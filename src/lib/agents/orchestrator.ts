// ─── Scraping Orchestrator ─────────────────────────────────────────
//
// Manages all scraping agents, deduplicates results, enriches properties,
// and persists everything to Supabase.
//

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SearchParams } from '@/types';
import {
  type ScrapedProperty,
  type AgentResult,
  type AgentError,
  normalizeAddress,
} from './types';
import { searchProperties as zillowSearch } from './zillow';
import { searchNODFilings } from './county-records';
import { searchAllForeclosureSites } from './foreclosure-sites';
import { searchPreForeclosures, searchForeclosures } from './attom';
import { enrichProperties } from './enricher';

// ─── Supabase Service Client ───────────────────────────────────────

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'The orchestrator requires a service role client for database operations.',
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Types ─────────────────────────────────────────────────────────

export interface OrchestratorResult {
  totalFound: number;
  totalAfterDedup: number;
  totalEnriched: number;
  totalSaved: number;
  agentResults: AgentResult[];
  errors: AgentError[];
  durationMs: number;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Run all applicable scraping agents for the given search parameters.
 *
 * Flow:
 * 1. Determine which agents to run based on search params
 * 2. Run agents in parallel
 * 3. Combine and deduplicate results
 * 4. Enrich properties with additional data
 * 5. Persist to Supabase
 */
export async function runSearch(params: SearchParams): Promise<OrchestratorResult> {
  const start = Date.now();
  const errors: AgentError[] = [];

  const city = params.city ?? '';
  const state = params.state ?? '';

  if (!city || !state) {
    return {
      totalFound: 0,
      totalAfterDedup: 0,
      totalEnriched: 0,
      totalSaved: 0,
      agentResults: [],
      errors: [{ message: 'City and state are required for search', timestamp: new Date().toISOString() }],
      durationMs: Date.now() - start,
    };
  }

  // ── Step 1: Determine which agents to run ────────────────────
  const agentPromises: Promise<AgentResult>[] = [];
  const distressTypes = params.distressTypes ?? [];
  const wantsForeclosure = distressTypes.length === 0 || distressTypes.some(d => ['Auction', 'Pre-Foreclosure', 'NOD'].includes(d));
  const wantsPreForeclosure = distressTypes.length === 0 || distressTypes.some(d => ['Pre-Foreclosure', 'NOD', 'Lis Pendens'].includes(d));
  const wantsREO = distressTypes.length === 0 || distressTypes.includes('REO');

  // Zillow - run per distress type for targeted filtering, or once with no filter
  if (!params.source || params.source === 'zillow') {
    if (distressTypes.length > 0) {
      for (const dt of distressTypes) {
        agentPromises.push(zillowSearch(city, state, dt));
      }
    } else {
      agentPromises.push(zillowSearch(city, state));
    }
  }

  // Foreclosure sites - run for foreclosure/reo types
  if (!params.source || params.source === 'foreclosure-sites') {
    if (wantsForeclosure || wantsREO) {
      agentPromises.push(searchAllForeclosureSites(city, state));
    }
  }

  // ATTOM - run if API key is available
  if ((!params.source || params.source === 'attom') && process.env.ATTOM_API_KEY) {
    if (wantsPreForeclosure) {
      agentPromises.push(searchPreForeclosures(city, state));
    }
    if (wantsForeclosure) {
      agentPromises.push(searchForeclosures(city, state));
    }
  }

  // County records - run for pre-foreclosure in supported counties
  if (!params.source || params.source === 'county-records') {
    if (wantsPreForeclosure) {
      // Default to searching the last 30 days
      agentPromises.push(
        searchNODFilings(guessCounty(city, state), state),
      );
    }
  }

  // ── Step 2: Run agents in parallel ───────────────────────────
  const settledResults = await Promise.allSettled(agentPromises);
  const agentResults: AgentResult[] = [];
  let allProperties: ScrapedProperty[] = [];

  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      agentResults.push(result.value);
      allProperties.push(...result.value.properties);
      errors.push(...result.value.errors);
    } else {
      errors.push({
        message: `Agent failed entirely: ${String(result.reason)}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const totalFound = allProperties.length;

  // ── Step 3: Deduplicate ──────────────────────────────────────
  allProperties = deduplicateProperties(allProperties);
  const totalAfterDedup = allProperties.length;

  // ── Step 4: Apply price filters ──────────────────────────────
  if (params.minPrice || params.maxPrice) {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? Infinity;
    allProperties = allProperties.filter((p) => {
      const price = p.listPrice ?? p.estimatedValue ?? 0;
      return price >= min && price <= max;
    });
  }

  // ── Step 5: Enrich properties ────────────────────────────────
  let enriched: ScrapedProperty[];
  try {
    enriched = await enrichProperties(allProperties);
  } catch (err) {
    errors.push({
      message: `Enrichment failed: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
    enriched = allProperties;
  }

  // ── Step 6: Filter by equity if requested ────────────────────
  if (params.minEquity && params.minEquity > 0) {
    enriched = enriched.filter(
      (p) => p.equityEstimate !== null && p.equityEstimate >= (params.minEquity ?? 0),
    );
  }

  const totalEnriched = enriched.length;

  // ── Step 7: Persist to Supabase ──────────────────────────────
  let totalSaved = 0;
  try {
    totalSaved = await saveProperties(enriched);
  } catch (err) {
    errors.push({
      message: `Failed to save properties: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    totalFound,
    totalAfterDedup,
    totalEnriched,
    totalSaved,
    agentResults,
    errors,
    durationMs: Date.now() - start,
  };
}

/**
 * Fetch a saved search from Supabase and run it.
 */
export async function runSavedSearch(savedSearchId: string): Promise<OrchestratorResult> {
  const supabase = getServiceClient();

  // Update status to "running"
  const { data: savedSearch, error: fetchError } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('id', savedSearchId)
    .single();

  if (fetchError || !savedSearch) {
    throw new Error(
      `Saved search ${savedSearchId} not found: ${fetchError?.message ?? 'no data'}`,
    );
  }

  // Mark as running
  await supabase
    .from('saved_searches')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', savedSearchId);

  // Run the search with the saved filters
  const params: SearchParams = (savedSearch.search_params ?? {}) as SearchParams;
  const result = await runSearch(params);

  // Log the scrape run
  try {
    await logScrapeRun(savedSearchId, result);
  } catch (err) {
    console.error(`[orchestrator] Failed to log scrape run:`, (err as Error).message);
  }

  // Update saved search with result count
  await supabase
    .from('saved_searches')
    .update({
      results_count: result.totalSaved,
      last_run_at: new Date().toISOString(),
    })
    .eq('id', savedSearchId);

  return result;
}

// ─── Deduplication ─────────────────────────────────────────────────

/**
 * Deduplicate properties by normalized address.
 * When duplicates are found, prefer the record with more data.
 */
export function deduplicateProperties(properties: ScrapedProperty[]): ScrapedProperty[] {
  const seen = new Map<string, ScrapedProperty>();

  for (const prop of properties) {
    const key = normalizeAddress(
      `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`,
    );

    if (!key || key.length < 5) {
      // Address too short to dedupe reliably; keep it
      seen.set(`__unknown_${Math.random()}`, prop);
      continue;
    }

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, prop);
    } else {
      // Merge: keep the record with more populated fields
      seen.set(key, mergeProperties(existing, prop));
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge two property records, preferring non-null values from either.
 * The first argument is treated as the "base" record.
 */
function mergeProperties(base: ScrapedProperty, incoming: ScrapedProperty): ScrapedProperty {
  const merged = { ...base };

  // For each field, prefer the non-null / non-empty value
  const fields: (keyof ScrapedProperty)[] = [
    'sourceUrl', 'county', 'latitude', 'longitude',
    'propertyType', 'bedrooms', 'bathrooms', 'sqft', 'lotSize', 'yearBuilt',
    'listPrice', 'estimatedValue', 'zestimate', 'arvEstimate',
    'lastSalePrice', 'lastSaleDate', 'loanBalance', 'equityEstimate',
    'ownerName',
  ];

  for (const field of fields) {
    if (merged[field] == null && incoming[field] != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (merged as any)[field] = incoming[field];
    }
  }

  // Merge distress types (union)
  const distressSet = new Set([...merged.distressTypes, ...incoming.distressTypes]);
  merged.distressTypes = Array.from(distressSet);

  // Track all sources
  if (incoming.source && incoming.source !== merged.source) {
    merged.source = `${merged.source},${incoming.source}`;
  }

  return merged;
}

// ─── Persistence ───────────────────────────────────────────────────

/**
 * Upsert scraped properties into the Supabase `properties` table.
 * Returns the number of successfully saved records.
 */
export async function saveProperties(properties: ScrapedProperty[]): Promise<number> {
  if (properties.length === 0) return 0;

  const supabase = getServiceClient();
  let saved = 0;

  // Process in batches of 50 to avoid payload size limits
  const batchSize = 50;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);

    const rows = batch.map((p) => ({
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      county: p.county,
      latitude: p.latitude,
      longitude: p.longitude,
      distress_type: p.distressTypes?.[0] ?? null,
      estimated_price: p.estimatedValue ?? p.zestimate ?? p.listPrice,
      arv: p.arvEstimate ?? null,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      lot_size: p.lotSize ? String(p.lotSize) : null,
      year_built: p.yearBuilt,
      source: p.source,
      source_url: p.sourceUrl,
      zillow_zestimate: p.zestimate ?? null,
      owner_name: p.ownerName,
      loan_balance: p.loanBalance,
      equity_estimate: p.equityEstimate,
      raw_data: p.rawData ?? null,
      updated_at: new Date().toISOString(),
    }));

    const { error, count } = await supabase
      .from('properties')
      .upsert(rows, {
        onConflict: 'address,city,state',
        ignoreDuplicates: false,
        count: 'exact',
      });

    if (error) {
      console.error(`[orchestrator] Batch upsert error:`, error.message);
    } else {
      saved += count ?? batch.length;
    }
  }

  return saved;
}

/**
 * Write a scrape run log entry to the `scrape_logs` table.
 */
export async function logScrapeRun(
  savedSearchId: string,
  result: OrchestratorResult,
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.from('scrape_logs').insert({
    saved_search_id: savedSearchId,
    source: 'orchestrator',
    status: result.errors.length > 0 && result.totalSaved === 0 ? 'failed' : 'completed',
    properties_found: result.totalFound,
    new_properties: result.totalSaved,
    error_message: result.errors.length > 0
      ? result.errors.map(e => e.message).join('; ')
      : null,
    duration_ms: result.durationMs,
    started_at: new Date(Date.now() - result.durationMs).toISOString(),
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[orchestrator] Failed to write scrape log:`, error.message);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Best-effort guess at county name for a city/state pair.
 * In production you would use a lookup table or geocoding API.
 */
function guessCounty(city: string, state: string): string {
  const lookup: Record<string, string> = {
    'phoenix-az': 'maricopa',
    'scottsdale-az': 'maricopa',
    'mesa-az': 'maricopa',
    'tempe-az': 'maricopa',
    'chandler-az': 'maricopa',
    'glendale-az': 'maricopa',
    'gilbert-az': 'maricopa',
    'peoria-az': 'maricopa',
    'surprise-az': 'maricopa',
    'goodyear-az': 'maricopa',
    'avondale-az': 'maricopa',
    'buckeye-az': 'maricopa',
    'tucson-az': 'pima',
    'flagstaff-az': 'coconino',
  };

  const key = `${city.toLowerCase()}-${state.toLowerCase()}`;
  return lookup[key] ?? city.toLowerCase();
}

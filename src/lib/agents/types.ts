// ─── Shared Types for All Scraping Agents ─────────────────────────

/**
 * Normalized property data returned by any scraping agent.
 * This is the intermediate format before upserting into Supabase.
 */
export interface ScrapedProperty {
  /** External ID from the source (zpid, parcel number, listing id, etc.) */
  sourceId: string;
  /** Which agent produced this record */
  source: string;
  /** Direct URL to the listing or record */
  sourceUrl: string | null;

  // ─── Location ────────────────────────────────────────────────
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  latitude: number | null;
  longitude: number | null;

  // ─── Property Details ────────────────────────────────────────
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lotSize: number | null;
  yearBuilt: number | null;

  // ─── Financial ───────────────────────────────────────────────
  listPrice: number | null;
  estimatedValue: number | null;
  zestimate: number | null;
  arvEstimate: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  loanBalance: number | null;
  equityEstimate: number | null;

  // ─── Owner / Distress ────────────────────────────────────────
  ownerName: string | null;
  ownerOccupied: boolean;
  distressTypes: string[];

  // ─── Metadata ────────────────────────────────────────────────
  scrapedAt: string;
  rawData?: Record<string, unknown>;
}

/**
 * Configuration that controls scraping behaviour.
 */
export interface ScrapeConfig {
  /** Minimum delay between requests in ms */
  minDelay: number;
  /** Maximum delay between requests in ms */
  maxDelay: number;
  /** Request timeout in ms */
  timeout: number;
  /** User-Agent string to send */
  userAgent: string;
  /** Maximum number of pages to scrape in a single run */
  maxPages: number;
  /** Maximum total results to return */
  maxResults: number;
}

/**
 * Result envelope returned by every agent run.
 */
export interface AgentResult {
  agent: string;
  properties: ScrapedProperty[];
  errors: AgentError[];
  /** Wall-clock duration of the run in ms */
  durationMs: number;
  /** Total pages or API calls attempted */
  requestCount: number;
}

export interface AgentError {
  message: string;
  code?: string;
  url?: string;
  timestamp: string;
}

// ─── Default User Agents ───────────────────────────────────────────

export const DEFAULT_USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
];

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Returns a promise that resolves after a random delay between `min` and `max` milliseconds.
 * Use between requests to avoid rate-limiting.
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Picks a random user-agent string from the default list.
 */
export function randomUserAgent(): string {
  return DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
}

/**
 * Standardises an address string for deduplication.
 * - Upper-cases
 * - Strips unit/apt/suite suffixes
 * - Normalises common abbreviations (St -> ST, Ave -> AVE, etc.)
 * - Collapses whitespace
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';

  let normalized = address.toUpperCase().trim();

  // Remove unit / apt / suite designations
  normalized = normalized.replace(/\b(APT|UNIT|STE|SUITE|#)\s*\S+/gi, '');

  // Common street suffix abbreviations
  const abbreviations: Record<string, string> = {
    STREET: 'ST',
    AVENUE: 'AVE',
    BOULEVARD: 'BLVD',
    DRIVE: 'DR',
    LANE: 'LN',
    ROAD: 'RD',
    COURT: 'CT',
    PLACE: 'PL',
    CIRCLE: 'CIR',
    TERRACE: 'TER',
    HIGHWAY: 'HWY',
    PARKWAY: 'PKWY',
    NORTH: 'N',
    SOUTH: 'S',
    EAST: 'E',
    WEST: 'W',
    NORTHEAST: 'NE',
    NORTHWEST: 'NW',
    SOUTHEAST: 'SE',
    SOUTHWEST: 'SW',
  };

  for (const [full, abbr] of Object.entries(abbreviations)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, 'g'), abbr);
  }

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Remove trailing commas or periods
  normalized = normalized.replace(/[.,]+$/, '');

  return normalized;
}

/**
 * Creates a blank ScrapedProperty with sensible defaults.
 */
export function emptyScrapedProperty(source: string): ScrapedProperty {
  return {
    sourceId: '',
    source,
    sourceUrl: null,
    address: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    latitude: null,
    longitude: null,
    propertyType: 'single-family',
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    lotSize: null,
    yearBuilt: null,
    listPrice: null,
    estimatedValue: null,
    zestimate: null,
    arvEstimate: null,
    lastSalePrice: null,
    lastSaleDate: null,
    loanBalance: null,
    equityEstimate: null,
    ownerName: null,
    ownerOccupied: false,
    distressTypes: [],
    scrapedAt: new Date().toISOString(),
  };
}

// ─── Property Enrichment Agent ─────────────────────────────────────
//
// Takes a ScrapedProperty and fills in missing data:
//   - Zestimate via Zillow agent
//   - ARV (After Repair Value) estimation
//   - Equity calculation
//   - Geocoding via Nominatim
//

import type { ScrapedProperty } from './types';
import { getZestimate } from './zillow';
import { randomDelay } from './types';

// ─── Public API ────────────────────────────────────────────────────

/**
 * Enriches a scraped property with additional data points.
 * This is best-effort: each enrichment step catches its own errors
 * so a failure in one step does not prevent the others.
 */
export async function enrichProperty(property: ScrapedProperty): Promise<ScrapedProperty> {
  const enriched = { ...property };

  // 1. Zestimate lookup
  await enrichZestimate(enriched);

  // 2. ARV estimation
  estimateARV(enriched);

  // 3. Equity calculation
  calculateEquity(enriched);

  // 4. Geocoding
  await geocodeAddress(enriched);

  return enriched;
}

/**
 * Enriches multiple properties in sequence with delays to respect rate limits.
 */
export async function enrichProperties(properties: ScrapedProperty[]): Promise<ScrapedProperty[]> {
  const results: ScrapedProperty[] = [];

  for (const property of properties) {
    try {
      const enriched = await enrichProperty(property);
      results.push(enriched);
    } catch (err) {
      console.error(
        `[enricher] Failed to enrich property at ${property.address}:`,
        (err as Error).message,
      );
      // Return the unenriched property rather than dropping it
      results.push(property);
    }

    // Small delay between properties to be polite to APIs
    await randomDelay(500, 1000);
  }

  return results;
}

// ─── Enrichment Steps ──────────────────────────────────────────────

/**
 * Look up Zestimate if not already present.
 */
async function enrichZestimate(property: ScrapedProperty): Promise<void> {
  if (property.zestimate) return;
  if (!property.address || !property.city || !property.state) return;

  try {
    const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`.trim();
    const zestimate = await getZestimate(fullAddress);

    if (zestimate) {
      property.zestimate = zestimate;
      // Also set estimatedValue if not present
      if (!property.estimatedValue) {
        property.estimatedValue = zestimate;
      }
    }
  } catch (err) {
    console.error(
      `[enricher] Zestimate lookup failed for ${property.address}:`,
      (err as Error).message,
    );
  }
}

/**
 * Estimate ARV (After Repair Value).
 *
 * Strategy:
 * - If Zestimate is available, use Zestimate * 1.1 as a rough ARV
 *   (assumes ~10% upside after repairs for distressed properties)
 * - If only list price is available, use list price * 1.3
 *   (distressed properties often list well below ARV)
 * - If estimatedValue is available but no Zestimate, use estimatedValue * 1.1
 */
function estimateARV(property: ScrapedProperty): void {
  if (property.arvEstimate) return;

  if (property.zestimate) {
    property.arvEstimate = Math.round(property.zestimate * 1.1);
  } else if (property.estimatedValue) {
    property.arvEstimate = Math.round(property.estimatedValue * 1.1);
  } else if (property.listPrice) {
    // Distressed list prices are typically 20-40% below ARV
    property.arvEstimate = Math.round(property.listPrice * 1.3);
  }
}

/**
 * Calculate equity: estimated value minus loan balance.
 */
function calculateEquity(property: ScrapedProperty): void {
  const value = property.zestimate ?? property.estimatedValue;

  if (value && property.loanBalance) {
    property.equityEstimate = Math.round(value - property.loanBalance);
  }
}

/**
 * Geocode the property address using Nominatim (free, no API key required).
 * Nominatim usage policy: max 1 request/second, include a valid User-Agent.
 */
async function geocodeAddress(property: ScrapedProperty): Promise<void> {
  // Skip if already geocoded
  if (property.latitude && property.longitude) return;
  if (!property.address) return;

  try {
    const fullAddress = [
      property.address,
      property.city,
      property.state,
      property.zip,
      'USA',
    ]
      .filter(Boolean)
      .join(', ');

    // Respect Nominatim rate limit
    await randomDelay(1100, 1500);

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', fullAddress);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'DealFinder/1.0 (property research tool)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[enricher] Nominatim returned ${res.status} for "${fullAddress}"`);
      return;
    }

    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;

    if (results.length > 0) {
      const lat = parseFloat(results[0].lat);
      const lon = parseFloat(results[0].lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        property.latitude = lat;
        property.longitude = lon;
      }
    }
  } catch (err) {
    console.error(
      `[enricher] Geocoding failed for ${property.address}:`,
      (err as Error).message,
    );
  }
}

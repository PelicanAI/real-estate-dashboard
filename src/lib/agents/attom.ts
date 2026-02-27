// ─── ATTOM Data API Agent ──────────────────────────────────────────
//
// Uses the ATTOM Data Solutions API for property data, pre-foreclosures,
// and foreclosure records. Requires ATTOM_API_KEY environment variable.
//
// Rate limit: 50 requests/minute
//

import {
  type ScrapedProperty,
  type AgentResult,
  type AgentError,
  emptyScrapedProperty,
  randomDelay,
} from './types';

const AGENT_NAME = 'attom';
const ATTOM_BASE_URL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';

// ─── Rate Limiter ──────────────────────────────────────────────────

const rateLimiter = {
  timestamps: [] as number[],
  maxRequests: 50,
  windowMs: 60_000,

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldestInWindow) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.timestamps.push(Date.now());
  },
};

// ─── Internal Fetch Helper ─────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.ATTOM_API_KEY;
  if (!key) {
    throw new Error('ATTOM_API_KEY environment variable is not set. ATTOM agent cannot run.');
  }
  return key;
}

async function attomFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getApiKey();

  await rateLimiter.waitForSlot();

  const url = new URL(`${ATTOM_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      apikey: apiKey,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ATTOM API ${res.status}: ${res.statusText} - ${body}`);
  }

  return res.json();
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Search ATTOM for pre-foreclosure properties in a city/state.
 */
export async function searchPreForeclosures(
  city: string,
  state: string,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    getApiKey(); // Fail fast if not configured

    await randomDelay(500, 1000);
    requestCount++;

    const data = (await attomFetch('/property/preforeclosure', {
      address1: `${city}, ${state}`,
      page: '1',
      pageSize: '50',
    })) as {
      property?: Array<Record<string, unknown>>;
      status?: { msg?: string };
    };

    if (!data.property || !Array.isArray(data.property)) {
      if (data.status?.msg) {
        errors.push({
          message: `ATTOM pre-foreclosure: ${data.status.msg}`,
          timestamp: new Date().toISOString(),
        });
      }
      return { agent: AGENT_NAME, properties, errors, durationMs: Date.now() - start, requestCount };
    }

    for (const record of data.property) {
      try {
        properties.push(mapAttomProperty(record, 'Pre-Foreclosure'));
      } catch (err) {
        errors.push({
          message: `Failed to map ATTOM pre-foreclosure record: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    errors.push({
      message: `ATTOM pre-foreclosure search failed: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    agent: AGENT_NAME,
    properties,
    errors,
    durationMs: Date.now() - start,
    requestCount,
  };
}

/**
 * Search ATTOM for foreclosure properties in a city/state.
 */
export async function searchForeclosures(
  city: string,
  state: string,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    getApiKey();

    await randomDelay(500, 1000);
    requestCount++;

    const data = (await attomFetch('/property/foreclosure', {
      address1: `${city}, ${state}`,
      page: '1',
      pageSize: '50',
    })) as {
      property?: Array<Record<string, unknown>>;
      status?: { msg?: string };
    };

    if (!data.property || !Array.isArray(data.property)) {
      if (data.status?.msg) {
        errors.push({
          message: `ATTOM foreclosure: ${data.status.msg}`,
          timestamp: new Date().toISOString(),
        });
      }
      return { agent: AGENT_NAME, properties, errors, durationMs: Date.now() - start, requestCount };
    }

    for (const record of data.property) {
      try {
        properties.push(mapAttomProperty(record, 'Auction'));
      } catch (err) {
        errors.push({
          message: `Failed to map ATTOM foreclosure record: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    errors.push({
      message: `ATTOM foreclosure search failed: ${(err as Error).message}`,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    agent: AGENT_NAME,
    properties,
    errors,
    durationMs: Date.now() - start,
    requestCount,
  };
}

/**
 * Get detailed property information by address.
 */
export async function getPropertyDetails(address: string): Promise<ScrapedProperty | null> {
  try {
    getApiKey();

    await randomDelay(500, 1000);

    const data = (await attomFetch('/property/detailowner', {
      address1: address,
    })) as {
      property?: Array<Record<string, unknown>>;
    };

    if (!data.property?.[0]) return null;

    return mapAttomProperty(data.property[0]);
  } catch (err) {
    console.error(`[attom] getPropertyDetails failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Get tax assessment data for a property.
 */
export async function getAssessment(address: string): Promise<{
  assessedValue: number | null;
  taxAmount: number | null;
  marketValue: number | null;
  rawData: Record<string, unknown>;
} | null> {
  try {
    getApiKey();

    await randomDelay(500, 1000);

    const data = (await attomFetch('/assessment/detail', {
      address1: address,
    })) as {
      property?: Array<Record<string, unknown>>;
    };

    if (!data.property?.[0]) return null;

    const record = data.property[0];
    const assessment = (record.assessment ?? {}) as Record<string, unknown>;
    const assessed = (assessment.assessed ?? {}) as Record<string, unknown>;
    const market = (assessment.market ?? {}) as Record<string, unknown>;
    const tax = (assessment.tax ?? {}) as Record<string, unknown>;

    return {
      assessedValue: typeof assessed.assdTtlValue === 'number' ? assessed.assdTtlValue : null,
      marketValue: typeof market.mktTtlValue === 'number' ? market.mktTtlValue : null,
      taxAmount: typeof tax.taxAmt === 'number' ? tax.taxAmt : null,
      rawData: record,
    };
  } catch (err) {
    console.error(`[attom] getAssessment failed:`, (err as Error).message);
    return null;
  }
}

// ─── Internal Mapping ──────────────────────────────────────────────

type AttomDistressType = import('@/types').DistressType;

function mapAttomProperty(
  record: Record<string, unknown>,
  distressType?: AttomDistressType,
): ScrapedProperty {
  const prop = emptyScrapedProperty(AGENT_NAME);

  // Address info - ATTOM nests this under "address"
  const addr = (record.address ?? {}) as Record<string, unknown>;
  prop.address = String(addr.line1 ?? addr.oneLine ?? '');
  prop.city = String(addr.locality ?? addr.city ?? '');
  prop.state = String(addr.countrySubd ?? addr.state ?? '');
  prop.zip = String(addr.postal1 ?? addr.zip ?? '');
  prop.county = String(addr.county ?? '');

  // Location
  const location = (record.location ?? {}) as Record<string, unknown>;
  prop.latitude = typeof location.latitude === 'number' ? location.latitude : null;
  prop.longitude = typeof location.longitude === 'number' ? location.longitude : null;

  // Identifier
  const identifier = (record.identifier ?? {}) as Record<string, unknown>;
  prop.sourceId = String(identifier.attomId ?? identifier.Id ?? record.id ?? '');

  // Building info
  const building = (record.building ?? {}) as Record<string, unknown>;
  const rooms = (building.rooms ?? {}) as Record<string, unknown>;
  const size = (building.size ?? {}) as Record<string, unknown>;
  const summary = (building.summary ?? {}) as Record<string, unknown>;

  prop.bedrooms = typeof rooms.beds === 'number' ? rooms.beds : null;
  prop.bathrooms = typeof rooms.bathsFull === 'number' ? rooms.bathsFull : null;
  prop.sqft = typeof size.livingSize === 'number' ? size.livingSize : null;
  prop.yearBuilt = typeof summary.yearBuilt === 'number' ? summary.yearBuilt : null;
  prop.propertyType = String(summary.propClass ?? summary.propType ?? 'single-family').toLowerCase();

  // Lot
  const lot = (record.lot ?? {}) as Record<string, unknown>;
  prop.lotSize = typeof lot.lotSize1 === 'number' ? lot.lotSize1 : null;

  // Sale info
  const sale = (record.sale ?? {}) as Record<string, unknown>;
  const saleAmount = (sale.amount ?? {}) as Record<string, unknown>;
  prop.lastSalePrice = typeof saleAmount.saleAmt === 'number' ? saleAmount.saleAmt : null;
  prop.lastSaleDate = sale.saleTransDate ? String(sale.saleTransDate) : null;

  // Assessment / value
  const assessment = (record.assessment ?? {}) as Record<string, unknown>;
  const market = (assessment.market ?? {}) as Record<string, unknown>;
  prop.estimatedValue = typeof market.mktTtlValue === 'number' ? market.mktTtlValue : null;

  // Owner
  const owner = (record.owner ?? {}) as Record<string, unknown>;
  prop.ownerName = owner.owner1 ? String(owner.owner1) : null;
  prop.ownerOccupied = owner.absenteeInd === 'O'; // "O" = owner-occupied in ATTOM

  // Mortgage / loan
  const mortgage = (record.mortgage ?? {}) as Record<string, unknown>;
  const firstMortgage = (mortgage.first ?? mortgage) as Record<string, unknown>;
  prop.loanBalance = typeof firstMortgage.amount === 'number' ? firstMortgage.amount : null;

  // Distress type
  if (distressType) {
    prop.distressTypes = [distressType];
  }

  // Foreclosure-specific fields
  const foreclosure = (record.foreclosure ?? {}) as Record<string, unknown>;
  if (foreclosure.defaultAmount && typeof foreclosure.defaultAmount === 'number') {
    prop.loanBalance = prop.loanBalance ?? foreclosure.defaultAmount;
  }

  prop.rawData = record;
  return prop;
}

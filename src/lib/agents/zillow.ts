// ─── Zillow Scraper Agent ──────────────────────────────────────────
//
// Two modes:
//   1. RapidAPI Zillow endpoint (if RAPIDAPI_KEY is set) - fast & structured
//   2. Cheerio-based HTML scraping fallback - slower, fragile
//

import * as cheerio from 'cheerio';
type DistressType = string;
import {
  type ScrapedProperty,
  type AgentResult,
  type AgentError,
  emptyScrapedProperty,
  randomDelay,
  randomUserAgent,
} from './types';

const AGENT_NAME = 'zillow';

// City center coordinates for mapBounds (expand as needed)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'phoenix-az': { lat: 33.4484, lng: -112.0740 },
  'scottsdale-az': { lat: 33.4942, lng: -111.9261 },
  'mesa-az': { lat: 33.4152, lng: -111.8315 },
  'tempe-az': { lat: 33.4255, lng: -111.9400 },
  'glendale-az': { lat: 33.5387, lng: -112.1860 },
  'chandler-az': { lat: 33.3062, lng: -111.8413 },
  'gilbert-az': { lat: 33.3528, lng: -111.7890 },
  'peoria-az': { lat: 33.5806, lng: -112.2374 },
  'surprise-az': { lat: 33.6292, lng: -112.3680 },
  'goodyear-az': { lat: 33.4353, lng: -112.3577 },
};

// ─── RapidAPI Zillow helpers ───────────────────────────────────────

function rapidApiHeaders(): Record<string, string> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY not set');
  return {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': process.env.RAPIDAPI_ZILLOW_HOST || 'real-estate101.p.rapidapi.com',
    Accept: 'application/json',
  };
}

async function rapidApiFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const host = process.env.RAPIDAPI_ZILLOW_HOST || 'real-estate101.p.rapidapi.com';
  const url = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: rapidApiHeaders(),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`RapidAPI ${res.status}: ${res.statusText} - ${await res.text().catch(() => '')}`);
  }

  return res.json();
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Search Zillow for properties in a given city/state.
 * Optionally filter by distress type (pre-foreclosure, foreclosure, etc.)
 */
export async function searchProperties(
  city: string,
  state: string,
  distressType?: DistressType,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  const useApi = !!process.env.RAPIDAPI_KEY;

  try {
    if (useApi) {
      const citySlug = city.toLowerCase().replace(/\s+/g, '-');
      const stateSlug = state.toLowerCase();
      const slug = `${citySlug}-${stateSlug}`;
      const coords = CITY_COORDS[slug] || { lat: 33.4484, lng: -112.0740 }; // default Phoenix
      const boundsOffset = 0.25; // ~17 miles

      let data: {
        results?: Array<Record<string, unknown>>;
        props?: Array<Record<string, unknown>>;
        searchResults?: { listResults?: Array<Record<string, unknown>> };
        data?: Array<Record<string, unknown>>;
        totalCount?: number;
        filteredCount?: number;
        success?: boolean;
      };

      if (!distressType) {
        // ── No filter: use bymapbounds (simpler, proven to work) ────
        const params: Record<string, string> = {
          north: String(coords.lat + boundsOffset),
          south: String(coords.lat - boundsOffset),
          east: String(coords.lng + boundsOffset),
          west: String(coords.lng - boundsOffset),
          page: '1',
        };
        console.log('[zillow] bymapbounds params:', JSON.stringify(params));
        await randomDelay(1000, 2000);
        requestCount++;
        data = (await rapidApiFetch('/api/search/bymapbounds', params)) as typeof data;
      } else {
        // ── Distress filter: use byurl with searchQueryState ────────
        const filterState: Record<string, any> = {
          sort: { value: 'globalrelevanceex' },
          isAllHomes: { value: true },
        };

        const dt = distressType.toLowerCase();
        if (dt.includes('pre-foreclosure') || dt.includes('nod') || dt.includes('lis pendens')) {
          filterState.isPreForeclosure = { value: true };
        } else if (dt.includes('auction')) {
          filterState.isForSaleForeclosure = { value: true };
        } else if (dt.includes('foreclosure')) {
          filterState.isForSaleForeclosure = { value: true };
          filterState.isPreForeclosure = { value: true };
        } else if (dt.includes('reo') || dt.includes('bank')) {
          filterState.isRecentlySold = { value: true };
        }

        const searchQueryState = JSON.stringify({
          mapBounds: {
            north: coords.lat + boundsOffset,
            south: coords.lat - boundsOffset,
            east: coords.lng + boundsOffset,
            west: coords.lng - boundsOffset,
          },
          isMapVisible: true,
          filterState,
          isListVisible: true,
        });
        const zillowUrl = `https://www.zillow.com/${slug}/?searchQueryState=${encodeURIComponent(searchQueryState)}`;
        console.log('[zillow] byurl with filter:', distressType, '- URL:', zillowUrl.slice(0, 120) + '...');
        await randomDelay(1000, 2000);
        requestCount++;
        data = (await rapidApiFetch('/api/search/byurl', { url: zillowUrl, page: '1' })) as typeof data;
      }

      const listings =
        data.results ??
        data.props ??
        data.searchResults?.listResults ??
        data.data ??
        [];

      for (const listing of listings) {
        try {
          properties.push(mapRapidApiListing(listing, city, state, distressType));
        } catch (err) {
          errors.push({
            message: `Failed to map listing: ${(err as Error).message}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      // ── Cheerio scraping fallback ──────────────────────────────
      const searchUrl = buildZillowSearchUrl(city, state, distressType);
      await randomDelay(3000, 5000);
      requestCount++;

      const html = await fetchPage(searchUrl);
      const $ = cheerio.load(html);

      // Zillow embeds search results as JSON in a <script> tag
      const scriptTag = $('script#__NEXT_DATA__').html();
      if (scriptTag) {
        try {
          const nextData = JSON.parse(scriptTag);
          const results =
            nextData?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults ?? [];

          for (const item of results) {
            try {
              properties.push(mapNextDataListing(item, city, state, distressType));
            } catch (err) {
              errors.push({
                message: `Failed to map NEXT_DATA listing: ${(err as Error).message}`,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch {
          errors.push({
            message: 'Failed to parse Zillow __NEXT_DATA__ JSON',
            url: searchUrl,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Fallback: try parsing HTML cards directly
      if (properties.length === 0) {
        $('article[data-test="property-card"]').each((_, el) => {
          try {
            const card = $(el);
            const prop = emptyScrapedProperty(AGENT_NAME);

            prop.address = card.find('[data-test="property-card-addr"]').text().trim();
            const priceText = card.find('[data-test="property-card-price"]').text().trim();
            prop.listPrice = parsePrice(priceText);

            const link = card.find('a[data-test="property-card-link"]').attr('href');
            if (link) {
              prop.sourceUrl = link.startsWith('http') ? link : `https://www.zillow.com${link}`;
              // Extract zpid from URL
              const zpidMatch = link.match(/(\d+)_zpid/);
              if (zpidMatch) prop.sourceId = zpidMatch[1];
            }

            prop.city = city;
            prop.state = state;
            if (distressType) prop.distressTypes = [distressType];

            // Parse bed/bath/sqft from the details line
            const details = card.find('[data-test="property-card-details"]').text();
            const bedMatch = details.match(/(\d+)\s*bd/i);
            const bathMatch = details.match(/([\d.]+)\s*ba/i);
            const sqftMatch = details.match(/([\d,]+)\s*sqft/i);
            if (bedMatch) prop.bedrooms = parseInt(bedMatch[1], 10);
            if (bathMatch) prop.bathrooms = parseFloat(bathMatch[1]);
            if (sqftMatch) prop.sqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);

            if (prop.address) properties.push(prop);
          } catch (err) {
            errors.push({
              message: `Failed to parse property card: ${(err as Error).message}`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    }
  } catch (err) {
    errors.push({
      message: `Zillow search failed: ${(err as Error).message}`,
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
 * Get detailed property info by Zillow Property ID.
 */
export async function getPropertyDetails(zpid: string): Promise<ScrapedProperty | null> {
  try {
    if (process.env.RAPIDAPI_KEY) {
      await randomDelay(1000, 2000);
      const data = (await rapidApiFetch('/api/property-info', { zpid })) as Record<string, unknown>;
      return mapDetailResponse(data);
    }

    // Scraping fallback
    const url = `https://www.zillow.com/homedetails/${zpid}_zpid/`;
    await randomDelay(3000, 5000);
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const scriptTag = $('script#__NEXT_DATA__').html();
    if (!scriptTag) return null;

    const nextData = JSON.parse(scriptTag);
    const propertyData = nextData?.props?.pageProps?.componentProps?.gdpClientCache;
    if (!propertyData) return null;

    // gdpClientCache is a JSON string keyed by a query hash
    const cacheStr = typeof propertyData === 'string' ? propertyData : JSON.stringify(propertyData);
    const cache = JSON.parse(cacheStr);
    const firstKey = Object.keys(cache)[0];
    if (!firstKey) return null;

    const property = JSON.parse(cache[firstKey])?.property;
    if (!property) return null;

    return mapDetailResponse(property);
  } catch (err) {
    console.error(`[zillow] getPropertyDetails(${zpid}) failed:`, (err as Error).message);
    return null;
  }
}

/**
 * Get the Zestimate for a given address.
 * Returns the dollar value or null if unavailable.
 */
export async function getZestimate(address: string): Promise<number | null> {
  try {
    if (process.env.RAPIDAPI_KEY) {
      await randomDelay(1000, 2000);
      const data = (await rapidApiFetch('/api/property-info', { address })) as Record<string, unknown>;
      const zest = data.zestimate ?? data.zEstimate ?? null;
      return typeof zest === 'number' ? zest : null;
    }

    // No reliable scraping fallback for Zestimate
    return null;
  } catch (err) {
    console.error(`[zillow] getZestimate failed:`, (err as Error).message);
    return null;
  }
}

// ─── Distress Type Mapping ─────────────────────────────────────────

/**
 * Map Zillow homeStatus / marketingStatus to a distress type.
 * Returns null for regular (non-distressed) listings.
 */
function mapHomeStatusToDistressType(listing: Record<string, unknown>): string | null {
  const status = String(
    listing.homeStatus ?? listing.marketingStatus ?? listing.status ?? listing.statusType ?? ''
  ).toLowerCase();

  if (status.includes('pre_foreclosure') || status.includes('preforeclosure')) return 'Pre-Foreclosure';
  if (status.includes('foreclosure') || status.includes('auction')) return 'Auction';
  if (status.includes('foreclosed') || status.includes('reo')) return 'REO';
  return null;
}

// ─── Internal Helpers ──────────────────────────────────────────────

function buildZillowSearchUrl(city: string, state: string, distressType?: DistressType): string {
  const slug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
  let url = `https://www.zillow.com/${slug}/`;

  if (distressType === 'foreclosure') {
    url += '?searchQueryState=%7B%22filterState%22%3A%7B%22isForeclosure%22%3A%7B%22value%22%3Atrue%7D%7D%7D';
  } else if (distressType === 'pre-foreclosure') {
    url += '?searchQueryState=%7B%22filterState%22%3A%7B%22isPreForeclosure%22%3A%7B%22value%22%3Atrue%7D%7D%7D';
  }

  return url;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return res.text();
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function mapRapidApiListing(
  listing: Record<string, unknown>,
  city: string,
  state: string,
  distressType?: DistressType,
): ScrapedProperty {
  const prop = emptyScrapedProperty(AGENT_NAME);

  prop.sourceId = String(listing.zpid ?? listing.id ?? '');

  // Handle address as object or string
  if (listing.address && typeof listing.address === 'object') {
    const addr = listing.address as Record<string, unknown>;
    prop.address = String(addr.street ?? addr.streetAddress ?? '');
    prop.city = String(addr.city ?? city);
    prop.state = String(addr.state ?? state);
    prop.zip = String(addr.zipcode ?? addr.zip ?? '');
  } else {
    prop.address = String(listing.address ?? listing.streetAddress ?? '');
    prop.city = String(listing.city ?? city);
    prop.state = String(listing.state ?? state);
    prop.zip = String(listing.zipcode ?? listing.zip ?? '');
  }
  prop.county = String(listing.county ?? '');

  prop.latitude = typeof listing.latitude === 'number' ? listing.latitude : null;
  prop.longitude = typeof listing.longitude === 'number' ? listing.longitude : null;

  prop.listPrice = typeof listing.unformattedPrice === 'number'
    ? listing.unformattedPrice
    : typeof listing.price === 'number' ? listing.price : parsePrice(String(listing.price ?? ''));
  prop.zestimate = typeof listing.zestimate === 'number' ? listing.zestimate : null;
  prop.estimatedValue = prop.zestimate ?? prop.listPrice;

  prop.bedrooms = typeof listing.beds === 'number' ? listing.beds
    : typeof listing.bedrooms === 'number' ? listing.bedrooms : null;
  prop.bathrooms = typeof listing.baths === 'number' ? listing.baths
    : typeof listing.bathrooms === 'number' ? listing.bathrooms : null;
  prop.sqft = typeof listing.area === 'number' ? listing.area
    : typeof listing.livingArea === 'number' ? listing.livingArea : null;
  prop.lotSize = typeof listing.lotAreaValue === 'number' ? listing.lotAreaValue : null;
  prop.yearBuilt = typeof listing.yearBuilt === 'number' ? listing.yearBuilt : null;

  prop.propertyType = String(listing.homeType ?? listing.propertyType ?? 'single-family').toLowerCase();

  const detailUrl = listing.detailUrl ?? listing.url;
  prop.sourceUrl = detailUrl ? String(detailUrl) : null;

  // Set distress type: prefer the explicit filter from the search, then try to infer from listing status
  const inferredDistress = mapHomeStatusToDistressType(listing);
  if (distressType) {
    prop.distressTypes = [distressType];
  } else if (inferredDistress) {
    prop.distressTypes = [inferredDistress];
  }

  prop.rawData = listing;
  return prop;
}

function mapNextDataListing(
  item: Record<string, unknown>,
  city: string,
  state: string,
  distressType?: DistressType,
): ScrapedProperty {
  const prop = emptyScrapedProperty(AGENT_NAME);

  prop.sourceId = String(item.zpid ?? item.id ?? '');
  prop.address = String(item.address ?? item.streetAddress ?? '');
  prop.city = city;
  prop.state = state;
  prop.zip = String(item.zipcode ?? '');

  prop.listPrice = typeof item.unformattedPrice === 'number'
    ? item.unformattedPrice
    : parsePrice(String(item.price ?? ''));

  const latLong = item.latLong as { latitude?: number; longitude?: number } | undefined;
  prop.latitude = latLong?.latitude ?? null;
  prop.longitude = latLong?.longitude ?? null;

  prop.bedrooms = typeof item.beds === 'number' ? item.beds : null;
  prop.bathrooms = typeof item.baths === 'number' ? item.baths : null;
  prop.sqft = typeof item.area === 'number' ? item.area : null;

  const detailUrl = item.detailUrl ?? item.url;
  prop.sourceUrl = detailUrl ? `https://www.zillow.com${detailUrl}` : null;

  const inferredDistress = mapHomeStatusToDistressType(item);
  if (distressType) {
    prop.distressTypes = [distressType];
  } else if (inferredDistress) {
    prop.distressTypes = [inferredDistress];
  }

  prop.rawData = item;
  return prop;
}

function mapDetailResponse(data: Record<string, unknown>): ScrapedProperty {
  const prop = emptyScrapedProperty(AGENT_NAME);

  prop.sourceId = String(data.zpid ?? '');
  prop.address = String(data.streetAddress ?? data.address ?? '');
  prop.city = String(data.city ?? '');
  prop.state = String(data.state ?? '');
  prop.zip = String(data.zipcode ?? data.zip ?? '');
  prop.county = String(data.county ?? '');

  prop.latitude = typeof data.latitude === 'number' ? data.latitude : null;
  prop.longitude = typeof data.longitude === 'number' ? data.longitude : null;

  prop.listPrice = typeof data.price === 'number' ? data.price : null;
  prop.zestimate = typeof data.zestimate === 'number' ? data.zestimate : null;
  prop.estimatedValue = prop.zestimate ?? prop.listPrice;

  prop.bedrooms = typeof data.bedrooms === 'number' ? data.bedrooms : null;
  prop.bathrooms = typeof data.bathrooms === 'number' ? data.bathrooms : null;
  prop.sqft = typeof data.livingArea === 'number' ? data.livingArea : null;
  prop.lotSize = typeof data.lotAreaValue === 'number' ? data.lotAreaValue : null;
  prop.yearBuilt = typeof data.yearBuilt === 'number' ? data.yearBuilt : null;

  prop.propertyType = String(data.homeType ?? 'single-family').toLowerCase();
  prop.ownerName = data.ownerName ? String(data.ownerName) : null;

  prop.lastSalePrice = typeof data.lastSoldPrice === 'number' ? data.lastSoldPrice : null;
  prop.lastSaleDate = data.lastSoldDate ? String(data.lastSoldDate) : null;

  prop.sourceUrl = data.url ? String(data.url) : `https://www.zillow.com/homedetails/${prop.sourceId}_zpid/`;

  prop.rawData = data;
  return prop;
}

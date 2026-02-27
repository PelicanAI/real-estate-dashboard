// ─── Foreclosure Aggregator Scraper Agent ──────────────────────────
//
// Scrapes multiple foreclosure listing websites using cheerio.
// Each function targets a specific site and returns ScrapedProperty[].
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

const AGENT_NAME = 'foreclosure-sites';

// ─── Shared fetch helper ───────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.google.com/',
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

function stateSlug(state: string): string {
  return state.toLowerCase();
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}

// ─── Foreclosure.com ───────────────────────────────────────────────

/**
 * Scrape foreclosure.com listings for a given city/state.
 * @param type - Optional filter: 'foreclosure', 'pre-foreclosure', 'bankruptcy', 'tax-lien'
 */
export async function searchForeclosureDotCom(
  city: string,
  state: string,
  type?: DistressType,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    // Foreclosure.com URL pattern: /listings/state/city.html
    const typeSlugMap: Partial<Record<DistressType, string>> = {
      Auction: 'foreclosure',
      'Pre-Foreclosure': 'preforeclosure',
      REO: 'bankruptcy',
      'Tax Lien': 'tax-lien',
    };

    const pathType = type && typeSlugMap[type] ? typeSlugMap[type] : 'foreclosure';
    const url = `https://www.foreclosure.com/listings/${pathType}/${stateSlug(state)}/${citySlug(city)}.html`;

    await randomDelay(3000, 5000);
    requestCount++;

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Foreclosure.com uses various listing card structures
    $('[class*="listing"], [class*="property"], .result-item, .search-result').each((_, el) => {
      try {
        const card = $(el);
        const prop = emptyScrapedProperty(AGENT_NAME);
        prop.source = 'foreclosure.com';

        // Address extraction - try multiple selectors
        prop.address =
          card.find('[class*="address"], .property-address, h3, h4').first().text().trim() ||
          card.find('a[href*="/listing/"]').first().text().trim();

        // Price
        const priceText =
          card.find('[class*="price"], .property-price, .listing-price').first().text().trim();
        prop.listPrice = parsePrice(priceText);

        // Link
        const link = card.find('a[href*="/listing/"]').first().attr('href');
        if (link) {
          prop.sourceUrl = link.startsWith('http') ? link : `https://www.foreclosure.com${link}`;
          prop.sourceId = link.replace(/[^a-zA-Z0-9]/g, '-');
        }

        // Property details
        const details = card.text();
        const bedMatch = details.match(/(\d+)\s*(?:bed|br|bd)/i);
        const bathMatch = details.match(/([\d.]+)\s*(?:bath|ba)/i);
        const sqftMatch = details.match(/([\d,]+)\s*(?:sq\s*ft|sqft)/i);

        if (bedMatch) prop.bedrooms = parseInt(bedMatch[1], 10);
        if (bathMatch) prop.bathrooms = parseFloat(bathMatch[1]);
        if (sqftMatch) prop.sqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);

        prop.city = city;
        prop.state = state.toUpperCase();
        prop.distressTypes = type ? [type] : ['foreclosure'];

        if (prop.address && prop.address.length > 5) {
          properties.push(prop);
        }
      } catch (err) {
        errors.push({
          message: `foreclosure.com card parse error: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    errors.push({
      message: `foreclosure.com search failed: ${(err as Error).message}`,
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

// ─── HUD Homes ────────────────────────────────────────────────────

/**
 * Scrape HUD Home Store (hudhomestore.gov) for government-owned properties.
 */
export async function searchHUDHomes(
  city: string,
  state: string,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    // HUD uses a search endpoint that returns HTML
    const params = new URLSearchParams({
      State: state.toUpperCase(),
      City: city,
      Zip: '',
      sLanguage: 'ENGLISH',
      iPS: '50', // page size
      iNP: '1',  // page number
      bSP: 'false',
    });

    const url = `https://www.hudhomestore.gov/Listing/PropertySearchResult?${params.toString()}`;

    await randomDelay(3000, 5000);
    requestCount++;

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // HUD home store uses a table or card layout
    $('.property-card, .listing-row, table.results tbody tr, .search-result-item').each((_, el) => {
      try {
        const card = $(el);
        const prop = emptyScrapedProperty(AGENT_NAME);
        prop.source = 'hudhomestore.gov';

        // Try to extract structured data
        prop.address =
          card.find('.property-address, .address, td:nth-child(1)').first().text().trim();
        prop.city =
          card.find('.property-city, .city, td:nth-child(2)').first().text().trim() || city;
        prop.state = state.toUpperCase();
        prop.zip =
          card.find('.property-zip, .zip, td:nth-child(4)').first().text().trim();

        const priceText =
          card.find('.property-price, .price, .list-price, td:nth-child(5)').first().text().trim();
        prop.listPrice = parsePrice(priceText);

        // HUD case number as source ID
        const caseNum =
          card.find('.case-number, .hud-case, td:nth-child(6)').first().text().trim() ||
          card.attr('data-case-number') ||
          '';
        prop.sourceId = caseNum || `hud-${prop.address}`.replace(/\s+/g, '-');

        // Property details
        const detailText = card.text();
        const bedMatch = detailText.match(/(\d+)\s*(?:bed|br|bd)/i);
        const bathMatch = detailText.match(/([\d.]+)\s*(?:bath|ba)/i);
        const sqftMatch = detailText.match(/([\d,]+)\s*(?:sq\s*ft|sqft)/i);

        if (bedMatch) prop.bedrooms = parseInt(bedMatch[1], 10);
        if (bathMatch) prop.bathrooms = parseFloat(bathMatch[1]);
        if (sqftMatch) prop.sqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);

        const link = card.find('a[href*="Property"]').first().attr('href');
        if (link) {
          prop.sourceUrl = link.startsWith('http')
            ? link
            : `https://www.hudhomestore.gov${link}`;
        }

        prop.distressTypes = ['reo'];

        if (prop.address && prop.address.length > 5) {
          properties.push(prop);
        }
      } catch (err) {
        errors.push({
          message: `HUD card parse error: ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    errors.push({
      message: `HUD Homes search failed: ${(err as Error).message}`,
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

// ─── Fannie Mae HomePath (REO) ────────────────────────────────────

/**
 * Scrape Fannie Mae HomePath for REO properties.
 */
export async function searchHomePath(
  city: string,
  state: string,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    // HomePath has an API-like search endpoint
    const url = `https://www.homepath.fanniemae.com/cgi-bin/searchMgr/search.cgi`;

    const body = new URLSearchParams({
      city,
      state: state.toUpperCase(),
      zip: '',
      radius: '25',
      minPrice: '0',
      maxPrice: '999999999',
      minBeds: '0',
      minBaths: '0',
      propertyType: 'SFR,CONDO,MULTI',
      pageSize: '50',
      page: '1',
    });

    await randomDelay(3000, 5000);
    requestCount++;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': randomUserAgent(),
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/json,*/*',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from HomePath`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    const responseText = await res.text();

    if (contentType.includes('json')) {
      // JSON response
      try {
        const data = JSON.parse(responseText) as {
          properties?: Array<Record<string, unknown>>;
          results?: Array<Record<string, unknown>>;
        };
        const listings = data.properties ?? data.results ?? [];

        for (const listing of listings) {
          const prop = emptyScrapedProperty(AGENT_NAME);
          prop.source = 'homepath.fanniemae.com';
          prop.sourceId = String(listing.id ?? listing.caseNumber ?? '');
          prop.address = String(listing.address ?? listing.streetAddress ?? '');
          prop.city = String(listing.city ?? city);
          prop.state = state.toUpperCase();
          prop.zip = String(listing.zip ?? listing.zipCode ?? '');
          prop.listPrice = typeof listing.listPrice === 'number' ? listing.listPrice : parsePrice(String(listing.listPrice ?? ''));
          prop.bedrooms = typeof listing.bedrooms === 'number' ? listing.bedrooms : null;
          prop.bathrooms = typeof listing.bathrooms === 'number' ? listing.bathrooms : null;
          prop.sqft = typeof listing.sqft === 'number' ? listing.sqft : null;
          prop.distressTypes = ['reo'];
          prop.sourceUrl = listing.url ? String(listing.url) : null;
          prop.rawData = listing;

          if (prop.address) properties.push(prop);
        }
      } catch (parseErr) {
        errors.push({
          message: `HomePath JSON parse error: ${(parseErr as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // HTML response - parse with cheerio
      const $ = cheerio.load(responseText);

      $('.property-listing, .result-item, [class*="listing"]').each((_, el) => {
        try {
          const card = $(el);
          const prop = emptyScrapedProperty(AGENT_NAME);
          prop.source = 'homepath.fanniemae.com';

          prop.address = card.find('.address, [class*="address"]').first().text().trim();
          prop.city = city;
          prop.state = state.toUpperCase();

          const priceText = card.find('.price, [class*="price"]').first().text().trim();
          prop.listPrice = parsePrice(priceText);

          prop.distressTypes = ['reo'];
          prop.sourceId = `homepath-${prop.address}`.replace(/\s+/g, '-');

          const link = card.find('a').first().attr('href');
          if (link) {
            prop.sourceUrl = link.startsWith('http')
              ? link
              : `https://www.homepath.fanniemae.com${link}`;
          }

          if (prop.address) properties.push(prop);
        } catch {
          // Skip unparseable cards
        }
      });
    }
  } catch (err) {
    errors.push({
      message: `HomePath search failed: ${(err as Error).message}`,
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

// ─── Freddie Mac HomeSteps (REO) ──────────────────────────────────

/**
 * Scrape Freddie Mac HomeSteps for REO properties.
 */
export async function searchHomeSteps(
  city: string,
  state: string,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  try {
    // HomeSteps uses a search page
    const url = `https://www.homesteps.com/listings?state=${encodeURIComponent(state.toUpperCase())}&city=${encodeURIComponent(city)}&page=1`;

    await randomDelay(3000, 5000);
    requestCount++;

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Try JSON-LD or embedded data first
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd);
        const items = Array.isArray(data) ? data : data.itemListElement ?? [];

        for (const item of items) {
          const listing = item.item ?? item;
          if (listing['@type'] === 'Product' || listing['@type'] === 'RealEstateListing') {
            const prop = emptyScrapedProperty(AGENT_NAME);
            prop.source = 'homesteps.com';
            prop.address = String(listing.name ?? listing.address?.streetAddress ?? '');
            prop.city = String(listing.address?.addressLocality ?? city);
            prop.state = state.toUpperCase();
            prop.zip = String(listing.address?.postalCode ?? '');
            prop.listPrice = parsePrice(String(listing.offers?.price ?? ''));
            prop.distressTypes = ['reo'];
            prop.sourceId = `homesteps-${prop.address}`.replace(/\s+/g, '-');
            prop.sourceUrl = listing.url ?? null;

            if (prop.address) properties.push(prop);
          }
        }
      } catch {
        // JSON-LD parse failed, continue to HTML parsing
      }
    }

    // Parse HTML cards
    if (properties.length === 0) {
      $('.listing-card, .property-card, .result-item, [class*="listing"]').each((_, el) => {
        try {
          const card = $(el);
          const prop = emptyScrapedProperty(AGENT_NAME);
          prop.source = 'homesteps.com';

          prop.address = card.find('.address, [class*="address"], h3, h4').first().text().trim();
          prop.city = city;
          prop.state = state.toUpperCase();

          const priceText = card.find('.price, [class*="price"]').first().text().trim();
          prop.listPrice = parsePrice(priceText);

          const detailText = card.text();
          const bedMatch = detailText.match(/(\d+)\s*(?:bed|br|bd)/i);
          const bathMatch = detailText.match(/([\d.]+)\s*(?:bath|ba)/i);
          const sqftMatch = detailText.match(/([\d,]+)\s*(?:sq\s*ft|sqft)/i);

          if (bedMatch) prop.bedrooms = parseInt(bedMatch[1], 10);
          if (bathMatch) prop.bathrooms = parseFloat(bathMatch[1]);
          if (sqftMatch) prop.sqft = parseInt(sqftMatch[1].replace(/,/g, ''), 10);

          prop.distressTypes = ['reo'];
          prop.sourceId = `homesteps-${prop.address}`.replace(/\s+/g, '-');

          const link = card.find('a').first().attr('href');
          if (link) {
            prop.sourceUrl = link.startsWith('http')
              ? link
              : `https://www.homesteps.com${link}`;
          }

          if (prop.address && prop.address.length > 5) {
            properties.push(prop);
          }
        } catch {
          // Skip unparseable cards
        }
      });
    }
  } catch (err) {
    errors.push({
      message: `HomeSteps search failed: ${(err as Error).message}`,
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

// ─── Combined search across all foreclosure sites ──────────────────

/**
 * Run all foreclosure site scrapers in parallel and combine results.
 */
export async function searchAllForeclosureSites(
  city: string,
  state: string,
  type?: DistressType,
): Promise<AgentResult> {
  const start = Date.now();

  const results = await Promise.allSettled([
    searchForeclosureDotCom(city, state, type),
    searchHUDHomes(city, state),
    searchHomePath(city, state),
    searchHomeSteps(city, state),
  ]);

  const combined: AgentResult = {
    agent: AGENT_NAME,
    properties: [],
    errors: [],
    durationMs: 0,
    requestCount: 0,
  };

  for (const result of results) {
    if (result.status === 'fulfilled') {
      combined.properties.push(...result.value.properties);
      combined.errors.push(...result.value.errors);
      combined.requestCount += result.value.requestCount;
    } else {
      combined.errors.push({
        message: `Foreclosure site agent failed: ${result.reason}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  combined.durationMs = Date.now() - start;
  return combined;
}

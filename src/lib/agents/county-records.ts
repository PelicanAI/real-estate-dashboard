// ─── County Records Scraper Agent ──────────────────────────────────
//
// Scrapes county recorder websites for NOD (Notice of Default) and
// Lis Pendens filings. Primary target: Maricopa County, AZ via
// recorder.maricopa.gov
//

import * as cheerio from 'cheerio';
import {
  type ScrapedProperty,
  type AgentResult,
  type AgentError,
  emptyScrapedProperty,
  randomDelay,
  randomUserAgent,
} from './types';

const AGENT_NAME = 'county-records';

// ─── Maricopa County Recorder Configuration ─────────────────────────
//
// recorder.maricopa.gov provides public access to recorded documents.
// The site uses a document search interface at:
//   https://recorder.maricopa.gov/recdocdata/
//
// Search parameters:
//   - Document types: NOD, LP (Lis Pendens), NTS (Notice of Trustee Sale)
//   - Date range filtering
//   - Results returned as HTML tables
//
// Alternative data source:
//   https://recorder.maricopa.gov/edigitalrecords/ (e-recording search)
//
// The treasurer site (treasurer.maricopa.gov) has tax lien data.

interface CountyConfig {
  name: string;
  state: string;
  fips: string;
  recorderUrl: string;
  treasurerUrl: string;
  /** Document type codes used on the recorder site */
  docTypeCodes: Record<string, string>;
  /** Known ZIP codes in this county for city lookups */
  zipCityMap: Record<string, string>;
}

const MARICOPA: CountyConfig = {
  name: 'Maricopa',
  state: 'AZ',
  fips: '04013',
  recorderUrl: 'https://recorder.maricopa.gov',
  treasurerUrl: 'https://treasurer.maricopa.gov',
  docTypeCodes: {
    NOD: 'NOD',
    'NOTICE OF DEFAULT': 'NOD',
    'LIS PENDENS': 'LP',
    LP: 'LP',
    'NOTICE OF TRUSTEE SALE': 'NTS',
    NTS: 'NTS',
    'TRUSTEE DEED': 'TD',
  },
  zipCityMap: {
    '85001': 'Phoenix', '85002': 'Phoenix', '85003': 'Phoenix', '85004': 'Phoenix',
    '85006': 'Phoenix', '85007': 'Phoenix', '85008': 'Phoenix', '85009': 'Phoenix',
    '85012': 'Phoenix', '85013': 'Phoenix', '85014': 'Phoenix', '85015': 'Phoenix',
    '85016': 'Phoenix', '85017': 'Phoenix', '85018': 'Phoenix', '85019': 'Phoenix',
    '85020': 'Phoenix', '85021': 'Phoenix', '85022': 'Phoenix', '85023': 'Phoenix',
    '85024': 'Phoenix', '85027': 'Phoenix', '85028': 'Phoenix', '85029': 'Phoenix',
    '85031': 'Phoenix', '85032': 'Phoenix', '85033': 'Phoenix', '85034': 'Phoenix',
    '85035': 'Phoenix', '85040': 'Phoenix', '85041': 'Phoenix', '85042': 'Phoenix',
    '85043': 'Phoenix', '85044': 'Phoenix', '85045': 'Phoenix', '85048': 'Phoenix',
    '85050': 'Phoenix', '85051': 'Phoenix', '85053': 'Phoenix', '85054': 'Phoenix',
    '85083': 'Phoenix', '85085': 'Phoenix', '85086': 'Phoenix',
    '85201': 'Mesa', '85202': 'Mesa', '85203': 'Mesa', '85204': 'Mesa',
    '85205': 'Mesa', '85206': 'Mesa', '85207': 'Mesa', '85208': 'Mesa',
    '85209': 'Mesa', '85210': 'Mesa', '85212': 'Mesa', '85213': 'Mesa',
    '85215': 'Mesa', '85233': 'Gilbert', '85234': 'Gilbert', '85295': 'Gilbert',
    '85296': 'Gilbert', '85297': 'Gilbert', '85224': 'Chandler', '85225': 'Chandler',
    '85226': 'Chandler', '85248': 'Chandler', '85249': 'Chandler', '85286': 'Chandler',
    '85250': 'Scottsdale', '85251': 'Scottsdale', '85253': 'Scottsdale',
    '85254': 'Scottsdale', '85255': 'Scottsdale', '85256': 'Scottsdale',
    '85257': 'Scottsdale', '85258': 'Scottsdale', '85259': 'Scottsdale',
    '85260': 'Scottsdale', '85262': 'Scottsdale', '85266': 'Scottsdale',
    '85268': 'Scottsdale', '85281': 'Tempe', '85282': 'Tempe', '85283': 'Tempe',
    '85284': 'Tempe', '85301': 'Glendale', '85302': 'Glendale', '85303': 'Glendale',
    '85304': 'Glendale', '85305': 'Glendale', '85306': 'Glendale', '85307': 'Glendale',
    '85308': 'Glendale', '85310': 'Glendale',
    '85338': 'Goodyear', '85340': 'Litchfield Park', '85345': 'Peoria',
    '85351': 'Sun City', '85373': 'Sun City West', '85374': 'Surprise',
    '85375': 'Sun City West', '85379': 'Surprise', '85381': 'Peoria',
    '85382': 'Peoria', '85383': 'Peoria', '85388': 'Surprise',
    '85392': 'Avondale', '85395': 'Goodyear',
    '85142': 'Queen Creek', '85143': 'San Tan Valley',
  },
};

// ─── Public API ────────────────────────────────────────────────────

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/**
 * Search Maricopa County Recorder for NOD and Lis Pendens filings.
 *
 * Targets: recorder.maricopa.gov/recdocdata/
 *
 * The recorder site provides public access to recorded documents including
 * Notices of Default (NOD), Lis Pendens (LP), and Notices of Trustee Sale (NTS).
 *
 * @param county - County name (currently only "maricopa" supported)
 * @param state  - Two-letter state code (currently only "AZ" supported)
 * @param dateRange - Date range to search within (defaults to last 30 days)
 */
export async function searchNODFilings(
  county: string,
  state: string,
  dateRange?: DateRange,
): Promise<AgentResult> {
  const start = Date.now();
  const errors: AgentError[] = [];
  const properties: ScrapedProperty[] = [];
  let requestCount = 0;

  // Validate county support
  const countyLower = county.toLowerCase();
  const stateLower = state.toLowerCase();

  if (countyLower !== 'maricopa' || stateLower !== 'az') {
    errors.push({
      message: `Only Maricopa County, AZ is currently supported. Got: ${county}, ${state}`,
      timestamp: new Date().toISOString(),
    });
    return { agent: AGENT_NAME, properties, errors, durationMs: Date.now() - start, requestCount };
  }

  const config = MARICOPA;
  const now = new Date();
  const range: DateRange = dateRange ?? {
    start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };

  // Search for each document type
  const docTypes = ['NOD', 'LP', 'NTS'];

  for (const docType of docTypes) {
    try {
      await randomDelay(3000, 6000);
      requestCount++;

      // recorder.maricopa.gov/recdocdata/ search
      const searchUrl = buildMaricopaSearchUrl(config, docType, range);
      const html = await fetchPage(searchUrl);
      const parsed = parseMaricopaResults(html, config, docType);
      properties.push(...parsed);

    } catch (err) {
      errors.push({
        message: `Failed to search Maricopa County for "${docType}": ${(err as Error).message}`,
        url: `${config.recorderUrl}/recdocdata/`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Also try the treasurer site for tax lien data
  try {
    await randomDelay(3000, 6000);
    requestCount++;
    const taxLiens = await searchMaricopaTaxLiens(config);
    properties.push(...taxLiens);
  } catch (err) {
    errors.push({
      message: `Failed to search Maricopa County tax liens: ${(err as Error).message}`,
      url: config.treasurerUrl,
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

// ─── Maricopa Recorder Search ────────────────────────────────────────

function buildMaricopaSearchUrl(config: CountyConfig, docType: string, dateRange: DateRange): string {
  // recorder.maricopa.gov uses a search form at /recdocdata/
  // Search parameters include document type and date range
  const params = new URLSearchParams({
    // The recorder site accepts various search parameters
    dT: docType,  // Document Type code
    sD: formatDateForMaricopa(dateRange.start), // Start Date MM/DD/YYYY
    eD: formatDateForMaricopa(dateRange.end),   // End Date MM/DD/YYYY
    pg: '1',
  });

  return `${config.recorderUrl}/recdocdata/GetRecDataSearch.aspx?${params.toString()}`;
}

function formatDateForMaricopa(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${month}/${day}/${year}`;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://recorder.maricopa.gov/',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }

  return res.text();
}

function parseMaricopaResults(
  html: string,
  config: CountyConfig,
  docType: string,
): ScrapedProperty[] {
  const $ = cheerio.load(html);
  const results: ScrapedProperty[] = [];

  // The recorder site renders results in a table or grid
  // Try multiple selectors since the page structure may vary
  const tableSelectors = [
    'table.rgMasterTable tbody tr',       // Telerik RadGrid (common in .gov sites)
    'table#searchResults tbody tr',
    '.search-results table tbody tr',
    'table.gridview tbody tr',
    '#ContentPlaceHolder1_gvResults tr',
    'table tr:has(td)',                     // Generic fallback
  ];

  let rows: ReturnType<typeof $> = $([]) as any;
  for (const sel of tableSelectors) {
    rows = $(sel);
    if (rows.length > 0) break;
  }

  // Also try to find data in JSON embedded in the page (some .gov sites use this)
  if (rows.length === 0) {
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const text = $(script).html() || '';
      try {
        // Look for JSON data arrays
        const jsonMatch = text.match(/\[\s*\{[^]*?"address"[^]*?\}\s*\]/i) ||
                          text.match(/var\s+data\s*=\s*(\[[^]*?\]);/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (Array.isArray(data)) {
            for (const item of data) {
              const prop = mapJsonRecordToProperty(item, config, docType);
              if (prop) results.push(prop);
            }
            return results;
          }
        }
      } catch {
        // Not valid JSON, continue
      }
    }
  }

  rows.each((_, row) => {
    try {
      const $row = $(row);
      const cells = $row.find('td');
      if (cells.length < 3) return; // Skip header/empty rows

      const prop = emptyScrapedProperty(AGENT_NAME);

      // Maricopa recorder typically shows:
      // Recording # | Recording Date | Doc Type | Grantor | Grantee | Legal Description
      // The exact layout depends on the search type

      const recordingNumber = cells.eq(0).text().trim();
      const recordingDate = cells.eq(1).text().trim();
      const documentType = cells.eq(2).text().trim();
      const grantor = cells.length > 3 ? cells.eq(3).text().trim() : '';
      const grantee = cells.length > 4 ? cells.eq(4).text().trim() : '';
      const legalDesc = cells.length > 5 ? cells.eq(5).text().trim() : '';
      const amountText = cells.length > 6 ? cells.eq(6).text().trim() : '';

      if (!recordingNumber && !grantor) return;

      prop.sourceId = recordingNumber || `maricopa-${recordingDate}-${grantor}`.replace(/\s+/g, '-');
      prop.source = AGENT_NAME;
      prop.county = 'Maricopa';
      prop.state = 'AZ';
      prop.ownerName = grantor || null;

      // Map document type to distress type
      prop.distressTypes = mapDocTypeToDistress(documentType || docType);

      // Parse amount as potential default/loan balance
      const amount = parseAmount(amountText);
      if (amount) {
        prop.loanBalance = amount;
      }

      // Try to extract address from legal description or linked page
      const address = extractAddressFromLegal(legalDesc);
      if (address) {
        prop.address = address.street;
        prop.city = address.city || 'Phoenix';
        prop.zip = address.zip || '';
      } else {
        // Use grantor name as identifier if no address available
        prop.address = legalDesc || `Filing by ${grantor}`;
        prop.city = 'Phoenix'; // Default to Phoenix for Maricopa County
      }

      // Build source URL to the actual document
      prop.sourceUrl = recordingNumber
        ? `${config.recorderUrl}/recdocdata/GetRecDataDetail.aspx?rn=${encodeURIComponent(recordingNumber)}`
        : `${config.recorderUrl}/recdocdata/`;

      // Store all raw data for later review
      prop.rawData = {
        recordingNumber,
        recordingDate,
        documentType: documentType || docType,
        grantor,
        grantee,
        legalDescription: legalDesc,
        amountText,
        county: 'Maricopa',
        state: 'AZ',
        source: 'recorder.maricopa.gov',
      };

      results.push(prop);
    } catch {
      // Skip unparseable rows
    }
  });

  return results;
}

// ─── Maricopa Treasurer (Tax Liens) ──────────────────────────────────

async function searchMaricopaTaxLiens(config: CountyConfig): Promise<ScrapedProperty[]> {
  // treasurer.maricopa.gov provides tax lien sale information
  // The site lists properties with delinquent taxes
  try {
    const url = `${config.treasurerUrl}/taxlieninfo/ParcelSearch.aspx`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const results: ScrapedProperty[] = [];

    // The treasurer site may list upcoming tax lien sales
    const rows = $('table tr:has(td)');

    rows.each((_, row) => {
      try {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        const parcel = cells.eq(0).text().trim();
        const address = cells.eq(1).text().trim();
        const amountText = cells.eq(2).text().trim();

        if (!parcel && !address) return;

        const prop = emptyScrapedProperty(AGENT_NAME);
        prop.sourceId = `tax-${parcel}`;
        prop.source = AGENT_NAME;
        prop.county = 'Maricopa';
        prop.state = 'AZ';
        prop.distressTypes = ['Tax Lien'];
        prop.sourceUrl = `${config.treasurerUrl}/taxlieninfo/ParcelDetail.aspx?pn=${encodeURIComponent(parcel)}`;

        const parsedAddr = parseMaricopaAddress(address);
        prop.address = parsedAddr.street;
        prop.city = parsedAddr.city || 'Phoenix';
        prop.zip = parsedAddr.zip || '';

        const amount = parseAmount(amountText);
        if (amount) {
          prop.loanBalance = amount;
        }

        prop.rawData = {
          parcelNumber: parcel,
          rawAddress: address,
          taxAmount: amountText,
          source: 'treasurer.maricopa.gov',
        };

        results.push(prop);
      } catch {
        // Skip unparseable rows
      }
    });

    return results;
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function mapJsonRecordToProperty(
  item: Record<string, unknown>,
  config: CountyConfig,
  docType: string,
): ScrapedProperty | null {
  try {
    const prop = emptyScrapedProperty(AGENT_NAME);
    prop.sourceId = String(item.recordingNumber || item.id || item.docNumber || '');
    prop.county = 'Maricopa';
    prop.state = 'AZ';
    prop.ownerName = String(item.grantor || item.owner || '') || null;
    prop.distressTypes = mapDocTypeToDistress(String(item.documentType || docType));

    const addr = String(item.address || item.propertyAddress || item.situs || '');
    if (addr) {
      const parsed = parseMaricopaAddress(addr);
      prop.address = parsed.street;
      prop.city = parsed.city || 'Phoenix';
      prop.zip = parsed.zip || '';
    }

    prop.rawData = item;
    return prop;
  } catch {
    return null;
  }
}

function parseAmount(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) || num === 0 ? null : num;
}

function mapDocTypeToDistress(docType: string): string[] {
  const upper = docType.toUpperCase();

  if (upper.includes('NOD') || upper.includes('NOTICE OF DEFAULT')) {
    return ['Pre-Foreclosure', 'NOD'];
  }
  if (upper.includes('LIS PENDENS') || upper === 'LP') {
    return ['Pre-Foreclosure', 'Lis Pendens'];
  }
  if (upper.includes('NTS') || upper.includes('NOTICE OF TRUSTEE SALE')) {
    return ['Auction'];
  }
  if (upper.includes('TRUSTEE DEED') || upper === 'TD') {
    return ['REO'];
  }
  if (upper.includes('TAX')) {
    return ['Tax Lien'];
  }

  return ['Pre-Foreclosure'];
}

function extractAddressFromLegal(legalDesc: string): { street: string; city: string; zip: string } | null {
  if (!legalDesc) return null;

  // Pattern: "123 E MAIN ST, PHOENIX, AZ 85001"
  const fullMatch = legalDesc.match(/^(\d+\s+.+?),\s*([A-Z][a-zA-Z\s]+),\s*AZ\s*(\d{5})?/i);
  if (fullMatch) {
    return {
      street: fullMatch[1].trim(),
      city: fullMatch[2].trim(),
      zip: fullMatch[3] || '',
    };
  }

  // Pattern: "123 E MAIN ST PHOENIX AZ 85001"
  const spacedMatch = legalDesc.match(/^(\d+\s+\w+\s+\w+(?:\s+\w+)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+AZ\s*(\d{5})?/i);
  if (spacedMatch) {
    return {
      street: spacedMatch[1].trim(),
      city: spacedMatch[2].trim(),
      zip: spacedMatch[3] || '',
    };
  }

  // Try to find just a ZIP code and look up the city
  const zipMatch = legalDesc.match(/(\d{5})(?:-\d{4})?/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const city = MARICOPA.zipCityMap[zip] || '';
    const beforeZip = legalDesc.slice(0, zipMatch.index).trim();
    return {
      street: beforeZip || legalDesc,
      city,
      zip,
    };
  }

  return null;
}

function parseMaricopaAddress(fullAddress: string): { street: string; city: string; zip: string } {
  if (!fullAddress) return { street: '', city: 'Phoenix', zip: '' };

  // "123 E Main St, Phoenix, AZ 85001"
  const match = fullAddress.match(/^(.+?),\s*(.+?),\s*AZ\s*(\d{5})?/i);
  if (match) {
    return {
      street: match[1].trim(),
      city: match[2].trim(),
      zip: match[3] || '',
    };
  }

  // "123 E Main St Phoenix 85001"
  const zipMatch = fullAddress.match(/(\d{5})(?:-\d{4})?$/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const city = MARICOPA.zipCityMap[zip] || 'Phoenix';
    const street = fullAddress.slice(0, zipMatch.index).trim().replace(/,?\s*(?:Phoenix|Mesa|Tempe|Scottsdale|Chandler|Gilbert|Glendale|Surprise|Peoria|Goodyear|Avondale)\s*,?\s*(?:AZ)?\s*$/i, '').trim();
    return { street, city, zip };
  }

  return { street: fullAddress, city: 'Phoenix', zip: '' };
}

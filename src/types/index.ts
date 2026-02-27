/**
 * Application-level type definitions for the Distressed Property Deal Finder.
 *
 * Database row types are re-exported from the generated Supabase types for
 * convenience so the rest of the codebase never imports from database.types
 * directly.
 */

import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { Database, Tables, TablesInsert, TablesUpdate, Enums, Json };

// ---------------------------------------------------------------------------
// Row aliases (shorthand)
// ---------------------------------------------------------------------------

export type Property = Tables<"properties">;
export type PropertyInsert = TablesInsert<"properties">;
export type PropertyUpdate = TablesUpdate<"properties">;

export type Deal = Tables<"deals">;
export type DealInsert = TablesInsert<"deals">;
export type DealUpdate = TablesUpdate<"deals">;

export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

export type SavedSearch = Tables<"saved_searches">;
export type SavedSearchInsert = TablesInsert<"saved_searches">;
export type SavedSearchUpdate = TablesUpdate<"saved_searches">;

export type ScrapeLog = Tables<"scrape_logs">;
export type ScrapeLogInsert = TablesInsert<"scrape_logs">;
export type ScrapeLogUpdate = TablesUpdate<"scrape_logs">;

export type ActivityLog = Tables<"activity_log">;
export type ActivityLogInsert = TablesInsert<"activity_log">;
export type ActivityLogUpdate = TablesUpdate<"activity_log">;

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type DistressType = Enums<"distress_type">;

export type DealStage = Enums<"deal_stage">;

export type ScrapeStatus = Enums<"scrape_status">;

export type SubscriptionTier = Enums<"subscription_tier">;

export type UserRole = Enums<"user_role">;

// ---------------------------------------------------------------------------
// Composite / joined types
// ---------------------------------------------------------------------------

/** A deal row joined with its associated property row. */
export type DealWithProperty = Deal & {
  property: Property;
};

/** A property with an optional list of deals referencing it. */
export type PropertyWithDeals = Property & {
  deals: Deal[];
};

// ---------------------------------------------------------------------------
// Search & filter types
// ---------------------------------------------------------------------------

export interface SearchParams {
  /** Free-text query (address, city, owner name, etc.) */
  query?: string;

  /** Filter by distress type(s) */
  distressTypes?: DistressType[];

  /** Filter by property type(s) (e.g. "Single Family", "Multi-Family") */
  propertyTypes?: string[];

  /** Geographic filters */
  city?: string;
  state?: string;
  zip?: string;
  county?: string;

  /** Bounding box for map-based searches */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  /** Radius search (miles) from a center point */
  radius?: {
    latitude: number;
    longitude: number;
    miles: number;
  };

  /** Numeric range filters */
  minPrice?: number;
  maxPrice?: number;
  minEquity?: number;
  maxEquity?: number;
  minScore?: number;
  maxScore?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;

  /** Boolean filters */
  isVacant?: boolean;
  hasCodeViolations?: boolean;
  taxDelinquent?: boolean;

  /** Tags filter (AND logic -- property must have all listed tags) */
  tags?: string[];

  /** Data source filter */
  source?: string;

  /** Sorting */
  sortBy?:
    | "score"
    | "estimated_value"
    | "equity_estimate"
    | "profit_estimate"
    | "created_at"
    | "distress_date";
  sortDirection?: "asc" | "desc";

  /** Pagination */
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Analytics / stats types
// ---------------------------------------------------------------------------

export interface DealStats {
  /** Total number of deals across all stages */
  totalDeals: number;

  /** Counts per stage */
  byStage: Record<DealStage, number>;

  /** Financial rollups */
  totalInvested: number;
  totalExpectedProfit: number;
  totalActualProfit: number;
  averageROI: number;

  /** Pipeline value (sum of expected profit for open deals) */
  pipelineValue: number;

  /** Conversion metrics */
  leadToContactRate: number;
  contactToOfferRate: number;
  offerToContractRate: number;
  contractToCloseRate: number;

  /** Time-series data for charting */
  monthlyDeals: Array<{
    month: string; // e.g. "2026-01"
    count: number;
    profit: number;
  }>;

  /** Top-performing markets */
  topMarkets: Array<{
    city: string;
    state: string;
    dealCount: number;
    totalProfit: number;
  }>;
}

// ---------------------------------------------------------------------------
// Scraper types
// ---------------------------------------------------------------------------

export interface ScrapeResult {
  /** Which source was scraped */
  source: string;

  /** Overall status of this scrape run */
  status: ScrapeStatus;

  /** Timing */
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;

  /** Counters */
  recordsFound: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;

  /** Individual property records extracted from the source */
  records: ScrapeRecord[];

  /** Any errors encountered during the run */
  errors: ScrapeError[];
}

export interface ScrapeRecord {
  /** Raw address string as scraped */
  rawAddress: string;

  /** Parsed address components */
  address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;

  /** Distress information */
  distressType: DistressType;
  distressAmount?: number;
  distressDate?: string;
  distressDetails?: Record<string, unknown>;

  /** Owner information */
  ownerName?: string;
  ownerMailingAddress?: string;
  ownerPhone?: string;
  ownerEmail?: string;

  /** Property details the source may provide */
  propertyType?: string;
  estimatedValue?: number;
  assessedValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;

  /** Source-specific identifier for deduplication */
  sourceId?: string;
  sourceUrl?: string;

  /** The complete raw payload from the source */
  rawData?: Record<string, unknown>;
}

export interface ScrapeError {
  message: string;
  code?: string;
  url?: string;
  timestamp: string;
  stack?: string;
}

// ---------------------------------------------------------------------------
// UI types
// ---------------------------------------------------------------------------

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// API response helpers
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

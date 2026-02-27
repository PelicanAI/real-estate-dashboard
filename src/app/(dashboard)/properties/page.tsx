"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PropertyCard, PropertyRow } from "@/components/properties/property-card";
import {
  PropertyFilters,
  type PropertyFilterValues,
} from "@/components/properties/property-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  distress_type: string | null;
  estimated_price: number | null;
  zillow_zestimate: number | null;
  equity_estimate: number | null;
  arv_estimate: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  photos: string[] | null;
  source: string | null;
  created_at: string;
}

const SORT_OPTIONS: { label: string; sortBy: string; sortOrder: string }[] = [
  { label: "Newest", sortBy: "created_at", sortOrder: "desc" },
  { label: "Price: High to Low", sortBy: "estimated_price", sortOrder: "desc" },
  { label: "Price: Low to High", sortBy: "estimated_price", sortOrder: "asc" },
  { label: "Sqft", sortBy: "sqft", sortOrder: "desc" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortIndex, setSortIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const filtersRef = useRef<PropertyFilterValues>({
    city: "",
    distressType: "",
    minPrice: "",
    maxPrice: "",
    minBeds: "",
    addressSearch: "",
  });

  const fetchProperties = useCallback(
    async (filters: PropertyFilterValues, pageNum: number, sort = SORT_OPTIONS[0]) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", "20");
        params.set("sort_by", sort.sortBy);
        params.set("sort_order", sort.sortOrder);

        if (filters.city) params.set("city", filters.city);
        if (filters.distressType) params.set("distress_type", filters.distressType);
        if (filters.minPrice) params.set("min_price", filters.minPrice);
        if (filters.maxPrice) params.set("max_price", filters.maxPrice);
        if (filters.minBeds) params.set("min_beds", filters.minBeds);
        if (filters.addressSearch) params.set("address", filters.addressSearch);

        const res = await fetch(`/api/properties?${params}`);
        const data = await res.json();
        setProperties(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
        setPage(pageNum);

        // Track last updated from first property's created_at
        if (data.data?.[0]?.created_at) {
          setLastUpdated(data.data[0].created_at);
        }
      } catch {
        toast.error("Failed to load properties");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchProperties(filtersRef.current, 1, SORT_OPTIONS[sortIndex]);
  }, [fetchProperties, sortIndex]);

  const handleFilterChange = useCallback(
    (filters: PropertyFilterValues) => {
      filtersRef.current = filters;
      fetchProperties(filters, 1, SORT_OPTIONS[sortIndex]);
    },
    [fetchProperties, sortIndex]
  );

  const handleSortChange = (index: number) => {
    setSortIndex(index);
    fetchProperties(filtersRef.current, 1, SORT_OPTIONS[index]);
  };

  const handlePageChange = (newPage: number) => {
    fetchProperties(filtersRef.current, newPage, SORT_OPTIONS[sortIndex]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, totalCount);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-lg">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono-numbers font-semibold text-foreground">
              {totalCount.toLocaleString()}
            </span>{" "}
            properties
            {lastUpdated && (
              <>
                {" · "}Last updated{" "}
                {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                Sort: {SORT_OPTIONS[sortIndex].label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              {SORT_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  className={cn(
                    "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
                    sortIndex === i && "bg-accent font-medium"
                  )}
                  onClick={() => handleSortChange(i)}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <PropertyFilters onFilterChange={handleFilterChange} />

      {/* Results */}
      {loading ? (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-2"
          }
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border border-border/30",
                viewMode === "grid" ? "space-y-3 p-4" : "flex items-center gap-4 px-4 py-3"
              )}
            >
              <Skeleton className={viewMode === "grid" ? "h-4 w-2/3" : "h-4 w-20"} />
              <Skeleton className={viewMode === "grid" ? "h-3 w-1/2" : "h-4 flex-1"} />
              <Skeleton className={viewMode === "grid" ? "h-5 w-1/3" : "h-4 w-24"} />
              {viewMode === "grid" && <Skeleton className="h-3 w-2/5" />}
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <p className="text-base font-medium text-muted-foreground">No properties found</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Try adjusting your filters
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {properties.map((property) => (
            <PropertyRow key={property.id} property={property} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-mono-numbers text-sm text-muted-foreground">
            {from}–{to} of {totalCount.toLocaleString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

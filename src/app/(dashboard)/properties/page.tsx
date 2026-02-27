"use client";

import { useEffect, useState, useCallback } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { SearchFilters } from "@/components/properties/search-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  photos: string[] | null;
  source: string | null;
  created_at: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const fetchProperties = useCallback(
    async (searchFilters: Record<string, unknown> = {}, pageNum = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", "20");
        Object.entries(searchFilters).forEach(([key, val]) => {
          if (val && (typeof val !== "object" || (Array.isArray(val) && val.length > 0))) {
            if (key === "distressTypes" && Array.isArray(val)) {
              (val as string[]).forEach((t) => params.append("distress_type", t));
            } else if (key === "minPrice") params.set("min_price", String(val));
            else if (key === "maxPrice") params.set("max_price", String(val));
            else if (key === "hasEquity") params.set("has_equity", String(val));
            else params.set(key, String(val));
          }
        });

        const res = await fetch(`/api/properties?${params}`);
        const data = await res.json();
        setProperties(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.count || 0);
        setPage(pageNum);
      } catch {
        toast.error("Failed to load properties");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearch = (searchFilters: Record<string, unknown>) => {
    setFilters(searchFilters);
    fetchProperties(searchFilters, 1);
  };

  const handleAddToPipeline = async (propertyId: string) => {
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Added to deal pipeline");
    } catch {
      toast.error("Failed to create deal");
    }
  };

  const handleManualAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Property added");
      setAddDialogOpen(false);
      fetchProperties(filters, page);
    } catch {
      toast.error("Failed to add property");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-lg">Properties</h1>
          <p className="mt-1 text-xs font-light text-muted-foreground">
            {totalCount} distressed properties found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property Manually</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" required placeholder="123 Main St" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input name="city" required placeholder="Phoenix" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input name="state" required placeholder="AZ" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input name="zip" placeholder="85001" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Distress Type</Label>
                    <Select name="distress_type">
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Pre-Foreclosure", "NOD", "Lis Pendens", "Auction",
                          "REO", "Tax Lien", "Probate", "Vacant", "Code Violation",
                        ].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Price</Label>
                    <Input name="estimated_price" type="number" placeholder="250000" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Beds</Label>
                    <Input name="bedrooms" type="number" placeholder="3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Baths</Label>
                    <Input name="bathrooms" type="number" step="0.5" placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sqft</Label>
                    <Input name="sqft" type="number" placeholder="1500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input name="owner_name" placeholder="John Doe" />
                </div>
                <Button type="submit" className="w-full">Add Property</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SearchFilters onSearch={handleSearch} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border/50 p-4">
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <p className="text-lg font-medium text-muted-foreground">No properties found</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Try adjusting your search filters or add properties manually
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-3"
          }
        >
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onAddToPipeline={handleAddToPipeline}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => fetchProperties(filters, page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => fetchProperties(filters, page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";

const DISTRESS_TYPES = [
  "Pre-Foreclosure",
  "NOD",
  "Lis Pendens",
  "Auction",
  "REO",
  "Tax Lien",
  "Probate",
  "Vacant",
  "Code Violation",
] as const;

interface SearchFiltersProps {
  onSearch: (filters: {
    city: string;
    state: string;
    zip: string;
    distressTypes: string[];
    minPrice: string;
    maxPrice: string;
    hasEquity: boolean;
  }) => void;
}

export function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [city, setCity] = useState("Phoenix");
  const [state, setState] = useState("AZ");
  const [zip, setZip] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [hasEquity, setHasEquity] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSearch = () => {
    onSearch({ city, state, zip, distressTypes: selectedTypes, minPrice, maxPrice, hasEquity });
  };

  const clearFilters = () => {
    setCity("");
    setState("");
    setZip("");
    setSelectedTypes([]);
    setMinPrice("");
    setMaxPrice("");
    setHasEquity(false);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-2">
          <div className="flex-1">
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="w-20">
            <Input
              placeholder="State"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
            />
          </div>
          <div className="w-28">
            <Input
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border/50 pt-4">
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">
              Distress Type
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {DISTRESS_TYPES.map((type) => (
                <Badge
                  key={type}
                  variant={selectedTypes.includes(type) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min Price</Label>
              <Input
                type="number"
                placeholder="$0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Max Price</Label>
              <Input
                type="number"
                placeholder="No max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-32"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasEquity}
                onChange={(e) => setHasEquity(e.target.checked)}
                className="rounded border-border"
              />
              Has Equity
            </label>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

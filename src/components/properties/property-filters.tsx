"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

const CITIES = [
  "Phoenix",
  "Scottsdale",
  "Mesa",
  "Tempe",
  "Chandler",
  "Gilbert",
  "Glendale",
  "Peoria",
  "Surprise",
  "Goodyear",
] as const;

const PRICE_RANGES = [
  { label: "Any Price", min: "", max: "" },
  { label: "Under $200K", min: "", max: "200000" },
  { label: "$200K – $500K", min: "200000", max: "500000" },
  { label: "$500K – $1M", min: "500000", max: "1000000" },
  { label: "$1M+", min: "1000000", max: "" },
] as const;

const BED_OPTIONS = [
  { label: "Any Beds", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
] as const;

export interface PropertyFilterValues {
  city: string;
  distressType: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  addressSearch: string;
}

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilterValues) => void;
}

export function PropertyFilters({ onFilterChange }: PropertyFiltersProps) {
  const [city, setCity] = useState("");
  const [distressType, setDistressType] = useState("");
  const [priceRange, setPriceRange] = useState(0);
  const [minBeds, setMinBeds] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Debounce address search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAddress(addressSearch), 300);
    return () => clearTimeout(timer);
  }, [addressSearch]);

  // Emit filter changes
  useEffect(() => {
    const range = PRICE_RANGES[priceRange];
    onFilterChange({
      city,
      distressType,
      minPrice: range.min,
      maxPrice: range.max,
      minBeds,
      addressSearch: debouncedAddress,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, distressType, priceRange, minBeds, debouncedAddress]);

  const activeCount =
    (city ? 1 : 0) +
    (distressType ? 1 : 0) +
    (priceRange > 0 ? 1 : 0) +
    (minBeds ? 1 : 0) +
    (addressSearch ? 1 : 0);

  const clearAll = () => {
    setCity("");
    setDistressType("");
    setPriceRange(0);
    setMinBeds("");
    setAddressSearch("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* City filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-xs",
              city && "border-taupe/50 bg-taupe/5 text-foreground"
            )}
          >
            {city || "All Cities"}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          <button
            className={cn(
              "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
              !city && "bg-accent font-medium"
            )}
            onClick={() => setCity("")}
          >
            All Cities
          </button>
          {CITIES.map((c) => (
            <button
              key={c}
              className={cn(
                "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
                city === c && "bg-accent font-medium"
              )}
              onClick={() => setCity(c)}
            >
              {c}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Distress type filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-xs",
              distressType && "border-taupe/50 bg-taupe/5 text-foreground"
            )}
          >
            {distressType || "All Types"}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <button
            className={cn(
              "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
              !distressType && "bg-accent font-medium"
            )}
            onClick={() => setDistressType("")}
          >
            All Types
          </button>
          {DISTRESS_TYPES.map((t) => (
            <button
              key={t}
              className={cn(
                "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
                distressType === t && "bg-accent font-medium"
              )}
              onClick={() => setDistressType(t)}
            >
              {t}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Price range filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-xs",
              priceRange > 0 && "border-taupe/50 bg-taupe/5 text-foreground"
            )}
          >
            {PRICE_RANGES[priceRange].label}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {PRICE_RANGES.map((range, i) => (
            <button
              key={range.label}
              className={cn(
                "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
                priceRange === i && "bg-accent font-medium"
              )}
              onClick={() => setPriceRange(i)}
            >
              {range.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Beds filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 gap-1.5 text-xs",
              minBeds && "border-taupe/50 bg-taupe/5 text-foreground"
            )}
          >
            {minBeds ? `${minBeds}+ Beds` : "Beds"}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1" align="start">
          {BED_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={cn(
                "w-full rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent",
                minBeds === opt.value && "bg-accent font-medium"
              )}
              onClick={() => setMinBeds(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Address search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Search address...  /"
          value={addressSearch}
          onChange={(e) => setAddressSearch(e.target.value)}
          className="h-9 w-52 pl-8 text-xs"
        />
      </div>

      {/* Active filter count + clear */}
      {activeCount > 0 && (
        <>
          <Badge variant="secondary" className="h-6 px-2 text-[10px]">
            {activeCount} active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </>
      )}
    </div>
  );
}

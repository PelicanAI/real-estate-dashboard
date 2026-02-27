"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  distress_type: string | null;
  estimated_price: number | null;
  zillow_zestimate: number | null;
  equity_estimate: number | null;
  arv_estimate?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  photos: string[] | null;
  source: string | null;
  created_at: string;
}

const distressBorderColors: Record<string, string> = {
  "Pre-Foreclosure": "border-l-amber-500",
  NOD: "border-l-red-500",
  "Lis Pendens": "border-l-red-500",
  Auction: "border-l-purple-500",
  REO: "border-l-blue-500",
  "Tax Lien": "border-l-orange-500",
  Probate: "border-l-slate-500",
  Vacant: "border-l-cyan-500",
  "Code Violation": "border-l-rose-500",
};

const distressBadgeColors: Record<string, string> = {
  "Pre-Foreclosure": "bg-amber-500/10 text-amber-400",
  NOD: "bg-red-500/10 text-red-400",
  "Lis Pendens": "bg-red-500/10 text-red-400",
  Auction: "bg-purple-500/10 text-purple-400",
  REO: "bg-blue-500/10 text-blue-400",
  "Tax Lien": "bg-orange-500/10 text-orange-400",
  Probate: "bg-slate-500/10 text-slate-400",
  Vacant: "bg-cyan-500/10 text-cyan-400",
  "Code Violation": "bg-rose-500/10 text-rose-400",
};

function formatPrice(price: number | null) {
  if (!price) return "—";
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (price >= 1_000) {
    return `$${Math.round(price / 1_000)}K`;
  }
  return `$${price.toLocaleString()}`;
}

function formatPriceFull(price: number | null) {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export function PropertyCard({ property }: { property: Property }) {
  const borderColor = property.distress_type
    ? distressBorderColors[property.distress_type] || "border-l-border"
    : "border-l-border";

  const badgeColor = property.distress_type
    ? distressBadgeColors[property.distress_type] || "bg-accent text-foreground"
    : "";

  const specs = [
    property.bedrooms ? `${property.bedrooms} bd` : null,
    property.bathrooms ? `${property.bathrooms} ba` : null,
    property.sqft ? `${property.sqft.toLocaleString()} sqft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const financials = [
    property.arv_estimate ? `ARV: ${formatPrice(property.arv_estimate)}` : null,
    property.equity_estimate && property.equity_estimate > 0
      ? `Equity: ${formatPrice(property.equity_estimate)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/properties/${property.id}`}>
      <Card
        className={`group border-l-[3px] ${borderColor} cursor-pointer border-border/30 transition-all hover:border-border/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 h-full`}
      >
        <CardContent className="p-4">
          {/* Top row: badge + price */}
          <div className="flex items-start justify-between gap-2">
            {property.distress_type && (
              <Badge className={`text-[10px] font-medium ${badgeColor}`}>
                {property.distress_type}
              </Badge>
            )}
            <span className="font-mono-numbers text-base font-semibold text-taupe-light ml-auto">
              {formatPriceFull(property.estimated_price)}
            </span>
          </div>

          {/* Address */}
          <h3 className="mt-3 text-sm font-medium leading-tight text-foreground group-hover:text-white">
            {property.address}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {property.city}, {property.state} {property.zip}
          </p>

          {/* Specs */}
          {specs && (
            <p className="mt-3 text-xs text-muted-foreground">{specs}</p>
          )}

          {/* Financials */}
          {financials && (
            <p className="mt-1.5 text-xs font-medium text-emerald-400">
              {financials}
            </p>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>{property.source ? `Source: ${property.source}` : ""}</span>
            <span>{timeAgo(property.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Compact list row variant */
export function PropertyRow({ property }: { property: Property }) {
  const badgeColor = property.distress_type
    ? distressBadgeColors[property.distress_type] || "bg-accent text-foreground"
    : "";

  const specs = [
    property.bedrooms ? `${property.bedrooms}bd` : null,
    property.bathrooms ? `${property.bathrooms}ba` : null,
    property.sqft ? `${property.sqft.toLocaleString()}sqft` : null,
  ]
    .filter(Boolean)
    .join("/");

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="group flex items-center gap-4 rounded-md border border-border/30 px-4 py-2.5 transition-all hover:border-border/60 hover:bg-card cursor-pointer">
        {property.distress_type && (
          <Badge className={`text-[10px] font-medium shrink-0 ${badgeColor}`}>
            {property.distress_type}
          </Badge>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-white">
          {property.address}, {property.city}, {property.state}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{specs}</span>
        <span className="shrink-0 font-mono-numbers text-sm font-semibold text-taupe-light">
          {formatPriceFull(property.estimated_price)}
        </span>
        {property.arv_estimate ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            ARV: {formatPrice(property.arv_estimate)}
          </span>
        ) : null}
        <span className="shrink-0 text-[10px] text-muted-foreground/60">
          {timeAgo(property.created_at)}
        </span>
      </div>
    </Link>
  );
}

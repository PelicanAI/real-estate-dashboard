"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

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

const distressColors: Record<string, string> = {
  "Pre-Foreclosure": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  NOD: "bg-red-500/10 text-red-400 border-red-500/20",
  "Lis Pendens": "bg-red-500/10 text-red-400 border-red-500/20",
  Auction: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  REO: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Tax Lien": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Probate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Vacant: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Code Violation": "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function formatPrice(price: number | null) {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function PropertyCard({ property }: { property: Property }) {
  const photoUrl = property.photos?.[0];

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="group overflow-hidden border-border/30 transition-colors hover:border-taupe/30 cursor-pointer h-full">
        <div className="relative h-44 bg-accent">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={property.address}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          {property.distress_type && (
            <Badge
              className={`absolute left-2 top-2 border ${
                distressColors[property.distress_type] || "bg-accent text-foreground"
              }`}
            >
              {property.distress_type}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium leading-tight group-hover:text-taupe transition-colors">
            {property.address}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground font-light">
            <MapPin className="h-3 w-3" />
            {property.city}, {property.state} {property.zip}
          </div>

          <div className="mt-3">
            <span className="font-mono-numbers text-lg font-semibold text-foreground">
              {formatPrice(property.estimated_price)}
            </span>
          </div>

          {property.equity_estimate && property.equity_estimate > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-400">
              <DollarSign className="h-3 w-3" />
              {formatPrice(property.equity_estimate)} est. equity
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground font-light">
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="h-3 w-3" /> {property.bedrooms} bd
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" /> {property.bathrooms} ba
              </span>
            )}
            {property.sqft && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> {property.sqft.toLocaleString()} sqft
              </span>
            )}
          </div>

          {property.source && (
            <p className="mt-3 text-[10px] text-muted-foreground/50 font-light">
              Source: {property.source}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

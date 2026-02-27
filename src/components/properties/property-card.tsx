"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  DollarSign,
  Plus,
  ExternalLink,
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
  "Pre-Foreclosure": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  NOD: "bg-red-500/15 text-red-400 border-red-500/20",
  "Lis Pendens": "bg-red-500/15 text-red-400 border-red-500/20",
  Auction: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  REO: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Tax Lien": "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Probate: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  Vacant: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "Code Violation": "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

function formatPrice(price: number | null) {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function PropertyCard({
  property,
  onAddToPipeline,
}: {
  property: Property;
  onAddToPipeline: (id: string) => void;
}) {
  const photoUrl = property.photos?.[0];

  return (
    <Card className="group overflow-hidden border-border/50 transition-colors hover:border-border">
      <div className="relative h-40 bg-accent">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={property.address}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {property.distress_type && (
          <Badge
            className={`absolute left-2 top-2 border text-[10px] ${
              distressColors[property.distress_type] || "bg-accent text-foreground"
            }`}
          >
            {property.distress_type}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <Link href={`/properties/${property.id}`} className="group/link">
          <h3 className="font-semibold leading-tight group-hover/link:text-primary transition-colors">
            {property.address}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {property.city}, {property.state} {property.zip}
        </div>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-mono-numbers text-lg font-bold text-primary">
            {formatPrice(property.estimated_price)}
          </span>
          {property.zillow_zestimate && (
            <span className="text-xs text-muted-foreground">
              Zestimate: {formatPrice(property.zillow_zestimate)}
            </span>
          )}
        </div>

        {property.equity_estimate && property.equity_estimate > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-400">
            <DollarSign className="h-3 w-3" />
            {formatPrice(property.equity_estimate)} est. equity
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
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

        <div className="mt-4 flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAddToPipeline(property.id)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add to Pipeline
          </Button>
          <Link href={`/properties/${property.id}`}>
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {property.source && (
          <p className="mt-2 text-[10px] text-muted-foreground/60">
            Source: {property.source}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

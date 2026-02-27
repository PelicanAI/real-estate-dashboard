"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Calendar,
  User,
  Phone,
  Mail,
  Home,
  RefreshCw,
  ExternalLink,
  Bookmark,
  Loader2,
} from "lucide-react";
import Link from "next/link";

function fmt(val: number | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then((r) => r.json())
      .then((d) => setProperty(d.data || d))
      .catch(() => toast.error("Failed to load property"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch(`/api/properties/${id}/enrich`, { method: "POST" });
      const data = await res.json();
      if (data.data) setProperty(data.data);
      const fields = data.enrichedFields as string[] | undefined;
      if (fields && fields.length > 0) {
        toast.success(`Enriched: ${fields.join(", ")}`);
      } else {
        toast.info("No new data found from ATTOM");
      }
      if (data.errors?.length) {
        toast.warning(`Some endpoints failed: ${data.errors.join(", ")}`);
      }
    } catch {
      toast.error("Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
    toast.success(saved ? "Removed from saved" : "Saved for later");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Property not found</p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = property as any;

  const zillowUrl = (p.zillow_url as string) || (p.source_url as string);

  // Check if financial details have any data
  const hasFinancialData =
    p.default_amount || p.loan_balance || p.recording_date || p.auction_date;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-heading text-lg">{p.address as string}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {p.city as string}, {p.state as string} {p.zip as string}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={saved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
          >
            <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching}>
            {enriching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {p.owner_name || p.arv_estimate ? "Re-Enrich" : "Enrich Data"}
          </Button>
          {zillowUrl && (
            <a href={zillowUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open on Zillow
              </Button>
            </a>
          )}
        </div>
      </div>

      {p.distress_type ? (
        <Badge variant="secondary" className="text-sm">
          {p.distress_type as string}
        </Badge>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Est. Price</p>
                  <p className="font-mono-numbers text-lg font-bold text-taupe-light">
                    {fmt(p.estimated_price as number)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assessed Value</p>
                  <p className="font-mono-numbers text-lg font-bold">
                    {fmt(p.assessed_value as number)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ARV</p>
                  <p className="font-mono-numbers text-lg font-bold">
                    {fmt(p.arv_estimate as number)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Est. Equity</p>
                  <p className="font-mono-numbers text-lg font-bold text-emerald-400">
                    {fmt(p.equity_estimate as number)}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {p.bedrooms && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    {p.bedrooms as number} Bedrooms
                  </div>
                )}
                {p.bathrooms && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    {p.bathrooms as number} Bathrooms
                  </div>
                )}
                {p.sqft && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    {(p.sqft as number).toLocaleString()} sqft
                  </div>
                )}
                {p.year_built && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Built {p.year_built as number}
                  </div>
                )}
              </div>

              {p.lot_size && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Lot: {p.lot_size as string}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Financial Details — only show if data exists */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              {hasFinancialData ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Default Amount</p>
                    <p className="font-mono-numbers font-medium">
                      {fmt(p.default_amount as number)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Loan Balance</p>
                    <p className="font-mono-numbers font-medium">
                      {fmt(p.loan_balance as number)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Recording Date</p>
                    <p className="text-sm">
                      {(p.recording_date as string) || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Auction Date</p>
                    <p className="text-sm">
                      {(p.auction_date as string) || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Financial details will appear after enrichment.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Owner Information */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Owner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.owner_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {p.owner_name as string}
                </div>
              )}
              {p.owner_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {p.owner_phone as string}
                </div>
              )}
              {p.owner_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {p.owner_email as string}
                </div>
              )}
              {p.owner_mailing_address && (
                <div className="flex items-center gap-2 text-sm">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  {p.owner_mailing_address as string}
                </div>
              )}
              {!p.owner_name && !p.owner_phone && !p.owner_email && (
                <p className="text-sm text-muted-foreground">
                  No owner info available. Try enriching.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.zillow_url && (
                <a
                  href={p.zillow_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-taupe hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on Zillow
                </a>
              )}
              {p.source_url && (
                <a
                  href={p.source_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-taupe hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Original Source
                </a>
              )}
              {p.source && (
                <p className="text-xs text-muted-foreground">
                  Source: {p.source as string}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

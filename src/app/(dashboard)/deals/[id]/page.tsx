"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  MapPin,
  DollarSign,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const STAGES = [
  "Lead", "Contacted", "Offer Sent", "Under Contract",
  "Closed - Acquired", "Rehab", "Listed", "Sold",
];

function fmt(val: number | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Record<string, unknown> | null>(null);
  const [activities, setActivities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [stage, setStage] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [acceptedPrice, setAcceptedPrice] = useState("");
  const [rehabCost, setRehabCost] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [cashBuyer, setCashBuyer] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/deals/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const d = data.data || data;
        setDeal(d);
        setStage((d.stage as string) || "Lead");
        setOfferPrice(d.offer_price ? String(d.offer_price) : "");
        setAcceptedPrice(d.accepted_price ? String(d.accepted_price) : "");
        setRehabCost(d.rehab_cost ? String(d.rehab_cost) : "");
        setListPrice(d.list_price ? String(d.list_price) : "");
        setSoldPrice(d.sold_price ? String(d.sold_price) : "");
        setCashBuyer((d.cash_buyer_company as string) || "");
        setNotes((d.notes as string) || "");
        setActivities(d.activities || []);
      })
      .catch(() => toast.error("Failed to load deal"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { stage, notes, cash_buyer_company: cashBuyer };
      if (offerPrice) body.offer_price = Number(offerPrice);
      if (acceptedPrice) body.accepted_price = Number(acceptedPrice);
      if (rehabCost) body.rehab_cost = Number(rehabCost);
      if (listPrice) body.list_price = Number(listPrice);
      if (soldPrice) body.sold_price = Number(soldPrice);

      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDeal(updated.data || updated);
      toast.success("Deal updated");
    } catch {
      toast.error("Failed to update deal");
    } finally {
      setSaving(false);
    }
  };

  const acqCommission = acceptedPrice ? Number(acceptedPrice) * 0.03 : 0;
  const listCommission = soldPrice ? Number(soldPrice) * 0.01 : 0;
  const totalCommission = acqCommission + listCommission;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const property = deal.property as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/deals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {(property?.address as string) || "Deal Details"}
            </h1>
            {property && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {property.city as string}, {property.state as string}
              </div>
            )}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cash Buyer Company</Label>
                  <Input
                    value={cashBuyer}
                    onChange={(e) => setCashBuyer(e.target.value)}
                    placeholder="Buyer company name"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Offer Price</Label>
                  <Input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accepted Price</Label>
                  <Input
                    type="number"
                    value={acceptedPrice}
                    onChange={(e) => setAcceptedPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rehab Cost</Label>
                  <Input
                    type="number"
                    value={rehabCost}
                    onChange={(e) => setRehabCost(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>List Price</Label>
                  <Input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sold Price</Label>
                  <Input
                    type="number"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Deal notes..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm">{a.action as string}</p>
                        {a.details ? (
                          <p className="text-xs text-muted-foreground">
                            {JSON.stringify(a.details)}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {a.created_at
                          ? formatDistanceToNow(new Date(a.created_at as string), {
                              addSuffix: true,
                            })
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-emerald-400">
                <DollarSign className="h-4 w-4" />
                Commission Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Acquisition (3%)
                </span>
                <span className="font-mono-numbers font-semibold text-emerald-400">
                  {fmt(acqCommission || null)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Listing (1%)
                </span>
                <span className="font-mono-numbers font-semibold text-emerald-400">
                  {fmt(listCommission || null)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="font-mono-numbers text-xl font-bold text-emerald-400">
                  {fmt(totalCommission || null)}
                </span>
              </div>
            </CardContent>
          </Card>

          {property && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Property Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{property.address as string}</p>
                <p className="text-muted-foreground">
                  {property.city as string}, {property.state as string}{" "}
                  {property.zip as string}
                </p>
                {property.distress_type ? (
                  <Badge variant="outline">{property.distress_type as string}</Badge>
                ) : null}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">Estimated Price</p>
                  <p className="font-mono-numbers font-semibold">
                    {fmt(property.estimated_price as number)}
                  </p>
                </div>
                <Link
                  href={`/properties/${property.id}`}
                  className="inline-block pt-2 text-xs text-primary hover:underline"
                >
                  View full property details
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "Created", key: "created_at" },
                { label: "Contacted", key: "contacted_at" },
                { label: "Offer Sent", key: "offer_sent_at" },
                { label: "Under Contract", key: "under_contract_at" },
                { label: "Closed", key: "closed_at" },
                { label: "Listed", key: "listed_at" },
                { label: "Sold", key: "sold_at" },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono-numbers text-xs">
                    {deal[key]
                      ? new Date(deal[key] as string).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

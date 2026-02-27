"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CalendarClock,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  MapPin,
  Bed,
  Bath,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface OverviewStats {
  totalProperties: number;
  newThisWeek: number;
  activeJobs: number;
  lastScrape: string | null;
}

interface RecentProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  estimated_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  distress_type: string | null;
}

interface ScrapeLog {
  id: string;
  source: string;
  status: string;
  properties_found: number | null;
  new_properties: number | null;
  error_message: string | null;
  duration_ms: number | null;
  started_at: string;
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

function fmt(val: number | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);

  useEffect(() => {
    // Fetch total properties count
    fetch("/api/properties?limit=1")
      .then((r) => r.json())
      .then((data) => {
        setStats((prev) => ({
          totalProperties: data.count || 0,
          newThisWeek: prev?.newThisWeek ?? 0,
          activeJobs: prev?.activeJobs ?? 0,
          lastScrape: prev?.lastScrape ?? null,
        }));
      })
      .catch(console.error);

    // Fetch recent 6 properties
    fetch("/api/properties?limit=6&sort_by=created_at&sort_order=desc")
      .then((r) => r.json())
      .then((data) => setRecentProperties(data.data || []))
      .catch(console.error);

    // Fetch scrape logs
    fetch("/api/scrape/logs")
      .then((r) => r.json())
      .then((data) => {
        const items = data.data || [];
        setLogs(items.slice(0, 5));
        if (items.length > 0) {
          setStats((prev) => ({
            totalProperties: prev?.totalProperties ?? 0,
            newThisWeek: prev?.newThisWeek ?? 0,
            activeJobs: prev?.activeJobs ?? 0,
            lastScrape: items[0].started_at,
          }));
        }
      })
      .catch(console.error);

    // Fetch active saved searches count
    fetch("/api/search/saved")
      .then((r) => r.json())
      .then((data) => {
        const items = data.data || [];
        const activeCount = items.filter((s: { is_active: boolean }) => s.is_active).length;
        // Count new this week from properties created in the last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStats((prev) => ({
          totalProperties: prev?.totalProperties ?? 0,
          newThisWeek: prev?.newThisWeek ?? 0,
          activeJobs: activeCount,
          lastScrape: prev?.lastScrape ?? null,
        }));
      })
      .catch(console.error);

    // Fetch properties from last 7 days for "New This Week"
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    fetch(`/api/properties?limit=1&created_after=${weekAgo.toISOString()}`)
      .then((r) => r.json())
      .then((data) => {
        setStats((prev) => ({
          totalProperties: prev?.totalProperties ?? 0,
          newThisWeek: data.count || 0,
          activeJobs: prev?.activeJobs ?? 0,
          lastScrape: prev?.lastScrape ?? null,
        }));
      })
      .catch(console.error);
  }, []);

  const statCards = [
    {
      label: "Total Properties",
      value: stats?.totalProperties?.toLocaleString() ?? "—",
      icon: Building2,
    },
    {
      label: "New This Week",
      value: stats?.newThisWeek?.toLocaleString() ?? "—",
      icon: CalendarClock,
    },
    {
      label: "Active Scrape Jobs",
      value: stats?.activeJobs?.toLocaleString() ?? "—",
      icon: Zap,
    },
    {
      label: "Last Scrape",
      value: stats?.lastScrape
        ? formatDistanceToNow(new Date(stats.lastScrape), { addSuffix: true })
        : "—",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading text-lg">Overview</h1>
        <p className="mt-1 text-xs font-light text-muted-foreground">
          Phoenix, AZ / Maricopa County — Distressed property finder
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <stat.icon className="h-5 w-5 text-taupe-light" />
              </div>
              <div>
                <p className="text-xs font-light text-muted-foreground">{stat.label}</p>
                <p className="font-mono-numbers text-lg font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Properties</h2>
          <Link
            href="/properties"
            className="text-xs text-taupe hover:underline"
          >
            View all
          </Link>
        </div>
        {recentProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentProperties.map((p) => (
              <Link key={p.id} href={`/properties/${p.id}`}>
                <Card className="border-border/30 transition-colors hover:border-taupe/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-tight">
                        {p.address}
                      </h3>
                      {p.distress_type && (
                        <Badge
                          className={`shrink-0 border text-[10px] ${
                            distressColors[p.distress_type] || "bg-accent text-foreground"
                          }`}
                        >
                          {p.distress_type}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {p.city}, {p.state} {p.zip}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono-numbers text-base font-semibold">
                        {fmt(p.estimated_price)}
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {p.bedrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bed className="h-3 w-3" /> {p.bedrooms}
                          </span>
                        )}
                        {p.bathrooms && (
                          <span className="flex items-center gap-0.5">
                            <Bath className="h-3 w-3" /> {p.bathrooms}
                          </span>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Scrape Activity</h2>
            <Link
              href="/searches"
              className="text-xs text-taupe hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-border/30 px-4 py-2 text-sm"
              >
                {log.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : log.status === "failed" ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                )}
                <span className="font-medium">{log.source}</span>
                <span className="text-muted-foreground">
                  {log.properties_found ?? 0} found, {log.new_properties ?? 0} new
                </span>
                {log.duration_ms && (
                  <span className="font-mono-numbers text-xs text-muted-foreground">
                    {((log.duration_ms ?? 0) / 1000).toFixed(1)}s
                  </span>
                )}
                {log.error_message && (
                  <span className="text-xs text-destructive">{log.error_message}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

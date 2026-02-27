"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CalendarClock,
  Zap,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PropertyCard, type Property } from "@/components/properties/property-card";
import { toast } from "sonner";

interface OverviewStats {
  totalProperties: number;
  newThisWeek: number;
  activeJobs: number;
  citiesCovered: number;
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

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    totalProperties: 0,
    newThisWeek: 0,
    activeJobs: 0,
    citiesCovered: 0,
  });
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    // Total properties
    fetch("/api/properties?limit=1")
      .then((r) => r.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, totalProperties: data.count || 0 }))
      )
      .catch(console.error);

    // Recent 8 properties
    fetch("/api/properties?limit=8&sort_by=created_at&sort_order=desc")
      .then((r) => r.json())
      .then((data) => setRecentProperties(data.data || []))
      .catch(console.error);

    // Scrape logs
    fetch("/api/scrape/logs")
      .then((r) => r.json())
      .then((data) => setLogs((data.data || []).slice(0, 5)))
      .catch(console.error);

    // Active saved searches count
    fetch("/api/search/saved")
      .then((r) => r.json())
      .then((data) => {
        const items = data.data || [];
        const activeCount = items.filter(
          (s: { is_active: boolean }) => s.is_active
        ).length;
        setStats((prev) => ({ ...prev, activeJobs: activeCount }));
      })
      .catch(console.error);

    // Distinct cities count (grab a larger set and count unique)
    fetch("/api/properties?limit=1000&sort_by=created_at&sort_order=desc")
      .then((r) => r.json())
      .then((data) => {
        const cities = new Set(
          (data.data || []).map((p: { city: string }) => p.city)
        );
        setStats((prev) => ({ ...prev, citiesCovered: cities.size }));
      })
      .catch(console.error);

    // New this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    fetch(`/api/properties?limit=1&created_after=${weekAgo.toISOString()}`)
      .then((r) => r.json())
      .then((data) =>
        setStats((prev) => ({ ...prev, newThisWeek: data.count || 0 }))
      )
      .catch(console.error);
  }, []);

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const res = await fetch("/api/search/saved");
      const data = await res.json();
      const active = (data.data || []).filter(
        (s: { is_active: boolean }) => s.is_active
      );
      for (const search of active) {
        await fetch("/api/scrape/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved_search_id: search.id }),
        });
      }
      toast.success(`Triggered ${active.length} scrape jobs`);
      // Refresh logs
      const logsRes = await fetch("/api/scrape/logs");
      const logsData = await logsRes.json();
      setLogs((logsData.data || []).slice(0, 5));
    } catch {
      toast.error("Failed to run scrapes");
    } finally {
      setRunningAll(false);
    }
  };

  const statCards = [
    {
      label: "Total Properties",
      value: stats.totalProperties.toLocaleString(),
      icon: Building2,
    },
    {
      label: "New This Week",
      value: stats.newThisWeek.toLocaleString(),
      icon: CalendarClock,
    },
    {
      label: "Active Scrape Jobs",
      value: stats.activeJobs.toLocaleString(),
      icon: Zap,
    },
    {
      label: "Cities Covered",
      value: stats.citiesCovered.toLocaleString(),
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-lg">Overview</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Phoenix, AZ / Maricopa County — Distressed property finder
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAll}
            disabled={runningAll}
          >
            {runningAll ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-2 h-3.5 w-3.5" />
            )}
            Run All Scrapes
          </Button>
          <Link href="/properties">
            <Button size="sm">View All Properties</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <stat.icon className="h-5 w-5 text-taupe-light" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-mono-numbers text-xl font-semibold">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Properties */}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentProperties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Scrape Activity */}
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
                className="flex items-center gap-3 rounded-md border border-border/30 px-4 py-2.5 text-sm"
              >
                {log.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : log.status === "failed" ? (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
                )}
                <span className="font-medium">{log.source}</span>
                <span className="text-muted-foreground">
                  {log.properties_found ?? 0} found, {log.new_properties ?? 0}{" "}
                  new
                </span>
                {log.duration_ms != null && (
                  <span className="font-mono-numbers text-xs text-muted-foreground">
                    {(log.duration_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {log.error_message && (
                  <span className="text-xs text-destructive">
                    {log.error_message}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.started_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PipelineMini } from "@/components/dashboard/pipeline-mini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";

interface DealStats {
  totalLeads: number;
  pipelineValue: number;
  expectedCommission: number;
  earnedCommission: number;
  dealsByStage: Record<string, number>;
}

interface Activity {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  deal_id?: string | null;
  property_id?: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DealStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/deals/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);

    fetch("/api/properties?limit=1")
      .then((r) => r.json())
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Phoenix, AZ / Maricopa County — Distressed property pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Quick search..."
              className="w-64 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/properties">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Find Properties
            </Button>
          </Link>
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ActivityFeed activities={activities} />
        </div>
        <div className="lg:col-span-2">
          <PipelineMini dealsByStage={stats?.dealsByStage ?? null} />
        </div>
      </div>
    </div>
  );
}

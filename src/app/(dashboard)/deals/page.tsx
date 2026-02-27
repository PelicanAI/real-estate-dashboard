"use client";

import { useEffect, useState, useCallback } from "react";
import { KanbanBoard } from "@/components/deals/kanban-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, DollarSign } from "lucide-react";

interface Deal {
  id: string;
  stage: string;
  offer_price: number | null;
  accepted_price: number | null;
  total_commission: number | null;
  created_at: string;
  property?: {
    id: string;
    address: string;
    city: string;
    state: string;
    estimated_price: number | null;
    distress_type: string | null;
  } | null;
}

function fmt(val: number | null | undefined) {
  const v = val ?? 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    expectedCommission: number;
    earnedCommission: number;
  } | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      const data = await res.json();
      setDeals(data.data || []);
    } catch {
      toast.error("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/deals/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchStats();
  }, [fetchDeals, fetchStats]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Deal moved to ${newStage}`);
      fetchStats();
    } catch {
      // Revert
      fetchDeals();
      toast.error("Failed to update deal stage");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-lg">Deal Pipeline</h1>
          <p className="mt-1 text-xs font-light text-muted-foreground">
            {deals.length} active deals
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Expected
                </p>
                <p className="font-mono-numbers text-sm font-bold text-emerald-400">
                  {fmt(stats.expectedCommission)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Earned
                </p>
                <p className="font-mono-numbers text-sm font-bold text-emerald-500">
                  {fmt(stats.earnedCommission)}
                </p>
              </div>
            </div>
          )}
          <Button variant="outline" size="icon" onClick={() => { fetchDeals(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2 rounded-lg bg-accent/20 p-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard deals={deals} onStageChange={handleStageChange} />
      )}
    </div>
  );
}

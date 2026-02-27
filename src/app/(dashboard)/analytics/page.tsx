"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
} from "recharts";
import { DollarSign, TrendingUp, Target, Clock } from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  Lead: "#98857B",
  Contacted: "#a8968c",
  "Offer Sent": "#b8a79d",
  "Under Contract": "#CCB091",
  "Closed - Acquired": "#10b981",
  Rehab: "#f59e0b",
  Listed: "#CCB091",
  Sold: "#059669",
};

function fmt(val: number | null | undefined) {
  const v = val ?? 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const dealsByStage = stats?.dealsByStage as Record<string, number> | undefined;

  const pipelineData = dealsByStage
    ? Object.entries(dealsByStage).map(([stage, count]) => ({
        name: stage,
        value: count,
        fill: STAGE_COLORS[stage] || "#6b7280",
      }))
    : [];

  const funnelData = [
    { name: "Leads", value: dealsByStage?.Lead || 0, fill: "#98857B" },
    { name: "Contacted", value: dealsByStage?.Contacted || 0, fill: "#a8968c" },
    { name: "Offers", value: dealsByStage?.["Offer Sent"] || 0, fill: "#b8a79d" },
    {
      name: "Contracts",
      value: dealsByStage?.["Under Contract"] || 0,
      fill: "#CCB091",
    },
    {
      name: "Closed",
      value: dealsByStage?.["Closed - Acquired"] || 0,
      fill: "#10b981",
    },
    { name: "Sold", value: dealsByStage?.Sold || 0, fill: "#059669" },
  ];

  // Simulated monthly data for the chart
  const monthlyData = [
    { month: "Jan", earned: 0, expected: 0 },
    { month: "Feb", earned: 0, expected: 0 },
    { month: "Mar", earned: 0, expected: (stats?.expectedCommission as number) || 0 },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading text-lg">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading text-lg">Analytics</h1>
        <p className="mt-1 text-xs font-light text-muted-foreground">
          Commission tracking and pipeline performance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-emerald-400/10">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Earned</p>
              <p className="font-mono-numbers text-xl font-bold text-emerald-400">
                {fmt(stats?.earnedCommission as number)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-taupe/10">
              <TrendingUp className="h-5 w-5 text-taupe" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pipeline</p>
              <p className="font-mono-numbers text-xl font-bold">
                {fmt(stats?.expectedCommission as number)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-taupe/10">
              <Target className="h-5 w-5 text-taupe-light" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Leads</p>
              <p className="font-mono-numbers text-xl font-bold">
                {(stats?.totalLeads as number) || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-taupe/10">
              <Clock className="h-5 w-5 text-taupe" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Pipeline Value</p>
              <p className="font-mono-numbers text-xl font-bold">
                {fmt(stats?.pipelineValue as number)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Deal Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData.map((item, i) => {
                const maxVal = Math.max(...funnelData.map((d) => d.value), 1);
                const pct = (item.value / maxVal) * 100;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-mono-numbers font-medium">{item.value}</span>
                    </div>
                    <div className="h-6 w-full overflow-hidden bg-accent/50">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "2px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No deals to display
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Commission Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "2px",
                  }}
                  formatter={(value) => [fmt(value as number)]}
                />
                <Bar dataKey="earned" fill="#10b981" radius={0} name="Earned" />
                <Bar
                  dataKey="expected"
                  fill="#10b98133"
                  radius={0}
                  name="Expected"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

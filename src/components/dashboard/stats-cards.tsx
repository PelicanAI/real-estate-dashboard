"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Building2, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalLeads: number;
    pipelineValue: number;
    expectedCommission: number;
    earnedCommission: number;
  } | null;
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      formatted: String(stats?.totalLeads ?? 0),
      icon: Building2,
      color: "text-taupe-light",
      bg: "bg-taupe/10",
    },
    {
      label: "Pipeline Value",
      value: stats?.pipelineValue ?? 0,
      formatted: formatCurrency(stats?.pipelineValue ?? 0),
      icon: TrendingUp,
      color: "text-taupe",
      bg: "bg-taupe/10",
    },
    {
      label: "Expected Commission",
      value: stats?.expectedCommission ?? 0,
      formatted: formatCurrency(stats?.expectedCommission ?? 0),
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Earned Commission",
      value: stats?.earnedCommission ?? 0,
      formatted: formatCurrency(stats?.earnedCommission ?? 0),
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.15em] text-muted-foreground">{card.label}</p>
              <p className="font-mono-numbers text-xl font-semibold">{card.formatted}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

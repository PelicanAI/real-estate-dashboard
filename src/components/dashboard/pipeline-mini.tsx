"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  { key: "Lead", color: "bg-blue-500" },
  { key: "Contacted", color: "bg-indigo-500" },
  { key: "Offer Sent", color: "bg-purple-500" },
  { key: "Under Contract", color: "bg-amber-500" },
  { key: "Closed - Acquired", color: "bg-emerald-500" },
  { key: "Rehab", color: "bg-orange-500" },
  { key: "Listed", color: "bg-cyan-500" },
  { key: "Sold", color: "bg-emerald-600" },
];

interface PipelineMiniProps {
  dealsByStage: Record<string, number> | null;
}

export function PipelineMini({ dealsByStage }: PipelineMiniProps) {
  const total = dealsByStage
    ? Object.values(dealsByStage).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGES.map((stage) => {
          const count = dealsByStage?.[stage.key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{stage.key}</span>
                <span className="font-mono-numbers font-medium">{count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className={`h-full rounded-full ${stage.color} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

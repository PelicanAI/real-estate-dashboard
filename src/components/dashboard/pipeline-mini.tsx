"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  { key: "Lead", color: "bg-taupe/60" },
  { key: "Contacted", color: "bg-taupe/70" },
  { key: "Offer Sent", color: "bg-taupe/80" },
  { key: "Under Contract", color: "bg-taupe-light/70" },
  { key: "Closed - Acquired", color: "bg-emerald-500" },
  { key: "Rehab", color: "bg-amber-500" },
  { key: "Listed", color: "bg-taupe-light" },
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
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGES.map((stage) => {
          const count = dealsByStage?.[stage.key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs font-light text-muted-foreground">{stage.key}</span>
                <span className="font-mono-numbers text-xs font-medium">{count}</span>
              </div>
              <div className="h-1 w-full overflow-hidden bg-accent">
                <div
                  className={`h-full ${stage.color} transition-all`}
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

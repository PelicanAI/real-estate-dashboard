"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  ArrowRight,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";

interface Activity {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  deal_id?: string | null;
  property_id?: string | null;
}

const actionIcons: Record<string, typeof Building2> = {
  property_added: Plus,
  stage_changed: ArrowRight,
  note_added: MessageSquare,
  offer_sent: Send,
  deal_created: Building2,
};

const actionLabels: Record<string, string> = {
  property_added: "Property Added",
  stage_changed: "Stage Changed",
  note_added: "Note Added",
  offer_sent: "Offer Sent",
  deal_created: "Deal Created",
};

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-light text-muted-foreground">No recent activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-0">
            {activities.map((activity) => {
              const Icon = actionIcons[activity.action] || Building2;
              const details = activity.details as Record<string, string> | null;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 border-b border-border/30 px-6 py-3 last:border-0"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center bg-accent">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {actionLabels[activity.action] || activity.action}
                      </Badge>
                    </div>
                    {details?.address && (
                      <p className="mt-0.5 truncate text-sm font-light">{details.address}</p>
                    )}
                    {details?.from && details?.to && (
                      <p className="mt-0.5 text-xs text-muted-foreground font-light">
                        {details.from} → {details.to}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

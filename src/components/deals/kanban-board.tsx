"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const STAGES = [
  { key: "Lead", color: "bg-blue-500", text: "text-blue-400" },
  { key: "Contacted", color: "bg-indigo-500", text: "text-indigo-400" },
  { key: "Offer Sent", color: "bg-purple-500", text: "text-purple-400" },
  { key: "Under Contract", color: "bg-amber-500", text: "text-amber-400" },
  { key: "Closed - Acquired", color: "bg-emerald-500", text: "text-emerald-400" },
  { key: "Rehab", color: "bg-orange-500", text: "text-orange-400" },
  { key: "Listed", color: "bg-cyan-500", text: "text-cyan-400" },
  { key: "Sold", color: "bg-emerald-600", text: "text-emerald-500" },
] as const;

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
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function DealCard({ deal }: { deal: Deal }) {
  const price = deal.accepted_price || deal.offer_price || deal.property?.estimated_price;

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card className="cursor-pointer border-border/40 transition-all hover:border-border hover:bg-accent/30">
        <CardContent className="p-3">
          <p className="text-sm font-medium leading-tight">
            {deal.property?.address || "Unknown Property"}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {deal.property?.city}, {deal.property?.state}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono-numbers text-sm font-semibold">
              {fmt(price)}
            </span>
            {deal.total_commission && deal.total_commission > 0 && (
              <span className="flex items-center gap-0.5 font-mono-numbers text-xs font-medium text-emerald-400">
                <DollarSign className="h-2.5 w-2.5" />
                {fmt(deal.total_commission)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
          </div>

          {deal.property?.distress_type && (
            <Badge variant="outline" className="mt-2 text-[9px]">
              {deal.property.distress_type}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function SortableDealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { deal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} />
    </div>
  );
}

function KanbanColumn({
  stage,
  deals,
  color,
  textColor,
}: {
  stage: string;
  deals: Deal[];
  color: string;
  textColor: string;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-accent/20">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2.5">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className={`text-sm font-semibold ${textColor}`}>{stage}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {deals.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1">
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 p-2">
            {deals.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} />
            ))}
            {deals.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground/50">
                No deals
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

export function KanbanBoard({
  deals,
  onStageChange,
}: {
  deals: Deal[];
  onStageChange: (dealId: string, newStage: string) => void;
}) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const draggedDeal = deals.find((d) => d.id === active.id);
    if (!draggedDeal) return;

    const overDeal = deals.find((d) => d.id === over.id);
    if (overDeal && overDeal.stage !== draggedDeal.stage) {
      onStageChange(draggedDeal.id, overDeal.stage);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.key}
            stage={stage.key}
            deals={deals.filter((d) => d.stage === stage.key)}
            color={stage.color}
            textColor={stage.text}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  );
}

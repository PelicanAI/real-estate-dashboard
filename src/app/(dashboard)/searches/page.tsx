"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Play,
  Clock,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedSearch {
  id: string;
  name: string;
  search_params?: Record<string, unknown>;
  is_active: boolean;
  frequency: string;
  last_run_at: string | null;
  results_count: number | null;
  created_at: string;
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

export default function SearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSearches, setRunningSearches] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const seedDefaults = async () => {
    try {
      await fetch("/api/seed", { method: "POST" });
    } catch {
      // silently fail — seed is best-effort
    }
  };

  const fetchSearches = async () => {
    try {
      const res = await fetch("/api/search/saved");
      const data = await res.json();
      const items = data.data || [];
      // If no searches exist, seed the defaults then re-fetch
      if (items.length === 0) {
        await seedDefaults();
        const res2 = await fetch("/api/search/saved");
        const data2 = await res2.json();
        setSearches(data2.data || []);
      } else {
        setSearches(items);
      }
    } catch {
      toast.error("Failed to load searches");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/scrape/logs");
      const data = await res.json();
      setLogs(data.data || []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchSearches();
    fetchLogs();
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/search/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !active }),
      });
      setSearches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !active } : s))
      );
    } catch {
      toast.error("Failed to toggle search");
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningSearches((prev) => new Set([...prev, id]));
    try {
      const res = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_search_id: id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Scrape completed");
      fetchSearches();
      fetchLogs();
    } catch {
      toast.error("Scrape failed");
    } finally {
      setRunningSearches((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/search/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          search_params: {
            city: formData.get("city"),
            state: formData.get("state"),
            zip: formData.get("zip"),
            distress_types: formData.get("distress_types")
              ? (formData.get("distress_types") as string).split(",").map((s) => s.trim())
              : [],
          },
          frequency: formData.get("frequency") || "daily",
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Search created");
      setDialogOpen(false);
      fetchSearches();
    } catch {
      toast.error("Failed to create search");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading text-lg">Scrape Jobs</h1>
          <p className="mt-1 text-xs font-light text-muted-foreground">
            Automated property scraping schedules
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Search
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Saved Search</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required placeholder="Phoenix Pre-Foreclosures" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input name="city" required defaultValue="Phoenix" placeholder="Phoenix" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input name="state" required defaultValue="AZ" placeholder="AZ" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input name="zip" placeholder="85001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Distress Types (comma-separated)</Label>
                <Input
                  name="distress_types"
                  placeholder="Pre-Foreclosure, NOD, Auction"
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select name="frequency" defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Search</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-accent/30" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">No saved searches</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Create a search to automatically find distressed properties
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <Card key={search.id} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{search.name}</h3>
                    <Badge variant={search.is_active ? "default" : "secondary"}>
                      {search.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {search.frequency}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {(search.search_params as Record<string, unknown> | undefined)?.city as string},{" "}
                      {(search.search_params as Record<string, unknown> | undefined)?.state as string}
                    </span>
                    {search.last_run_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last run:{" "}
                        {formatDistanceToNow(new Date(search.last_run_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                    {search.results_count != null && (
                      <span>{search.results_count} results last run</span>
                    )}
                    {(search as SavedSearch & { total_properties_found?: number }).total_properties_found != null && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {(search as SavedSearch & { total_properties_found?: number }).total_properties_found} total found
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={search.is_active}
                  onCheckedChange={() => handleToggle(search.id, search.is_active)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runningSearches.has(search.id)}
                  onClick={() => handleRunNow(search.id)}
                >
                  {runningSearches.has(search.id) ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  Run Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Scrape Logs</h2>
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
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

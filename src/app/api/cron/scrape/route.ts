import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/lib/agents/orchestrator";

const FREQUENCY_INTERVALS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Fetch all active saved searches
    const { data: searches, error: searchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("is_active", true);

    if (searchError) {
      return NextResponse.json(
        { error: searchError.message },
        { status: 500 }
      );
    }

    if (!searches || searches.length === 0) {
      return NextResponse.json({
        data: { message: "No active searches to run", processed: 0 },
      });
    }

    const now = Date.now();
    const results: Array<{
      search_id: string;
      name: string;
      status: string;
      records_found?: number;
      error?: string;
    }> = [];

    for (const search of searches) {
      const intervalMs =
        FREQUENCY_INTERVALS[search.frequency] ??
        FREQUENCY_INTERVALS.daily;

      // Skip if not due yet
      if (search.last_run_at) {
        const lastRun = new Date(search.last_run_at).getTime();
        if (now - lastRun < intervalMs) {
          results.push({
            search_id: search.id,
            name: search.name,
            status: "skipped",
          });
          continue;
        }
      }

      const filters = search.search_params as Record<string, unknown>;

      // Create scrape log
      const { data: scrapeLog } = await supabase
        .from("scrape_logs")
        .insert({
          source: `cron:saved_search:${search.id}`,
          status: "running",
          metadata: { saved_search_id: search.id, filters } as any,
        })
        .select()
        .single();

      const startTime = Date.now();

      try {
        const searchResult = await runSearch(filters as any);

        const durationMs = Date.now() - startTime;

        // Update scrape log
        if (scrapeLog) {
          await supabase
            .from("scrape_logs")
            .update({
              status: "completed",
              properties_found: searchResult.totalFound,
              new_properties: searchResult.totalSaved,
              duration_ms: durationMs,
            })
            .eq("id", scrapeLog.id);
        }

        // Update saved search
        await supabase
          .from("saved_searches")
          .update({
            last_run_at: new Date().toISOString(),
            results_count: searchResult.totalSaved as any,
          })
          .eq("id", search.id);

        results.push({
          search_id: search.id,
          name: search.name,
          status: "completed",
          records_found: searchResult.totalSaved,
        });
      } catch (scrapeError) {
        const durationMs = Date.now() - startTime;

        if (scrapeLog) {
          await supabase
            .from("scrape_logs")
            .update({
              status: "failed",
              duration_ms: durationMs,
              error_message:
                  scrapeError instanceof Error
                    ? scrapeError.message
                    : "Unknown error",
            })
            .eq("id", scrapeLog.id);
        }

        results.push({
          search_id: search.id,
          name: search.name,
          status: "failed",
          error:
            scrapeError instanceof Error
              ? scrapeError.message
              : "Unknown error",
        });
      }
    }

    const completed = results.filter((r) => r.status === "completed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({
      data: {
        processed: results.length,
        completed,
        failed,
        skipped,
        results,
      },
    });
  } catch (error) {
    console.error("GET /api/cron/scrape error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

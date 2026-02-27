import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/lib/agents/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { saved_search_id } = body;
    if (!saved_search_id) {
      return NextResponse.json(
        { error: "saved_search_id is required" },
        { status: 400 }
      );
    }

    // Fetch the saved search
    const { data: savedSearch, error: fetchError } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("id", saved_search_id)
      .single();

    if (fetchError || !savedSearch) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 }
      );
    }

    const filters = savedSearch.filters as Record<string, unknown>;

    // Create a running scrape log
    const { data: scrapeLog, error: logError } = await supabase
      .from("scrape_logs")
      .insert({
        source: `saved_search:${saved_search_id}`,
        status: "running",
        metadata: { saved_search_id, filters } as any,
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json(
        { error: logError.message },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    try {
      // Run the orchestrator
      const result = await runSearch(filters as any);

      const durationMs = Date.now() - startTime;

      // Update scrape log with results
      await supabase
        .from("scrape_logs")
        .update({
          status: "completed",
          records_found: result.totalFound,
          records_added: result.totalSaved,
          duration_ms: durationMs,
        })
        .eq("id", scrapeLog!.id);

      // Update saved search last_run_at and results_count
      await supabase
        .from("saved_searches")
        .update({
          last_run_at: new Date().toISOString(),
          results_count: result.totalSaved,
        })
        .eq("id", saved_search_id);

      return NextResponse.json({
        data: {
          scrape_log_id: scrapeLog!.id,
          results_count: result.totalSaved,
          duration_ms: durationMs,
        },
      });
    } catch (scrapeError) {
      const durationMs = Date.now() - startTime;

      await supabase
        .from("scrape_logs")
        .update({
          status: "failed",
          duration_ms: durationMs,
          errors: {
            message:
              scrapeError instanceof Error
                ? scrapeError.message
                : "Unknown error",
          },
        })
        .eq("id", scrapeLog!.id);

      return NextResponse.json(
        { error: "Scrape failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/scrape/trigger error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

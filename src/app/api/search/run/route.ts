import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSearch } from "@/lib/agents/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { city, state, zip, distressTypes, minPrice, maxPrice } = body;

    if (!city || !state) {
      return NextResponse.json(
        { error: "city and state are required" },
        { status: 400 }
      );
    }

    // Run the orchestrator agent
    const result = await runSearch({
      city,
      state,
      zip,
      distressTypes,
      minPrice,
      maxPrice,
    });

    // Log the scrape
    await supabase.from("scrape_logs").insert({
      source: "manual_search",
      status: "completed",
      properties_found: result.totalFound,
      new_properties: result.totalSaved,
    });

    return NextResponse.json({
      data: result,
      count: result.totalSaved,
    });
  } catch (error) {
    console.error("POST /api/search/run error:", error);

    // Attempt to log the failed scrape
    try {
      const supabase = await createClient();
      await supabase.from("scrape_logs").insert({
        source: "manual_search",
        status: "failed",
        error_message:
            error instanceof Error ? error.message : "Unknown error",
      });
    } catch {
      // Ignore logging failure
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

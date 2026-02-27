import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("scrape_logs")
      .select("*")
      .eq("status", "running")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isRunning = (data?.length ?? 0) > 0;

    return NextResponse.json({
      data: {
        is_running: isRunning,
        running_scrapes: data ?? [],
        count: data?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("GET /api/scrape/status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

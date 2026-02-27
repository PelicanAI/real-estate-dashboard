import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const savedSearchId = searchParams.get("saved_search_id");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("scrape_logs")
      .select("*", { count: "exact" });

    if (savedSearchId) {
      query = query.eq("source", `saved_search:${savedSearchId}`);
    }

    query = query
      .order("started_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      // Table might not exist yet — return empty instead of 500
      console.error("GET /api/scrape/logs error:", error.message);
      return NextResponse.json({
        data: [],
        count: 0,
        page,
        totalPages: 0,
      });
    }

    const totalCount = count ?? 0;

    return NextResponse.json({
      data: data ?? [],
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 0,
    });
  } catch (error) {
    console.error("GET /api/scrape/logs error:", error);
    return NextResponse.json({
      data: [],
      count: 0,
      page: 1,
      totalPages: 0,
    });
  }
}

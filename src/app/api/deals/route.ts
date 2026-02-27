import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const stage = searchParams.get("stage");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("deals")
      .select("*, property:properties(*)", { count: "exact" });

    if (stage) {
      query = query.eq("stage", stage);
    }

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count ?? 0;

    return NextResponse.json({
      data,
      count: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("GET /api/deals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { property_id } = body;
    if (!property_id) {
      return NextResponse.json(
        { error: "property_id is required" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify property exists
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("id")
      .eq("id", property_id)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Create deal with stage = "Lead"
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        property_id,
        user_id: user.id,
        stage: "Lead",
      })
      .select("*, property:properties(*)")
      .single();

    if (dealError) {
      return NextResponse.json({ error: dealError.message }, { status: 500 });
    }

    // Log to activity_log
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "deal_created",
      entity_type: "deal",
      entity_id: deal.id,
      details: { stage: "Lead", property_id },
    });

    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/deals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const zip = searchParams.get("zip");
    const distressType = searchParams.get("distress_type");
    const minPrice = searchParams.get("min_price");
    const maxPrice = searchParams.get("max_price");
    const hasEquity = searchParams.get("has_equity");
    const source = searchParams.get("source");
    const address = searchParams.get("address");
    const minBeds = searchParams.get("min_beds");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sortBy = searchParams.get("sort_by") || "created_at";
    const sortOrder = searchParams.get("sort_order") || "desc";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("properties")
      .select("*", { count: "exact" });

    if (city) query = query.ilike("city", `%${city}%`);
    if (state) query = query.ilike("state", `%${state}%`);
    if (zip) query = query.eq("zip", zip);
    if (distressType) query = query.eq("distress_type", distressType);
    if (minPrice) query = query.gte("estimated_price", parseFloat(minPrice));
    if (maxPrice) query = query.lte("estimated_price", parseFloat(maxPrice));
    if (hasEquity === "true") query = query.gt("equity_estimate", 0);
    if (hasEquity === "false") query = query.lte("equity_estimate", 0);
    if (source) query = query.eq("source", source);
    if (address) query = query.ilike("address", `%${address}%`);
    if (minBeds) query = query.gte("bedrooms", parseInt(minBeds, 10));

    const ascending = sortOrder === "asc";
    query = query.order(sortBy, { ascending }).range(from, to);

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
    console.error("GET /api/properties error:", error);
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

    const { address, city, state } = body;
    if (!address || !city || !state) {
      return NextResponse.json(
        { error: "address, city, and state are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("properties")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

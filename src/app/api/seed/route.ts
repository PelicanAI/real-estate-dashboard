import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_SEARCHES = [
  {
    name: "Maricopa County Pre-Foreclosures",
    search_params: {
      city: "Phoenix",
      state: "AZ",
      county: "Maricopa",
      distressTypes: ["Pre-Foreclosure", "NOD", "Lis Pendens"],
    },
    is_active: true,
    frequency: "daily",
  },
  {
    name: "Phoenix AZ Distressed Properties",
    search_params: {
      city: "Phoenix",
      state: "AZ",
      distressTypes: [
        "Pre-Foreclosure",
        "Auction",
        "REO",
        "Tax Lien",
        "Vacant",
        "Code Violation",
      ],
    },
    is_active: true,
    frequency: "daily",
  },
];

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if searches already exist for this user
    const { data: existing, error: existingError } = await supabase
      .from("saved_searches")
      .select("name")
      .eq("user_id", user.id);

    if (existingError) {
      // Table might not exist — return gracefully
      console.error("Seed: saved_searches query error:", existingError.message);
      return NextResponse.json({
        message: "Could not seed — table may not exist",
        created: 0,
      });
    }

    const existingNames = new Set((existing || []).map((s) => s.name));

    const toInsert = DEFAULT_SEARCHES.filter((s) => !existingNames.has(s.name)).map(
      (s) => ({
        user_id: user.id,
        name: s.name,
        search_params: s.search_params as any,
        is_active: s.is_active,
        frequency: s.frequency,
      })
    );

    if (toInsert.length === 0) {
      return NextResponse.json({
        message: "Default searches already exist",
        created: 0,
      });
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .insert(toInsert)
      .select();

    if (error) {
      console.error("Seed: insert error:", error.message);
      return NextResponse.json({
        message: "Could not seed searches",
        created: 0,
      });
    }

    return NextResponse.json({
      message: "Default searches created",
      created: data?.length || 0,
      data,
    });
  } catch (error) {
    console.error("POST /api/seed error:", error);
    return NextResponse.json({
      message: "Seed failed",
      created: 0,
    });
  }
}

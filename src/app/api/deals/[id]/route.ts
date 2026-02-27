import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

// Map stage names to their corresponding timestamp fields in the timeline JSON
const STAGE_TIMESTAMP_MAP: Record<string, string> = {
  Contacted: "contacted_at",
  "Offer Sent": "offer_sent_at",
  "Under Contract": "under_contract_at",
  "Closed - Acquired": "closed_at",
  Rehab: "rehab_started_at",
  Listed: "listed_at",
  Sold: "sold_at",
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Fetch deal with property data
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*, property:properties(*)")
      .eq("id", id)
      .single();

    if (dealError) {
      if (dealError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Deal not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: dealError.message },
        { status: 500 }
      );
    }

    // Fetch activity log for this deal
    const { data: activityLog, error: logError } = await supabase
      .from("activity_log")
      .select("*")
      .eq("entity_type", "deal")
      .eq("entity_id", id)
      .order("created_at", { ascending: false });

    if (logError) {
      return NextResponse.json(
        { error: logError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { ...deal, activity_log: activityLog },
    });
  } catch (error) {
    console.error("GET /api/deals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const body = await request.json();

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

    // Fetch current deal to detect stage changes
    const { data: currentDeal, error: fetchError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Deal not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Handle stage change: set timestamp in timeline
    if (body.stage && body.stage !== currentDeal.stage) {
      const timestampField = STAGE_TIMESTAMP_MAP[body.stage];
      if (timestampField) {
        const existingTimeline =
          (currentDeal.timeline as Record<string, string>) || {};
        updatePayload.timeline = {
          ...existingTimeline,
          [timestampField]: new Date().toISOString(),
        };
      }
    }

    // Auto-calculate commissions based on available price data
    const acceptedPrice =
      body.purchase_price ?? currentDeal.purchase_price;
    const soldPrice = body.sold_price ?? currentDeal.sold_price;

    let acquisitionCommission: number | null = null;
    let listingCommission: number | null = null;

    if (acceptedPrice) {
      acquisitionCommission = acceptedPrice * 0.03;
    }
    if (soldPrice) {
      listingCommission = soldPrice * 0.01;
    }

    // Store commissions in the documents JSON field (no dedicated columns)
    if (acquisitionCommission !== null || listingCommission !== null) {
      const existingDocs =
        (currentDeal.documents as Record<string, unknown>) || {};
      updatePayload.documents = {
        ...existingDocs,
        acquisition_commission: acquisitionCommission,
        listing_commission: listingCommission,
        total_commission:
          (acquisitionCommission ?? 0) + (listingCommission ?? 0),
      };
    }

    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update(updatePayload)
      .eq("id", id)
      .select("*, property:properties(*)")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Log stage changes to activity_log
    if (body.stage && body.stage !== currentDeal.stage) {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: "stage_changed",
        entity_type: "deal",
        entity_id: id,
        details: {
          from: currentDeal.stage,
          to: body.stage,
        },
      });
    }

    return NextResponse.json({ data: updatedDeal });
  } catch (error) {
    console.error("PATCH /api/deals/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all deals with property data
    const { data: deals, error } = await supabase
      .from("deals")
      .select("*, property:properties(estimated_value)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allDeals = deals || [];

    // Tally deals by stage
    const dealsByStage: Record<string, number> = {};
    for (const deal of allDeals) {
      dealsByStage[deal.stage] = (dealsByStage[deal.stage] || 0) + 1;
    }

    // Pipeline stages (not yet closed/sold)
    const closedStages = new Set(["Closed - Acquired", "Sold"]);
    const deadStages = new Set(["Dead"]);

    const pipelineDeals = allDeals.filter(
      (d) => !closedStages.has(d.stage) && !deadStages.has(d.stage)
    );

    const closedDeals = allDeals.filter((d) => closedStages.has(d.stage));

    // Pipeline value: sum of estimated property values in active pipeline
    const pipelineValue = pipelineDeals.reduce((sum, deal) => {
      const prop = deal.property as { estimated_value: number | null } | null;
      return sum + (prop?.estimated_value ?? 0);
    }, 0);

    // Expected commissions: pipeline deals' potential commissions
    const expectedCommission = pipelineDeals.reduce((sum, deal) => {
      const prop = deal.property as { estimated_value: number | null } | null;
      const estimated = prop?.estimated_value ?? 0;
      // 3% acquisition + 1% listing potential
      return sum + estimated * 0.04;
    }, 0);

    // Earned commissions: sum of commissions on closed deals
    const earnedCommission = closedDeals.reduce((sum, deal) => {
      const docs = deal.documents as Record<string, number> | null;
      return sum + (docs?.total_commission ?? 0);
    }, 0);

    // Recent deals (last 10)
    const recentDeals = allDeals.slice(0, 10);

    return NextResponse.json({
      data: {
        totalLeads: allDeals.length,
        pipelineValue,
        expectedCommission,
        earnedCommission,
        dealsByStage,
        recentDeals,
      },
    });
  } catch (error) {
    console.error("GET /api/deals/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

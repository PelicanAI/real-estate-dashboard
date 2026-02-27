import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Fetch the property first
    const { data: property, error: fetchError } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const attomKey = process.env.ATTOM_API_KEY;
    if (!attomKey) {
      return NextResponse.json(
        { error: "ATTOM API key not configured" },
        { status: 500 }
      );
    }

    const address1 = encodeURIComponent(property.address);
    const cityStateZip = `${property.city}, ${property.state}${property.zip ? " " + property.zip : ""}`;
    const address2 = encodeURIComponent(cityStateZip);
    const baseUrl = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
    const headers = { Accept: "application/json", apikey: attomKey };

    const enrichedData: Record<string, unknown> = {};
    const enrichedFields: string[] = [];
    const errors: string[] = [];

    // 1. property/detail — owner info, building details, lot info
    try {
      const res = await fetch(
        `${baseUrl}/property/detail?address1=${address1}&address2=${address2}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const prop = data?.property?.[0];
        if (prop) {
          const owner = prop.assessment?.owner?.owner1;
          if (owner?.fullName && !property.owner_name) {
            enrichedData.owner_name = owner.fullName;
            enrichedFields.push("owner name");
          }

          const building = prop.building;
          if (building?.rooms?.beds && !property.bedrooms) {
            enrichedData.bedrooms = building.rooms.beds;
            enrichedFields.push("bedrooms");
          }
          if (building?.rooms?.bathstotal && !property.bathrooms) {
            enrichedData.bathrooms = building.rooms.bathstotal;
            enrichedFields.push("bathrooms");
          }
          if (building?.size?.universalsize && !property.sqft) {
            enrichedData.sqft = building.size.universalsize;
            enrichedFields.push("sqft");
          }
          if (building?.construction?.yearbuilt) {
            enrichedData.year_built = building.construction.yearbuilt;
            enrichedFields.push("year built");
          }

          if (prop.lot?.lotsize2 && !property.lot_size) {
            enrichedData.lot_size = Number(prop.lot.lotsize2);
            enrichedFields.push("lot size");
          }

          // Stash full assessment in raw_data
          if (prop.assessment) {
            enrichedData.raw_data = {
              ...((property.raw_data as Record<string, unknown>) || {}),
              attom_detail: prop,
            };
          }
        }
      } else {
        errors.push(`property/detail: ${res.status}`);
      }
    } catch (e) {
      errors.push(`property/detail: ${(e as Error).message}`);
    }

    // 2. avm/detail — AVM valuation
    try {
      const res = await fetch(
        `${baseUrl}/avm/detail?address1=${address1}&address2=${address2}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const prop = data?.property?.[0];
        if (prop?.avm?.amount?.value) {
          const avmValue = prop.avm.amount.value;
          enrichedData.arv_estimate = avmValue;
          enrichedFields.push("AVM");

          if (!property.assessed_value) {
            enrichedData.assessed_value = avmValue;
            enrichedFields.push("valuation");
          }

          // Calculate equity if we have mortgage balance
          if (property.mortgage_balance && !property.equity_estimate) {
            enrichedData.equity_estimate = Math.round(avmValue - property.mortgage_balance);
            enrichedFields.push("equity");
          }
        }
      } else {
        errors.push(`avm/detail: ${res.status}`);
      }
    } catch (e) {
      errors.push(`avm/detail: ${(e as Error).message}`);
    }

    // 3. sale/snapshot — recent sale history (supplementary, don't log errors)
    try {
      const res = await fetch(
        `${baseUrl}/sale/snapshot?address1=${address1}&address2=${address2}`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const sale = data?.property?.[0]?.sale;
        if (sale) {
          enrichedData.raw_data = {
            ...((enrichedData.raw_data as Record<string, unknown>) ||
              (property.raw_data as Record<string, unknown>) ||
              {}),
            attom_sale_history: sale,
          };
          enrichedFields.push("sale history");
        }
      }
    } catch {
      // supplementary — don't report
    }

    // Update the property with enriched data
    if (Object.keys(enrichedData).length > 0) {
      enrichedData.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from("properties")
        .update(enrichedData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to save enriched data", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: updated,
        enrichedFields,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json({
      data: property,
      enrichedFields: [],
      message: "No new data found from ATTOM",
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/properties/[id]/enrich error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

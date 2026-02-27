import { NextRequest, NextResponse } from "next/server";
import { searchProperties as zillowSearch } from "@/lib/agents/zillow";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // ── Zillow / RapidAPI Tests ────────────────────────────────────

  // Test bymapbounds endpoint (Phoenix bounds)
  try {
    const bmRes = await fetch(
      'https://real-estate101.p.rapidapi.com/api/search/bymapbounds?north=33.70&south=33.20&east=-111.82&west=-112.32&page=1',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'real-estate101.p.rapidapi.com',
        },
      }
    );
    const bmText = await bmRes.text();
    let bmData: any = {};
    try { bmData = JSON.parse(bmText); } catch {}
    results.zillow_bymapbounds_test = {
      status: bmRes.status,
      success: bmData.success,
      resultCount: bmData.results?.length ?? 0,
      totalCount: bmData.totalCount,
      bodyPreview: bmRes.status !== 200 ? bmText.slice(0, 200) : undefined,
    };
  } catch (err) {
    results.zillow_bymapbounds_test = { error: (err as Error).message };
  }

  // Test bymapbounds with PreForeclosure filter
  try {
    const pfRes = await fetch(
      'https://real-estate101.p.rapidapi.com/api/search/bymapbounds?north=33.70&south=33.20&east=-111.82&west=-112.32&page=1&status=PreForeclosure',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'real-estate101.p.rapidapi.com',
        },
      }
    );
    const pfText = await pfRes.text();
    let pfData: any = {};
    try { pfData = JSON.parse(pfText); } catch {}
    results.zillow_preforeclosure_test = {
      status: pfRes.status,
      success: pfData.success,
      resultCount: pfData.results?.length ?? 0,
      totalCount: pfData.totalCount,
      bodyPreview: pfRes.status !== 200 ? pfText.slice(0, 200) : undefined,
    };
  } catch (err) {
    results.zillow_preforeclosure_test = { error: (err as Error).message };
  }

  // Test Zillow agent
  try {
    const zillowResult = await zillowSearch("Phoenix", "AZ");
    results.zillow = {
      status: "ok",
      found: zillowResult.properties.length,
      errors: zillowResult.errors.map(e => e.message),
      duration: zillowResult.durationMs,
      sampleProperty: zillowResult.properties[0] ? {
        address: zillowResult.properties[0].address,
        city: zillowResult.properties[0].city,
        price: zillowResult.properties[0].listPrice,
      } : null,
    };
  } catch (err) {
    results.zillow = { status: "error", message: (err as Error).message };
  }

  // ── ATTOM Enrichment Endpoint Tests ────────────────────────────

  const attomKey = process.env.ATTOM_API_KEY;
  if (attomKey) {
    const attomHeaders = { Accept: "application/json", apikey: attomKey };
    const baseUrl = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

    // Two test addresses:
    // 1. ATTOM docs example (guaranteed to work if key is valid)
    // 2. Real Phoenix scraped address with ZIP
    const testAddresses = [
      {
        label: "attom_docs_example",
        address1: encodeURIComponent("4529 Winona Court"),
        address2: encodeURIComponent("Denver, CO"),
      },
      {
        label: "phoenix_with_zip",
        address1: encodeURIComponent("918 W Kathleen Rd"),
        address2: encodeURIComponent("Phoenix, AZ 85023"),
      },
    ];

    for (const addr of testAddresses) {
      // Test property/detail
      try {
        const res = await fetch(
          `${baseUrl}/property/detail?address1=${addr.address1}&address2=${addr.address2}`,
          { headers: attomHeaders }
        );
        const data = await res.json();
        const prop = data?.property?.[0];
        results[`attom_detail_${addr.label}`] = {
          status: res.status,
          statusMsg: data?.status?.msg ?? null,
          hasProperty: !!prop,
          ownerName: prop?.assessment?.owner?.owner1?.fullName ?? null,
          sampleFields: prop ? Object.keys(prop).slice(0, 10) : [],
        };
      } catch (err) {
        results[`attom_detail_${addr.label}`] = { error: (err as Error).message };
      }

      // Test avm/detail
      try {
        const res = await fetch(
          `${baseUrl}/avm/detail?address1=${addr.address1}&address2=${addr.address2}`,
          { headers: attomHeaders }
        );
        const data = await res.json();
        const prop = data?.property?.[0];
        results[`attom_avm_${addr.label}`] = {
          status: res.status,
          statusMsg: data?.status?.msg ?? null,
          hasProperty: !!prop,
          avmValue: prop?.avm?.amount?.value ?? null,
        };
      } catch (err) {
        results[`attom_avm_${addr.label}`] = { error: (err as Error).message };
      }
    }
  } else {
    results.attom_tests = { skipped: true, reason: "ATTOM_API_KEY not set" };
  }

  // ── Disabled agents (for reference) ────────────────────────────

  results.disabled_agents = {
    attom_preforeclosure_search: "disabled — 404 on trial plan",
    attom_foreclosure_search: "disabled — 404 on trial plan",
    county_records: "disabled — requires browser automation",
    foreclosure_sites: "disabled — target sites dead",
  };

  // ── Environment check ──────────────────────────────────────────

  results.env_check = {
    has_rapidapi_key: !!process.env.RAPIDAPI_KEY,
    has_rapidapi_zillow_host: !!process.env.RAPIDAPI_ZILLOW_HOST,
    rapidapi_zillow_host: process.env.RAPIDAPI_ZILLOW_HOST || "(not set, using default: real-estate101.p.rapidapi.com)",
    has_attom_key: !!process.env.ATTOM_API_KEY,
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  return NextResponse.json(results, { status: 200 });
}

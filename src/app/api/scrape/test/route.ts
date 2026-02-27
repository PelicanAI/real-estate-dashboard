import { NextRequest, NextResponse } from "next/server";
import { searchProperties as zillowSearch } from "@/lib/agents/zillow";
import { searchPreForeclosures, searchForeclosures } from "@/lib/agents/attom";
import { searchNODFilings } from "@/lib/agents/county-records";
import { searchAllForeclosureSites } from "@/lib/agents/foreclosure-sites";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

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

  // Test Zillow/RapidAPI
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

  // Test ATTOM
  try {
    const attomResult = await searchPreForeclosures("Phoenix", "AZ");
    results.attom_preforeclosure = {
      status: "ok",
      found: attomResult.properties.length,
      errors: attomResult.errors.map(e => e.message),
      duration: attomResult.durationMs,
    };
  } catch (err) {
    results.attom_preforeclosure = { status: "error", message: (err as Error).message };
  }

  try {
    const attomFcResult = await searchForeclosures("Phoenix", "AZ");
    results.attom_foreclosure = {
      status: "ok",
      found: attomFcResult.properties.length,
      errors: attomFcResult.errors.map(e => e.message),
      duration: attomFcResult.durationMs,
    };
  } catch (err) {
    results.attom_foreclosure = { status: "error", message: (err as Error).message };
  }

  // Test County Records
  try {
    const countyResult = await searchNODFilings("maricopa", "AZ");
    results.county_records = {
      status: "ok",
      found: countyResult.properties.length,
      errors: countyResult.errors.map(e => e.message),
      duration: countyResult.durationMs,
    };
  } catch (err) {
    results.county_records = { status: "error", message: (err as Error).message };
  }

  // Test Foreclosure Sites
  try {
    const fcSitesResult = await searchAllForeclosureSites("Phoenix", "AZ");
    results.foreclosure_sites = {
      status: "ok",
      found: fcSitesResult.properties.length,
      errors: fcSitesResult.errors.map(e => e.message),
      duration: fcSitesResult.durationMs,
    };
  } catch (err) {
    results.foreclosure_sites = { status: "error", message: (err as Error).message };
  }

  // Environment check
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

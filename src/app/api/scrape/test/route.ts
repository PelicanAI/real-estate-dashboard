import { NextRequest, NextResponse } from "next/server";
import { searchProperties as zillowSearch } from "@/lib/agents/zillow";
import { searchPreForeclosures, searchForeclosures } from "@/lib/agents/attom";
import { searchNODFilings } from "@/lib/agents/county-records";
import { searchAllForeclosureSites } from "@/lib/agents/foreclosure-sites";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // Test 1 - raw URL string (no encoding)
  try {
    const rawRes = await fetch(
      'https://real-estate101.p.rapidapi.com/api/search/byurl?url=https://www.zillow.com/phoenix-az/&page=1',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'real-estate101.p.rapidapi.com',
        },
      }
    );
    const rawText = await rawRes.text();
    let rawData: any = {};
    try { rawData = JSON.parse(rawText); } catch {}
    results.zillow_raw_url_test = {
      status: rawRes.status,
      success: rawData.success,
      resultCount: rawData.results?.length ?? 0,
      totalCount: rawData.totalCount,
      bodyPreview: rawRes.status !== 200 ? rawText.slice(0, 200) : undefined,
    };
  } catch (err) {
    results.zillow_raw_url_test = { error: (err as Error).message };
  }

  // Test 2 - URL-encoded
  try {
    const encRes = await fetch(
      `https://real-estate101.p.rapidapi.com/api/search/byurl?url=${encodeURIComponent('https://www.zillow.com/phoenix-az/')}&page=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
          'X-RapidAPI-Host': 'real-estate101.p.rapidapi.com',
        },
      }
    );
    const encText = await encRes.text();
    let encData: any = {};
    try { encData = JSON.parse(encText); } catch {}
    results.zillow_encoded_url_test = {
      status: encRes.status,
      success: encData.success,
      resultCount: encData.results?.length ?? 0,
      totalCount: encData.totalCount,
      bodyPreview: encRes.status !== 200 ? encText.slice(0, 200) : undefined,
    };
  } catch (err) {
    results.zillow_encoded_url_test = { error: (err as Error).message };
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

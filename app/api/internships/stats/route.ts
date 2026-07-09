import { NextRequest, NextResponse } from "next/server";
import { getAnonClient } from "@/lib/supabase/anon";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    const supabase = getAnonClient();

    let query = supabase
      .from("employers")
      .select("company, year, hourly_median, data_basis");

    if (school) {
      query = query.ilike("school", school);
    }

    const { data: rawData, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type Row = { company: string; year: number | null; hourly_median: number | null; data_basis: string | null };
    const data = rawData as Row[];

    if (!data.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    const median = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const hourlyRates = data
      .map((r) => r.hourly_median)
      .filter((v): v is number => v != null && v > 0);

    const companies = [...new Set(data.map((r) => r.company))];
    const years = data.map((r) => r.year).filter((v): v is number => v != null);

    const stats = {
      record_count: data.length,
      unique_companies: companies.length,
      year_range: {
        min: Math.min(...years),
        max: Math.max(...years),
      },
      compensation: {
        median_hourly: hourlyRates.length ? +median(hourlyRates).toFixed(2) : null,
        records_with_compensation: hourlyRates.length,
      },
      data_basis: {
        projected: data.filter((r) => r.data_basis === "projected").length,
        inferred: data.filter((r) => r.data_basis === "inferred").length,
        actual: data.filter((r) => r.data_basis === "actual").length,
      },
      ...(school ? { school } : {}),
    };

    return NextResponse.json(
      { stats },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

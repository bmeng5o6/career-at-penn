import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    const supabase = await createClient();

    let query = supabase.from("penn_outcomes").select("*");

    if (school) {
      query = query.ilike("school", school);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v != null);
      return valid.length
        ? +(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(3)
        : null;
    };

    const stats = {
      record_count: data.length,
      year_range: {
        min: Math.min(...data.map((r) => r.class_year)),
        max: Math.max(...data.map((r) => r.class_year)),
      },
      averages: {
        full_time_employment: avg(data.map((r) => r.full_time_employment)),
        continuing_education: avg(data.map((r) => r.continuing_education)),
        seeking_employment: avg(data.map((r) => r.seeking_employment)),
        part_time_employment: avg(data.map((r) => r.part_time_employment)),
        overall_positive_rate: avg(data.map((r) => r.overall_positive_rate)),
      },
      ...(school ? { school } : {}),
    };

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

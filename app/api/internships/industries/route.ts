import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const school = searchParams.get("school");
    const year = searchParams.get("year");
    const isProjected = searchParams.get("is_projected");

    const supabase = await createClient();

    let query = supabase
      .from("industry_breakdown")
      .select("*", { count: "exact" });

    if (school) query = query.ilike("school", school);
    if (year) query = query.eq("year", parseInt(year));
    if (isProjected) query = query.eq("is_projected", isProjected === "true");

    query = query
      .order("percentage", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      meta: { total: count },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SORT_COLUMNS = [
  "school",
  "class_year",
  "known_outcomes",
  "full_time_employment",
  "continuing_education",
  "seeking_employment",
  "part_time_employment",
  "overall_positive_rate",
  "created_at",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const school = searchParams.get("school");
    const year = searchParams.get("year");
    const yearFrom = searchParams.get("year_from");
    const yearTo = searchParams.get("year_to");
    const minEmployment = searchParams.get("min_employment");
    const sortBy = searchParams.get("sort_by") || "class_year";
    const order = searchParams.get("order") || "desc";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!ALLOWED_SORT_COLUMNS.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sort_by. Allowed: ${ALLOWED_SORT_COLUMNS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let query = supabase
      .from("penn_outcomes")
      .select("*", { count: "exact" });

    if (school) query = query.ilike("school", school);
    if (year) query = query.eq("class_year", parseInt(year));
    if (yearFrom) query = query.gte("class_year", parseInt(yearFrom));
    if (yearTo) query = query.lte("class_year", parseInt(yearTo));
    if (minEmployment) query = query.gte("full_time_employment", parseFloat(minEmployment));

    query = query
      .order(sortBy, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      meta: {
        total: count,
        limit,
        offset,
        has_more: offset + limit < (count ?? 0),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

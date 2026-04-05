import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SORT_COLUMNS = [
  "company",
  "school",
  "year",
  "penn_intern_count",
  "hourly_median",
  "monthly_estimate",
  "levels_fyi_entries",
  "data_basis",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const school = searchParams.get("school");
    const year = searchParams.get("year");
    const company = searchParams.get("company");
    const dataSource = searchParams.get("compensation_source");
    const isProjected = searchParams.get("is_projected");
    const dataBasis = searchParams.get("data_basis");
    const sortBy = searchParams.get("sort_by") || "penn_intern_count";
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
      .from("employers")
      .select("*", { count: "exact" });

    if (school) query = query.ilike("school", school);
    if (year) query = query.eq("year", parseInt(year));
    if (company) query = query.ilike("company", `%${company}%`);
    if (dataSource) query = query.eq("compensation_source", dataSource);
    if (isProjected) query = query.eq("is_projected", isProjected === "true");
    if (dataBasis) query = query.eq("data_basis", dataBasis);

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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SORT_COLUMNS = [
  "company",
  "role",
  "major",
  "school",
  "class_year",
  "count",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const school = searchParams.get("school");
    const major = searchParams.get("major");
    const company = searchParams.get("company");
    const classYear = searchParams.get("class_year");
    const sortBy = searchParams.get("sort_by") || "major";
    const order = searchParams.get("order") || "asc";
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
      .from("major_listings")
      .select("*", { count: "exact" });

    if (school) query = query.ilike("school", school);
    if (major) query = query.ilike("major", `%${major}%`);
    if (company) query = query.ilike("company", `%${company}%`);
    if (classYear) query = query.eq("class_year", classYear);

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

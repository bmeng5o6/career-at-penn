import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/majors?school=SEAS
// Returns distinct majors, optionally filtered by school

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");

    const supabase = await createClient();

    let query = supabase
      .from("major_listings")
      .select("major, school")
      .order("major");

    if (school) query = query.ilike("school", school);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate majors
    const majors = [...new Set(data.map((r: { major: string }) => r.major))].sort();

    return NextResponse.json({ majors });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

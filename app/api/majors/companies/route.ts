import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/majors/companies?school=SEAS&major=Computer+Science
// Returns distinct companies, optionally filtered by school and/or major

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");
    const major  = searchParams.get("major");

    const supabase = await createClient();

    let query = supabase
      .from("major_listings")
      .select("company")
      .order("company");

    if (school) query = query.ilike("school", school);
    if (major)  query = query.ilike("major", major);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const companies = [...new Set(data.map((r: { company: string }) => r.company))].sort();

    return NextResponse.json({ companies });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

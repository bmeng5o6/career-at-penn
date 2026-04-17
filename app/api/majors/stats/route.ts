import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/majors/stats?major=Computer+Science&school=SEAS&company=Google
// Returns top companies, roles, class_year breakdown for a major (optionally filtered by school/company)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const major   = searchParams.get("major");
    const school  = searchParams.get("school");
    const company = searchParams.get("company");

    if (!major && !company) {
      return NextResponse.json({ error: "At least one of major or company is required" }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from("major_listings")
      .select("major, company, role, class_year, school, count");

    if (major)   query = query.ilike("major", major);
    if (school)  query = query.ilike("school", school);
    if (company) query = query.ilike("company", company);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Top companies (useful when filtering by major)
    const companyCounts: Record<string, number> = {};
    for (const row of data) {
      companyCounts[row.company] = (companyCounts[row.company] || 0) + (row.count ?? 1);
    }
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company, count]) => ({ company, count }));

    // Top majors (useful when filtering by company)
    const majorCounts: Record<string, number> = {};
    for (const row of data) {
      if (row.major) {
        majorCounts[row.major] = (majorCounts[row.major] || 0) + (row.count ?? 1);
      }
    }
    const topMajors = Object.entries(majorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([major, count]) => ({ major, count }));

    // Top roles
    const roleCounts: Record<string, number> = {};
    for (const row of data) {
      if (row.role) {
        roleCounts[row.role] = (roleCounts[row.role] || 0) + (row.count ?? 1);
      }
    }
    const topRoles = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([role, count]) => ({ role, count }));

    // Class year breakdown
    const classYearCounts: Record<string, number> = {};
    for (const row of data) {
      if (row.class_year) {
        classYearCounts[row.class_year] = (classYearCounts[row.class_year] || 0) + (row.count ?? 1);
      }
    }
    const classYearBreakdown = Object.entries(classYearCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([class_year, count]) => ({ class_year, count }));

    return NextResponse.json({
      major:  major  ?? null,
      school: school ?? null,
      company: company ?? null,
      total_listings:   data.length,
      unique_companies: Object.keys(companyCounts).length,
      unique_majors:    Object.keys(majorCounts).length,
      unique_roles:     Object.keys(roleCounts).length,
      top_companies:    topCompanies,
      top_majors:       topMajors,
      top_roles:        topRoles,
      class_year_breakdown: classYearBreakdown,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

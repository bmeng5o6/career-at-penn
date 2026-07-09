import { NextRequest, NextResponse } from "next/server";
import { getMajorsForSchools } from "@/lib/majors";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schoolParam = searchParams.get("schools") ?? "";
  const schools = schoolParam
    ? schoolParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const majors = getMajorsForSchools(schools);
  return NextResponse.json({ majors });
}

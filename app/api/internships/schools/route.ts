import { NextResponse } from "next/server";
import { getAnonClient } from "@/lib/supabase/anon";

export async function GET() {
  try {
    const supabase = getAnonClient();

    const { data, error } = await supabase
      .from("employers")
      .select("school")
      .order("school");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schools = [...new Set(data.map((row: { school: string }) => row.school))];

    return NextResponse.json(
      { schools },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

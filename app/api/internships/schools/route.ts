import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("employers")
      .select("school")
      .order("school");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schools = [...new Set(data.map((row: { school: string }) => row.school))];

    return NextResponse.json({ schools });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

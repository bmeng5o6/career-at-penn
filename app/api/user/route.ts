import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { name, school, major, class_year, clubs } = await req.json();

    const { data, error } = await supabase
      .from("user-info")
      .insert([{
        name, 
        school,
        major,
        year: class_year,
        "campus clubs and recreation": clubs,
      }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
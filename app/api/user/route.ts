import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user-info")
      .select('id, name, school, major, year, "campus clubs and recreation"')
      .order("id", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data?.[0];

    if (!row) {
      return NextResponse.json({
        id: null,
        name: "",
        school: "",
        major: "",
        class_year: "",
        clubs: "",
      });
    }

    return NextResponse.json({
      id: row.id,
      name: row.name ?? "",
      school: row.school ?? "",
      major: row.major ?? "",
      class_year: String(row.year ?? ""),
      clubs: row["campus clubs and recreation"] ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { name, school, major, class_year, clubs } = await req.json();

    const { data, error } = await supabase
      .from("user-info")
      .insert([
        {
          name,
          school,
          major,
          year: class_year ? parseInt(class_year, 10) : null,
          "campus clubs and recreation": clubs,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { id, name, school, major, class_year, clubs } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user-info")
      .update({
        name,
        school,
        major,
        year: class_year ? parseInt(class_year, 10) : null,
        "campus clubs and recreation": clubs,
      })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
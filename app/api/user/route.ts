import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Not logged in — return empty profile so the form renders
      return NextResponse.json({ id: null, name: "", school: "", major: "", class_year: "", clubs: "" });
    }

    const { data, error } = await supabase
      .from("user-info")
      .select('id, name, school, major, year, "campus clubs and recreation"')
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ id: null, name: "", school: "", major: "", class_year: "", clubs: "" });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name ?? "",
      school: data.school ?? "",
      major: data.major ?? "",
      class_year: String(data.year ?? ""),
      clubs: data["campus clubs and recreation"] ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    // No auth check — guests are allowed through

    const { name, school, major, class_year, clubs } = await req.json();

    // Only persist to DB if the user is logged in
    if (user) {
      const { data, error } = await supabase
        .from("user-info")
        .insert([{
          user_id: user.id,
          name,
          school,
          major,
          year: class_year ? parseInt(class_year, 10) : null,
          "campus clubs and recreation": clubs,
        }])
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    // Guest — acknowledge without persisting
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      .eq("user_id", user.id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
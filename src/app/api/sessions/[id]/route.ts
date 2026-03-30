import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch session (ownership enforced by RLS)
  const { data: session, error: sessionError } = await supabase
    .from("research_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch report
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("session_id", id)
    .single();

  // Fetch sources
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  // ← NEW: fetch activities from research_history
  const { data: history } = await supabase
    .from("research_history")
    .select("activities")
    .eq("id", id)
    .single();

  return NextResponse.json({
    session,
    report: report ?? null,
    sources: sources ?? [],
    activities: history?.activities ?? [],  // ← NEW
  });
}
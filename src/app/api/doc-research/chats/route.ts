import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function resolveUserId(req: NextRequest): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}
  return req.headers.get("x-user-id") ?? "anonymous";
}

const db = () => createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const documentId = req.nextUrl.searchParams.get("documentId");
    let query = db().from("rag_chats").select("id, role, content, created_at, document_id")
      .eq("user_id", userId).order("created_at", { ascending: true });
    if (documentId) query = query.eq("document_id", documentId);
    else query = query.is("document_id", null);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ messages: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const { role, content, documentId } = await req.json();
    const { error } = await db().from("rag_chats")
      .insert({ user_id: userId, role, content, document_id: documentId ?? null });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const documentId = req.nextUrl.searchParams.get("documentId");
    let query = db().from("rag_chats").delete().eq("user_id", userId);
    if (documentId) query = query.eq("document_id", documentId);
    else query = query.is("document_id", null);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

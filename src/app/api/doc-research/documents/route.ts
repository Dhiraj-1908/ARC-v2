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
  // Guest: client sends their sessionStorage guest ID
  return req.headers.get("x-user-id") ?? "anonymous";
}

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const { data, error } = await service()
      .from("rag_documents")
      .select("id, file_name, file_type, char_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ documents: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });
    const { error } = await service()
      .from("rag_documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

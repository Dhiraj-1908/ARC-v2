import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

async function resolveUserId(req: NextRequest, formData?: FormData): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}
  const fromHeader = req.headers.get("x-user-id");
  if (fromHeader) return fromHeader;
  const fromForm = formData?.get("guestId");
  if (fromForm && typeof fromForm === "string") return fromForm;
  return "anonymous";
}

async function extractText(file: File): Promise<string> {
  if (file.type === "text/plain") return await file.text();
  if (file.type === "application/pdf") {
    const { extractText } = await import("unpdf");
    const arrayBuffer = await file.arrayBuffer();
    const { text } = await extractText(new Uint8Array(arrayBuffer));
    return text.join("\n");
  }
  throw new Error(`Unsupported file type: ${file.type}. Upload a PDF or .txt file.`);
}

/** Protect abbreviations, then split on sentence-ending punctuation */
function splitIntoSentences(text: string): string[] {
  const protected_text = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Fig|fig|Vol|vol|No|pp|al)\./g, "$1<DOT>")
    .replace(/(\d+)\.(\d+)/g, "$1<DOT>$2");

  const raw = protected_text.split(/(?<=[.?!])\s+(?=[A-Z"'])/);
  return raw
    .map(s => s.replace(/<DOT>/g, ".").trim())
    .filter(s => s.length > 10);
}

/**
 * Smart semantic chunker:
 * 1. Split on paragraph boundaries first
 * 2. Within paragraphs, group sentences until maxWords budget is hit
 * 3. Overlap: carry last `overlapSentences` sentences into next chunk
 */
function chunkText(
  text: string,
  maxWords = 250,
  overlapSentences = 2
): Array<{ content: string; chunkIndex: number; sentenceCount: number }> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 20);

  const allSentences: string[] = [];
  for (const para of paragraphs) {
    allSentences.push(...splitIntoSentences(para));
  }

  const chunks: Array<{ content: string; chunkIndex: number; sentenceCount: number }> = [];
  let i = 0;
  let chunkIndex = 0;

  while (i < allSentences.length) {
    const group: string[] = [];
    let wordCount = 0;

    while (i < allSentences.length) {
      const sentWords = allSentences[i].split(/\s+/).length;
      if (wordCount + sentWords > maxWords && group.length > 0) break;
      group.push(allSentences[i]);
      wordCount += sentWords;
      i++;
    }

    const content = group.join(" ").trim();
    if (content) {
      chunks.push({ content, chunkIndex, sentenceCount: group.length });
      chunkIndex++;
    }

    // Overlap: step back by overlapSentences
    i = Math.max(i - overlapSentences, i - group.length + 1);
    // Prevent infinite loop if a single sentence exceeds maxWords
    if (group.length === 0) i++;
  }

  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEW_KEY}` },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${await res.text()}`);
  return (await res.json()).data[0].embedding as number[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = await resolveUserId(req, formData);
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const rawText = await extractText(file);
    if (!rawText.trim()) return NextResponse.json({ error: "Could not extract text from document." }, { status: 422 });

    const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: docRecord, error: docError } = await db
      .from("rag_documents")
      .insert({ user_id: userId, file_name: file.name, file_type: file.type, char_count: rawText.length })
      .select("id").single();
    if (docError) throw new Error(`DB insert failed: ${docError.message}`);
    const documentId = docRecord.id as string;

    const chunks = chunkText(rawText);
    const rows = [];

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.content);
      rows.push({
        document_id: documentId,
        user_id: userId,
        content: chunk.content,
        embedding,
        metadata: {
          file_name: file.name,
          file_type: file.type,
          chunk_index: chunk.chunkIndex,
          sentence_count: chunk.sentenceCount,
        },
      });
    }

    const { error: insertError } = await db.from("rag_chunks").insert(rows);
    if (insertError) throw new Error(`Chunk insert failed: ${insertError.message}`);

    return NextResponse.json({ success: true, documentId, fileName: file.name, chunks: chunks.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
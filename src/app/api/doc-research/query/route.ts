import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

async function resolveUserId(req: NextRequest): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {}
  return req.headers.get("x-user-id") ?? "anonymous";
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

// ✅ FIX 2: Smart token-budget trimmer instead of hardcoded slice(-6)
function trimHistoryToTokenBudget(
  history: { role: string; content: string }[],
  maxTokens = 1500
): { role: string; content: string }[] {
  let budget = maxTokens;
  const result: { role: string; content: string }[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const approxTokens = Math.ceil(history[i].content.length / 4);
    if (budget - approxTokens < 0) break;
    budget -= approxTokens;
    result.unshift(history[i]);
  }
  return result;
}

/**
 * Rewrite the user's query using chat history so follow-up questions
 * like "explain more" or "what about the second point?" are resolved
 * into a fully self-contained query before embedding.
 */
async function rewriteQuery(query: string, history: { role: string; content: string }[]): Promise<string> {
  if (history.length === 0) return query;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEW_KEY}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You are a query rewriter. Given a conversation history and a follow-up question, 
rewrite the follow-up into a fully self-contained search query that captures the user's intent. 
Output ONLY the rewritten query, nothing else.`,
        },
        // ✅ FIX 3: use token budget instead of slice(-6) here too
        ...trimHistoryToTokenBudget(history).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: `Follow-up question: "${query}"\n\nRewritten standalone query:` },
      ],
    }),
  });

  if (!res.ok) return query;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? query;
}

/**
 * Re-rank chunks using a simple but effective hybrid score:
 * - Keyword overlap between query terms and chunk content (BM25-lite)
 * - Position bonus: earlier chunks (lower chunkIndex) get slight boost
 *   since documents often front-load key info
 */
function rerankChunks(
  query: string,
  chunks: Array<{ content: string; similarity: number; metadata?: { chunk_index?: number } }>
): typeof chunks {
  const queryTerms = new Set(
    query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );

  return chunks
    .map(chunk => {
      const words = chunk.content.toLowerCase().split(/\s+/);
      const totalWords = words.length;
      const matchCount = words.filter(w => queryTerms.has(w)).length;
      const keywordScore = totalWords > 0 ? matchCount / totalWords : 0;

      const chunkIndex = chunk.metadata?.chunk_index ?? 99;
      const positionBonus = Math.max(0, 0.02 - chunkIndex * 0.001);

      const finalScore = chunk.similarity * 0.75 + keywordScore * 0.22 + positionBonus;
      return { ...chunk, finalScore };
    })
    .sort((a, b) => (b as any).finalScore - (a as any).finalScore);
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    const { query, documentId } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "Query is required." }, { status: 400 });

    const db = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Fetch recent chat history for this document
    // ✅ FIX 1: bumped from 10 → 20 so trimHistoryToTokenBudget has more to work with
    let chatHistory: { role: string; content: string }[] = [];
    try {
      let historyQuery = db
        .from("rag_chats")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (documentId) historyQuery = historyQuery.eq("document_id", documentId);
      else historyQuery = historyQuery.is("document_id", null);

      const { data } = await historyQuery;
      chatHistory = (data ?? []).reverse(); // oldest first
    } catch {}

    // 2. Rewrite query using history context
    const rewrittenQuery = await rewriteQuery(query, chatHistory);

    // 3. Embed the rewritten query
    const queryEmbedding = await getEmbedding(rewrittenQuery);

    // 4. Vector similarity search
    const { data: rawChunks, error: searchError } = await db.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_document_id: documentId ?? null,
      match_count: 30,
    });
    if (searchError) throw new Error(`Similarity search failed: ${searchError.message}`);
    if (!rawChunks || rawChunks.length === 0) {
      return NextResponse.json({ answer: "I couldn't find any relevant content in the document for your query." });
    }

    // 5. Re-rank and take top 6
    const reranked = rerankChunks(rewrittenQuery, rawChunks).slice(0, 6);

    const context = reranked
      .map((c, i) => `[Chunk ${i + 1}]\n${c.content}`)
      .join("\n\n");

    // 6. Build messages: system + history + current query
    // ✅ FIX 4 (system prompt): removed ONLY — model can now reason beyond the document
    const systemPrompt = `You are an intelligent research assistant. Your primary source is the provided document context below.

- For factual questions: answer using the document context, and cite chunk numbers when relevant.
- For questions requiring inference, prediction, or analysis (e.g. salary estimates, quality judgments, recommendations): use the document as a foundation and apply your own knowledge to give a helpful, reasoned answer. Clearly indicate when you are going beyond the document.
- If the document has no relevant info AND the question can't be answered from general knowledge, say so.

DOCUMENT CONTEXT:
${context}`;

    const messages = [
      { role: "system", content: systemPrompt },
      // ✅ FIX 3: token-budget trim instead of hardcoded slice(-6)
      ...trimHistoryToTokenBudget(chatHistory).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: query },
    ];

    // 7. Stream LLM response
    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NEW_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        stream: true,
        messages,
      }),
    });
    if (!llmRes.ok) throw new Error(`LLM error: ${await llmRes.text()}`);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmRes.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split("\n").filter(l => l.startsWith("data: "))) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") continue;
            try {
              const content = JSON.parse(data).choices?.[0]?.delta?.content;
              if (content) controller.enqueue(encoder.encode(content));
            } catch {}
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[query]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
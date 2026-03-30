// src/lib/rag/utils.ts

// ─── BM25 (keyword retrieval) ────────────────────────────────────────────────

export function bm25Score(
  query: string,
  corpus: { id: string; content: string }[],
  k1 = 1.5,
  b = 0.75
): { id: string; score: number }[] {
  const tokenize = (text: string) =>
    text.toLowerCase().match(/\b\w+\b/g) ?? [];

  const queryTerms = tokenize(query);
  const docTokens = corpus.map((d) => tokenize(d.content));
  const avgDl = docTokens.reduce((s, t) => s + t.length, 0) / (docTokens.length || 1);

  // Build IDF map
  const df: Record<string, number> = {};
  for (const terms of docTokens) {
    for (const t of new Set(terms)) df[t] = (df[t] ?? 0) + 1;
  }
  const N = corpus.length;
  const idf = (term: string) =>
    Math.log((N - (df[term] ?? 0) + 0.5) / ((df[term] ?? 0) + 0.5) + 1);

  return corpus.map((doc, i) => {
    const terms = docTokens[i];
    const dl = terms.length;
    const tf: Record<string, number> = {};
    for (const t of terms) tf[t] = (tf[t] ?? 0) + 1;

    let score = 0;
    for (const term of queryTerms) {
      const f = tf[term] ?? 0;
      score += idf(term) * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / avgDl))));
    }
    return { id: doc.id, score };
  });
}

// ─── Reciprocal Rank Fusion ──────────────────────────────────────────────────

export function reciprocalRankFusion(
  lists: { id: string; score: number }[][],
  k = 60
): { id: string; score: number }[] {
  const scores: Record<string, number> = {};
  for (const list of lists) {
    const sorted = [...list].sort((a, b) => b.score - a.score);
    sorted.forEach(({ id }, rank) => {
      scores[id] = (scores[id] ?? 0) + 1 / (k + rank + 1);
    });
  }
  return Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

// ─── Context compression ─────────────────────────────────────────────────────

export async function compressChunks(
  query: string,
  chunks: { id: string; content: string }[],
  openrouterKey: string
): Promise<{ id: string; content: string }[]> {
  const prompt = `Given the user query below, extract only the 1–3 sentences from each chunk that are most relevant to answering it. If a chunk has nothing relevant, return an empty string for it.

Query: "${query}"

Chunks (JSON array):
${JSON.stringify(chunks.map((c) => ({ id: c.id, content: c.content })))}

Respond ONLY with a JSON array: [{"id":"...","relevant":"..."}]`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openrouterKey}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return chunks; // fallback: return originals on failure

  try {
    const raw = (await res.json()).choices[0].message.content as string;
    const parsed: { id: string; relevant: string }[] = JSON.parse(raw);
    // If it's wrapped in an object key, unwrap
    const arr = Array.isArray(parsed) ? parsed : (Object.values(parsed)[0] as typeof parsed);
    return arr
      .filter((r) => r.relevant?.trim())
      .map((r) => ({ id: r.id, content: r.relevant }));
  } catch {
    return chunks; // fallback
  }
}

// ─── Faithfulness pre-check ──────────────────────────────────────────────────

export async function isFaithfullyAnswerable(
  query: string,
  contextChunks: string[],
  openrouterKey: string
): Promise<boolean> {
  const context = contextChunks.join("\n\n");
  const prompt = `You are a strict relevance judge. Given the context below, decide if the query can be answered from it — even partially.

Context:
${context}

Query: "${query}"

Reply with exactly one word: YES or NO.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openrouterKey}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5,
    }),
  });
  if (!res.ok) return true; // fail open: let the LLM try
  const answer = (await res.json()).choices[0].message.content?.trim().toUpperCase();
  return answer !== "NO";
}

// ─── Self-critique post-check ────────────────────────────────────────────────

export async function selfCritiqueAnswer(
  answer: string,
  contextChunks: string[],
  openrouterKey: string
): Promise<{ ok: boolean; reason?: string }> {
  const context = contextChunks.join("\n\n");
  const prompt = `Does the answer below contradict or go beyond what the context supports? Reply with JSON: {"ok": true} if the answer is faithful, or {"ok": false, "reason": "..."} if not.

Context:
${context}

Answer:
${answer}`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openrouterKey}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { ok: true };
  try {
    return JSON.parse((await res.json()).choices[0].message.content);
  } catch {
    return { ok: true };
  }
}

// ─── Semantic cache (in-memory, per process) ─────────────────────────────────

type CacheEntry = { answer: string; embedding: number[]; ts: number };
const semanticCache: CacheEntry[] = [];
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_THRESHOLD = 0.97;

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function cacheGet(queryEmbedding: number[]): string | null {
  const now = Date.now();
  for (const entry of semanticCache) {
    if (now - entry.ts > CACHE_TTL_MS) continue;
    if (cosineSim(queryEmbedding, entry.embedding) >= CACHE_THRESHOLD) {
      return entry.answer;
    }
  }
  return null;
}

export function cacheSet(queryEmbedding: number[], answer: string): void {
  semanticCache.push({ answer, embedding: queryEmbedding, ts: Date.now() });
  // Keep cache from growing unbounded
  if (semanticCache.length > 500) semanticCache.splice(0, 100);
}
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { question, reportContent, reportTopic, history } = await req.json();

  const systemPrompt = `You are a knowledgeable research assistant. The user has a research report on "${reportTopic}".
Answer their questions using the report as your primary context. Be concise, accurate, and helpful.
If the answer isn't in the report, say so clearly and answer from your general knowledge.

REPORT CONTENT:
${(reportContent || "").slice(0, 12000)}`;

  const messages = [
    ...(history || []),
    { role: "user", content: question },
  ];

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.NEW_KEY || ""}`,
      "HTTP-Referer": "https://arc-research.app",
      "X-Title": "ARC Research Curator",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3-haiku",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenRouter report-chat error:", response.status, errText);
    return new Response(`API error: ${response.status}`, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
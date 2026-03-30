import { createDataStreamResponse } from "ai";
import { ResearchState } from "./types";
import { deepResearch } from "./main";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessageContent = messages[messages.length - 1].content;
    const parsed = JSON.parse(lastMessageContent);
    const topic = parsed.topic;
    const clarifications = parsed.clarifications;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Create session row
    let sessionId: string | null = null;
    if (user) {
      const { data: session, error } = await supabase
        .from("research_sessions")
        .insert({
          user_id: user.id,
          topic,
          clarifications,
          status: "running",
        })
        .select("id")
        .single();

      if (!error && session) {
        sessionId = session.id;
      }
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Stream the sessionId immediately so client can use it
        if (sessionId) {
          dataStream.writeData({ type: "session", content: { sessionId } });
        }

        const researchState: ResearchState = {
          topic,
          completedSteps: 0,
          tokenUsed: 0,
          findings: [],
          processedUrl: new Set(),
          clarificationsText: JSON.stringify(clarifications),
          reportMarkdown: "",
          activities: [],  // ← NEW
        };

        await deepResearch(researchState, dataStream);

        // Save everything after pipeline finishes
        if (user && sessionId) {
          const wordCount = researchState.reportMarkdown
            .split(/\s+/)
            .filter(Boolean).length;

          // Save report
          await supabase.from("reports").insert({
            session_id: sessionId,
            content: researchState.reportMarkdown,
            token_used: researchState.tokenUsed,
            iteration_count: researchState.completedSteps,
            word_count: wordCount,
          });

          // Build source rows
          const seen = new Set<string>();
          const sourceRows = researchState.findings
            .filter((f) => {
              if (!f.source || seen.has(f.source)) return false;
              seen.add(f.source);
              return true;
            })
            .map((f) => ({
              session_id: sessionId,
              url: f.source,
              title: f.source.split("/")[2] || f.source,
            }));

          if (sourceRows.length > 0) {
            await supabase.from("sources").insert(sourceRows);
          }

          // ← NEW: save to research_history with activities
          await supabase.from("research_history").insert({
            id: sessionId,
            topic,
            report: researchState.reportMarkdown,
            sources: sourceRows.map((s) => ({ url: s.url, title: s.title })),
            activities: researchState.activities,
            created_at: Date.now(),
          });

          // Mark session complete
          await supabase
            .from("research_sessions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
        }
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Invalid message format!",
      }),
      { status: 200 }
    );
  }
}
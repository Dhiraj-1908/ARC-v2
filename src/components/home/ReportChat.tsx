"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, SendHorizonal, MessageSquare, Trash2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── localStorage fallback for guests ─────────────────────────────────────────
const LOCAL_KEY = "arc_chat_v1";
function localLoad(sessionId: string): ChatMessage[] {
  try { return JSON.parse(localStorage.getItem(`${LOCAL_KEY}_${sessionId}`) ?? "[]"); }
  catch { return []; }
}
function localSave(sessionId: string, msgs: ChatMessage[]) {
  try { localStorage.setItem(`${LOCAL_KEY}_${sessionId}`, JSON.stringify(msgs)); } catch { /* full */ }
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbLoad(sessionId: string): Promise<ChatMessage[] | null> {
  try {
    const res = await fetch(`/api/report-chat/history?sessionId=${sessionId}`);
    if (!res.ok) return null;
    const { messages } = await res.json();
    return (messages ?? []).map((m: any) => ({ role: m.role, content: m.content }));
  } catch { return null; }
}

async function dbSave(sessionId: string, role: string, content: string): Promise<boolean> {
  try {
    const res = await fetch("/api/report-chat/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, role, content }),
    });
    return res.ok;
  } catch { return false; }
}

async function dbClear(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/report-chat/history?sessionId=${sessionId}`, { method: "DELETE" });
    return res.ok;
  } catch { return false; }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReportChatProps {
  reportContent: string;
  reportTopic: string;
  isDarkMode: boolean;
  sessionId: string | null;
  isLoggedIn?: boolean; // true → DB, false → localStorage
}

const SUGGESTIONS = [
  "Summarize the key takeaways",
  "What are the most important concepts?",
  "Give me a quick quiz on this topic",
  "What should I study next?",
];

export default function ReportChat({
  reportContent, reportTopic, isDarkMode, sessionId, isLoggedIn = false,
}: ReportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setMessages([]); setLoaded(true); return; }

    setLoaded(false);
    (async () => {
      if (isLoggedIn) {
        const dbMsgs = await dbLoad(sessionId);
        // fall back to localStorage if DB fails (e.g. temp session not yet persisted)
        setMessages(dbMsgs ?? localLoad(sessionId));
      } else {
        setMessages(localLoad(sessionId));
      }
      setLoaded(true);
    })();
  }, [sessionId, isLoggedIn]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || streaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = { role: "user", content: question };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const withUser = [...messages, userMsg];
    setMessages(withUser);

    // Persist user message immediately (fire-and-forget)
    if (sessionId) {
      if (isLoggedIn) dbSave(sessionId, "user", question);
      else localSave(sessionId, withUser);
    }

    setStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/report-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, reportContent, reportTopic, history }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setStreamingText(full);
      }

      const withAssistant: ChatMessage[] = [...withUser, { role: "assistant", content: full }];
      setMessages(withAssistant);

      // Persist assistant reply
      if (sessionId) {
        if (isLoggedIn) dbSave(sessionId, "assistant", full);
        else localSave(sessionId, withAssistant);
      }
    } catch (err) {
      console.error("Report chat error:", err);
      const errContent = "Sorry, something went wrong. Please try again.";
      const withErr: ChatMessage[] = [...withUser, { role: "assistant", content: errContent }];
      setMessages(withErr);
      if (sessionId) {
        if (isLoggedIn) dbSave(sessionId, "assistant", errContent);
        else localSave(sessionId, withErr);
      }
    } finally {
      setStreaming(false);
      setStreamingText("");
    }
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clearChat = async () => {
    if (!sessionId || clearing) return;
    setClearing(true);
    if (isLoggedIn) await dbClear(sessionId);
    else localStorage.removeItem(`${LOCAL_KEY}_${sessionId}`);
    setMessages([]);
    setClearing(false);
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const t = isDarkMode ? {
    wrap: "bg-white/[0.025] border-white/[0.07]",
    header: "border-white/[0.07]",
    text: "text-gray-100",
    muted: "text-gray-500",
    userBubble: "bg-red-500/15 text-gray-100 border border-red-500/20",
    aiBubble: "bg-white/[0.04] text-gray-200 border border-white/[0.07]",
    input: "bg-white/[0.04] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-red-500/40",
    send: "bg-red-500/20 hover:bg-red-500/30 text-red-400 disabled:opacity-30",
    chip: "bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-gray-200 hover:bg-white/[0.08] hover:border-white/[0.15]",
    clearBtn: "text-gray-600 hover:text-red-400",
  } : {
    wrap: "bg-white border-gray-200",
    header: "border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    userBubble: "bg-red-50 text-gray-900 border border-red-200",
    aiBubble: "bg-gray-50 text-gray-800 border border-gray-200",
    input: "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400",
    send: "bg-red-500 hover:bg-red-600 text-white disabled:opacity-30",
    chip: "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300",
    clearBtn: "text-gray-400 hover:text-red-500",
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className={`rounded-2xl border ${t.wrap} overflow-hidden mt-4 flex items-center justify-center py-8`}>
        <Loader2 size={16} className="animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${t.wrap} overflow-hidden mt-4`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${t.header}`}>
        <MessageSquare size={13} className="text-red-400" />
        <span className={`text-xs font-semibold ${t.text}`}>Ask about this report</span>
        {!isLoggedIn && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 ml-1">
            guest · not saved
          </span>
        )}
        <span className={`text-[10px] ml-auto ${t.muted} truncate max-w-[180px]`}>{reportTopic}</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            disabled={clearing}
            title="Clear chat history"
            className={`ml-2 shrink-0 transition-colors ${t.clearBtn}`}
          >
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="min-h-[80px] max-h-[420px] overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${t.chip}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border ${m.role === "user" ? t.userBubble : t.aiBubble}`}>
              {m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    code: ({ children }) => <code className={`px-1 rounded text-[11px] ${isDarkMode ? "bg-white/10" : "bg-gray-200"}`}>{children}</code>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              ) : m.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border ${t.aiBubble}`}>
              {streamingText ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    code: ({ children }) => <code className={`px-1 rounded text-[11px] ${isDarkMode ? "bg-white/10" : "bg-gray-200"}`}>{children}</code>,
                  }}
                >
                  {streamingText}
                </ReactMarkdown>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
              {streamingText && (
                <span className="inline-block w-0.5 h-3.5 bg-red-400 ml-0.5 align-text-bottom animate-pulse" />
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`flex items-end gap-2 px-4 pb-4 pt-2 border-t ${t.header}`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Ask anything about this report…"
          rows={1}
          className={`flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${t.input}`}
          style={{ minHeight: "38px", maxHeight: "120px" }}
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={!input.trim() || streaming}
          className={`rounded-xl p-2.5 transition-all shrink-0 ${t.send}`}
        >
          {streaming
            ? <Loader2 size={14} className="animate-spin" />
            : <SendHorizonal size={14} />
          }
        </button>
      </div>
    </div>
  );
}

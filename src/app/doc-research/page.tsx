"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Upload, FileText, Trash2, SendHorizonal, Loader2,
  ChevronLeft, Sun, Moon, Database, GitBranch, CheckCircle2,
  AlertCircle, FileUp, MessageSquare, X, Sparkles, LogIn,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  char_count: number;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const UPLOAD_STEPS = [
  { label: "Extracting text…",        detail: "Reading document content" },
  { label: "Chunking into segments…", detail: "Splitting into 300-word chunks" },
  { label: "Generating embeddings…",  detail: "Vectorising each chunk" },
  { label: "Storing in database…",    detail: "Writing chunks to pgvector" },
];

const QUICK_PROMPTS = [
  "Summarize this document",
  "What are the key points?",
  "List the main topics",
  "What conclusions are drawn?",
];

function getOrCreateGuestId(): string {
  let id = sessionStorage.getItem("arc_doc_guest_id");
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    sessionStorage.setItem("arc_doc_guest_id", id);
  }
  return id;
}

function UploadAnimation({ step, isDarkMode }: { step: number; isDarkMode: boolean }) {
  const done = step >= 4;
  const [displayStep, setDisplayStep] = useState(0);

  useEffect(() => {
    if (done) return;
    const durations = [1000, 1200, 1800, 3000];
    const timer = setTimeout(() => {
      setDisplayStep(s => (s + 1) % 4);
    }, durations[displayStep]);
    return () => clearTimeout(timer);
  }, [displayStep, done]);

  const active = done ? 4 : displayStep;

  const red   = (a: number) => `rgba(239,68,68,${a})`;
  const green = (a: number) => `rgba(34,197,94,${a})`;
  


  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full px-4" style={{ minHeight: 340 }}>
      <style>{`
        @keyframes ua-slice  { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
        @keyframes ua-chunk  { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ua-bar    { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes ua-dot    { 0%{offset-distance:0%;opacity:1} 80%{opacity:1} 100%{offset-distance:100%;opacity:0} }
        @keyframes ua-fill   { from{height:0} to{height:var(--fh)} }
        @keyframes ua-pop    { 0%{transform:scale(0)} 60%{transform:scale(1.18)} 100%{transform:scale(1)} }
        @keyframes ua-pulse  { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes progress-drain { from { width: 100% } to { width: 0% } }
        @keyframes ua-fadein { from{opacity:0} to{opacity:1} }
        @keyframes ua-fadeout{ from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(8px)} }
        @keyframes ua-absorb { 0%{opacity:1;transform:scale(1)} 70%{opacity:.4;transform:scale(.7)} 100%{opacity:0;transform:scale(0)} }
        .ua-slice  { transform-origin: left center; animation: ua-slice .2s ease both; }
        .ua-chunk  { animation: ua-chunk .25s ease both; }
        .ua-bar    { transform-origin: bottom center; animation: ua-bar .28s cubic-bezier(.34,1.2,.64,1) both; }
        .ua-dot    {
          animation: ua-dot 1.1s ease-in-out infinite;
          offset-path: path('M 200 162 C 270 162 320 200 370 200');
          width: 6px; height: 6px; border-radius: 50%;
          background: ${red(0.8)};
          position: absolute; top: 0; left: 0;
        }
        .ua-fill   { animation: ua-fill .4s ease both; }
        .ua-pop    { animation: ua-pop .25s cubic-bezier(.34,1.56,.64,1) both; }
        .ua-pulse  { animation: ua-pulse .6s ease-in-out infinite; }
        .ua-fadein { animation: ua-fadein .25s ease both; }
        .ua-absorb { animation: ua-absorb .7s ease forwards; }
      `}</style>

      {/* ── Stage 0: Extract ── */}
      {active === 0 && (
        <div className="ua-fadein flex flex-col items-center gap-4">
          <svg width="160" height="190" viewBox="0 0 160 190">
            <rect x="30" y="10" width="100" height="130" rx="6"
              fill={red(0.08)} stroke={red(0.4)} strokeWidth="1"/>
            <path d="M108 10 L130 32 L108 32 Z" fill={red(0.15)} stroke={red(0.3)} strokeWidth="0.5"/>
            {[40, 54, 68, 82, 96, 110].map((y, i) => (
              <rect key={i} x="44" y={y} width={i % 3 === 2 ? 48 : 72} height="6" rx="2"
                fill={red(0.25)} className="ua-pulse"
                style={{ animationDelay: `${i * 120}ms` }}/>
            ))}
            <rect x="30" y="55" width="100" height="2" rx="1" fill={red(0.6)} className="ua-pulse"
              style={{ animationDuration: "0.7s" }}/>
            <text x="80" y="170" textAnchor="middle" fontSize="11"
              fill={isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)"} fontFamily="inherit">
              Extracting text…
            </text>
          </svg>
        </div>
      )}

      {/* ── Stage 1: Chunking ── */}
      {active === 1 && (
        <div className="ua-fadein flex flex-col items-center gap-3">
          <svg width="340" height="210" viewBox="0 0 340 210">
            <rect x="120" y="8" width="100" height="90" rx="5"
              fill={red(0.06)} stroke={red(0.25)} strokeWidth="1" strokeDasharray="4 2"/>
            {[34, 56, 78].map((y, i) => (
              <line key={i} x1="120" y1={y} x2="220" y2={y}
                stroke={red(0.7)} strokeWidth="1.2" strokeDasharray="3 2"
                className="ua-slice" style={{ animationDelay: `${i * 180}ms` }}/>
            ))}
            {[{ x: 8, delay: 0 }, { x: 88, delay: 90 }, { x: 168, delay: 180 }, { x: 248, delay: 270 }]
              .map((c, i) => (
              <g key={i} className="ua-chunk" style={{ animationDelay: `${c.delay + 200}ms` }}>
                <rect x={c.x} y="118" width="72" height="74" rx="5"
                  fill={red(0.1)} stroke={red(0.45)} strokeWidth="1"/>
                {[130, 143, 156, 169].map((ly, j) => (
                  <rect key={j} x={c.x + 8} y={ly} width={j === 3 ? 32 : 56} height="5" rx="1.5"
                    fill={red(0.3)}/>
                ))}
                <text x={c.x + 36} y="203" textAnchor="middle" fontSize="10"
                  fill={isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontFamily="inherit">
                  chunk {i + 1}
                </text>
              </g>
            ))}
          </svg>
          <p style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontFamily: "inherit" }}>
            Splitting into 300-word chunks…
          </p>
        </div>
      )}

      {/* ── Stage 2: Embedding ── */}
      {active === 2 && (
        <div className="ua-fadein flex flex-col items-center gap-3">
          <svg width="360" height="190" viewBox="0 0 360 190">
            {[0, 1, 2, 3].map(i => {
              const cx = 20 + i * 84;
              const bars = [10, 18, 7, 22, 14, 19, 9, 16];
              return (
                <g key={i}>
                  <rect x={cx} y="110" width="68" height="60" rx="5"
                    fill={red(0.07)} stroke={red(0.25)} strokeWidth="1"/>
                  {[120, 132, 144, 156].map((ly, j) => (
                    <rect key={j} x={cx + 7} y={ly} width={j === 3 ? 28 : 54} height="4" rx="1"
                      fill={red(0.22)}/>
                  ))}
                  {bars.map((h, j) => (
                    <rect key={j}
                      x={cx + 4 + j * 8} y={108 - h} width="6" height={h} rx="1"
                      fill={red(0.65)} className="ua-bar"
                      style={{ animationDelay: `${i * 80 + j * 30}ms`, transformOrigin: `${cx + 4 + j * 8 + 3}px 108px` }}/>
                  ))}
                  <text x={cx + 34} y="182" textAnchor="middle" fontSize="10"
                    fill={isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontFamily="inherit">
                    [{i === 0 ? "0.82…" : i === 1 ? "−0.41…" : i === 2 ? "0.17…" : "0.63…"}]
                  </text>
                </g>
              );
            })}
            <text x="180" y="20" textAnchor="middle" fontSize="11"
              fill={isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontFamily="inherit">
              Each chunk → high-dimensional vector
            </text>
          </svg>
          <p style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontFamily: "inherit" }}>
            Generating embeddings…
          </p>
        </div>
      )}

      {/* ── Stage 3: Storing ── */}
      {active === 3 && (
        <div className="ua-fadein flex flex-col items-center gap-2">
          <svg width="440" height="230" viewBox="0 0 440 230">
            <line x1="40" y1="185" x2="280" y2="185" stroke={red(0.2)} strokeWidth="1"/>
            <line x1="40" y1="20"  x2="40"  y2="185" stroke={red(0.2)} strokeWidth="1"/>
            <text x="160" y="198" textAnchor="middle" fontSize="8" fill={isDarkMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)"} fontFamily="inherit">dimension 1</text>
            <text x="13" y="103" textAnchor="middle" fontSize="8" fill={isDarkMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)"} fontFamily="inherit" transform="rotate(-90,13,103)">dimension 2</text>
            <ellipse cx="210" cy="60" rx="34" ry="24"
              fill="rgba(239,68,68,0.07)" stroke="rgba(239,68,68,0.22)" strokeWidth="1" strokeDasharray="3 2"
              className="ua-fadein" style={{ animationDelay: "150ms" }}/>
            <text x="210" y="42" textAnchor="middle" fontSize="8" fill={red(0.5)} fontFamily="inherit"
              className="ua-fadein" style={{ animationDelay: "180ms" }}>Methodology</text>
            {[{cx:196,cy:55},{cx:212,cy:65},{cx:224,cy:54},{cx:203,cy:70},{cx:220,cy:72}].map((p,i)=>(
              <circle key={i} cx={p.cx} cy={p.cy} r="4"
                fill={red(0.75)} stroke={red(0.3)} strokeWidth="1"
                className="ua-pop" style={{ animationDelay: `${300+i*100}ms` }}/>
            ))}
            {[[196,55,212,65],[212,65,224,54],[212,65,203,70],[203,70,220,72]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={red(0.18)} strokeWidth="1"
                className="ua-fadein" style={{ animationDelay: `${650+i*70}ms` }}/>
            ))}
            <ellipse cx="220" cy="148" rx="38" ry="22"
              fill="rgba(99,102,241,0.07)" stroke="rgba(99,102,241,0.22)" strokeWidth="1" strokeDasharray="3 2"
              className="ua-fadein" style={{ animationDelay: "150ms" }}/>
            <text x="220" y="130" textAnchor="middle" fontSize="8" fill="rgba(99,102,241,0.6)" fontFamily="inherit"
              className="ua-fadein" style={{ animationDelay: "180ms" }}>Results</text>
            {[{cx:204,cy:146},{cx:218,cy:154},{cx:233,cy:144},{cx:212,cy:158},{cx:228,cy:160}].map((p,i)=>(
              <circle key={i} cx={p.cx} cy={p.cy} r="4"
                fill="rgba(99,102,241,0.8)" stroke="rgba(99,102,241,0.35)" strokeWidth="1"
                className="ua-pop" style={{ animationDelay: `${450+i*100}ms` }}/>
            ))}
            {[[204,146,218,154],[218,154,233,144],[218,154,212,158]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(99,102,241,0.2)" strokeWidth="1"
                className="ua-fadein" style={{ animationDelay: `${780+i*70}ms` }}/>
            ))}
            <ellipse cx="100" cy="112" rx="38" ry="24"
              fill="rgba(34,197,94,0.07)" stroke="rgba(34,197,94,0.22)" strokeWidth="1" strokeDasharray="3 2"
              className="ua-fadein" style={{ animationDelay: "150ms" }}/>
            <text x="100" y="93" textAnchor="middle" fontSize="8" fill="rgba(34,197,94,0.55)" fontFamily="inherit"
              className="ua-fadein" style={{ animationDelay: "180ms" }}>Introduction</text>
            {[{cx:85,cy:108},{cx:100,cy:117},{cx:115,cy:107},{cx:92,cy:122},{cx:110,cy:121}].map((p,i)=>(
              <circle key={i} cx={p.cx} cy={p.cy} r="4"
                fill="rgba(34,197,94,0.75)" stroke="rgba(34,197,94,0.3)" strokeWidth="1"
                className="ua-pop" style={{ animationDelay: `${600+i*100}ms` }}/>
            ))}
            {[[85,108,100,117],[100,117,115,107],[100,117,92,122]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(34,197,94,0.2)" strokeWidth="1"
                className="ua-fadein" style={{ animationDelay: `${900+i*70}ms` }}/>
            ))}
            <path d="M 282 103 C 300 103 305 103 318 103"
              fill="none" stroke={red(0.35)} strokeWidth="1.5" strokeDasharray="4 3"
              className="ua-fadein" style={{ animationDelay: "700ms" }}/>
            <polygon points="318,99 326,103 318,107"
              fill={red(0.45)}
              className="ua-fadein" style={{ animationDelay: "750ms" }}/>
            <text x="304" y="97" textAnchor="middle" fontSize="7.5"
              fill={isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} fontFamily="inherit"
              className="ua-fadein" style={{ animationDelay: "750ms" }}>stored as</text>
            <ellipse cx="378" cy="72" rx="42" ry="13"
              fill={red(0.12)} stroke={red(0.4)} strokeWidth="1"
              className="ua-fadein" style={{ animationDelay: "800ms" }}/>
            <rect x="336" y="72" width="84" height="90" rx="0"
              fill={red(0.05)} stroke="none"
              className="ua-fadein" style={{ animationDelay: "800ms" }}/>
            <line x1="336" y1="72" x2="336" y2="162" stroke={red(0.3)} strokeWidth="1"
              className="ua-fadein" style={{ animationDelay: "800ms" }}/>
            <line x1="420" y1="72" x2="420" y2="162" stroke={red(0.3)} strokeWidth="1"
              className="ua-fadein" style={{ animationDelay: "800ms" }}/>
            {[
              { color: "rgba(239,68,68,0.7)",   delay: 950  },
              { color: "rgba(239,68,68,0.7)",   delay: 1080 },
              { color: "rgba(99,102,241,0.75)", delay: 1210 },
              { color: "rgba(34,197,94,0.7)",   delay: 1340 },
              { color: "rgba(99,102,241,0.75)", delay: 1470 },
            ].map((row, i) => (
              <g key={i} className="ua-chunk" style={{ animationDelay: `${row.delay}ms` }}>
                <rect x="338" y={79 + i * 16} width="80" height="13" rx="2"
                  fill={row.color.replace(/[\d.]+\)$/, "0.12)")}
                  stroke={row.color.replace(/[\d.]+\)$/, "0.3)")} strokeWidth="0.5"/>
                <circle cx="345" cy={85.5 + i * 16} r="3" fill={row.color}/>
                {[0,1,2,3,4,5].map(j => (
                  <rect key={j}
                    x={352 + j * 9} y={80 + i * 16 + (j % 2 === 0 ? 2 : 5)}
                    width="6" height={j % 2 === 0 ? 7 : 4} rx="1"
                    fill={row.color.replace(/[\d.]+\)$/, "0.5)")}/>
                ))}
              </g>
            ))}
            <ellipse cx="378" cy="162" rx="42" ry="13"
              fill={red(0.1)} stroke={red(0.35)} strokeWidth="1"
              className="ua-fadein" style={{ animationDelay: "850ms" }}/>
            <text x="378" y="188" textAnchor="middle" fontSize="9"
              fill={isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} fontFamily="inherit"
              className="ua-fadein" style={{ animationDelay: "900ms" }}>pgvector</text>
            <text x="160" y="213" textAnchor="middle" fontSize="8"
              fill={isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} fontFamily="inherit">embedding space</text>
          </svg>
          <p style={{ fontSize: 11, color: isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontFamily: "inherit" }}>
            Similar chunks cluster by meaning → stored as coordinate vectors
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {active === 4 && (
        <div className="ua-fadein flex flex-col items-center gap-4">
          <svg width="200" height="160" viewBox="0 0 200 160">
            <ellipse cx="100" cy="50" rx="60" ry="18"
              fill={green(0.15)} stroke={green(0.5)} strokeWidth="1"/>
            <rect x="40" y="50" width="120" height="70"
              fill={green(0.07)} stroke="none"/>
            {[0, 1, 2, 3].map(i => (
              <rect key={i} x="42" y={57 + i * 16} width="116" height="12" rx="2"
                fill={green(0.15)} stroke={green(0.3)} strokeWidth="0.5"/>
            ))}
            <ellipse cx="100" cy="120" rx="60" ry="18"
              fill={green(0.15)} stroke={green(0.45)} strokeWidth="1"/>
            <circle cx="100" cy="85" r="20" fill={green(0.9)} className="ua-pop"/>
            <path d="M90 85l7 7 13-14" fill="none" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" className="ua-pop"
              style={{ animationDelay: "120ms" }}/>
          </svg>
          <p style={{ fontSize: 12, fontWeight: 500, color: isDarkMode ? "#4ade80" : "#15803d", fontFamily: "inherit" }}>
            Embedded successfully — ready to chat
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocResearchPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [backend, setBackend] = useState<"vector" | "graph">("vector");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(-1);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showUploadResult, setShowUploadResult] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestId, setGuestId] = useState<string>("");
  const [fadingOut, setFadingOut] = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const stepTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadBtnRef = useRef<HTMLButtonElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("arcThemeMode");
    setIsDarkMode(saved ? saved === "dark" : true);
    const gid = getOrCreateGuestId();
    setGuestId(gid);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
  }, []);

  // ── Auth headers ──────────────────────────────────────────────────────────
  const authHeaders = useCallback((): Record<string, string> => {
    if (isLoggedIn) return {};
    return { "x-user-id": guestId };
  }, [isLoggedIn, guestId]);

  const toggleMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("arcThemeMode", next ? "dark" : "light");
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const d = {
    pageBg:        isDarkMode ? "bg-[#0d0f16]"                        : "bg-[#f0f2f8]",
    sidebarBg:     isDarkMode ? "bg-[#0b0d14]"                        : "bg-white",
    mainBg:        isDarkMode ? "bg-[#0d0f16]"                        : "bg-[#f0f2f8]",
    border:        isDarkMode ? "border-white/[0.07]"                  : "border-gray-200",
    text:          isDarkMode ? "text-gray-100"                        : "text-gray-900",
    muted:         isDarkMode ? "text-gray-500"                        : "text-gray-500",
    mutedLight:    isDarkMode ? "text-gray-600"                        : "text-gray-400",
    hover:         isDarkMode ? "hover:bg-white/[0.05]"                : "hover:bg-gray-50",
    radioActive:   isDarkMode ? "bg-red-500/10 border-red-500/30"      : "bg-red-50 border-red-300",
    radioInactive: isDarkMode ? "bg-white/[0.03] border-white/[0.09]" : "bg-gray-50 border-gray-200",
    dropzone:      isDarkMode
      ? "border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] hover:border-red-500/30"
      : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-red-400",
    dropzoneOver:  isDarkMode ? "border-red-500/50 bg-red-500/5"       : "border-red-400 bg-red-50",
    docItem:       isDarkMode ? "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50",
    docActive:     isDarkMode ? "bg-red-500/10 border-red-500/25"      : "bg-red-50 border-red-300",
    userBubble:    isDarkMode ? "bg-red-500/15 border-red-500/20 text-gray-100" : "bg-red-500 border-red-600 text-white",
    aiBubble:      isDarkMode ? "bg-white/[0.04] border-white/[0.07] text-gray-200" : "bg-white border-gray-200 text-gray-800",
    sendBtn:       isDarkMode ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" : "bg-red-500 hover:bg-red-600 text-white",
    uploadBtn:     "bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400",
    successBanner: isDarkMode ? "bg-green-500/8 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700",
    errorBanner:   isDarkMode ? "bg-red-500/8 border-red-500/20 text-red-400"      : "bg-red-50 border-red-200 text-red-700",
    guestBanner:   isDarkMode ? "bg-white/[0.03] border-white/[0.07] text-gray-500" : "bg-amber-50 border-amber-200 text-amber-700",
    scrollbar:     isDarkMode ? "#ffffff12" : "#00000015",
    headerBg:      isDarkMode ? "bg-[#0b0d14]/95 backdrop-blur" : "bg-white/95 backdrop-blur",
    footerBg:      isDarkMode ? "bg-[#0d0f16]/95 backdrop-blur border-white/[0.06]" : "bg-white/95 backdrop-blur border-gray-200",
    stepBg:        isDarkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-gray-50 border-gray-200",
    stepDone:      isDarkMode ? "text-green-400" : "text-green-600",
    stepActive:    isDarkMode ? "text-red-400"   : "text-red-500",
    stepPending:   isDarkMode ? "text-gray-600"  : "text-gray-400",
  };

  // ── Load documents ────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    if (!guestId && !isLoggedIn) return;
    setLoadingDocs(true);
    try {
      const res = await fetch("/api/doc-research/documents", { headers: authHeaders() });
      if (res.ok) setDocuments((await res.json()).documents ?? []);
    } catch (e) { console.error(e); }
    setLoadingDocs(false);
  }, [guestId, isLoggedIn, authHeaders]);

  useEffect(() => {
    if (guestId || isLoggedIn) loadDocuments();
  }, [guestId, isLoggedIn, loadDocuments]);

  // ── Load chat history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!guestId && !isLoggedIn) return;
    const loadChat = async () => {
      setLoadingChat(true);
      setMessages([]);
      try {
        const url = activeDocId
          ? `/api/doc-research/chats?documentId=${activeDocId}`
          : `/api/doc-research/chats`;
        const res = await fetch(url, { headers: authHeaders() });
        if (res.ok) {
          const { messages: msgs } = await res.json();
          setMessages((msgs ?? []).map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        }
      } catch (e) { console.error(e); }
      setLoadingChat(false);
    };
    loadChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId, guestId, isLoggedIn]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setUploadResult(null); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setUploadResult(null);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setActiveDocId(null);
    setUploading(true); setUploadResult(null); setShowUploadResult(false); setUploadStep(0);

    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step += 1;
      if (step < 3) setUploadStep(step);
      else if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }, 900);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("backend", backend);
      if (!isLoggedIn) formData.append("guestId", guestId);

      const res  = await fetch("/api/doc-research/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      if (res.ok && json.success) {
        setUploadStep(3);
        await new Promise(r => setTimeout(r, 2000));
        setUploadStep(4);
        setUploadResult({ success: true, message: `✓ ${json.fileName} — ${json.chunks} chunks embedded.` });
        setFadingOut(false);
setShowUploadResult(true);
setTimeout(() => {
  setFadingOut(true);
  setTimeout(() => { setShowUploadResult(false); setFadingOut(false); }, 400);
}, 3000);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadDocuments();
      } else {
        setUploadStep(-1);
        setUploadResult({ success: false, message: json.error ?? "Upload failed." });
        setShowUploadResult(true);
      }
    } catch {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setUploadStep(-1);
      setUploadResult({ success: false, message: "Network error. Please try again." });
      setShowUploadResult(true);
    }

    setUploading(false);
    setTimeout(() => setUploadStep(-1), 4000);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteDocument = async (docId: string) => {
    try {
      await fetch("/api/doc-research/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ documentId: docId }),
      });
      if (activeDocId === docId) { setActiveDocId(null); setMessages([]); }
      await loadDocuments();
    } catch (e) { console.error(e); }
  };

  // ── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = async () => {
    try {
      const url = activeDocId
        ? `/api/doc-research/chats?documentId=${activeDocId}`
        : `/api/doc-research/chats`;
      await fetch(url, { method: "DELETE", headers: authHeaders() });
    } catch (e) { console.error(e); }
    setMessages([]);
  };

  // ── Save message ──────────────────────────────────────────────────────────
  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    try {
      await fetch("/api/doc-research/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ role, content, documentId: activeDocId }),
      });
    } catch (e) { console.error(e); }
  }, [activeDocId, authHeaders]);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sendQuery = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || streaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = { role: "user", content: question };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    await saveMessage("user", question);

    setStreaming(true); setStreamingText("");

    try {
      const res = await fetch("/api/doc-research/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query: question, documentId: activeDocId }),
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Query failed");

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setStreamingText(full);
      }
     // AFTER
      // Stop streaming bubble FIRST, then commit final message in same tick
      setStreaming(false);
      setStreamingText("");
      setMessages([...withUser, { role: "assistant", content: full }]);
      await saveMessage("assistant", full);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setStreaming(false);
      setStreamingText("");
      setMessages([...withUser, { role: "assistant", content: `Error: ${msg}` }]);
    }
  };

  const activeDoc = documents.find(doc => doc.id === activeDocId);

  return (
    <div className={`flex h-screen w-full overflow-hidden ${d.pageBg} transition-colors duration-300`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${d.scrollbar}; border-radius: 4px; }
        @keyframes progress-bar { from { width: 0% } to { width: 100% } }
        .progress-bar-anim { animation: progress-bar 0.85s ease-out forwards; }
      `}</style>

      {/* ════ SIDEBAR ════ */}
      <aside className={`w-[268px] shrink-0 flex flex-col border-r ${d.sidebarBg} ${d.border} overflow-hidden transition-colors duration-300`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-[14px] border-b ${d.border}`}>
          <div className="flex items-center gap-2">
            <Link href="/" className={`${d.muted} hover:text-red-400 transition-colors p-1 rounded-lg ${d.hover}`}>
              <ChevronLeft size={15} />
            </Link>
            <span className="text-red-500 font-bold text-sm tracking-tight">ARC</span>
            <span className={`text-xs ${d.muted}`}>/</span>
            <span className={`text-xs font-medium ${d.text}`}>Doc Research</span>
          </div>
          <button onClick={toggleMode}
            className={`p-1.5 rounded-lg transition-all ${isDarkMode ? "bg-white/[0.06] text-yellow-400 hover:bg-white/[0.1]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* Guest banner */}
        {!isLoggedIn && (
          <div className={`mx-3 mt-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] ${d.guestBanner}`}>
            <span>Guest — data clears on tab close</span>
            <Link href="/login" className="flex items-center gap-1 shrink-0 text-red-400 font-semibold hover:text-red-300 transition-colors">
              <LogIn size={11} /> Sign in
            </Link>
          </div>
        )}

        {/* Backend selector */}
        <div className="px-3 pt-4 pb-3">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${d.muted} mb-2 px-1`}>Retrieval Backend</p>
          <div className="flex flex-col gap-1.5">
            {(["vector", "graph"] as const).map(b => {
              const isActive   = backend === b;
              const isDisabled = b === "graph";
              return (
                <label key={b} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all
                  ${isActive ? d.radioActive : `${d.radioInactive} ${!isDisabled ? d.hover : ""}`}
                  ${isDisabled ? "opacity-45 cursor-not-allowed" : ""}`}>
                  <input type="radio" name="backend" value={b} checked={isActive}
                    onChange={() => !isDisabled && setBackend(b)} disabled={isDisabled} className="sr-only" />
                  {b === "vector"
                    ? <Database  size={13} className={isActive ? "text-red-400" : d.muted} />
                    : <GitBranch size={13} className={d.muted} />}
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${isActive ? "text-red-400" : d.text}`}>
                      {b === "vector" ? "Vector Database" : "Graph Database"}
                    </p>
                    {b === "graph" && <p className={`text-[10px] ${d.muted}`}>Coming soon</p>}
                  </div>
                  {isActive && <CheckCircle2 size={12} className="text-red-400 shrink-0" />}
                </label>
              );
            })}
          </div>
        </div>

        <div className={`mx-3 border-t ${d.border} mb-3`} />

        {/* Upload section */}
        <div className="px-3 pb-3">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${d.muted} mb-2 px-1`}>Upload Document</p>

          <div
            className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all
              ${dragOver ? d.dropzoneOver : d.dropzone}`}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="sr-only" onChange={handleFileChange} />
            {file ? (
  <div className="flex items-center gap-2">
    <FileText size={13} className="text-red-400 shrink-0" />
    <span className={`text-xs ${d.text} truncate flex-1 text-left`}>{file.name}</span>
    {!uploading && (
      <button onClick={e => { e.stopPropagation(); setFile(null); setUploadResult(null); }}
        className={`shrink-0 ${d.muted} hover:text-red-400 transition-colors`}>
        <X size={12} />
      </button>
    )}
  </div>
            ) : (
              <div className="py-1">
                <FileUp size={18} className={`${d.muted} mx-auto mb-1.5`} />
                <p className={`text-xs ${d.muted}`}>Drop PDF or .txt here</p>
                <p className={`text-[10px] ${d.mutedLight} mt-0.5`}>or click to browse</p>
              </div>
            )}
          </div>

          {/* Sidebar upload progress steps */}
          {uploadStep >= 0 && uploadStep < 4 && (
            <div className={`mt-2 rounded-xl border p-3 ${d.stepBg}`}>
              <div className="flex flex-col gap-2">
                {UPLOAD_STEPS.map((s, i) => {
                  const isDone   = i < uploadStep;
                  const isActive = i === uploadStep;
                  return (
                    <div key={i} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                          {isDone
                            ? <CheckCircle2 size={13} className={d.stepDone} />
                            : isActive
                              ? <Loader2 size={13} className={`${d.stepActive} animate-spin`} />
                              : <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-white/20" : "bg-gray-300"}`} />}
                        </div>
                        <span className={`text-[11px] font-medium ${isDone ? d.stepDone : isActive ? d.stepActive : d.stepPending}`}>
                          {s.label}
                        </span>
                      </div>
                      {isActive && (
                        <div className={`ml-6 h-0.5 rounded-full overflow-hidden ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-200"}`}>
                          <div key={uploadStep}
                            className={`h-full rounded-full progress-bar-anim ${isDarkMode ? "bg-red-500/60" : "bg-red-400"}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          <button ref={uploadBtnRef} onClick={handleUpload} disabled={!file || uploading}
            className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${d.uploadBtn}`}>
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? "Processing…" : "Upload & Embed"}
          </button>
        </div>

        <div className={`mx-3 border-t ${d.border} mb-3`} />

        {/* Documents list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${d.muted}`}>Your Documents</p>
            {documents.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-white/[0.06] text-gray-500" : "bg-gray-100 text-gray-500"}`}>
                {documents.length}
              </span>
            )}
          </div>
          {loadingDocs ? (
            <div className="flex justify-center py-8">
              <Loader2 size={14} className="animate-spin text-red-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className={`text-center py-8 px-3 rounded-xl border border-dashed ${d.border}`}>
              <FileText size={20} className={`${d.muted} mx-auto mb-2 opacity-40`} />
              <p className={`text-xs ${d.muted}`}>No documents yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {documents.map(doc => {
                const isActive = activeDocId === doc.id;
                return (
                  <div key={doc.id} onClick={() => setActiveDocId(isActive ? null : doc.id)}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all
                      ${isActive ? d.docActive : d.docItem}`}>
                    <FileText size={12} className={isActive ? "text-red-400 shrink-0" : `${d.muted} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? "text-red-400" : d.text}`}>{doc.file_name}</p>
                      <p className={`text-[10px] ${d.muted}`}>{(doc.char_count / 1000).toFixed(1)}k chars</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteDocument(doc.id); }}
                      className={`shrink-0 opacity-0 group-hover:opacity-100 transition-all ${d.muted} hover:text-red-400`}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* ════ MAIN CHAT AREA ════ */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ${d.mainBg} transition-colors duration-300`}>

        {/* Top bar */}
        <div className={`flex items-center gap-3 px-6 py-[14px] border-b ${d.border} ${d.headerBg} shrink-0`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
            ${isDarkMode ? "bg-red-500/15 border border-red-500/20" : "bg-red-50 border border-red-200"}`}>
            <MessageSquare size={14} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${d.text} truncate`}>
              {activeDoc ? activeDoc.file_name : "Document Chat"}
            </p>
            <p className={`text-[11px] ${d.muted}`}>
              {activeDoc
                ? "Powered by RAG"
                : documents.length > 0
                  ? "Select a document — or ask to search all"
                  : "Upload a document to begin"}
            </p>
          </div>
          {/* Clear chat — shown when there are messages */}
          {messages.length > 0 && (
            <button onClick={clearChat}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                ${isDarkMode
                  ? "border-white/[0.08] text-gray-500 hover:text-red-400 hover:border-red-500/30"
                  : "border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-300"}`}>
              <Trash2 size={11} /> Clear chat
            </button>
          )}
          {/* Document Chat — go back to global chat from a doc */}
          {activeDocId && (
            <button onClick={() => setActiveDocId(null)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all
                ${isDarkMode
                  ? "border-white/[0.08] text-gray-500 hover:text-gray-200 hover:border-white/[0.15]"
                  : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}>
              <MessageSquare size={11} /> Document Chat
            </button>
          )}
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">

          {loadingChat && (
            <div className="flex justify-center py-8">
              <Loader2 size={16} className="animate-spin text-red-400" />
            </div>
          )}

          {/* ── Upload animation — only when no existing messages ── */}
          {!loadingChat && uploading && uploadStep >= 0 && messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <UploadAnimation step={uploadStep} isDarkMode={isDarkMode} />
            </div>
          )}

          {/* ── Empty state ── */}
          {!loadingChat && !uploading && messages.length === 0 && !streaming && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border
                ${isDarkMode ? "bg-white/[0.03] border-white/[0.07]" : "bg-white border-gray-200"}`}>
                <Sparkles size={24} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className={`text-base font-semibold ${d.text} mb-1`}>
                  {documents.length === 0 ? "Upload your first document" : "What would you like to know?"}
                </p>
                <p className={`text-sm ${d.muted} max-w-sm`}>
                  {documents.length === 0
                    ? "Upload a PDF or .txt file on the left to start asking questions about it."
                    : activeDoc
                      ? `Asking about: ${activeDoc.file_name}`
                      : "Select a document or search across all uploaded documents."}
                </p>
              </div>
              {documents.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map(prompt => (
                    <button key={prompt} onClick={() => sendQuery(prompt)}
                      className={`text-xs px-4 py-2 rounded-full border transition-all
                        ${isDarkMode
                          ? "border-white/[0.08] text-gray-500 hover:text-gray-200 hover:border-white/[0.18] hover:bg-white/[0.04]"
                          : "border-gray-200 text-gray-500 bg-white hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50"}`}>
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Chat messages ── */}
          {!loadingChat && messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5 border
                  ${isDarkMode ? "bg-red-500/15 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                  <Sparkles size={11} className="text-red-400" />
                </div>
              )}
              <div className={`max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-relaxed border
                ${msg.role === "user" ? d.userBubble : d.aiBubble}`}>
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    p:      ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul:     ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol:     ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li:     ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    code:   ({ children }) => (
                      <code className={`px-1.5 py-0.5 rounded text-xs font-mono
                        ${isDarkMode ? "bg-white/10 text-red-300" : "bg-gray-100 text-red-600"}`}>
                        {children}
                      </code>
                    ),
                  }}>{msg.content}</ReactMarkdown>
                ) : msg.content}
              </div>
            </div>
          ))}

          {/* ── Streaming bubble ── */}
          {streaming && (
            <div className="flex justify-start">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5 border
                ${isDarkMode ? "bg-red-500/15 border-red-500/20" : "bg-red-50 border-red-200"}`}>
                <Sparkles size={11} className="text-red-400 animate-pulse" />
              </div>
              <div className={`max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${d.aiBubble}`}>
                {streamingText ? (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}
                      components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                      {streamingText}
                    </ReactMarkdown>
                    <span className="inline-block w-0.5 h-4 bg-red-400 ml-0.5 align-text-bottom animate-pulse" />
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* ── Input bar ── */}
        <div className={`px-6 py-4 border-t shrink-0 ${d.footerBg}`}>
          {activeDocId && (
            <p className={`text-[11px] ${d.muted} mb-2`}>
              Searching in: <span className="text-red-400 font-medium">{activeDoc?.file_name}</span>
            </p>
          )}
          <div className="flex items-end gap-3">
            <textarea ref={textareaRef} value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(); }
              }}
              placeholder={
                documents.length === 0
                  ? "Upload a document first…"
                  : activeDocId
                    ? `Ask anything about ${activeDoc?.file_name}…`
                    : "Ask a question — searches across all documents…"
              }
              disabled={documents.length === 0}
              rows={1}
              className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition-colors
                ${isDarkMode
                  ? "bg-white/[0.05] border-white/[0.08] text-gray-100 placeholder-gray-600 focus:border-red-500/40"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400"}
                disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ minHeight: "46px", maxHeight: "140px" }}
            />
            <button onClick={() => sendQuery()}
              disabled={!input.trim() || streaming || documents.length === 0}
              className={`rounded-2xl p-3 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${d.sendBtn}`}>
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
            </button>
          </div>
        </div>
      </main>
      {/* ── Upload success popup ── */}
{uploadResult && showUploadResult && (

  <div
  
    className={`fixed bottom-6 right-6 z-50 w-72 rounded-2xl border shadow-2xl p-4
      ${uploadResult.success
        ? isDarkMode
          ? "bg-[#0d1a12] border-green-500/20 shadow-black/40"
          : "bg-white border-green-200 shadow-black/10"
        : isDarkMode
          ? "bg-[#1a0d0d] border-red-500/20 shadow-black/40"
          : "bg-white border-red-200 shadow-black/10"
      }`}
      style={{
    animation: fadingOut
      ? "toastOut 0.4s ease forwards"
      : "toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards"
  }}
  >
    {/* Header */}
    <div className="flex items-start justify-between gap-3 mb-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
        ${uploadResult.success
          ? isDarkMode ? "bg-green-500/15" : "bg-green-50"
          : isDarkMode ? "bg-red-500/15" : "bg-red-50"
        }`}>
        {uploadResult.success
          ? <CheckCircle2 size={15} className={isDarkMode ? "text-green-400" : "text-green-600"} />
          : <AlertCircle  size={15} className={isDarkMode ? "text-red-400"   : "text-red-500"} />}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
          {uploadResult.success ? "Successfully embedded" : "Upload failed"}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          {uploadResult.message}
        </p>
      </div>
     <button onClick={() => { setFadingOut(true); setTimeout(() => { setShowUploadResult(false); setFadingOut(false); }, 400); }}
  className={`shrink-0 p-1 rounded-lg transition-colors
    ${isDarkMode ? "text-gray-600 hover:text-gray-400 hover:bg-white/[0.05]" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
  <X size={13} />
</button>
    </div>

    {/* Progress bar that drains as the toast auto-closes */}
    {uploadResult.success && (
      <div className={`h-0.5 rounded-full overflow-hidden mt-3 ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-100"}`}>
        <div
          className={`h-full rounded-full ${isDarkMode ? "bg-green-500/50" : "bg-green-400"}`}
          style={{ animation: "progress-drain 7s linear forwards" }}
        />
      </div>
    )}
  </div>
)}
    </div>
  );
}
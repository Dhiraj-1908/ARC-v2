"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sun, Moon, Plus, LogOut, ChevronRight, ChevronLeft,
  LayoutDashboard, X, Loader2, FileSearch,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

import SessionInfoPanel from "@/components/home/SessionInfoPanel";
import StepsPanel from "@/components/home/StepsPanel";
import UserInput from "@/components/ui/deep-research/UserInput";
import QnA from "@/components/ui/deep-research/QnA";
import ResearchReport from "@/app/api/deep-research/ResearchReport";
import ReportChat from "@/components/home/ReportChat";
import ResearchAnimation from "@/components/home/ResearchAnimation";
import SidebarSessionItem from "@/components/home/SidebarSessionItem";

import { useDeepResearchStore } from "@/store/deepResearch";
import { createClient } from "@/lib/supabase/client";
import { useChat } from "@ai-sdk/react";

interface Session {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [researchStarted, setResearchStarted] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  const reportScrollRef = useRef<HTMLDivElement>(null);
  const researchFiredRef = useRef(false);

  const {
    questions, topic, answers, isCompleted,
    setIsLoading, setActivities, setSources, setReport, setSessionId,
    activities, report, isLoading, sessionId, sources,
  } = useDeepResearchStore();

  const supabase = createClient();
  const searchParams = useSearchParams();
  const { append, data } = useChat({ api: "/api/deep-research" });

  const isGenerating = researchStarted && !activeSessionId && isLoading;

  useLayoutEffect(() => {
    const savedMode = localStorage.getItem("arcThemeMode");
    setIsDarkMode(savedMode ? savedMode === "dark" : true);

    const store = useDeepResearchStore.getState();
    if (store.isCompleted && store.report.length > 0) {
      setResearchStarted(true);
      researchFiredRef.current = true;
    } else if (store.isCompleted && !store.report.length) {
      useDeepResearchStore.setState({
        questions: [], answers: [], currentQuestion: 0,
        isCompleted: false, topic: "",
      });
    }

    setHasMounted(true);
  }, []);

  const toggleMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("arcThemeMode", next ? "dark" : "light");
  };

  const t: Record<string, string> = isDarkMode ? {
    bg: "bg-[#0d0f16]",
    sidebar: "bg-[#0b0d14] border-white/[0.06]",
    topbar: "bg-[#0d0f16]/95 border-white/[0.06]",
    card: "bg-white/[0.03] border-white/[0.07]",
    text: "text-gray-100",
    muted: "text-gray-500",
    hover: "hover:bg-white/[0.05]",
    sessionItem: "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]",
    inputCard: "bg-white/[0.025] border-white/[0.08]",
  } : {
    bg: "bg-[#f4f6fb]",
    sidebar: "bg-white border-gray-200",
    topbar: "bg-white/95 border-gray-200",
    card: "bg-white border-gray-200",
    text: "text-gray-900",
    muted: "text-gray-500",
    hover: "hover:bg-gray-100",
    sessionItem: "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
    inputCard: "bg-white border-gray-200",
  };

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);

    if (searchParams.get("code")) setJustLoggedIn(true);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.id);
        setUserEmail(user.email ?? null);
        const { data } = await supabase
          .from("research_sessions")
          .select("id, topic, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40);
        setSessions(data ?? []);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      isCompleted &&
      !researchFiredRef.current &&
      topic &&
      questions.length > 0 &&
      answers.length >= questions.length &&
      !report.length &&
      activities.length === 0
    ) {
      researchFiredRef.current = true;
      setResearchStarted(true);
      setActiveSessionId(null);
      setActiveSessionData(null);

      const clarifications = questions.map((q, i) => ({ question: q, answer: answers[i] }));

      setSessions(prev => prev.filter(s => !s.id.startsWith("temp-")));
      append({ role: "user", content: JSON.stringify({ topic, clarifications }) });
      setIsLoading(true);

      if (isLoggedIn) {
        const tempSession: Session = {
          id: `temp-${Date.now()}`,
          topic,
          status: "running",
          created_at: new Date().toISOString(),
        };
        setSessions(prev => [tempSession, ...prev]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  useEffect(() => {
    if (!data) return;
    const msgs = data as unknown[];

    const acts = msgs
      .filter(m => typeof m === "object" && (m as any).type === "activity")
      .map(m => (m as any).content);
    setActivities(acts);

    const srcs = acts
      .filter((a: any) => a.type === "extract" && a.status === "complete")
      .map((a: any) => {
        const url = a.message.split("from ")[1];
        return { url, title: url?.split("/")[2] || url };
      });
    setSources(srcs);

    const sessionMsg = msgs.find(m => typeof m === "object" && (m as any).type === "session");
    if (sessionMsg && (sessionMsg as any).content?.sessionId) {
      setSessionId((sessionMsg as any).content.sessionId);
    }

    const reportData = msgs.find(m => typeof m === "object" && (m as any).type === "report");
    const rep = typeof (reportData as any)?.content === "string" ? (reportData as any).content : "";
    if (rep) {
      setReport(rep);
      setIsLoading(false);

      setTimeout(() => {
        reportScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }, 50);

      if (isLoggedIn) {
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const user = session?.user ?? null;
          if (user) {
            const { data: fresh } = await supabase
              .from("research_sessions")
              .select("id, topic, status, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(40);
            if (fresh) setSessions(fresh);
          }
        })();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const loadSession = async (sid: string) => {
    if (sid.startsWith("temp-")) return;
    setLoadingSession(true);
    setActiveSessionId(sid);
    setActiveSessionData(null);
    setResearchStarted(true);
    researchFiredRef.current = true;

    try {
      const res = await fetch(`/api/sessions/${sid}`);
      if (res.ok) {
        const json = await res.json();
        setActiveSessionData(json);
        const rawContent = (() => {
          const c = json.report?.content ?? "";
          if (c.includes("<report>") && c.includes("</report>"))
            return c.split("<report>")[1].split("</report>")[0];
          return c;
        })();
        useDeepResearchStore.setState({
          topic: json.session?.topic ?? "",
          report: rawContent,
          sessionId: sid,
          isCompleted: true,
          isLoading: false,
          questions: (json.session?.clarifications ?? []).map((c: any) => c.question),
          answers: (json.session?.clarifications ?? []).map((c: any) => c.answer),
          sources: (json.sources ?? []).map((s: any) => ({
            url: s.url,
            title: s.title || s.url?.split("/")[2] || s.url,
          })),
          activities: json.activities ?? [],
        });
        setTimeout(() => {
          reportScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
        }, 50);
      }
    } catch (e) { console.error(e); }
    setLoadingSession(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleNewResearch = () => {
    researchFiredRef.current = false;
    useDeepResearchStore.setState({
      topic: "", questions: [], answers: [], currentQuestion: 0,
      isCompleted: false, isLoading: false, activities: [], sources: [], report: "", sessionId: null,
    });
    setResearchStarted(false);
    setActiveSessionId(null);
    setActiveSessionData(null);
    setSessions(prev => prev.filter(s => !s.id.startsWith("temp-")));
  };

  const handleSessionDeleted = (deletedId: string) => {
    setSessions(prev => prev.filter(s => s.id !== deletedId));
    if (activeSessionId === deletedId) {
      setActiveSessionId(null);
      setActiveSessionData(null);
      setResearchStarted(false);
    }
  };

  const groupedSessions = (() => {
    const buckets = new Map<string, Session[]>();
    for (const s of sessions) {
      const d = new Date(s.created_at);
      const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMM d, yyyy");
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(s);
    }
    return [...buckets.entries()].map(([label, items]) => ({ label, items }));
  })();

  const liveActiveId: string | null = (() => {
    if (!researchStarted || activeSessionId) return null;
    const temp = sessions.find(s => s.id.startsWith("temp-") && s.topic === topic);
    if (temp) return temp.id;
    if (sessionId) return sessionId;
    return null;
  })();

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const sidebar = (
    <aside className={`${sidebarOpen ? "w-60" : "w-0"} shrink-0 flex flex-col border-r ${t.sidebar} transition-all duration-300 overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-4 border-b ${isDarkMode ? "border-white/[0.06]" : "border-gray-200"}`}>
        <span className="text-red-500 font-bold text-base tracking-tight">ARC</span>
        <button type="button" onClick={handleNewResearch}
          className={`p-1.5 rounded-lg ${t.hover} ${t.muted} transition-all`} title="New Research">
          <Plus size={14} />
        </button>
      </div>

      <div className="px-3 py-3">
        <button type="button" onClick={handleNewResearch}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/18 border border-red-500/15 text-red-400 hover:text-red-300 text-xs font-semibold transition-all">
          <Plus size={13} /> New Research
        </button>
      </div>

      <div className="px-3 pb-2 flex flex-col gap-1">
        <Link href="/dashboard"
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${t.sessionItem} text-xs transition-all`}>
          <LayoutDashboard size={13} /> Dashboard
        </Link>
        <Link href="/doc-research"
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${t.sessionItem} text-xs transition-all`}>
          <FileSearch size={13} /> Doc Research
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 relative">
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] bg-black/30 rounded-lg">
            <Loader2 size={16} className="text-red-400 animate-spin" />
            <p className="text-[10px] text-gray-400 text-center px-4">Research in progress…<br />Sidebar locked</p>
          </div>
        )}
        {sessions.length === 0
          ? <p className={`text-xs ${t.muted} px-3 py-4 text-center`}>No sessions yet</p>
          : groupedSessions.map(group => (
            <div key={group.label} className="mb-3">
              <p className={`text-[9px] font-semibold ${t.muted} px-3 py-1.5 uppercase tracking-[0.12em]`}>
                {group.label}
              </p>
              {group.items.map(session => {
                const isTemp = session.id.startsWith("temp-");
                const isActive =
                  session.id === activeSessionId ||
                  session.id === liveActiveId ||
                  (!isTemp && sessionId === session.id && researchStarted && !activeSessionId);
                return (
                  <SidebarSessionItem
                    key={session.id}
                    session={session}
                    isActive={isActive}
                    isDarkMode={isDarkMode}
                    t={t}
                    userId={userId}
                    onLoad={loadSession}
                    onDeleted={handleSessionDeleted}
                    currentSessionId={sessionId}
                    isGenerating={isGenerating}
                  />
                );
              })}
            </div>
          ))}
      </div>

      {userEmail && (
        <div className={`border-t ${isDarkMode ? "border-white/[0.06]" : "border-gray-200"} px-3 py-3`}>
          <div className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg ${t.hover} transition-all`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <span className="text-red-400 text-[10px] font-bold uppercase">{userEmail[0]}</span>
              </div>
              <span className={`text-[11px] ${t.muted} truncate`}>{userEmail}</span>
            </div>
            <button type="button" onClick={handleSignOut} title="Sign out"
              className={`shrink-0 ${t.muted} hover:text-red-400 transition-colors`}>
              <LogOut size={12} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  // ── Top bar ───────────────────────────────────────────────────────────────
  const topBar = (
    <header className={`flex items-center justify-between px-5 py-3 border-b
      ${isDarkMode ? "border-white/[0.06]" : "border-gray-200"} ${t.topbar} backdrop-blur shrink-0`}>
      <div className="flex items-center gap-3">
        {isLoggedIn && (
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg ${t.hover} ${t.muted} transition-all`}>
            <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        {!isLoggedIn && <span className="text-red-500 font-bold text-base tracking-tight">ARC</span>}
      </div>
      <div className="flex items-center gap-2.5">
        {researchStarted && (
          <button type="button" onClick={handleNewResearch}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/18 border border-red-500/15 text-red-400 font-medium transition-all flex items-center gap-1.5">
            <Plus size={12} /> New Research
          </button>
        )}
        <Link
          href="/doc-research"
          className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all
            ${isDarkMode ? "border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400"
              : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500"}`}
        >
          <FileSearch size={12} /> Doc Research
        </Link>
        {!isLoggedIn && !researchStarted && (
          <Link href="/login"
            className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all
              ${isDarkMode ? "border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400"
                : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500"}`}>
            Sign in
          </Link>
        )}
        <button type="button" onClick={toggleMode}
          className={`p-2 rounded-full transition-all
            ${isDarkMode ? "bg-white/[0.06] text-yellow-400 hover:bg-white/[0.09]"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );

  // ── Home view ─────────────────────────────────────────────────────────────
  const homeView = (
    <div className={`flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-12
      transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
      {justLoggedIn && (
        <div className={`w-full max-w-2xl mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border
          ${isDarkMode ? "bg-green-500/8 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
          <span className="text-sm">✓ Signed in — research reports will be saved.</span>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold underline underline-offset-2">Dashboard →</Link>
            <button type="button" onClick={() => setJustLoggedIn(false)}><X size={14} /></button>
          </div>
        </div>
      )}
      {!isLoggedIn && (
        <div className={`w-full max-w-2xl mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border
          ${isDarkMode ? "bg-white/[0.03] border-white/[0.07] text-gray-500" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
          <span className="text-sm">Guest mode — reports won't be saved.</span>
          <Link href="/login" className="text-sm font-semibold underline underline-offset-2 shrink-0">Sign in →</Link>
        </div>
      )}
      <div className="flex flex-col items-center mb-10">
        <div className="relative w-16 h-16 mb-5">
          <div className={`absolute inset-0 rounded-full ${isDarkMode ? "bg-red-500/15" : "bg-red-500/8"} blur-xl`} />
          <Image src="/logo/logo2.svg" fill alt="ARC" priority />
        </div>
        <h1 className="flex items-center gap-3 mb-2">
          <span className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-400 text-transparent bg-clip-text tracking-tight">ARC</span>
          <span className={`text-xs font-medium ${t.muted} tracking-[0.2em] uppercase border-l pl-3 ${isDarkMode ? "border-white/10" : "border-gray-300"}`}>
            AI Research Curator
          </span>
        </h1>
        <p className={`text-sm ${t.muted} text-center max-w-sm leading-relaxed`}>
          Deep research, synthesized into polished reports — in minutes.
        </p>
      </div>
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${t.inputCard}`}>
        <div className="p-5">
          {!hasMounted || questions.length === 0
            ? <UserInput isDarkMode={isDarkMode} />
            : <QnA isDarkMode={isDarkMode} />
          }
        </div>
      </div>

      {/* Doc Research card */}
      <div className="w-full max-w-2xl mt-4">
        <Link href="/doc-research"
          className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all group
            ${isDarkMode ? "bg-white/[0.02] border-white/[0.07] hover:border-red-500/30 hover:bg-white/[0.04]"
              : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/30"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border
              ${isDarkMode ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"}`}>
              <FileSearch size={15} className="text-red-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Doc Research</p>
              <p className={`text-xs ${t.muted}`}>Upload PDFs & chat with your documents</p>
            </div>
          </div>
          <ChevronRight size={14} className={`${isDarkMode ? "text-gray-600 group-hover:text-red-400" : "text-gray-400 group-hover:text-red-500"} transition-colors`} />
        </Link>
      </div>
    </div>
  );

  // ── Report layout wrapper ─────────────────────────────────────────────────
  function ReportLayout({
    topicLabel, clarifications, reportSources, children,
  }: {
    topicLabel: string;
    clarifications?: { question: string; answer: string }[];
    reportSources?: { url: string; title: string }[];
    children: React.ReactNode;
  }) {
    const [sourcesOpen, setSourcesOpen] = useState(false);
    return (
      <div className="flex-1 overflow-y-auto" ref={reportScrollRef}>
        <div className="max-w-4xl mx-auto w-full px-4 py-6">
          <div className="flex justify-end items-start gap-3 mb-6">
            {reportSources && reportSources.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSourcesOpen(o => !o)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border transition-all ${t.card} ${t.muted}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 shrink-0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {reportSources.length} sources
                  <ChevronRight size={11} className={`transition-transform duration-200 ${sourcesOpen ? "rotate-90" : ""}`} />
                </button>
                {sourcesOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSourcesOpen(false)} />
                    <div className={`absolute right-0 top-full mt-1.5 z-50 w-80 max-h-72 overflow-y-auto rounded-xl border shadow-2xl ${isDarkMode ? "bg-[#12151f] border-white/10" : "bg-white border-gray-200"}`}>
                      <div className={`px-3 py-2 border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0 ${isDarkMode ? "bg-[#12151f] border-white/[0.06] text-gray-500" : "bg-white border-gray-100 text-gray-400"}`}>
                        Sources ({reportSources.length})
                      </div>
                      <div className="py-1">
                        {reportSources.map((src, i) => (
                          <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors border-b last:border-0 ${isDarkMode ? "border-white/[0.04] text-blue-400 hover:bg-white/[0.04] hover:text-blue-300" : "border-gray-50 text-blue-600 hover:bg-gray-50 hover:text-blue-700"}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className={`text-right px-4 py-2.5 rounded-xl border ${t.card}`}>
              <p className={`text-[9px] font-semibold uppercase tracking-[0.15em] ${t.muted} mb-0.5`}>Research Topic</p>
              <p className={`text-sm font-semibold ${t.text}`}>{topicLabel}</p>
            </div>
          </div>
          {clarifications && clarifications.length > 0 && (
            <details className={`mb-6 rounded-xl border ${t.card} overflow-hidden group`}>
              <summary className={`px-4 py-3 text-xs font-medium ${t.muted} cursor-pointer select-none list-none flex items-center gap-2`}>
                <ChevronRight size={12} className="transition-transform duration-200 group-open:rotate-90" />
                Research scope ({clarifications.length} clarifications)
              </summary>
              <div className="px-4 pb-4 pt-1 space-y-3">
                {clarifications.map((c, i) => (
                  <div key={i}>
                    <p className={`text-[11px] font-semibold ${t.muted} mb-0.5`}>{c.question}</p>
                    <p className={`text-sm ${t.text}`}>{c.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
          {children}
        </div>
      </div>
    );
  }

  // ── Research view ─────────────────────────────────────────────────────────
  const researchView = (() => {
    if (activeSessionId && !activeSessionId.startsWith("temp-")) {
      if (loadingSession) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className={`text-sm ${t.muted}`}>Loading report…</span>
            </div>
          </div>
        );
      }
      if (activeSessionData) {
        const { session: sess } = activeSessionData;
        const clarifications: { question: string; answer: string }[] = sess.clarifications ?? [];
        const savedReportContent = (() => {
          const c = activeSessionData.report?.content ?? "";
          if (c.includes("<report>") && c.includes("</report>"))
            return c.split("<report>")[1].split("</report>")[0];
          return c;
        })();
        return (
          <div className="flex flex-1 overflow-hidden">
            <ReportLayout
              topicLabel={sess.topic}
              clarifications={clarifications}
              reportSources={(activeSessionData.sources ?? []).map((s: any) => ({
                url: s.url,
                title: s.title || s.url?.split("/")[2] || s.url,
              }))}
            >
              <div className="mb-4"><ResearchReport isDarkMode={isDarkMode} /></div>
              {savedReportContent && (
                <ReportChat
                  reportContent={savedReportContent}
                  reportTopic={sess.topic}
                  isDarkMode={isDarkMode}
                  sessionId={activeSessionId}
                  isLoggedIn={isLoggedIn}
                />
              )}
            </ReportLayout>
            <StepsPanel
              acts={activities}
              isDarkMode={isDarkMode}
              isLoading={isLoading}
              stepsOpen={stepsOpen}
              setStepsOpen={setStepsOpen}
            />
          </div>
        );
      }
      return null;
    }

    const liveClarifications = questions.map((q, i) => ({ question: q, answer: answers[i] }));
    const liveReportContent = (() => {
      if (!report) return "";
      if (report.includes("<report>") && report.includes("</report>"))
        return report.split("<report>")[1].split("</report>")[0];
      return report;
    })();

    return (
      <div className="flex flex-1 overflow-hidden">
        <ReportLayout topicLabel={topic} clarifications={liveClarifications} reportSources={sources}>
          {isLoading && report.length === 0 && (
            <ResearchAnimation activities={activities} isDarkMode={isDarkMode} />
          )}
          {report.length > 0 && (
            <>
              <div className="mb-4"><ResearchReport isDarkMode={isDarkMode} /></div>
              {!isLoading && (
                <ReportChat
                  reportContent={liveReportContent}
                  reportTopic={topic}
                  isDarkMode={isDarkMode}
                  sessionId={sessionId}
                  isLoggedIn={isLoggedIn}
                />
              )}
            </>
          )}
        </ReportLayout>
        {activities.length > 0 && (
          <StepsPanel
            acts={activities}
            isDarkMode={isDarkMode}
            isLoading={isLoading}
            stepsOpen={stepsOpen}
            setStepsOpen={setStepsOpen}
          />
        )}
      </div>
    );
  })();

  // ── Root ──────────────────────────────────────────────────────────────────
  return (
    <div suppressHydrationWarning className={`flex h-screen w-full overflow-hidden ${t.bg} transition-colors duration-300`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff12; border-radius: 4px; }
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
      `}</style>
      {isLoggedIn && sidebar}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {topBar}
        {researchStarted ? researchView : homeView}
      </div>
    </div>
  );
}
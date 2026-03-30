"use client";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDeepResearchStore } from "@/store/deepResearch";
import { createClient } from "@/lib/supabase/client";
import { useChat } from "@ai-sdk/react";
import { buildTheme } from "@/lib/useTheme";

import Sidebar from "@/components/home/Sidebar";
import TopBar from "@/components/home/TopBar";
import HomeView from "@/components/home/HomeView";
import ResearchView from "@/components/home/ResearchView";

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

  const t = buildTheme(isDarkMode);
  const isGenerating = researchStarted && !activeSessionId && isLoading;

  // ── On mount ──────────────────────────────────────────────────────────────
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

  // ── Auth + sessions ───────────────────────────────────────────────────────
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

  // ── Fire research when Q&A completes ─────────────────────────────────────
  useEffect(() => {
    if (
      isCompleted &&
      !researchFiredRef.current &&
      topic &&
      questions.length > 0 &&
      answers.length >= questions.length &&
      !report.length
      // NOTE: removed `activities.length === 0` — that was causing stuck research
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
        setSessions(prev => [{
          id: `temp-${Date.now()}`,
          topic,
          status: "running",
          created_at: new Date().toISOString(),
        }, ...prev]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  // ── Process streaming data ────────────────────────────────────────────────
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
      setTimeout(() => reportScrollRef.current?.scrollTo({ top: 0, behavior: "instant" }), 50);

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

  // ── Handlers ──────────────────────────────────────────────────────────────
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
        // Guard: session still in-progress (no report saved yet)
        if (!json.report?.content) {
          setActiveSessionData({ session: json.session, report: { content: "" }, sources: [], activities: [] });
          setLoadingSession(false);
          return;
        }
        setActiveSessionData(json);
        const rawContent = (() => {
          const c = json.report.content;
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
        setTimeout(() => reportScrollRef.current?.scrollTo({ top: 0, behavior: "instant" }), 50);
      }
    } catch (e) { console.error(e); }
    setLoadingSession(false);
  };

  const handleSessionDeleted = (deletedId: string) => {
    setSessions(prev => prev.filter(s => s.id !== deletedId));
    if (activeSessionId === deletedId) {
      setActiveSessionId(null);
      setActiveSessionData(null);
      setResearchStarted(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const liveActiveId: string | null = (() => {
    if (!researchStarted || activeSessionId) return null;
    const temp = sessions.find(s => s.id.startsWith("temp-") && s.topic === topic);
    if (temp) return temp.id;
    if (sessionId) return sessionId;
    return null;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
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

      {isLoggedIn && (
        <Sidebar
          isOpen={sidebarOpen}
          isDarkMode={isDarkMode}
          t={t}
          sessions={sessions}
          userEmail={userEmail}
          userId={userId}
          isGenerating={isGenerating}
          activeSessionId={activeSessionId}
          liveActiveId={liveActiveId}
          sessionId={sessionId}
          researchStarted={researchStarted}
          topic={topic}
          onNewResearch={handleNewResearch}
          onLoadSession={loadSession}
          onSessionDeleted={handleSessionDeleted}
          onSignOut={handleSignOut}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          isDarkMode={isDarkMode}
          t={t}
          isLoggedIn={isLoggedIn}
          researchStarted={researchStarted}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onToggleMode={() => {
            const next = !isDarkMode;
            setIsDarkMode(next);
            localStorage.setItem("arcThemeMode", next ? "dark" : "light");
          }}
          onNewResearch={handleNewResearch}
        />

        {researchStarted ? (
          <ResearchView
            activeSessionId={activeSessionId}
            activeSessionData={activeSessionData}
            loadingSession={loadingSession}
            topic={topic}
            questions={questions}
            answers={answers}
            report={report}
            sources={sources}
            activities={activities}
            isLoading={isLoading}
            sessionId={sessionId}
            isDarkMode={isDarkMode}
            t={t}
            isLoggedIn={isLoggedIn}
            stepsOpen={stepsOpen}
            setStepsOpen={setStepsOpen}
            scrollRef={reportScrollRef}
          />
        ) : (
          <HomeView
            isDarkMode={isDarkMode}
            t={t}
            isLoaded={isLoaded}
            hasMounted={hasMounted}
            isLoggedIn={isLoggedIn}
            justLoggedIn={justLoggedIn}
            hasQuestions={questions.length > 0}
            onDismissLoginBanner={() => setJustLoggedIn(false)}
          />
        )}
      </div>
    </div>
  );
}
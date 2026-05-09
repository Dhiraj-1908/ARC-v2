"use client";
import Link from "next/link";
import { Plus, LogOut, LayoutDashboard, FileSearch, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import SidebarSessionItem from "./SidebarSessionItem";

interface Session {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  isDarkMode: boolean;
  t: Record<string, string>;
  sessions: Session[];
  userEmail: string | null;
  userId: string;
  isGenerating: boolean;
  activeSessionId: string | null;
  liveActiveId: string | null;
  sessionId: string | null;
  researchStarted: boolean;
  topic: string;
  onNewResearch: () => void;
  onLoadSession: (id: string) => void;
  onSessionDeleted: (id: string) => void;
  onSignOut: () => void;
}

export default function Sidebar({
  isOpen, isDarkMode, t, sessions, userEmail, userId,
  isGenerating, activeSessionId, liveActiveId, sessionId, researchStarted,
  onNewResearch, onLoadSession, onSessionDeleted, onSignOut,
}: SidebarProps) {
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

  return (
    <aside className={`${isOpen ? "w-60" : "w-0"} shrink-0 flex flex-col border-r ${t.sidebar} transition-all duration-300 overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-4 border-b ${isDarkMode ? "border-white/[0.06]" : "border-gray-200"}`}>
        <button type="button" onClick={onNewResearch} className="text-red-500 font-bold text-base tracking-tight cursor-pointer hover:opacity-80 transition-opacity">
          ARC
        </button>
        <button type="button" onClick={onNewResearch}
          className={`p-1.5 rounded-lg ${t.hover} ${t.muted} transition-all`} title="New Research">
          <Plus size={14} />
        </button>
      </div>

      <div className="px-3 py-3">
        <button type="button" onClick={onNewResearch}
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
                    onLoad={onLoadSession}
                    onDeleted={onSessionDeleted}
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
            <button type="button" onClick={onSignOut} title="Sign out"
              className={`shrink-0 ${t.muted} hover:text-red-400 transition-colors`}>
              <LogOut size={12} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
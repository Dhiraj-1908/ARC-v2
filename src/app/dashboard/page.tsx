"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Plus, Trash2, ArrowRight, Search,
  ChevronLeft, Sun, Moon, Loader2, BookmarkX, LogOut,
} from "lucide-react";

interface SavedReport {
  id: string;
  created_at: string;
  session_id: string;
  research_sessions: {
    id: string;
    topic: string;
    status: string;
    created_at: string;
    reports: { word_count: number; token_used: number; iteration_count: number }[] | null;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("arcThemeMode");
    setIsDarkMode(saved ? saved === "dark" : true);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("arcThemeMode", next ? "dark" : "light");
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserEmail(user.email ?? "");
      await loadSaved();
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSaved = async () => {
    const res = await fetch("/api/saved-reports");
    if (res.ok) {
      const { saved } = await res.json();
      setSaved(saved ?? []);
    }
  };

  // ── Unsave (remove from saved, keep the session) ─────────────────────────
  const handleUnsave = async (sessionId: string) => {
    setUnsavingId(sessionId);
    await fetch(`/api/saved-reports?sessionId=${sessionId}`, { method: "DELETE" });
    setSaved(prev => prev.filter(s => s.session_id !== sessionId));
    setUnsavingId(null);
  };

  // ── Delete (permanently delete session + report + sources) ───────────────
  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      // Unsave first
      await fetch(`/api/saved-reports?sessionId=${sessionId}`, { method: "DELETE" });
      // Delete from DB
      await supabase.from("sources").delete().eq("session_id", sessionId);
      await supabase.from("reports").delete().eq("session_id", sessionId);
      await supabase.from("research_sessions").delete().eq("id", sessionId);
      setSaved(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const displayed = search
    ? saved.filter(s => s.research_sessions.topic.toLowerCase().includes(search.toLowerCase()))
    : saved;

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const bg       = isDarkMode ? "bg-[#0d0f16]"                  : "bg-[#f4f6fb]";
  const sidebar  = isDarkMode ? "bg-[#0b0d14] border-white/[0.06]" : "bg-white border-gray-200";
  const topbar   = isDarkMode ? "bg-[#0d0f16]/95 border-white/[0.06]" : "bg-white/95 border-gray-200";
  const cardBg   = isDarkMode ? "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.045] hover:border-white/[0.1]"
                              : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm";
  const text     = isDarkMode ? "text-gray-100"  : "text-gray-900";
  const muted    = isDarkMode ? "text-gray-500"  : "text-gray-500";
  const subtle   = isDarkMode ? "text-gray-700"  : "text-gray-400";
  const inputBg  = isDarkMode ? "bg-white/[0.04] border-white/[0.06] text-gray-400 placeholder-gray-700 focus:border-red-500/25"
                              : "bg-white border-gray-200 text-gray-700 placeholder-gray-400 focus:border-red-400";
  const divider  = isDarkMode ? "border-white/[0.06]" : "border-gray-100";
  const actionBtn = isDarkMode ? "text-gray-600 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100";

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="flex items-center gap-3 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen ${bg} overflow-hidden transition-colors duration-200`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDarkMode ? "#ffffff10" : "#00000010"}; border-radius: 4px; }
      `}</style>

      {/* ── SIDEBAR ───────────────────────────────── */}
      <aside className={`w-56 shrink-0 flex flex-col border-r ${sidebar} transition-colors duration-200`}>

        {/* Logo + Back */}
        <div className={`px-3 py-4 border-b ${divider}`}>
          <Link
            href="/"
            className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all group
              ${isDarkMode
                ? "bg-red-500/10 hover:bg-red-500/18 border border-red-500/20 hover:border-red-500/35 text-red-400 hover:text-red-300"
                : "bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-500 hover:text-red-600"}`}
          >
            <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="text-xs font-semibold">Back to ARC</span>
            <span className="ml-auto font-bold text-sm">ARC</span>
          </Link>
        </div>

        {/* Nav */}
        <div className="px-3 py-3">
          <p className={`text-[9px] font-semibold uppercase tracking-[0.18em] px-2 mb-2 ${subtle}`}>Library</p>
          <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium
            ${isDarkMode ? "bg-red-500/12 text-red-300" : "bg-red-50 text-red-600"}`}>
            <FileText size={12} />
            Saved Reports
            <span className={`ml-auto text-[10px] ${isDarkMode ? "text-red-400/60" : "text-red-400"}`}>
              {saved.length}
            </span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User */}
        <div className={`border-t ${divider} px-3 py-3`}>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-red-400 text-[10px] font-bold uppercase">{userEmail[0]}</span>
            </div>
            <span className={`text-[11px] ${muted} truncate flex-1`}>{userEmail}</span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className={`shrink-0 transition-colors ${isDarkMode ? "text-gray-700 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className={`shrink-0 border-b ${topbar} ${divider} backdrop-blur px-6 py-3.5 flex items-center justify-between gap-4`}>
          <div>
            <h1 className={`text-sm font-semibold ${text}`}>Saved Reports</h1>
            <p className={`text-[11px] ${muted} mt-0.5`}>
              {displayed.length} report{displayed.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={11} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${subtle}`} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reports…"
                className={`rounded-xl border pl-7 pr-3 py-2 text-xs outline-none transition-all w-48 ${inputBg}`}
              />
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all ${isDarkMode
                ? "bg-white/[0.06] text-yellow-400 hover:bg-white/[0.09]"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>

            {/* New Research */}
            <Link
              href="/"
              className={`flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2 transition-all
                ${isDarkMode
                  ? "bg-red-500/10 hover:bg-red-500/18 border border-red-500/15 text-red-400"
                  : "bg-red-500 hover:bg-red-600 text-white"}`}
            >
              <Plus size={12} /> New Research
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {saved.length === 0 ? (
            /* Empty state — no saves at all */
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center
                ${isDarkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-gray-100 border-gray-200"}`}>
                <FileText size={22} className={subtle} />
              </div>
              <div>
                <p className={`text-sm font-medium ${muted}`}>No saved reports yet</p>
                <p className={`text-xs mt-1 ${subtle}`}>
                  Save a report from the main page to see it here.
                </p>
              </div>
              <Link
                href="/"
                className={`text-xs font-medium mt-1 transition-colors ${isDarkMode ? "text-red-500/60 hover:text-red-400" : "text-red-500 hover:text-red-600"}`}
              >
                Start your first research →
              </Link>
            </div>
          ) : displayed.length === 0 ? (
            /* Empty search state */
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className={`text-sm ${muted}`}>No reports match your search</p>
              <button onClick={() => setSearch("")} className={`text-xs mt-1 ${isDarkMode ? "text-red-500/60 hover:text-red-400" : "text-red-500 hover:text-red-600"} transition-colors`}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayed.map(item => {
                const sess = item.research_sessions;
                const report = Array.isArray(sess.reports) ? sess.reports[0] : sess.reports;
                const isDeleting = deletingId === sess.id;
                const isConfirming = confirmId === sess.id;
                const isUnsaving = unsavingId === sess.id;

                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col gap-3 border rounded-2xl p-4 transition-all duration-150
                      ${cardBg} ${isDeleting || isUnsaving ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    {/* Topic */}
                    <div className="flex-1">
                      <p className={`text-[13px] font-medium leading-snug line-clamp-2 transition-colors
                        ${isDarkMode ? "text-gray-300 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>
                        {sess.topic}
                      </p>
                      <div className={`flex items-center gap-2 mt-2 text-[11px] ${subtle}`}>
                        <span>
                          {new Date(sess.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        {(report?.word_count ?? 0) > 0 && (
                          <>
                            <span>·</span>
                            <span>{report!.word_count.toLocaleString()} words</span>
                          </>
                        )}
                        {(report?.iteration_count ?? 0) > 0 && (
                          <>
                            <span>·</span>
                            <span>{report!.iteration_count} iterations</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-1 pt-2.5 border-t ${divider}`}>

                      {/* Unsave button */}
                      <button
                        onClick={() => handleUnsave(sess.id)}
                        title="Remove from saved"
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all ${actionBtn}`}
                      >
                        {isUnsaving
                          ? <Loader2 size={11} className="animate-spin" />
                          : <BookmarkX size={11} />}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">Unsave</span>
                      </button>

                      {/* Delete */}
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(sess.id)}
                            className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-all
                              ${isDarkMode ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`}
                          >
                            {isDeleting ? "Deleting…" : "Delete"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className={`text-[11px] px-2 py-1 rounded-lg transition-all ${actionBtn}`}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(sess.id)}
                          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all opacity-0 group-hover:opacity-100
                            ${isDarkMode ? "text-gray-700 hover:text-red-400 hover:bg-red-500/5" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}

                      {/* Open */}
                      <Link
                        href={`/report/${sess.id}`}
                        className={`ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all
                          ${isDarkMode ? "text-gray-600 hover:text-red-400 hover:bg-red-500/5" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                      >
                        Open <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
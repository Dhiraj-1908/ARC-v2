"use client";
import { useState, useEffect } from "react";
import {
  FileText, Trash2, Loader2, Check, Bookmark, BookmarkCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Session {
  id: string;
  topic: string;
  status: string;
  created_at: string;
}

interface Props {
  session: Session;
  isActive: boolean;
  isDarkMode: boolean;
  t: Record<string, string>;
  userId: string;
  onLoad: (id: string) => void;
  onDeleted: (id: string) => void;
  currentSessionId: string | null;
  isGenerating: boolean;
}

export default function SidebarSessionItem({
  session, isActive, isDarkMode, t, userId, onLoad, onDeleted, currentSessionId, isGenerating,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Save to DB state ────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const isTemp = session.id.startsWith("temp-");
  const reportId = isTemp ? currentSessionId : session.id;
  const canAct = !isTemp && !!reportId;
  const isBlockedDuringGen = isGenerating && !isActive;

  // Check saved status on mount / when reportId changes
  useEffect(() => {
    if (!reportId || isTemp) return;
    fetch("/api/saved-reports")
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.saved) {
          setSaved(json.saved.some((s: { session_id: string }) => s.session_id === reportId));
        }
      })
      .catch(() => {});
  }, [reportId, isTemp]);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving || !reportId) return;

    setSaving(true);
    try {
      if (saved) {
        const res = await fetch(`/api/saved-reports?sessionId=${reportId}`, { method: "DELETE" });
        if (res.ok) {
          setSaved(false);
          setSaveFeedback("Removed");
        }
      } else {
        const res = await fetch("/api/saved-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: reportId }),
        });
        if (res.ok) {
          setSaved(true);
          setSaveFeedback("Saved!");
        } else if (res.status === 401) {
          setSaveFeedback("Sign in first");
        } else {
          setSaveFeedback("Failed");
        }
      }
    } catch {
      setSaveFeedback("Error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveFeedback(null), 1800);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!reportId) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      // Also unsave from dashboard if saved
      await fetch(`/api/saved-reports?sessionId=${reportId}`, { method: "DELETE" });
      await supabase.from("sources").delete().eq("session_id", reportId);
      await supabase.from("reports").delete().eq("session_id", reportId);
      await supabase.from("research_sessions").delete().eq("id", reportId);
      onDeleted(session.id);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const activeClass = isActive
    ? isDarkMode
      ? "bg-red-500/10 border-l-2 border-red-500/50 text-red-300"
      : "bg-red-50 border-l-2 border-red-400 text-red-700"
    : isDarkMode
      ? "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100";

  return (
    <div
      className="relative mb-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); if (!saving) setDeleteConfirm(false); }}
    >
      <div
        role="button"
        tabIndex={isBlockedDuringGen ? -1 : 0}
        onClick={() => { if (isTemp || isBlockedDuringGen) return; onLoad(session.id); }}
        onKeyDown={e => { if (!isTemp && !isBlockedDuringGen && (e.key === "Enter" || e.key === " ")) onLoad(session.id); }}
        className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-all select-none
          ${isBlockedDuringGen ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
          ${activeClass}`}
      >
        {isTemp
          ? <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 animate-pulse" />
          : <FileText size={11} className="mt-0.5 shrink-0 opacity-40" />
        }
        <span className={`text-xs leading-snug flex-1 min-w-0 ${hovered && canAct ? "line-clamp-1" : "line-clamp-2"}`}>
          {session.topic}
        </span>

        {/* Action buttons — visible on hover */}
        {hovered && canAct && !isBlockedDuringGen && (
          <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>

            {/* Save button */}
            <div className="relative">
              <button
                type="button"
                title={saved ? "Unsave from dashboard" : "Save to dashboard"}
                onClick={handleSave}
                disabled={saving}
                className={`p-1 rounded transition-colors ${
                  saved
                    ? "text-yellow-400 hover:bg-yellow-500/10"
                    : isDarkMode
                      ? "text-gray-600 hover:text-gray-300 hover:bg-white/10"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                }`}
              >
                {saving
                  ? <Loader2 size={11} className="animate-spin" />
                  : saved
                    ? <BookmarkCheck size={11} />
                    : <Bookmark size={11} />
                }
              </button>

              {/* Feedback tooltip */}
              {saveFeedback && (
                <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50
                  px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap pointer-events-none shadow-lg
                  ${isDarkMode
                    ? "bg-[#1a1d2a] border border-white/10 text-gray-200"
                    : "bg-white border border-gray-200 text-gray-700"
                  }`}>
                  {saveFeedback}
                  {/* Arrow */}
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                    border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent
                    ${isDarkMode ? "border-t-white/10" : "border-t-gray-200"}`} />
                </div>
              )}
            </div>

            {/* Delete button */}
            {!deleteConfirm ? (
              <button
                type="button"
                title="Delete"
                onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
                className={`p-1 rounded transition-colors ${
                  isDarkMode
                    ? "text-gray-600 hover:text-red-400 hover:bg-red-500/10"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                }`}
              >
                <Trash2 size={11} />
              </button>
            ) : (
              <button
                type="button"
                title="Confirm delete"
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

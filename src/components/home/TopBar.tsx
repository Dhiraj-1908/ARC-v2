"use client";
import Link from "next/link";
import { Sun, Moon, Plus, ChevronRight, FileSearch } from "lucide-react";

interface TopBarProps {
  isDarkMode: boolean;
  t: Record<string, string>;
  isLoggedIn: boolean;
  researchStarted: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleMode: () => void;
  onNewResearch: () => void;
}

export default function TopBar({
  isDarkMode, t, isLoggedIn, researchStarted,
  sidebarOpen, onToggleSidebar, onToggleMode, onNewResearch,
}: TopBarProps) {
  return (
    <header className={`flex items-center justify-between px-5 py-3 border-b
      ${isDarkMode ? "border-white/[0.06]" : "border-gray-200"} ${t.topbar} backdrop-blur shrink-0`}>
      <div className="flex items-center gap-3">
        {isLoggedIn && (
          <button type="button" onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg ${t.hover} ${t.muted} transition-all`}>
            <ChevronRight size={14} className={`transition-transform duration-300 ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        {!isLoggedIn && <span className="text-red-500 font-bold text-base tracking-tight">ARC</span>}
      </div>

      <div className="flex items-center gap-2.5">
        {researchStarted && (
          <button type="button" onClick={onNewResearch}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/18 border border-red-500/15 text-red-400 font-medium transition-all flex items-center gap-1.5">
            <Plus size={12} /> New Research
          </button>
        )}
        <Link href="/doc-research"
          className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all
            ${isDarkMode ? "border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400"
              : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500"}`}>
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
        <button type="button" onClick={onToggleMode}
          className={`p-2 rounded-full transition-all
            ${isDarkMode ? "bg-white/[0.06] text-yellow-400 hover:bg-white/[0.09]"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
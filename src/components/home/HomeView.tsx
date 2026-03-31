"use client";
import Image from "next/image";
import Link from "next/link";
import { X, ChevronRight, FileSearch } from "lucide-react";
import UserInput from "@/components/ui/deep-research/UserInput";
import QnA from "@/components/ui/deep-research/QnA";

interface HomeViewProps {
  isDarkMode: boolean;
  t: Record<string, string>;
  isLoaded: boolean;
  hasMounted: boolean;
  isLoggedIn: boolean;
  justLoggedIn: boolean;
  hasQuestions: boolean;
  onDismissLoginBanner: () => void;
}

export default function HomeView({
  isDarkMode, t, isLoaded, hasMounted, isLoggedIn,
  justLoggedIn, hasQuestions, onDismissLoginBanner,
}: HomeViewProps) {
  return (
    <div className={`flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-12
      transition-opacity duration-500 ${isLoaded ? "opacity-100" : "opacity-0"}`}>

      {justLoggedIn && (
        <div className={`w-full max-w-2xl mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border
          ${isDarkMode ? "bg-green-500/8 border-green-500/20 text-green-400" : "bg-green-50 border-green-200 text-green-700"}`}>
          <span className="text-sm">✓ Signed in — research reports will be saved.</span>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold underline underline-offset-2">Dashboard →</Link>
            <button type="button" onClick={onDismissLoginBanner}><X size={14} /></button>
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

      {/* Logo + title */}
      <div className="flex flex-col items-center mb-10 -mt-16">
        <div className="relative w-48 h-48 mb-5">
          <div className={`absolute inset-0 rounded-full ${isDarkMode ? "bg-red-500/25" : "bg-red-500/12"} blur-3xl scale-150`} />
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

      {/* Input card */}
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${t.inputCard}`}>
        <div className="p-5">
          {!hasMounted || !hasQuestions
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
}

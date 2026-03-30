"use client";
import { useState, useRef, RefObject } from "react";
import { ChevronRight } from "lucide-react";

interface ReportLayoutProps {
  topicLabel: string;
  clarifications?: { question: string; answer: string }[];
  reportSources?: { url: string; title: string }[];
  isDarkMode: boolean;
  t: Record<string, string>;
  scrollRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export default function ReportLayout({
  topicLabel, clarifications, reportSources, isDarkMode, t, scrollRef, children,
}: ReportLayoutProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="max-w-4xl mx-auto w-full px-4 py-6">

        {/* Topic + sources header */}
        <div className="flex justify-end items-start gap-3 mb-6">
          {reportSources && reportSources.length > 0 && (
            <div className="relative">
              <button type="button" onClick={() => setSourcesOpen(o => !o)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border transition-all ${t.card} ${t.muted}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 shrink-0">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                {reportSources.length} sources
                <ChevronRight size={11} className={`transition-transform duration-200 ${sourcesOpen ? "rotate-90" : ""}`} />
              </button>
              {sourcesOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSourcesOpen(false)} />
                  <div className={`absolute right-0 top-full mt-1.5 z-50 w-80 max-h-72 overflow-y-auto rounded-xl border shadow-2xl
                    ${isDarkMode ? "bg-[#12151f] border-white/10" : "bg-white border-gray-200"}`}>
                    <div className={`px-3 py-2 border-b text-[10px] font-semibold uppercase tracking-wider sticky top-0
                      ${isDarkMode ? "bg-[#12151f] border-white/[0.06] text-gray-500" : "bg-white border-gray-100 text-gray-400"}`}>
                      Sources ({reportSources.length})
                    </div>
                    <div className="py-1">
                      {reportSources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors border-b last:border-0
                            ${isDarkMode ? "border-white/[0.04] text-blue-400 hover:bg-white/[0.04] hover:text-blue-300"
                              : "border-gray-50 text-blue-600 hover:bg-gray-50 hover:text-blue-700"}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
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

        {/* Clarifications */}
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
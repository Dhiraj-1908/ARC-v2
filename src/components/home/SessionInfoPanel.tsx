"use client";
import { useState } from "react";
import { Activity, ChevronRight, ChevronLeft } from "lucide-react";

interface SessionInfoPanelProps {
  data: any;
  isDarkMode: boolean;
  stepsOpen: boolean;
  setStepsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export default function SessionInfoPanel({
  data,
  isDarkMode,
  stepsOpen,
  setStepsOpen,
}: SessionInfoPanelProps) {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [clarsOpen, setClarsOpen] = useState(false);

  const panelBg = isDarkMode
    ? "bg-[#0b0d14] border-white/[0.07]"
    : "bg-white border-gray-200";
  const panelHeader = isDarkMode
    ? "bg-[#0b0d14] border-white/[0.07] text-gray-400"
    : "bg-gray-50 border-gray-200 text-gray-500";
  const toggleBtn = isDarkMode
    ? "bg-white/[0.04] border-white/[0.07] text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
    : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50";
  const sectionBg = isDarkMode
    ? "bg-white/[0.025] border-white/[0.06]"
    : "bg-gray-50 border-gray-200";
  const mutedText = isDarkMode ? "text-gray-500" : "text-gray-500";
  const labelText = isDarkMode ? "text-gray-300" : "text-gray-700";
  const dividerColor = isDarkMode ? "border-white/[0.05]" : "border-gray-200";

  const report = data?.report;
  const sources: any[] = data?.sources ?? [];
  const clarifications: { question: string; answer: string }[] =
    data?.session?.clarifications ?? [];

  return (
    <div className="flex h-full shrink-0">
      {/* Collapse/expand tab */}
      <button
        type="button"
        onClick={() => setStepsOpen((o) => !o)}
        title={stepsOpen ? "Collapse info" : "Expand info"}
        className={`flex flex-col items-center justify-center gap-2 px-1.5 py-4 border-l border-t border-b rounded-l-xl transition-all shrink-0 ${toggleBtn}`}
      >
        {stepsOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        <Activity size={11} className="text-blue-400" />
        <span
          className="text-[9px] font-semibold tracking-wider"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          INFO
        </span>
      </button>

      {/* Panel */}
      <div
        className={`flex flex-col border-l border-t border-b overflow-hidden transition-all duration-300 ${panelBg}
          ${stepsOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
      >
        {/* Header */}
        <div
          className={`px-3 py-2.5 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0 sticky top-0 ${panelHeader}`}
        >
          <Activity size={10} className="text-blue-400" />
          Session Info
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Stats */}
          {report && (
            <div className={`rounded-xl border p-3 ${sectionBg}`}>
              <p
                className={`text-[9px] font-semibold uppercase tracking-wider mb-2 ${mutedText}`}
              >
                Report Stats
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Words", value: report.word_count?.toLocaleString() },
                  { label: "Tokens used", value: report.token_used?.toLocaleString() },
                  { label: "Iterations", value: report.iteration_count },
                ].map(
                  (s) =>
                    s.value && (
                      <div
                        key={s.label}
                        className="flex items-center justify-between"
                      >
                        <span className={`text-[11px] ${mutedText}`}>
                          {s.label}
                        </span>
                        <span className={`text-[11px] font-medium ${labelText}`}>
                          {s.value}
                        </span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}

          {/* Sources collapsible */}
          {sources.length > 0 && (
            <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
              <button
                type="button"
                onClick={() => setSourcesOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${mutedText} transition-colors`}
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Sources ({sources.length})
                </span>
                <ChevronRight
                  size={11}
                  className={`transition-transform duration-200 ${
                    sourcesOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              {sourcesOpen && (
                <div
                  className={`px-3 pb-3 space-y-1.5 border-t ${dividerColor}`}
                >
                  {sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[11px] text-blue-400/70 hover:text-blue-300 truncate transition-colors pt-1.5"
                      title={s.url}
                    >
                      {s.title || s.url?.split("/")[2] || s.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clarifications collapsible */}
          {clarifications.length > 0 && (
            <div className={`rounded-xl border overflow-hidden ${sectionBg}`}>
              <button
                type="button"
                onClick={() => setClarsOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider ${mutedText} transition-colors`}
              >
                <span>Scope ({clarifications.length})</span>
                <ChevronRight
                  size={11}
                  className={`transition-transform duration-200 ${
                    clarsOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              {clarsOpen && (
                <div
                  className={`px-3 pb-3 space-y-3 border-t ${dividerColor}`}
                >
                  {clarifications.map((c, i) => (
                    <div key={i} className="pt-2">
                      <p className={`text-[10px] ${mutedText} mb-0.5`}>
                        {c.question}
                      </p>
                      <p className={`text-[11px] font-medium ${labelText}`}>
                        {c.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
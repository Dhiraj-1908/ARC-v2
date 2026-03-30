"use client";
import { useEffect, useRef } from "react";
import { Activity, ChevronRight, ChevronLeft } from "lucide-react";

interface Step {
  type: string;
  status?: string;
  message: string;
}

interface StepsPanelProps {
  acts: Step[];
  isDarkMode: boolean;
  isLoading: boolean;
  stepsOpen: boolean;
  setStepsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export default function StepsPanel({
  acts,
  isDarkMode,
  isLoading,
  stepsOpen,
  setStepsOpen,
}: StepsPanelProps) {
  const stepsEndRef = useRef<HTMLDivElement>(null);

  const panelBg = isDarkMode
    ? "bg-[#0b0d14] border-white/[0.07]"
    : "bg-white border-gray-200";
  const panelHeader = isDarkMode
    ? "bg-[#0b0d14] border-white/[0.07] text-gray-400"
    : "bg-gray-50 border-gray-200 text-gray-500";
  const toggleBtn = isDarkMode
    ? "bg-white/[0.04] border-white/[0.07] text-gray-400 hover:text-gray-200 hover:bg-white/[0.08]"
    : "bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50";
  const stepBorder = isDarkMode ? "border-white/[0.05]" : "border-gray-100";
  const stepType = isDarkMode ? "text-gray-200" : "text-gray-700";
  const stepMsg = isDarkMode ? "text-gray-500" : "text-gray-400";

  // Auto-scroll to latest step while generating
  useEffect(() => {
    if (stepsOpen && isLoading) {
      stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [acts, stepsOpen, isLoading]);

  if (acts.length === 0) return null;

  return (
    <div className="flex h-full shrink-0">
      {/* Collapse/expand tab */}
      <button
  type="button"
  onClick={() => setStepsOpen((o) => !o)}
  onMouseDown={e => e.preventDefault()}
  title={stepsOpen ? "Collapse steps" : "Expand steps"}
  className={`flex flex-col items-center justify-center gap-2 px-1.5 py-4 border-l border-t border-b rounded-l-xl transition-all shrink-0 ${toggleBtn}`}
>
        {stepsOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        <Activity size={11} className="text-blue-400" />
        <span
          className="text-[9px] font-semibold tracking-wider"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {acts.length} STEPS
        </span>
      </button>

      {/* Panel */}
      <div
        className={`flex flex-col border-l border-t border-b overflow-hidden transition-all duration-300 ${panelBg}
          ${stepsOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
      >
        {/* Header */}
        <div
          className={`px-3 py-2.5 border-b text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between shrink-0 sticky top-0 ${panelHeader}`}
        >
          <span className="flex items-center gap-1.5">
            <Activity size={10} className="text-blue-400" />
            Research Steps
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
            {acts.length}
          </span>
        </div>

        {/* Steps list — scrollable */}
        <div className="flex-1 overflow-y-auto py-1">
          {acts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 px-3 py-2.5 text-xs border-b last:border-0 ${stepBorder}`}
            >
              <span
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                  ${a.status === "complete"
                    ? "bg-green-500/20 text-green-400"
                    : a.status === "warning"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-blue-500/20 text-blue-400"}`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold capitalize mb-0.5 flex items-center gap-1.5 ${stepType}`}>
                  {a.type}
                  {a.status && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium
                        ${a.status === "complete"
                          ? "bg-green-500/15 text-green-400"
                          : a.status === "warning"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-blue-500/15 text-blue-400"}`}
                    >
                      {a.status}
                    </span>
                  )}
                </p>
                <p className={`text-[11px] leading-relaxed break-words ${stepMsg}`}>
                  {a.message}
                </p>
              </div>
            </div>
          ))}
          <div ref={stepsEndRef} />
        </div>
      </div>
    </div>
  );
}
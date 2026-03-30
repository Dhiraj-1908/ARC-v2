"use client";
import { useState, useEffect } from "react";
import { Search, Globe, Layers, Sparkles, BookOpen } from "lucide-react";

const RESEARCH_PHASES = [
  { icon: Search,   label: "Analyzing topic",      colorDark: "text-blue-400",   colorLight: "text-blue-600"   },
  { icon: Globe,    label: "Searching the web",     colorDark: "text-purple-400", colorLight: "text-purple-600" },
  { icon: Layers,   label: "Extracting insights",   colorDark: "text-yellow-400", colorLight: "text-amber-600"  },
  { icon: Sparkles, label: "Synthesizing findings", colorDark: "text-pink-400",   colorLight: "text-pink-600"   },
  { icon: BookOpen, label: "Writing your report",   colorDark: "text-green-400",  colorLight: "text-green-600"  },
];

interface Activity {
  type: string;
  status?: string;
  message: string;
}

interface ResearchAnimationProps {
  activities: Activity[];
  isDarkMode: boolean;
}

export default function ResearchAnimation({ activities, isDarkMode }: ResearchAnimationProps) {
  const [phase, setPhase] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % RESEARCH_PHASES.length), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  const cur = RESEARCH_PHASES[phase];
  const Icon = cur.icon;
  const iconColor = isDarkMode ? cur.colorDark : cur.colorLight;
  const last = activities[activities.length - 1];

  const labelText   = isDarkMode ? "text-white"       : "text-gray-800";
  const subText     = isDarkMode ? "text-gray-500"    : "text-gray-500";
  const dotInactive = isDarkMode ? "bg-white/10"      : "bg-gray-300";
  const dotPast     = isDarkMode ? "bg-red-500/40"    : "bg-red-300";
  const ringOuter   = isDarkMode ? "border-white/[0.06]" : "border-gray-300";
  const ringInner   = isDarkMode ? "border-white/[0.08]" : "border-gray-200";
  const glowBg      = isDarkMode
    ? "bg-gradient-to-br from-red-500/20 to-blue-500/10"
    : "bg-gradient-to-br from-red-500/10 to-blue-500/5";

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 gap-8 select-none">

      {/* Spinner */}
      <div className="relative w-28 h-28">
        <div className={`absolute inset-0 rounded-full border ${ringOuter} animate-spin`} style={{ animationDuration: "8s" }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500/80" />
        </div>
        <div className={`absolute inset-3 rounded-full border ${ringInner} animate-spin`} style={{ animationDuration: "5s", animationDirection: "reverse" }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500/80" />
        </div>
        <div className={`absolute inset-6 rounded-full ${glowBg} blur-sm animate-pulse`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={24} className={`${iconColor} transition-all duration-700`} />
        </div>
      </div>

      {/* Label */}
      <div className="flex flex-col items-center gap-2">
        <p className={`font-semibold text-lg ${labelText}`}>{cur.label}{dots}</p>
        {last && (
          <p className={`text-xs max-w-xs text-center truncate ${subText}`}>
            {last.message?.length > 60 ? last.message.slice(0, 60) + "…" : last.message}
          </p>
        )}
      </div>

      {/* Phase dots */}
      <div className="flex gap-2">
        {RESEARCH_PHASES.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all duration-700
            ${i === phase ? "w-6 bg-red-500" : i < phase ? `w-2 ${dotPast}` : `w-2 ${dotInactive}`}`}
          />
        ))}
      </div>
    </div>
  );
}
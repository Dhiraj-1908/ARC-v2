"use client";
import { useDeepResearchStore } from '@/store/deepResearch';
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import ResearchActivities from './ResearchActivities';
import ResearchReport from './ResearchReport';
import StepsPanel from '@/components/home/StepsPanel';
import { Sun, Moon } from "lucide-react";

interface ResearchProgressPageProps {
  isDarkMode: boolean;
}

const ResearchProgressPage = ({ isDarkMode: initialDarkMode }: ResearchProgressPageProps) => {
  const { isLoading, report, activities } = useDeepResearchStore();
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [mounted, setMounted] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(initialDarkMode);
  }, [initialDarkMode]);

  // Auto-close steps panel once report is ready
  useEffect(() => {
    if (report.length > 0 && !isLoading) {
      setStepsOpen(false);
    }
  }, [report, isLoading]);

  const toggleMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem("arcThemeMode", newMode ? "dark" : "light");
    }
  };

  // Map activities to the Step shape StepsPanel expects
  const steps = activities.map((a: { type: string; status?: string; message: string }) => ({
    type: a.type,
    status: a.status,
    message: a.message,
  }));

  const theme = {
    background: isDarkMode ? "bg-gray-900" : "bg-[#f0f5fa]",
    text: isDarkMode ? "text-gray-100" : "text-[#0f2e47]",
    mutedText: isDarkMode ? "text-gray-300" : "text-[#4a6583]",
    shadow: isDarkMode ? "shadow-lg shadow-black/30" : "shadow-lg shadow-[#c9d6e3]/40",
    themeToggle: isDarkMode
      ? "bg-gray-800 text-blue-400 hover:bg-gray-700"
      : "bg-white text-blue-500 hover:bg-gray-100",
  };

  if (!mounted) return null;

  return (
    <div className={`w-full min-h-screen ${theme.background} relative transition-colors duration-500`}>
      {/* Theme toggle */}
      <button
        onClick={toggleMode}
        className={`fixed top-6 right-6 z-30 p-3 rounded-full ${theme.themeToggle} transition-all duration-300 ${theme.shadow}`}
        aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background logo */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-0 pointer-events-none transition-opacity duration-500 ${
          report.length > 0 ? "opacity-5" : "opacity-15"
        }`}
      >
        <div className="w-64 h-64 sm:w-80 sm:h-80 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse" />
          <div
            className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping scale-90"
            style={{ animationDuration: isLoading ? "2s" : "5s" }}
          />
          <div
            className={`w-full h-full transition-all duration-500 ${isLoading ? "animate-spin" : ""}`}
            style={{ animationDuration: "8s" }}
          >
            <Image
              src="/logo/logo2.svg"
              width={800}
              height={800}
              alt="Arc Reactor"
              priority
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Left activities sidebar */}
      <ResearchActivities isDarkMode={isDarkMode} />

      {/* Loading overlay */}
      {isLoading && report.length <= 0 && (
        <>
          <div className="fixed top-20 left-0 right-0 z-20 px-4 pointer-events-none">
            <div
              className={`mx-auto max-w-md ${
                isDarkMode ? "bg-gray-800/80" : "bg-white/80"
              } backdrop-blur-sm rounded-full p-4 ${theme.shadow}`}
            >
              <div className="flex items-center space-x-4">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-blue-400/10 animate-pulse" />
                    <div
                      className="w-8 h-8 border-2 rounded-full animate-spin border-blue-500 border-t-blue-300 border-r-blue-300"
                      style={{ animationDuration: "1s" }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${theme.text} font-semibold text-sm truncate`}>
                    Researching Your Query...
                  </p>
                  <p className={`${theme.mutedText} text-xs truncate`}>Scanning the web</p>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-8 left-4 right-4 z-20 pointer-events-none">
            <div
              className={`mx-auto max-w-lg ${
                isDarkMode ? "bg-gray-800/90" : "bg-white/90"
              } backdrop-blur-md rounded-2xl p-6 ${theme.shadow} border ${
                isDarkMode ? "border-gray-700/50" : "border-gray-200/50"
              }`}
            >
              <div className="flex justify-center space-x-3 mb-4">
                {[0, 0.5, 1].map((delay) => (
                  <div
                    key={delay}
                    className="w-3 h-3 rounded-full animate-pulse bg-blue-500"
                    style={{ animationDelay: `${delay}s`, animationDuration: "2s" }}
                  />
                ))}
              </div>
              <div className="text-center space-y-2">
                <p className={`${theme.text} font-medium text-sm sm:text-base`}>
                  ARC scans the web in real time to deliver sharp, customised research reports.
                </p>
                <p className={`${theme.mutedText} text-xs sm:text-sm`}>
                  Estimated time: 1–2 minutes
                </p>
              </div>
              <div className="mt-4">
                <div
                  className={`w-full h-1 ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-200"
                  } rounded-full overflow-hidden`}
                >
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: "100%",
                      background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
                      animation: "progress-wave 2s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes progress-wave {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </>
      )}

      {/* ── MAIN CONTENT + RIGHT STEPS PANEL ── */}
      <div className="relative z-10 w-full md:pl-[420px] min-h-screen flex flex-col items-start justify-start pt-16 pb-16">
        {/* Flex row: report content + steps panel side by side */}
        <div className="w-full flex items-start justify-start">
          {/* Report */}
          <div className="flex-1 min-w-0 px-4">
            <div className="w-full max-w-3xl mx-auto">
              <ResearchReport isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Steps panel — only show when there are steps */}
          {steps.length > 0 && (
            <div className="hidden md:flex shrink-0 self-stretch items-start pt-0 pr-2">
              <div className="sticky top-16">
                <StepsPanel
                  acts={steps}
                  isDarkMode={isDarkMode}
                  isLoading={isLoading}
                  stepsOpen={stepsOpen}
                  setStepsOpen={setStepsOpen}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchProgressPage;

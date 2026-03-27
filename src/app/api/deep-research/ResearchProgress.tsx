"use client";
import { useDeepResearchStore } from '@/store/deepResearch';
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import ResearchActivities from './ResearchActivities';
import ResearchReport from './ResearchReport';
import { Sun, Moon } from "lucide-react";

interface ResearchProgressPageProps {
  isDarkMode: boolean;
}

const ResearchProgressPage = ({ isDarkMode: initialDarkMode }: ResearchProgressPageProps) => {
  const { isLoading, report } = useDeepResearchStore();
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(initialDarkMode);
  }, [initialDarkMode]);

  const toggleMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem("arcThemeMode", newMode ? "dark" : "light");
    }
  };

  const theme = {
    background: isDarkMode ? "bg-gray-900" : "bg-[#f0f5fa]",
    text: isDarkMode ? "text-gray-100" : "text-[#0f2e47]",
    mutedText: isDarkMode ? "text-gray-300" : "text-[#4a6583]",
    shadow: isDarkMode ? "shadow-lg shadow-black/30" : "shadow-lg shadow-[#c9d6e3]/40",
    themeToggle: isDarkMode 
      ? "bg-gray-800 text-blue-400 hover:bg-gray-700" 
      : "bg-white text-blue-500 hover:bg-gray-100",
    accentColor: "text-blue-500",
    accentBg: "bg-blue-500",
    accentBorder: "border-blue-500",
    accentLight: "text-blue-400",
    accentBgLight: "bg-blue-400",
  };

  if (!mounted) return null;

  return (
    <div className={`w-full min-h-screen ${theme.background} flex flex-col items-center justify-center relative transition-colors duration-500 overflow-hidden`}>
      {/* Theme toggle button */}
      <button
        onClick={toggleMode}
        className={`fixed top-6 right-6 z-10 p-3 rounded-full ${theme.themeToggle} transition-all duration-300 ${theme.shadow}`}
        aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background with the logo - visible during loading */}
      <div className={`absolute inset-0 flex items-center justify-center z-0 transition-opacity duration-500 ${report.length > 0 ? 'opacity-10' : 'opacity-20'} overflow-hidden`}>
        <div className="relative">
          {/* Enhanced logo container with animation */}
          <div className="w-64 h-64 sm:w-80 sm:h-80 relative flex items-center justify-center">
            {/* Blue glow effect */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse"></div>
            
            {/* Animated border */}
            <div
              className={`absolute inset-0 rounded-full border border-blue-500/30 animate-ping transform scale-[0.9]`}
              style={{
                animationDuration: isLoading ? "2s" : "5s",
                animationIterationCount: "infinite",
              }}
            ></div>

            {/* Logo with rotation during loading */}
            <div 
              className={`w-full h-full transition-all duration-500 ${isLoading ? 'animate-spin' : ''}`}
              style={{ animationDuration: '8s' }}
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
      </div>

      {/* Activities component */}
      <ResearchActivities isDarkMode={isDarkMode} />

      {/* Loading State */}
      {isLoading && report.length <= 0 && (
        <>
          {/* Top Loading Bar */}
          <div className="fixed top-20 left-0 right-0 z-20 px-4">
            <div className={`mx-auto max-w-md ${isDarkMode ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-sm rounded-full p-4 ${theme.shadow}`}>
              <div className="flex items-center space-x-4">
                {/* Enhanced Spinner with blue glow */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-blue-400/10 animate-pulse"></div>
                    <div 
                      className={`w-8 h-8 border-2 rounded-full animate-spin border-blue-500 border-t-blue-300 border-r-blue-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                      style={{ animationDuration: '1s' }}
                    ></div>
                  </div>
                </div>
                
                {/* Loading Text */}
                <div className="flex-1 min-w-0">
                  <p className={`${theme.text} font-semibold text-sm truncate`}>
                    Researching Your Query...
                  </p>
                  <p className={`${theme.mutedText} text-xs truncate`}>
                    Scanning the web
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status Card - Enhanced */}
          <div className="fixed bottom-8 left-4 right-4 z-20">
            <div className={`mx-auto max-w-lg ${isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-md rounded-2xl p-6 ${theme.shadow} border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
              {/* Progress Dots with blue glow */}
              <div className="flex justify-center space-x-3 mb-4">
                {[0, 0.5, 1].map((delay) => (
                  <div 
                    key={delay}
                    className={`w-3 h-3 rounded-full animate-pulse bg-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]`}
                    style={{ 
                      animationDelay: `${delay}s`, 
                      animationDuration: '2s' 
                    }}
                  ></div>
                ))}
              </div>

              {/* Status Text */}
              <div className="text-center space-y-2">
                <p className={`${theme.text} font-medium text-sm sm:text-base`}>
                  ARC scans the web in real time to deliver sharp, customized query-specific research report.
                </p>
                <p className={`${theme.mutedText} text-xs sm:text-sm`}>
                  Estimated time: 1-2 minutes
                </p>
              </div>

              {/* Animated Progress Bar with blue glow */}
              <div className="mt-4">
                <div className={`w-full h-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div 
                    className={`h-full rounded-full bg-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.4)]`}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
                      animation: 'progress-wave 2s ease-in-out infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* CSS for progress wave animation */}
          <style jsx>{`
            @keyframes progress-wave {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </>
      )}

      {/* Content area */}
      <div className="relative z-5 w-full flex flex-col items-center pt-16 md:pt-8 overflow-hidden">
        <div className="w-full flex justify-center overflow-hidden">
          <ResearchReport isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
};

export default ResearchProgressPage;
"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";

// A loading screen component that respects dark mode
const LoadingScreen = () => {
  // State to track dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  
  // Check for dark mode preference after component mounts
  useEffect(() => {
    setHasMounted(true);
    
    // Check system or saved preference for dark mode
    const savedMode = localStorage.getItem("arcThemeMode");
    if (savedMode) {
      setIsDarkMode(savedMode === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(prefersDark);
    }
  }, []);
  
  // Don't render anything during SSR
  if (!hasMounted) {
    return null;
  }
  
  // Theme settings based on mode
  const theme = {
    background: isDarkMode ? "bg-gray-900" : "bg-[#f0f5fa]",
    text: isDarkMode ? "text-gray-100" : "text-[#0f2e47]",
    mutedText: isDarkMode ? "text-gray-300" : "text-[#4a6583]",
    spinnerBorder: isDarkMode ? "border-blue-400" : "border-[#5ca7c7]"
  };
  
  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${theme.background} ${theme.text}`}>
      <div className="relative mb-8">
        {/* Logo image */}
        <div className="w-24 h-24 relative flex items-center justify-center">
          {/* Glowing effect */}
          <div 
            className={`absolute inset-0 rounded-full ${
              isDarkMode ? "bg-blue-500/20" : "bg-[#c8a250]/10"
            } blur-2xl`}
          ></div>
          
          {/* Logo with slow spin animation */}
          <div className="w-full h-full animate-spin" style={{ animationDuration: '8s' }}>
            <Image
              src="/logo/logo2.svg"
              width={200}
              height={200}
              alt="Arc Reactor"
              priority
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-medium mb-2">Preparing Research Environment</h2>
      <p className={`${theme.mutedText} text-center max-w-md`}>
        Please wait while we verify your research session...
      </p>
    </div>
  );
};

export default LoadingScreen;
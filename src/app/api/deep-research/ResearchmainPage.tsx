
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useDeepResearchStore } from '@/store/deepResearch';
import React, { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import ResearchProgressPage from '@/app/api/deep-research/ResearchProgress';
import { useRouter } from 'next/navigation';

const ResearchPage = () => {
  const router = useRouter();
  const {
    questions,
    topic,
    answers,
    setIsLoading,
    setActivities,
    setSources,
    setReport,
    isCompleted
  } = useDeepResearchStore();
  
  const { append, data } = useChat({
    api: "/api/deep-research"
  });

  // Track if we've mounted to avoid hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  // Get the dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Only run after component has mounted
  useEffect(() => {
    setHasMounted(true);
    
    // Check system or saved preference for dark mode
    const savedMode = localStorage.getItem("arcThemeMode");
    if (savedMode) {
      setIsDarkMode(savedMode === "dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Redirect if requirements aren't met
  useEffect(() => {
    if (!hasMounted) return; // Skip until we've mounted
    
    // Ensure user has completed the questionnaire by checking isCompleted
    if (!topic || !questions.length || answers.length < questions.length || !isCompleted) {
      router.replace('/');
    }
  }, [topic, questions, answers, isCompleted, router, hasMounted]);

  useEffect(() => {
    if (!hasMounted || !data) return; // Skip until we've mounted

    // Extract activities and sources
    const messages = data as unknown[];
    const activities = messages
      .filter(
        (msg) => typeof msg === "object" && (msg as any).type === "activity"
      )
      .map((msg) => (msg as any).content);

    setActivities(activities);

    const sources = activities
      .filter((activity) => activity.type === "extract" && activity.status === "complete")
      .map((activity) => {
        const url = activity.message.split("from ")[1];
        return {
          url,
          title: url?.split("/")[2] || url,
        };
      });

    setSources(sources);
    
    const reportData = messages.find(
      (msg) => typeof msg === "object" && (msg as any).type === "report");

    const report = typeof (reportData as any)?.content === "string"
      ? (reportData as any).content
      : "";
    setReport(report);

    setIsLoading(!report.length);
  }, [data, setActivities, setSources, setReport, setIsLoading, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return; // Skip until we've mounted
    
    // When this page loads, initiate the research immediately if we have questions and answers
    // and we haven't already sent a request
    if (questions.length > 0 && 
        answers.length === questions.length && 
        isCompleted && 
        !data?.length) {
      
      const clarifications = questions.map((question, index) => ({
        question: question,
        answer: answers[index]
      }));

      append({
        role: "user",
        content: JSON.stringify({
          topic: topic,
          clarifications: clarifications
        })
      });
      
      // Set loading state to true when sending the request
      setIsLoading(true);
    }
  }, [questions, answers, topic, append, setIsLoading, data, isCompleted, hasMounted]);

  // During server render or before client hydration, return null or a loading placeholder
  if (!hasMounted) {
    return null; // Return nothing during SSR to prevent hydration mismatch
  }

  return <ResearchProgressPage isDarkMode={isDarkMode} />;
};

export default ResearchPage;
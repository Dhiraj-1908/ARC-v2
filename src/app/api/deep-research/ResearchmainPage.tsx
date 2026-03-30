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
  questions, topic, answers,
  setIsLoading, setActivities, setSources,
  setReport, setSessionId, isCompleted,
  report,       // ← add this
  activities,   // ← add this
} = useDeepResearchStore();
  
  const { append, data } = useChat({
    api: "/api/deep-research"
  });

  const [hasMounted, setHasMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const savedMode = localStorage.getItem("arcThemeMode");
    if (savedMode) {
      setIsDarkMode(savedMode === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!topic || !questions.length || answers.length < questions.length || !isCompleted) {
      router.replace('/');
    }
  }, [topic, questions, answers, isCompleted, router, hasMounted]);

  useEffect(() => {
    if (!hasMounted || !data) return;

    const messages = data as unknown[];

    // ── Pick up sessionId streamed from server
    const sessionData = messages.find(
      (msg) => typeof msg === "object" && (msg as any).type === "session"
    );
    if (sessionData) {
      setSessionId((sessionData as any).content.sessionId ?? null);
    }

    // ── Activities
    const activities = messages
      .filter((msg) => typeof msg === "object" && (msg as any).type === "activity")
      .map((msg) => (msg as any).content);
    setActivities(activities);

    // ── Sources derived from activities
    const sources = activities
      .filter((a) => a.type === "extract" && a.status === "complete")
      .map((a) => {
        const url = a.message.split("from ")[1];
        return { url, title: url?.split("/")[2] || url };
      });
    setSources(sources);

    // ── Report
    const reportData = messages.find(
      (msg) => typeof msg === "object" && (msg as any).type === "report"
    );
    const report =
      typeof (reportData as any)?.content === "string"
        ? (reportData as any).content
        : "";
    setReport(report);
    setIsLoading(!report.length);
  }, [data, setActivities, setSources, setReport, setIsLoading, setSessionId, hasMounted]);

  useEffect(() => {
    if (!hasMounted) return;
    if (
      questions.length > 0 &&
      answers.length === questions.length &&
      isCompleted &&
!data?.length && 
!report.length &&
 activities.length === 0
    ) {
      const clarifications = questions.map((question, index) => ({
        question,
        answer: answers[index],
      }));
      append({
        role: "user",
        content: JSON.stringify({ topic, clarifications }),
      });
      setIsLoading(true);
    }
  }, [questions, answers, topic, append, setIsLoading, data, isCompleted, hasMounted]);

  if (!hasMounted) return null;

  return <ResearchProgressPage isDarkMode={isDarkMode} />;
};

export default ResearchPage;
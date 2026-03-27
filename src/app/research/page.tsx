"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeepResearchStore } from '@/store/deepResearch';
import ResearchPage from "../api/deep-research/ResearchmainPage";
import LoadingScreen from "./loadingscreen"; 

export default function Research() {
  const router = useRouter();
  const { topic, questions, answers, isCompleted } = useDeepResearchStore();
  const [hasMounted, setHasMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Check if the user has completed the questionnaire and clicked "Start Research"
  useEffect(() => {
    if (!hasMounted) return;
    
    // Check if user has completed the process
    if (!topic || !isCompleted || questions.length === 0 || answers.length < questions.length) {
      // Redirect to home if requirements aren't met
      router.replace('/');
    } else {
      // User is authorized to view the research page
      setIsAuthorized(true);
    }
  }, [topic, questions, answers, isCompleted, router, hasMounted]);

  // During SSR or before hydration check completes, show nothing
  if (!hasMounted) {
    return null;
  }
  
  // Show loading state while we check authorization
  if (!isAuthorized) {
    return <LoadingScreen />;
  }

  // Only render the research page once we've confirmed the user is authorized
  return <ResearchPage />;
}
"use client";
import { RefObject } from "react";
import ReportLayout from "./ReportLayout";
import StepsPanel from "./StepsPanel";
import ResearchAnimation from "./ResearchAnimation";
import ReportChat from "./ReportChat";
import ResearchReport from "@/app/api/deep-research/ResearchReport";

interface Source { url: string; title: string; }
interface Activity { type: string; status?: string; message: string; }

interface ResearchViewProps {
  // session loading
  activeSessionId: string | null;
  activeSessionData: any;
  loadingSession: boolean;
  // live state from store
  topic: string;
  questions: string[];
  answers: string[];
  report: string;
  sources: Source[];
  activities: Activity[];
  isLoading: boolean;
  sessionId: string | null;
  // ui
  isDarkMode: boolean;
  t: Record<string, string>;
  isLoggedIn: boolean;
  stepsOpen: boolean;
  setStepsOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

function extractReport(raw: string) {
  if (raw.includes("<report>") && raw.includes("</report>"))
    return raw.split("<report>")[1].split("</report>")[0];
  return raw;
}

export default function ResearchView({
  activeSessionId, activeSessionData, loadingSession,
  topic, questions, answers, report, sources, activities, isLoading, sessionId,
  isDarkMode, t, isLoggedIn, stepsOpen, setStepsOpen, scrollRef,
}: ResearchViewProps) {

  // ── Loading a saved session ───────────────────────────────────────────────
  if (activeSessionId && !activeSessionId.startsWith("temp-")) {
    if (loadingSession) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm ${t.muted}`}>Loading report…</span>
          </div>
        </div>
      );
    }

    if (activeSessionData) {
      const { session: sess } = activeSessionData;
      const clarifications = sess.clarifications ?? [];
      const savedReportContent = extractReport(activeSessionData.report?.content ?? "");
      const savedSources = (activeSessionData.sources ?? []).map((s: any) => ({
        url: s.url,
        title: s.title || s.url?.split("/")[2] || s.url,
      }));

      return (
        <div className="flex flex-1 overflow-hidden">
          <ReportLayout
            topicLabel={sess.topic}
            clarifications={clarifications}
            reportSources={savedSources}
            isDarkMode={isDarkMode}
            t={t}
            scrollRef={scrollRef}
          >
            <div className="mb-4"><ResearchReport isDarkMode={isDarkMode} /></div>
            {savedReportContent && (
              <ReportChat
                reportContent={savedReportContent}
                reportTopic={sess.topic}
                isDarkMode={isDarkMode}
                sessionId={activeSessionId}
                isLoggedIn={isLoggedIn}
              />
            )}
          </ReportLayout>
          <StepsPanel
            acts={activities}
            isDarkMode={isDarkMode}
            isLoading={isLoading}
            stepsOpen={stepsOpen}
            setStepsOpen={setStepsOpen}
          />
        </div>
      );
    }

    // Session found but no data yet — shouldn't normally reach here
    return null;
  }

  // ── Live / just-generated report ─────────────────────────────────────────
  const liveClarifications = questions.map((q, i) => ({ question: q, answer: answers[i] }));
  const liveReportContent = extractReport(report);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ReportLayout
        topicLabel={topic}
        clarifications={liveClarifications}
        reportSources={sources}
        isDarkMode={isDarkMode}
        t={t}
        scrollRef={scrollRef}
      >
        {isLoading && report.length === 0 && (
          <ResearchAnimation activities={activities} isDarkMode={isDarkMode} />
        )}
        {report.length > 0 && (
          <>
            <div className="mb-4"><ResearchReport isDarkMode={isDarkMode} /></div>
            {!isLoading && (
              <ReportChat
                reportContent={liveReportContent}
                reportTopic={topic}
                isDarkMode={isDarkMode}
                sessionId={sessionId}
                isLoggedIn={isLoggedIn}
              />
            )}
          </>
        )}
      </ReportLayout>
      {activities.length > 0 && (
        <StepsPanel
          acts={activities}
          isDarkMode={isDarkMode}
          isLoading={isLoading}
          stepsOpen={stepsOpen}
          setStepsOpen={setStepsOpen}
        />
      )}
    </div>
  );
}
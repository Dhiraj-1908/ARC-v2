import { Activity, Source } from "@/app/api/deep-research/types"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface DeepResearchState {
  topic: string,
  questions: string[],
  answers: string[],
  currentQuestion: number,
  isCompleted: boolean,
  isLoading: boolean,
  activities: Activity[],
  sources: Source[],
  report: string,
  sessionId: string | null,
}

interface DeepResearchActions {
  setTopic: (topic: string) => void,
  setQuestions: (questions: string[]) => void,
  setAnswers: (answers: string[]) => void,
  setCurrentQuestion: (index: number) => void,
  setIsCompleted: (isCompleted: boolean) => void,
  setIsLoading: (isLoading: boolean) => void,
  setActivities: (activities: Activity[]) => void,
  setSources: (sources: Source[]) => void,
  setReport: (report: string) => void,
  setSessionId: (sessionId: string | null) => void,
}

const initialState: DeepResearchState = {
  topic: "",
  questions: [],
  answers: [],
  currentQuestion: 0,
  isCompleted: false,
  isLoading: false,
  activities: [],
  sources: [],
  report: "",
  sessionId: null,
}

export const useDeepResearchStore = create<DeepResearchState & DeepResearchActions>()(
  persist(
    (set) => ({
      ...initialState,
      setTopic: (topic) => set({ topic }),
      setQuestions: (questions) => set({ questions }),
      setAnswers: (answers) => set({ answers }),
      setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
      setIsCompleted: (isCompleted) => set({ isCompleted }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setActivities: (activities) => set({ activities }),
      setSources: (sources) => set({ sources }),
      setReport: (report) => set({ report }),
      setSessionId: (sessionId) => set({ sessionId }),
    }),
    {
      name: "arc-active-session",
      partialize: (state) => ({
        topic: state.topic,
        report: state.report,
        activities: state.activities,
        sources: state.sources,
        isCompleted: state.isCompleted,
        sessionId: state.sessionId,
        questions: state.questions,
        answers: state.answers,
      }),
      merge: (persisted: unknown, current) => {
        const p = (persisted ?? {}) as Partial<DeepResearchState>
        return {
          ...current,
          ...p,
          // Guarantee arrays are never null after rehydration
          questions:  Array.isArray(p.questions)  ? p.questions  : [],
          answers:    Array.isArray(p.answers)     ? p.answers    : [],
          activities: Array.isArray(p.activities)  ? p.activities : [],
          sources:    Array.isArray(p.sources)     ? p.sources    : [],
          // Guarantee strings are never null
          topic:  typeof p.topic  === "string" ? p.topic  : "",
          report: typeof p.report === "string" ? p.report : "",
        }
      },
    }
  )
)
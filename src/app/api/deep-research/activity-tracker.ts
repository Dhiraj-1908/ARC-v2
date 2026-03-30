/* eslint-disable @typescript-eslint/no-explicit-any */
import { Activity, ResearchState } from "./types";

export const createActivityTracker = (
  dataStream: any,
  researchState: ResearchState
) => {
  return {
    add: (
      type: Activity["type"],
      status: Activity["status"],
      message: Activity["message"]
    ) => {
      const activity: Activity = {
        type,
        status,
        message,
        timestamp: Date.now(),
      };

      // ← NEW: push into researchState so route.ts can save them
      researchState.activities.push(activity);

      dataStream.writeData({
        type: "activity",
        content: {
          type,
          status,
          message,
          timestamp: activity.timestamp,
          completedSteps: researchState.completedSteps,
          tokenUsed: researchState.tokenUsed,
        },
      });
    },
  };
};
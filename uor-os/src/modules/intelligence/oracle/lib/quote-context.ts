/**
 * quote-context — Gathers user context signals for contextual quote generation.
 */

import { getRecentKeywords } from "@/modules/intelligence/oracle/lib/search-history";

export interface QuoteContext {
  recentTopics: string[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: string;
  sessionCount: number;
}

function getTimeOfDay(): QuoteContext["timeOfDay"] {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const SESSION_COUNT_KEY = "uor:immersive-session-count";

function getAndBumpSessionCount(): number {
  try {
    const n = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0", 10) || 0;
    localStorage.setItem(SESSION_COUNT_KEY, String(n + 1));
    return n + 1;
  } catch {
    return 1;
  }
}

export async function gatherQuoteContext(): Promise<QuoteContext> {
  const recentTopics = await getRecentKeywords(10);
  return {
    recentTopics,
    timeOfDay: getTimeOfDay(),
    dayOfWeek: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()),
    sessionCount: getAndBumpSessionCount(),
  };
}

/**
 * AmbientIntelligenceEngine — Context-aware card surfacing
 * ═══════════════════════════════════════════════════════════
 *
 * Derives contextual signals from:
 *   • Time of day (morning/afternoon/evening/night)
 *   • Day of week (weekday vs weekend)
 *   • Recent activity patterns (calendar events, trust connections, knowledge graph density)
 *   • Triadic phase balance (Learn/Work/Play from sovereign creator framework)
 *
 * Produces ranked AmbientCard suggestions that proactively surface
 * relevant projections without user initiation.
 *
 * @module hologram-ui/engines/AmbientIntelligenceEngine
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────

export type AmbientCardType =
  | "upcoming_event"
  | "trust_request"
  | "knowledge_insight"
  | "focus_suggestion"
  | "greeting"
  | "reflection"
  | "streak"
  | "connection_nudge";

export interface AmbientCard {
  id: string;
  type: AmbientCardType;
  title: string;
  subtitle: string;
  icon: string;
  priority: number;         // 0-100, higher = more prominent
  action?: {
    label: string;
    projection?: "conversation" | "trust" | "calendar" | "knowledge";
  };
  meta?: Record<string, unknown>;
  expiresAt?: Date;
}

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type DayType = "weekday" | "weekend";

// ── Time Context ────────────────────────────────────────────────────────

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function getDayType(): DayType {
  const d = new Date().getDay();
  return d === 0 || d === 6 ? "weekend" : "weekday";
}

const GREETINGS: Record<TimeOfDay, string[]> = {
  morning: ["Good morning", "Rise & create", "A new day begins"],
  afternoon: ["Good afternoon", "Midday momentum", "Afternoon focus"],
  evening: ["Good evening", "Evening reflection", "Winding down"],
  night: ["Night mode", "Late session", "Quiet hours"],
};

const GREETING_SUBTITLES: Record<TimeOfDay, string> = {
  morning: "Your sovereign space awaits",
  afternoon: "Deep work territory",
  evening: "Time to review and reflect",
  night: "Rest is part of the protocol",
};

// ── Engine ──────────────────────────────────────────────────────────────

export async function computeAmbientCards(userId?: string): Promise<AmbientCard[]> {
  const cards: AmbientCard[] = [];
  const tod = getTimeOfDay();
  const dayType = getDayType();
  const now = new Date();

  // 1. Time-based greeting card (always present)
  const greetings = GREETINGS[tod];
  cards.push({
    id: "greeting",
    type: "greeting",
    title: greetings[Math.floor(Math.random() * greetings.length)],
    subtitle: GREETING_SUBTITLES[tod],
    icon: tod === "morning" ? "🌅" : tod === "afternoon" ? "☀️" : tod === "evening" ? "🌆" : "🌙",
    priority: 30,
  });

  if (!userId) return cards;

  // 2. Upcoming calendar events (next 3 hours)
  try {
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, color, location")
      .gte("start_time", now.toISOString())
      .lte("start_time", threeHoursLater.toISOString())
      .eq("user_id", userId)
      .order("start_time", { ascending: true })
      .limit(3);

    if (events && events.length > 0) {
      events.forEach((evt, i) => {
        const startDate = new Date(evt.start_time);
        const minsUntil = Math.round((startDate.getTime() - now.getTime()) / 60000);
        const timeLabel = minsUntil <= 5 ? "Starting now" :
          minsUntil < 60 ? `In ${minsUntil} min` :
          `In ${Math.round(minsUntil / 60)}h`;

        cards.push({
          id: `event-${evt.id}`,
          type: "upcoming_event",
          title: evt.title,
          subtitle: `${timeLabel}${evt.location ? ` · ${evt.location}` : ""}`,
          icon: minsUntil <= 15 ? "🔴" : "📅",
          priority: minsUntil <= 15 ? 95 : 80 - i * 5,
          action: { label: "View Calendar", projection: "calendar" },
          meta: { startTime: evt.start_time, color: evt.color },
          expiresAt: startDate,
        });
      });
    }
  } catch { /* silent */ }

  // 3. Pending trust requests
  try {
    const { data: pendingTrust, count } = await supabase
      .from("trust_connections")
      .select("id, requester_id, message", { count: "exact" })
      .eq("responder_id", userId)
      .eq("status", "pending")
      .limit(3);

    if (count && count > 0) {
      cards.push({
        id: "trust-pending",
        type: "trust_request",
        title: `${count} Trust Request${count > 1 ? "s" : ""} Pending`,
        subtitle: "Someone wants to connect with you",
        icon: "🤝",
        priority: 70,
        action: { label: "View Trust Network", projection: "trust" },
      });
    }
  } catch { /* silent */ }

  // 4. Knowledge graph density insight
  try {
    const { count: tripleCount } = await supabase
      .from("messenger_context_graph")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (tripleCount !== null) {
      if (tripleCount >= 50) {
        cards.push({
          id: "knowledge-rich",
          type: "knowledge_insight",
          title: `${tripleCount} Knowledge Triples`,
          subtitle: "Your context graph is growing — explore patterns",
          icon: "🧠",
          priority: 40,
          action: { label: "Explore Graph", projection: "knowledge" },
        });
      } else if (tripleCount < 10) {
        cards.push({
          id: "knowledge-grow",
          type: "knowledge_insight",
          title: "Build Your Knowledge Graph",
          subtitle: "Conversations create context triples automatically",
          icon: "🌱",
          priority: 25,
          action: { label: "Start Conversation", projection: "conversation" },
        });
      }
    }
  } catch { /* silent */ }

  // 5. Focus suggestion based on time
  if (dayType === "weekday" && (tod === "morning" || tod === "afternoon")) {
    cards.push({
      id: "focus-work",
      type: "focus_suggestion",
      title: "Deep Focus Window",
      subtitle: tod === "morning"
        ? "Morning hours are optimal for complex reasoning"
        : "Afternoon: review and iterate on morning work",
      icon: "🎯",
      priority: 35,
      action: { label: "Start Session", projection: "conversation" },
    });
  }

  // 6. Evening reflection
  if (tod === "evening") {
    cards.push({
      id: "reflection",
      type: "reflection",
      title: "Evening Reflection",
      subtitle: "Review today's reasoning chains and knowledge growth",
      icon: "🪞",
      priority: 45,
      action: { label: "Review Graph", projection: "knowledge" },
    });
  }

  // 7. Connection nudge on weekends
  if (dayType === "weekend") {
    cards.push({
      id: "connection-nudge",
      type: "connection_nudge",
      title: "Strengthen Your Network",
      subtitle: "Weekends are great for deepening trust connections",
      icon: "🌐",
      priority: 35,
      action: { label: "View Network", projection: "trust" },
    });
  }

  // Sort by priority descending, take top 4
  cards.sort((a, b) => b.priority - a.priority);
  return cards.slice(0, 4);
}

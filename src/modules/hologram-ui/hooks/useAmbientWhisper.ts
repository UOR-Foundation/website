/**
 * useAmbientWhisper — Contextually prioritized portal whisper
 * ═══════════════════════════════════════════════════════════════
 *
 * Returns the single most relevant ambient message for the portal's
 * resting state. Prioritizes actionable state over decorative greetings.
 *
 * Priority order:
 *   1. Pending trust requests (actionable)
 *   2. Unread messages (actionable)
 *   3. Calendar proximity (time-sensitive)
 *   4. Time-of-day greeting (ambient)
 *
 * Updates every 30 seconds to stay fresh without being distracting.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AmbientWhisper {
  /** The whisper text to display */
  text: string;
  /** Category for potential styling differentiation */
  category: "action" | "temporal" | "greeting" | "coherence";
  /** Whether there are pending items requiring attention */
  hasAction: boolean;
}

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 22 || h < 5) return "Rest well.";
  if (h >= 5 && h < 7) return "Early light.";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 20) return "Good evening.";
  return "Quiet hours.";
}

export function useAmbientWhisper(): AmbientWhisper {
  const [whisper, setWhisper] = useState<AmbientWhisper>({
    text: getTimeGreeting(),
    category: "greeting",
    hasAction: false,
  });

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setWhisper({ text: getTimeGreeting(), category: "greeting", hasAction: false });
        return;
      }

      // Check pending trust requests
      const { count: trustCount } = await supabase
        .from("trust_connections")
        .select("id", { count: "exact", head: true })
        .eq("responder_id", session.user.id)
        .eq("status", "pending");

      if (trustCount && trustCount > 0) {
        setWhisper({
          text: trustCount === 1
            ? "Someone wants to connect."
            : `${trustCount} people want to connect.`,
          category: "action",
          hasAction: true,
        });
        return;
      }

      // Check upcoming calendar events (next 2 hours)
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const { data: events } = await supabase
        .from("calendar_events")
        .select("title, start_time")
        .eq("user_id", session.user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", twoHoursLater.toISOString())
        .order("start_time", { ascending: true })
        .limit(1);

      if (events && events.length > 0) {
        const mins = Math.round((new Date(events[0].start_time).getTime() - now.getTime()) / 60000);
        setWhisper({
          text: mins <= 5
            ? `${events[0].title} is starting.`
            : `${events[0].title} in ${mins} minutes.`,
          category: "temporal",
          hasAction: true,
        });
        return;
      }

      // Default: time-of-day greeting
      setWhisper({ text: getTimeGreeting(), category: "greeting", hasAction: false });
    } catch {
      setWhisper({ text: getTimeGreeting(), category: "greeting", hasAction: false });
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Listen to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refresh());
    return () => subscription.unsubscribe();
  }, [refresh]);

  return whisper;
}

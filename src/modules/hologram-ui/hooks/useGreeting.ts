/**
 * useGreeting — Time-aware personalized greeting
 * ═══════════════════════════════════════════════
 *
 * Returns contextual greetings that account for night time.
 * Day window: 7am – 10pm. Outside that is "night".
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Day boundaries (future: user-configurable) */
const DAY_START = 7;  // 7:00 AM
const DAY_END = 22;   // 10:00 PM

function getTimeGreeting(): string {
  const h = new Date().getHours();

  // Night time — 10pm to 7am
  if (h >= DAY_END || h < 5) return "Good night";
  if (h >= 5 && h < DAY_START) return "Early morning";

  // Day time
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Whether current time is within the active day window */
export function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= DAY_END || h < DAY_START;
}

/** Returns day progress as 0–1 within the day window (7am–10pm) */
export function getDayWindowProgress(): number {
  const now = new Date();
  const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const startSeconds = DAY_START * 3600;
  const endSeconds = DAY_END * 3600;
  const windowSeconds = endSeconds - startSeconds;

  if (totalSeconds < startSeconds) return 0;
  if (totalSeconds >= endSeconds) return 1;
  return (totalSeconds - startSeconds) / windowSeconds;
}

export function useGreeting() {
  const [name, setName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState(getTimeGreeting);

  useEffect(() => {
    const id = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) { setName(null); return; }

        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const displayName =
          data?.display_name ||
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          session.user.email?.split("@")[0] ||
          null;

        setName(displayName);
      },
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setName(
        data?.display_name ||
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split("@")[0] ||
        null,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  return { greeting, name };
}

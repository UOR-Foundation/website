/**
 * useGreeting — Time-aware personalized greeting
 * Returns "Good morning/afternoon/evening" + user's display name if logged in.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function useGreeting() {
  const [name, setName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState(getTimeGreeting);

  useEffect(() => {
    // Update greeting every minute
    const id = setInterval(() => setGreeting(getTimeGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) { setName(null); return; }

        // Try profile display_name first
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

    // Check current session
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

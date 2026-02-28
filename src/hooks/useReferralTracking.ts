/**
 * useReferralTracking — reads ?ref= from URL, tracks clicks & signup attribution.
 *
 * Drop this hook once at the app root. It:
 * 1. On first visit with ?ref=CODE, stores the code and fires a click event.
 * 2. On auth SIGNED_IN (new signup), fires a signup attribution event.
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "uor_referral_code";
const CLICK_TRACKED_KEY = "uor_referral_click_tracked";

async function trackReferral(action: "click" | "signup", code: string) {
  try {
    await supabase.functions.invoke("referral-track", {
      body: { action, code },
    });
  } catch (e) {
    console.warn("Referral tracking failed:", e);
  }
}

export function useReferralTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tracked = useRef(false);

  // 1. Capture ?ref= code and track click
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || tracked.current) return;
    tracked.current = true;

    // Persist the code for signup attribution later
    sessionStorage.setItem(STORAGE_KEY, ref);

    // Only track click once per session
    if (!sessionStorage.getItem(CLICK_TRACKED_KEY)) {
      sessionStorage.setItem(CLICK_TRACKED_KEY, "1");
      trackReferral("click", ref);
    }

    // Clean the URL without reload
    searchParams.delete("ref");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // 2. On new signup, attribute to referrer
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const code = sessionStorage.getItem(STORAGE_KEY);
        if (code) {
          trackReferral("signup", code);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(CLICK_TRACKED_KEY);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);
}

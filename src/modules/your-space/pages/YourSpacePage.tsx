/**
 * Your Space — Personal Sovereign Data Dashboard
 * 
 * Page-scoped light/dark mode — does not affect the rest of the site.
 * Starts in LIGHT mode for an approachable first impression.
 * Detects ?welcome=1 after founding ceremony for a warm transition.
 */

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { SpaceHeader } from "../components/SpaceHeader";
import { OwnSection } from "../components/OwnSection";
import { MonitorSection } from "../components/MonitorSection";
import { ControlSection } from "../components/ControlSection";
import { SpaceBottomBar } from "../components/SpaceBottomBar";

const VOTES_KEY = "uor-space-module-votes";

const loadVotes = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
  } catch {
    return {};
  }
};

const YourSpacePage = () => {
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [votes, setVotes] = useState<Record<string, number>>(loadVotes);
  const [searchParams, setSearchParams] = useSearchParams();
  const [userName, setUserName] = useState("You");
  const [showWelcome, setShowWelcome] = useState(false);

  // Fetch profile display name
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (profile?.display_name) {
        setUserName(profile.display_name);
      }
    })();
  }, []);

  // Welcome banner after ceremony
  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
      setShowWelcome(true);
      // Clear the param without a full navigation
      setSearchParams({}, { replace: true });
      // Auto-dismiss after 6s
      const t = setTimeout(() => setShowWelcome(false), 6000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  const handleVote = useCallback((slug: string) => {
    setVotes(prev => {
      const next = { ...prev, [slug]: (prev[slug] || 0) + 1 };
      localStorage.setItem(VOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-300 ${isDark ? "dark bg-background text-foreground" : "bg-background text-foreground"}`}>
      <SpaceHeader userName={userName} isDark={isDark} />

      {/* Welcome banner — post-ceremony */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-[180px] left-1/2 -translate-x-1/2 z-[70] max-w-md w-full"
          >
            <div
              className="rounded-2xl border px-8 py-6 text-center backdrop-blur-lg shadow-lg"
              style={{
                background: isDark
                  ? "hsla(220, 18%, 12%, 0.92)"
                  : "hsla(0, 0%, 100%, 0.92)",
                borderColor: isDark
                  ? "hsla(38, 40%, 50%, 0.3)"
                  : "hsla(38, 40%, 50%, 0.25)",
              }}
            >
              <p className="text-sm text-muted-foreground tracking-widest uppercase mb-2">
                Welcome home
              </p>
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "hsl(38, 40%, 50%)" }}>
                {userName}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Your sovereign identity is active. This space is yours.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark/Light mode toggle — page-scoped */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="fixed top-6 right-[280px] z-[60] p-2.5 rounded-full border transition-all duration-200 bg-card border-border text-muted-foreground hover:text-foreground shadow-sm"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-56 pb-28">
        <div className="space-y-10 max-w-[1400px] mx-auto">
          <OwnSection isDark={isDark} searchQuery={searchQuery} setSearchQuery={setSearchQuery} votes={votes} onVote={handleVote} />
          <MonitorSection isDark={isDark} votes={votes} onVote={handleVote} />
          <ControlSection isDark={isDark} votes={votes} onVote={handleVote} />
        </div>
      </div>

      <SpaceBottomBar isDark={isDark} />
    </div>
  );
};

export default YourSpacePage;

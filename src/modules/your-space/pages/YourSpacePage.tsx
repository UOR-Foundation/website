/**
 * Your Space — Personal Sovereign Data Dashboard
 * 
 * Page-scoped light/dark mode — does not affect the rest of the site.
 * Starts in LIGHT mode for an approachable first impression.
 */

import { useState, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
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

  const handleVote = useCallback((slug: string) => {
    setVotes(prev => {
      const next = { ...prev, [slug]: (prev[slug] || 0) + 1 };
      localStorage.setItem(VOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const userName = "Alex";

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-300 ${isDark ? "dark bg-background text-foreground" : "bg-background text-foreground"}`}>
      <SpaceHeader userName={userName} isDark={isDark} />

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

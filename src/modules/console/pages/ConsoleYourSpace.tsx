/**
 * Console — Your Space (embedded)
 *
 * Shows the key Your Space parameters inside the console layout.
 */

import { useState, useCallback } from "react";
import { OwnSection } from "@/modules/your-space/components/OwnSection";
import { MonitorSection } from "@/modules/your-space/components/MonitorSection";
import { ControlSection } from "@/modules/your-space/components/ControlSection";

const VOTES_KEY = "uor-space-module-votes";

const loadVotes = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
  } catch {
    return {};
  }
};

export default function ConsoleYourSpace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [votes, setVotes] = useState<Record<string, number>>(loadVotes);

  const handleVote = useCallback((slug: string) => {
    setVotes((prev) => {
      const next = { ...prev, [slug]: (prev[slug] || 0) + 1 };
      localStorage.setItem(VOTES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Embedded in console = always use the console's theme (isDark=false uses foreground/background tokens)
  const isDark = false;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Space
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your sovereign data dashboard — identity, assets, and controls.
        </p>
      </div>

      <div className="space-y-8">
        <OwnSection isDark={isDark} searchQuery={searchQuery} setSearchQuery={setSearchQuery} votes={votes} onVote={handleVote} />
        <MonitorSection isDark={isDark} votes={votes} onVote={handleVote} />
        <ControlSection isDark={isDark} votes={votes} onVote={handleVote} />
      </div>
    </div>
  );
}

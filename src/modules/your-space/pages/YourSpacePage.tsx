/**
 * Your Space — Personal Sovereign Data Dashboard
 * 
 * UOR Framework Compliance:
 * Every user is treated as a first-class identity object, derived from
 * their attributes via the URDNA2015 → SHA-256 → singleProofHash pipeline.
 * This page provides a personal dashboard for managing that identity,
 * its associated data, activity, and experience controls.
 * 
 * Page-scoped dark/light mode — does not affect the rest of the site.
 */

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SpaceHeader } from "../components/SpaceHeader";
import { OwnSection } from "../components/OwnSection";
import { MonitorSection } from "../components/MonitorSection";
import { ControlSection } from "../components/ControlSection";
import { SpaceBottomBar } from "../components/SpaceBottomBar";

const YourSpacePage = () => {
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Default identity — in production this comes from UniversalIdentityManager.createIdentity()
  const userName = "Alex";

  return (
    <div className={`min-h-screen font-mono flex flex-col relative transition-colors duration-300 ${isDark ? "bg-black text-white" : "bg-gray-50 text-gray-900"}`}>
      <SpaceHeader userName={userName} isDark={isDark} />

      {/* Dark/Light mode toggle — page-scoped */}
      <button
        onClick={() => setIsDark(!isDark)}
        className={`fixed top-6 right-[280px] z-[60] p-2 rounded-full border transition-all duration-200 ${
          isDark
            ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
            : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
        }`}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Main Content */}
      <div className="flex-1 p-4 pt-56 pb-24">
        <div className="space-y-4 max-w-[1400px] mx-auto">
          <OwnSection isDark={isDark} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <MonitorSection isDark={isDark} />
          <ControlSection isDark={isDark} />
        </div>
      </div>

      <SpaceBottomBar isDark={isDark} />
    </div>
  );
};

export default YourSpacePage;

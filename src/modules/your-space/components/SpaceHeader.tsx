/**
 * Your Space — Dashboard Header
 * 
 * Mirrors the Hologram "Sovereign Data Space" header bar with UOR identity.
 * Shows data owner name, last access time, and navigation actions.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Image } from "lucide-react";

interface SpaceHeaderProps {
  userName: string;
  isDark: boolean;
}

export const SpaceHeader = ({ userName, isDark }: SpaceHeaderProps) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatAccess = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  const bg = isDark ? "bg-black/67 border-white/20" : "bg-white/80 border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const textSub = isDark ? "text-gray-300" : "text-gray-600";

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={`${bg} backdrop-blur-md border-b p-6 pb-4`}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-4">
            <Star className={`w-6 h-6 ${text}`} />
            <h1 className={`text-xl font-mono font-light tracking-wide ${text}`}>SOVEREIGN DATA SPACE</h1>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => navigate("/")}
              className={`text-2xl font-mono font-light tracking-[0.4em] ${text} hover:opacity-70 transition-colors cursor-pointer`}
            >
              HOLOGRAM
            </button>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate("/console/apps")}
              className={`${textSub} hover:${text} transition-colors text-sm font-mono tracking-wide`}
            >
              EXPLORE APPS
            </button>
            <button
              onClick={() => navigate("/console")}
              className={`${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"} px-6 py-3 rounded text-sm font-mono font-medium transition-colors`}
            >
              SECURE KEY
            </button>
          </div>
        </div>

        {/* Data owner banner */}
        <div className={`${isDark ? "bg-gradient-to-br from-gray-900/60 to-gray-800/60 border-gray-700/50" : "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200"} border rounded-lg p-8 backdrop-blur-sm relative overflow-hidden`}>
          <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-br from-black/40 to-transparent" : "bg-gradient-to-br from-white/60 to-transparent"}`} />
          <button className={`absolute top-4 right-4 z-20 ${textMuted} hover:${text} transition-colors`}>
            <Image size={16} />
          </button>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className={`${textMuted} text-sm font-mono`}>DATA OWNER:</span>
              <span className={`text-2xl font-mono font-light tracking-wide ${text}`}>
                {userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}
              </span>
            </div>
            <div className={`text-sm ${textSub} font-mono`}>
              <span>LAST ACCESS: {formatAccess(currentTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

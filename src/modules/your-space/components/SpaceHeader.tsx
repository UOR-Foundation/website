/**
 * Your Space — Dashboard Header
 * Clean, console-matched header with large readable text.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star } from "lucide-react";

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

  const bg = isDark ? "bg-[hsl(220,18%,7%)]/95 border-white/10" : "bg-white/95 border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className={`${bg} backdrop-blur-md border-b px-8 py-5`}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Star className={`w-5 h-5 ${text}`} />
            <h1 className={`text-lg font-body font-semibold tracking-wide ${text}`}>
              SOVEREIGN DATA SPACE
            </h1>
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <button
              onClick={() => navigate("/")}
              className={`text-xl font-body font-semibold tracking-[0.3em] ${text} hover:opacity-70 transition-opacity cursor-pointer`}
            >
              HOLOGRAM
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/console/apps")}
              className={`${textMuted} hover:${text} transition-colors text-sm font-body font-medium tracking-wide`}
            >
              EXPLORE APPS
            </button>
            <button
              onClick={() => navigate("/console")}
              className={`${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"} px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-colors`}
            >
              SECURE KEY
            </button>
          </div>
        </div>

        {/* Data owner banner */}
        <div className={`${isDark ? "bg-white/[0.03] border-white/10" : "bg-gray-50 border-gray-200"} border rounded-xl px-8 py-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <span className={`${textMuted} text-sm font-body font-medium`}>DATA OWNER</span>
              <span className={`text-2xl font-body font-semibold tracking-wide ${text}`}>
                {userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}
              </span>
            </div>
            <span className={`text-sm ${textMuted} font-body`}>
              Last access: {formatAccess(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

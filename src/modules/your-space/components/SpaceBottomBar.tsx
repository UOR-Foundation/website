/**
 * Your Space — Bottom Bar
 * Clean, minimal status bar with public address and connection info.
 */

import { useState } from "react";
import { Eye, EyeOff, Copy, Bell } from "lucide-react";

interface SpaceBottomBarProps {
  isDark: boolean;
}

export const SpaceBottomBar = ({ isDark }: SpaceBottomBarProps) => {
  const [isAddressRevealed, setIsAddressRevealed] = useState(false);
  const publicAddress = "⠕⠗⠊⠛⠊⠝⠒⠺⠑⠃⠒⠥⠕⠗";

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(publicAddress); } catch {}
  };

  const bg = isDark ? "bg-[hsl(220,18%,7%)]/95 border-white/10" : "bg-white/95 border-gray-200";
  const text = isDark ? "text-white" : "text-gray-700";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const btnCls = isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-200 hover:bg-gray-100";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className={`${bg} backdrop-blur-md border-t px-8 py-4`}>
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          {/* Left: Public Address */}
          <div className="flex items-center gap-3">
            <span className={`text-sm ${textMuted} font-body`}>Public address:</span>
            <button
              onClick={() => setIsAddressRevealed(!isAddressRevealed)}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${btnCls} border rounded-lg text-sm ${text} font-body transition-all`}
            >
              {isAddressRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {isAddressRevealed ? "Hide" : "Reveal"}
            </button>
            {isAddressRevealed && (
              <>
                <span className={`text-sm ${text} font-body font-semibold`}>{publicAddress}</span>
                <button onClick={handleCopy} className={`${textMuted} hover:${text} transition-colors`}>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className={`text-sm ${textMuted} font-body`}>Connected</span>
            </div>
            <button className={`flex items-center gap-2 px-3.5 py-2 ${btnCls} border rounded-lg transition-all relative`}>
              <Bell className={`w-4 h-4 ${text}`} />
              <span className={`text-sm ${text} font-body`}>Notifications</span>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-body font-bold">3</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

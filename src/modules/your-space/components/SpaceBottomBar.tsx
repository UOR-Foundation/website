/**
 * Your Space — Bottom Overlay Bar
 * 
 * Shows the user's UOR public address (content-addressed Braille glyph),
 * connection status, and notification center.
 * The public address is the canonical u:glyph from the UOR identity system.
 */

import { useState } from "react";
import { Eye, EyeOff, Copy, Bell, Mic } from "lucide-react";

interface SpaceBottomBarProps {
  isDark: boolean;
}

export const SpaceBottomBar = ({ isDark }: SpaceBottomBarProps) => {
  const [isAddressRevealed, setIsAddressRevealed] = useState(false);
  // UOR content-addressed public address (Braille bijection of identity hash)
  const publicAddress = "⠕⠗⠊⠛⠊⠝⠒⠺⠑⠃⠒⠥⠕⠗";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicAddress);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const bg = isDark ? "bg-black/67 border-white/20" : "bg-white/90 border-gray-200";
  const text = isDark ? "text-white/80" : "text-gray-700";
  const textMuted = isDark ? "text-white/70" : "text-gray-500";
  const btnBg = isDark ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-gray-100 border-gray-200 hover:bg-gray-200";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className={`${bg} backdrop-blur-md border-t px-6 py-5`}>
        <div className="grid grid-cols-3 items-center max-w-7xl mx-auto gap-4">
          {/* Left: Public Address */}
          <div className="flex items-center gap-3 justify-self-start">
            <span className={`text-sm ${textMuted} font-mono`}>Your public address:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddressRevealed(!isAddressRevealed)}
                className={`flex items-center gap-1 px-2 py-1 ${btnBg} border rounded text-sm ${text} transition-all duration-200`}
              >
                {isAddressRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isAddressRevealed ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2 py-1 ${btnBg} border rounded text-sm ${text} transition-all duration-200`}
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            {isAddressRevealed && (
              <span className={`text-sm ${isDark ? "text-white" : "text-gray-900"} font-mono font-semibold`}>
                {publicAddress}
              </span>
            )}
          </div>

          {/* Center: Voice Assistant */}
          <div className="flex justify-center items-center justify-self-center">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-full text-green-400 hover:bg-green-500/30 transition-all duration-200">
              <Mic className="w-4 h-4" />
              <span className="text-sm font-mono">Lumen Voice Assistant</span>
            </button>
          </div>

          {/* Right: Connection Status */}
          <div className="flex items-center gap-6 justify-self-end">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className={`text-sm ${textMuted} font-mono`}>CONNECTED</span>
            </div>
            <button className={`flex items-center gap-2 px-3 py-2 ${btnBg} border rounded transition-all duration-200 relative`}>
              <Bell className={`w-4 h-4 ${text}`} />
              <span className={`text-sm ${text} font-mono`}>Notifications</span>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/90 border border-red-400 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-mono font-semibold">3</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

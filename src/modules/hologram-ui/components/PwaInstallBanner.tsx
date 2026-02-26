/**
 * PwaInstallBanner — Subtle Install Invitation
 * ═════════════════════════════════════════════
 *
 * A warm, non-intrusive banner that appears at the bottom of the
 * mobile OS shell when the app can be installed. Matches the Aman
 * aesthetic — golden accent, warm earth tones, gentle animation.
 */

import { Download, X } from "lucide-react";
import type { PwaInstallState } from "../hooks/usePwaInstall";

const P = {
  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', serif",
};

interface PwaInstallBannerProps {
  pwa: PwaInstallState;
}

export default function PwaInstallBanner({ pwa }: PwaInstallBannerProps) {
  if (!pwa.canInstall || pwa.dismissed || pwa.isStandalone) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] px-5 pb-[max(env(safe-area-inset-bottom,12px),12px)]"
      style={{
        animation: "slide-up-drawer 0.5s cubic-bezier(0.22, 1, 0.36, 1) 2s both",
      }}
    >
      <div
        className="relative flex items-center gap-3 px-5 py-4 rounded-2xl overflow-hidden"
        style={{
          background: "hsla(25, 12%, 14%, 0.92)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid hsla(38, 18%, 30%, 0.2)",
          boxShadow: "0 -4px 32px hsla(25, 10%, 5%, 0.4)",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center shrink-0 rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: "hsla(38, 30%, 50%, 0.12)",
            border: "1px solid hsla(38, 25%, 55%, 0.15)",
          }}
        >
          <Download
            className="w-5 h-5"
            strokeWidth={1.5}
            style={{ color: "hsla(38, 40%, 65%, 0.9)" }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-medium tracking-wide"
            style={{ fontFamily: P.font, color: "hsla(38, 15%, 90%, 0.9)" }}
          >
            Install Hologram
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ fontFamily: P.font, color: "hsla(38, 10%, 70%, 0.6)" }}
          >
            Add to home screen for the full experience
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={() => pwa.install()}
          className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium tracking-wide active:scale-95 transition-transform"
          style={{
            fontFamily: P.font,
            background: "hsla(38, 35%, 55%, 0.2)",
            color: "hsla(38, 35%, 75%, 0.95)",
            border: "1px solid hsla(38, 25%, 55%, 0.2)",
          }}
        >
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={() => pwa.dismiss()}
          className="absolute top-2 right-2 p-1.5 rounded-full active:scale-90 transition-transform"
          style={{ color: "hsla(38, 10%, 60%, 0.4)" }}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

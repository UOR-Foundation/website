/**
 * HologramInstallPage — PWA Install Experience
 * ══════════════════════════════════════════════
 *
 * A beautiful, full-screen install page that guides users
 * through adding Hologram to their home screen. Matches the
 * Aman aesthetic with warm earth tones and golden accents.
 */

import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Smartphone, Wifi, WifiOff, Shield } from "lucide-react";
import { usePwaInstall } from "../hooks/usePwaInstall";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";

const P = {
  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', serif",
};

const FEATURES = [
  { icon: Smartphone, title: "Native experience", desc: "Full screen, no browser chrome — feels like a real OS" },
  { icon: WifiOff, title: "Works offline", desc: "Cached for instant access, even without connectivity" },
  { icon: Shield, title: "Private and sovereign", desc: "Your data stays yours — no tracking, no telemetry" },
];

export default function HologramInstallPage() {
  const navigate = useNavigate();
  const pwa = usePwaInstall();

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: "hsl(25, 8%, 8%)" }}>
      {/* Hero image */}
      <div className="relative h-[45vh] min-h-[280px] overflow-hidden">
        <img
          src={heroLandscape}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.65) saturate(0.9)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, hsla(25, 8%, 8%, 0.2) 0%, hsla(25, 8%, 8%, 0.95) 85%, hsl(25, 8%, 8%) 100%)",
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate("/hologram")}
          className="absolute top-[max(env(safe-area-inset-top,16px),16px)] left-4 p-3 rounded-full active:scale-90 transition-transform z-10"
          style={{ color: "hsla(38, 15%, 85%, 0.6)" }}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Hero text */}
        <div className="absolute bottom-8 left-0 right-0 px-8 text-center">
          <p
            className="text-[10px] tracking-[0.5em] uppercase mb-4"
            style={{ color: "hsla(38, 25%, 65%, 0.6)", fontFamily: P.font }}
          >
            Hologram OS
          </p>
          <h1
            className="text-[28px] font-light leading-[1.3] tracking-[0.01em]"
            style={{ fontFamily: P.fontDisplay, color: "hsla(38, 15%, 90%, 0.95)" }}
          >
            Install your portal.
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-12 -mt-2">
        {/* Subtitle */}
        <p
          className="text-[16px] font-light leading-[1.8] mb-10 text-center"
          style={{ fontFamily: P.font, color: "hsla(38, 12%, 65%, 0.7)" }}
        >
          Add Hologram to your home screen for the full, native experience — 
          no app store required.
        </p>

        {/* Features */}
        <div className="space-y-6 mb-12">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div
                className="shrink-0 flex items-center justify-center rounded-xl mt-0.5"
                style={{
                  width: 44,
                  height: 44,
                  background: "hsla(38, 25%, 45%, 0.08)",
                  border: "1px solid hsla(38, 20%, 45%, 0.1)",
                }}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} style={{ color: "hsla(38, 35%, 60%, 0.7)" }} />
              </div>
              <div>
                <p
                  className="text-[15px] font-medium tracking-wide"
                  style={{ fontFamily: P.font, color: "hsla(38, 15%, 88%, 0.9)" }}
                >
                  {title}
                </p>
                <p
                  className="text-[13px] mt-1 leading-[1.6]"
                  style={{ fontFamily: P.font, color: "hsla(38, 10%, 60%, 0.6)" }}
                >
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Install CTA */}
        {pwa.canInstall && !pwa.isStandalone ? (
          <button
            onClick={() => pwa.install()}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[15px] font-medium tracking-wide active:scale-[0.98] transition-transform"
            style={{
              fontFamily: P.font,
              background: "hsla(38, 30%, 50%, 0.15)",
              color: "hsla(38, 30%, 78%, 0.95)",
              border: "1px solid hsla(38, 25%, 50%, 0.2)",
            }}
          >
            <Download className="w-5 h-5" strokeWidth={1.5} />
            Install Hologram
          </button>
        ) : pwa.isStandalone ? (
          <div
            className="w-full text-center py-4 rounded-2xl text-[15px] font-medium tracking-wide"
            style={{
              fontFamily: P.font,
              background: "hsla(38, 30%, 50%, 0.08)",
              color: "hsla(38, 25%, 65%, 0.7)",
              border: "1px solid hsla(38, 20%, 40%, 0.12)",
            }}
          >
            ✓ Already installed
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p
              className="text-[14px] leading-[1.7]"
              style={{ fontFamily: P.font, color: "hsla(38, 10%, 65%, 0.6)" }}
            >
              Open this page in your mobile browser, then use your browser's
              "Add to Home Screen" option.
            </p>
            <p
              className="text-[12px]"
              style={{ fontFamily: P.font, color: "hsla(38, 10%, 55%, 0.4)" }}
            >
              Safari: Share → Add to Home Screen<br />
              Chrome: Menu → Add to Home Screen
            </p>
          </div>
        )}

        {/* Back link */}
        <button
          onClick={() => navigate("/hologram")}
          className="w-full mt-6 py-3 text-center text-[13px] tracking-wide active:scale-95 transition-transform"
          style={{ fontFamily: P.font, color: "hsla(38, 10%, 60%, 0.4)" }}
        >
          Back to Hologram
        </button>
      </div>
    </div>
  );
}

/**
 * PwaInstallBanner — Harmonious Install Invitation
 * ═══════════════════════════════════════════════════
 *
 * A warm, human invitation to install Hologram as a native app.
 * Gentle entrance animation, iOS Safari guidance, and a design
 * language that mirrors the portal aesthetic — luminous, quiet,
 * and inviting rather than demanding.
 *
 * Appears after a 4s delay with a smooth bloom-in animation.
 * Dismissed state persists for 3 days to avoid annoyance.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";
import type { PwaInstallState } from "../../hooks/usePwaInstall";
import { PP } from "../../theme/portal-palette";

const ORGANIC_EASE = [0.23, 1, 0.32, 1] as [number, number, number, number];

interface PwaInstallBannerProps {
  pwa: PwaInstallState;
}

export default function PwaInstallBanner({ pwa }: PwaInstallBannerProps) {
  return (
    <AnimatePresence>
      {pwa.shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.7, ease: ORGANIC_EASE }}
          className="fixed bottom-0 left-0 right-0 z-[60] px-4"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 12px), 16px)",
          }}
        >
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: PP.drawerBg,
              backdropFilter: "blur(48px)",
              WebkitBackdropFilter: "blur(48px)",
              border: `1px solid ${PP.bloomCardBorder}`,
              boxShadow: `0 -8px 40px hsla(25, 10%, 5%, 0.35), 0 0 0 0.5px ${PP.bloomCardBorder}`,
            }}
          >
            {/* Subtle golden accent line at top */}
            <div
              className="h-[1.5px] w-full"
              style={{
                background: `linear-gradient(90deg, transparent 10%, ${PP.accent}40 50%, transparent 90%)`,
              }}
            />

            <div className="px-5 py-4">
              {/* Header row */}
              <div className="flex items-start gap-3.5">
                {/* Orb icon — echoes the portal monad */}
                <motion.div
                  className="shrink-0 flex items-center justify-center rounded-2xl mt-0.5"
                  animate={{
                    boxShadow: [
                      `0 0 12px ${PP.accent}15`,
                      `0 0 20px ${PP.accent}25`,
                      `0 0 12px ${PP.accent}15`,
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 48,
                    height: 48,
                    background: `linear-gradient(135deg, ${PP.accent}18, ${PP.accent}08)`,
                    border: `1px solid ${PP.accent}20`,
                  }}
                >
                  {/* Unicode monad glyph */}
                  <span
                    style={{
                      fontSize: "22px",
                      lineHeight: 1,
                      color: PP.accent,
                      opacity: 0.85,
                    }}
                  >
                    ◎
                  </span>
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: PP.fontDisplay,
                      fontSize: "17px",
                      fontWeight: 500,
                      color: PP.text,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    Hologram belongs here
                  </p>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: PP.font,
                      fontSize: "13px",
                      color: PP.textWhisper,
                      lineHeight: 1.5,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {pwa.isIosSafari
                      ? "Add to your home screen for the full native experience."
                      : "Install as a native app — no app store needed."}
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => pwa.dismiss()}
                  className="shrink-0 p-2 -mt-1 -mr-1 rounded-xl active:scale-90 transition-transform"
                  aria-label="Dismiss"
                >
                  <X
                    className="w-4 h-4"
                    strokeWidth={1.5}
                    style={{ color: PP.textWhisper, opacity: 0.5 }}
                  />
                </button>
              </div>

              {/* iOS Safari instructions */}
              {pwa.isIosSafari && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.3, duration: 0.5, ease: ORGANIC_EASE }}
                  className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: `${PP.accent}06`,
                    border: `1px solid ${PP.accent}10`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: PP.font, color: PP.textWhisper }}
                    >
                      Tap
                    </span>
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{
                        background: `${PP.accent}12`,
                        border: `1px solid ${PP.accent}15`,
                      }}
                    >
                      <Share className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.accent }} />
                    </div>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: PP.font, color: PP.textWhisper }}
                    >
                      then
                    </span>
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{
                        background: `${PP.accent}12`,
                        border: `1px solid ${PP.accent}15`,
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.accent }} />
                    </div>
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: PP.font, color: PP.textWhisper }}
                    >
                      Add to Home Screen
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Install button (Android/Chrome) */}
              {pwa.canInstall && (
                <motion.button
                  onClick={() => pwa.install()}
                  whileTap={{ scale: 0.97 }}
                  className="w-full mt-3 flex items-center justify-center gap-2.5 py-3.5 rounded-xl transition-colors"
                  style={{
                    fontFamily: PP.font,
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    background: `${PP.accent}18`,
                    color: PP.accent,
                    border: `1px solid ${PP.accent}22`,
                  }}
                >
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>◎</span>
                  Install Hologram
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

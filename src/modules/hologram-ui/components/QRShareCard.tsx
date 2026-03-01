/**
 * QRShareCard — Share via QR Code (Glass Blur Entrance)
 * ═════════════════════════════════════════════════════
 *
 * Generates a shareable QR code for the current track or stream.
 * Glass morphism entrance with backdrop blur spring animation.
 *
 * @module hologram-prime/components/QRShareCard
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import { P } from "@/modules/hologram-ui/theme/prime-palette";

interface QRShareCardProps {
  track: any | null; // Typed loosely until full types are migrated
  open: boolean;
  onClose: () => void;
}

// Spring config for glass entrance
const glassSpring = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.9 };

export default function QRShareCard({ track, open, onClose }: QRShareCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = track?.sourceUrl
    ? `${window.location.origin}/hologram-prime?play=${encodeURIComponent(track.sourceUrl)}`
    : window.location.href;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&bgcolor=1a1816&color=d4b896&format=png&data=${encodeURIComponent(shareUrl)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: P.bgSolid + "d9",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.92, y: 16, filter: "blur(4px)" }}
            transition={glassSpring}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: P.surface,
              backdropFilter: "blur(40px) saturate(1.4)",
              border: `1px solid ${P.border}`,
              borderRadius: "1.5rem",
              padding: "2.5rem",
              maxWidth: 340,
              width: "90%",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "1.5rem",
              position: "relative",
              boxShadow: `0 24px 80px -16px hsla(25, 20%, 5%, 0.6), 0 0 1px ${P.border}`,
            }}
          >
            {/* Close */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              onClick={onClose}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", cursor: "pointer",
                background: "transparent", color: P.textTertiary,
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </motion.button>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{ textAlign: "center" }}
            >
              <p style={{
                fontFamily: P.fontDisplay, fontSize: "1.3rem",
                color: P.text, letterSpacing: "-0.02em",
                margin: 0, marginBottom: 6,
              }}>
                Share
              </p>
              {track && (
                <p style={{
                  fontFamily: P.font, fontSize: "0.8rem",
                  color: P.textSecondary, margin: 0,
                }}>
                  {track.title} · {track.artist}
                </p>
              )}
            </motion.div>

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, ...glassSpring }}
              style={{
                background: P.surfaceGlass,
                borderRadius: "1rem",
                padding: "1.25rem",
                border: `1px solid ${P.borderLight}`,
              }}
            >
              <img
                src={qrImageUrl}
                alt="QR Code"
                width={200}
                height={200}
                style={{ borderRadius: "0.5rem", display: "block" }}
              />
            </motion.div>

            {/* Copy link */}
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1.25rem",
                borderRadius: 999,
                border: `1px solid ${P.border}`,
                background: copied ? P.accentGlow : "transparent",
                color: copied ? P.accent : P.textSecondary,
                fontFamily: P.font, fontSize: "0.8rem",
                cursor: "pointer",
                transition: "background 0.3s, color 0.3s",
              }}
            >
              {copied ? (
                <><Check style={{ width: 14, height: 14 }} /> Copied</>
              ) : (
                <><Copy style={{ width: 14, height: 14 }} /> Copy link</>
              )}
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{
                fontFamily: P.font, fontSize: "0.65rem",
                color: P.textTertiary, textAlign: "center",
                margin: 0,
              }}
            >
              Scan to listen on any device
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

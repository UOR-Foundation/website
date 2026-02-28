/**
 * TriwordAddress — Reusable three-word address display with copy + reveal actions.
 *
 * Two icon buttons:
 *   📋 Copy the triword (word1.word2.word3) to clipboard
 *   🔍 Reveal the full canonical hash + glyph in a popover
 */

import { useState, useCallback } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { canonicalToTriword } from "@/lib/uor-triword";
import { motion, AnimatePresence } from "framer-motion";

interface TriwordAddressProps {
  /** The canonical ID / hash string to derive the triword from */
  canonicalId: string;
  /** Optional glyph character to show in reveal */
  glyph?: string;
  /** Label shown above the address (e.g. "Your Address", "Agent Address") */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom color for the triword text (CSS color string) */
  color?: string;
  /** Custom color for muted/secondary text */
  mutedColor?: string;
  /** Whether to use the hologram dark theme styling */
  variant?: "default" | "hologram";
}

const SIZE_MAP = {
  sm: { triword: "text-sm", dot: "text-[10px]", label: "text-[9px]", icon: 12, reveal: "text-[10px]" },
  md: { triword: "text-lg", dot: "text-[10px]", label: "text-xs", icon: 14, reveal: "text-xs" },
  lg: { triword: "text-holo-xl", dot: "text-[11px]", label: "text-holo-xs", icon: 14, reveal: "text-xs" },
};

export default function TriwordAddress({
  canonicalId,
  glyph,
  label,
  size = "md",
  color,
  mutedColor,
  variant = "default",
}: TriwordAddressProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const s = SIZE_MAP[size];

  const triword = canonicalToTriword(canonicalId);
  const displayTriword = triword
    .split(".")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" · ");

  const copyTriword = useCallback(() => {
    navigator.clipboard.writeText(triword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [triword]);

  const toggleReveal = useCallback(() => setRevealed((r) => !r), []);

  // Extract short hash for display
  const shortHash = canonicalId.length > 20
    ? canonicalId.slice(0, 12) + "…" + canonicalId.slice(-8)
    : canonicalId;

  const isHologram = variant === "hologram";

  const triwordColor = color || (isHologram ? undefined : undefined);
  const secondaryColor = mutedColor || (isHologram ? undefined : undefined);

  return (
    <div>
      {label && (
        <span
          className={`block mb-1 ${s.label}`}
          style={secondaryColor ? { color: secondaryColor } : undefined}
        >
          {label}
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* Triword display */}
        <span
          className={`${s.triword} font-serif tracking-wide font-medium`}
          style={triwordColor ? { color: triwordColor } : undefined}
        >
          {displayTriword}
        </span>

        {/* Action icons */}
        <span className="inline-flex items-center gap-1">
          {/* Copy */}
          <button
            onClick={copyTriword}
            className="p-1 rounded-md transition-colors hover:bg-foreground/10"
            title={copied ? "Copied!" : "Copy address"}
            aria-label="Copy triword address"
          >
            {copied ? (
              <Check size={s.icon} className="text-emerald-500" />
            ) : (
              <Copy
                size={s.icon}
                style={secondaryColor ? { color: secondaryColor } : undefined}
                className={secondaryColor ? "" : "text-muted-foreground"}
              />
            )}
          </button>

          {/* Reveal full address */}
          <button
            onClick={toggleReveal}
            className="p-1 rounded-md transition-colors hover:bg-foreground/10"
            title={revealed ? "Hide full address" : "Reveal full address"}
            aria-label="Reveal full canonical address"
          >
            {revealed ? (
              <EyeOff
                size={s.icon}
                style={secondaryColor ? { color: secondaryColor } : undefined}
                className={secondaryColor ? "" : "text-muted-foreground"}
              />
            ) : (
              <Eye
                size={s.icon}
                style={secondaryColor ? { color: secondaryColor } : undefined}
                className={secondaryColor ? "" : "text-muted-foreground"}
              />
            )}
          </button>
        </span>
      </div>

      {/* Dot-notation */}
      <span
        className={`block font-mono mt-0.5 ${s.dot}`}
        style={secondaryColor ? { color: secondaryColor } : undefined}
      >
        {triword}
      </span>

      {/* Reveal panel */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-2 rounded-md border px-3 py-2 space-y-1 ${
                isHologram
                  ? "border-white/10 bg-white/5"
                  : "border-border bg-muted/30"
              }`}
            >
              {glyph && (
                <div className="flex items-center gap-2">
                  <span className={`${s.reveal} font-medium`} style={secondaryColor ? { color: secondaryColor } : undefined}>
                    Glyph
                  </span>
                  <span className="text-base tracking-widest">{glyph}</span>
                </div>
              )}
              <div>
                <span className={`${s.reveal} font-medium block`} style={secondaryColor ? { color: secondaryColor } : undefined}>
                  Full Hash
                </span>
                <code
                  className={`${s.reveal} font-mono break-all block mt-0.5`}
                  style={secondaryColor ? { color: secondaryColor } : undefined}
                >
                  {canonicalId}
                </code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

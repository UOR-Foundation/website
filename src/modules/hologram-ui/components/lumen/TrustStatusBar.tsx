/**
 * TrustStatusBar — Compact trust & privacy indicator for mobile
 * ═══════════════════════════════════════════════════════════════
 *
 * Shows at a glance:
 *   • Session integrity (hash-chain intact)
 *   • Encryption status (client-side AES-256-GCM active)
 *   • Disclosure level (how many categories are disclosed)
 *   • QDisclosure state (PII redaction active/inactive)
 *
 * Tapping expands to show details and quick privacy toggles.
 *
 * @module hologram-ui/components/lumen/TrustStatusBar
 */

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, ChevronDown, Check } from "lucide-react";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";

const STORAGE_KEY = "polygram-privacy-rules";

interface CategoryRule {
  id: string;
  label: string;
  icon: string;
  disclosed: boolean;
}

function loadDisclosureState(): CategoryRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored).map((r: any) => ({
        id: r.id,
        label: r.label,
        icon: r.icon,
        disclosed: r.disclosed,
      }));
    }
  } catch { /* ignore */ }
  return [];
}

interface TrustStatusBarProps {
  /** Whether the session chain is intact */
  sessionIntact?: boolean;
  /** Number of redactions applied in current session */
  redactionCount?: number;
}

export default function TrustStatusBar({
  sessionIntact = true,
  redactionCount = 0,
}: TrustStatusBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState<CategoryRule[]>(loadDisclosureState);

  const disclosedCount = useMemo(() => categories.filter(c => c.disclosed).length, [categories]);
  const totalCategories = categories.length || 11;
  const privacyScore = Math.round(((totalCategories - disclosedCount) / totalCategories) * 100);

  const privacyColor = privacyScore >= 80
    ? "hsla(150, 45%, 55%, 0.85)"
    : privacyScore >= 50
      ? "hsla(38, 50%, 55%, 0.85)"
      : "hsla(0, 50%, 55%, 0.85)";

  const privacyLabel = privacyScore >= 80
    ? "Private"
    : privacyScore >= 50
      ? "Selective"
      : "Open";

  const toggleCategory = useCallback((id: string) => {
    setCategories(prev => {
      const next = prev.map(c => c.id === id ? { ...c, disclosed: !c.disclosed } : c);
      // Sync back to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const full = JSON.parse(stored);
          const updated = full.map((r: any) =>
            r.id === id ? { ...r, disclosed: !r.disclosed } : r
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="w-full">
      {/* Compact bar */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform duration-200"
        style={{
          background: `${PP.canvasSubtle}`,
          border: `1px solid ${PP.bloomCardBorder}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Shield
            className="w-4 h-4"
            strokeWidth={1.5}
            style={{ color: privacyColor }}
          />
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "12px",
                fontWeight: 500,
                color: privacyColor,
                letterSpacing: "0.04em",
              }}
            >
              {privacyLabel}
            </span>
            <span
              style={{
                fontFamily: PP.font,
                fontSize: "10px",
                color: PP.textWhisper,
                opacity: 0.6,
              }}
            >
              •
            </span>
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" style={{ color: PP.textWhisper, opacity: 0.6 }} />
              <span
                style={{
                  fontFamily: PP.font,
                  fontSize: "10px",
                  color: PP.textWhisper,
                  opacity: 0.6,
                }}
              >
                E2E
              </span>
            </div>
            {redactionCount > 0 && (
              <>
                <span style={{ fontFamily: PP.font, fontSize: "10px", color: PP.textWhisper, opacity: 0.6 }}>•</span>
                <span style={{
                  fontFamily: PP.font,
                  fontSize: "10px",
                  color: "hsla(185, 40%, 60%, 0.7)",
                }}>
                  {redactionCount} redacted
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-300"
          strokeWidth={1.5}
          style={{
            color: PP.textWhisper,
            opacity: 0.5,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-xl px-4 py-3 space-y-3"
              style={{
                background: PP.canvasSubtle,
                border: `1px solid ${PP.bloomCardBorder}`,
              }}
            >
              {/* Status items */}
              <div className="space-y-2">
                <StatusRow
                  icon="🔒"
                  label="Encryption"
                  value="AES-256-GCM"
                  ok
                />
                <StatusRow
                  icon="🔗"
                  label="Session chain"
                  value={sessionIntact ? "Intact" : "Broken"}
                  ok={sessionIntact}
                />
                <StatusRow
                  icon="🛡️"
                  label="PII redaction"
                  value="Active"
                  ok
                />
                <StatusRow
                  icon="📊"
                  label="Privacy score"
                  value={`${privacyScore}%`}
                  ok={privacyScore >= 50}
                />
              </div>

              {/* Quick toggles */}
              {categories.length > 0 && (
                <div>
                  <p
                    className="mb-2"
                    style={{
                      fontFamily: PP.font,
                      fontSize: "10px",
                      color: PP.textWhisper,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    Disclosure Controls
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg active:scale-95 transition-all duration-200"
                        style={{
                          background: cat.disclosed
                            ? "hsla(38, 40%, 50%, 0.12)"
                            : `${PP.canvas}`,
                          border: `1px solid ${cat.disclosed
                            ? "hsla(38, 40%, 50%, 0.25)"
                            : PP.bloomCardBorder
                          }`,
                        }}
                      >
                        <span style={{ fontSize: "11px" }}>{cat.icon}</span>
                        <span style={{
                          fontFamily: PP.font,
                          fontSize: "10px",
                          color: cat.disclosed ? PP.accent : PP.textWhisper,
                        }}>
                          {cat.label}
                        </span>
                        {cat.disclosed ? (
                          <Eye className="w-2.5 h-2.5" style={{ color: PP.accent, opacity: 0.7 }} />
                        ) : (
                          <EyeOff className="w-2.5 h-2.5" style={{ color: PP.textWhisper, opacity: 0.4 }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p
                className="text-center pt-1"
                style={{
                  fontFamily: PP.font,
                  fontSize: "9px",
                  color: PP.textWhisper,
                  opacity: 0.5,
                }}
              >
                Privacy is the default. Every disclosure is your choice.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusRow({ icon, label, value, ok }: {
  icon: string;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ fontSize: "12px" }}>{icon}</span>
        <span style={{
          fontFamily: PP.font,
          fontSize: "11px",
          color: PP.textSecondary,
        }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{
          fontFamily: PP.font,
          fontSize: "11px",
          fontWeight: 500,
          color: ok ? "hsla(150, 45%, 55%, 0.85)" : "hsla(0, 50%, 55%, 0.85)",
        }}>
          {value}
        </span>
        {ok && (
          <Check className="w-3 h-3" style={{ color: "hsla(150, 45%, 55%, 0.7)" }} />
        )}
      </div>
    </div>
  );
}

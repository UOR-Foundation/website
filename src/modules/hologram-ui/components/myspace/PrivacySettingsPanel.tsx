/**
 * PrivacySettingsPanel — Selective disclosure controls
 * ═════════════════════════════════════════════════════
 *
 * Each data category can be toggled independently.
 * When "off," the data is never revealed — requesters receive
 * a zero-knowledge proof that the data exists and is valid
 * without seeing its actual value.
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, Lock, Eye, EyeOff, Fingerprint,
  Globe, Hash, User, Mail, FileText, Image, AtSign,
  Sparkles, Info, Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type PrivacyRules } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface PrivacySettingsPanelProps {
  onBack: () => void;
}

// ── Category definitions ─────────────────────────────────────────────

interface Category {
  key: string;
  label: string;
  description: string;
  icon: typeof Shield;
  zkExplanation: string;
}

const CATEGORIES: Category[] = [
  {
    key: "name",
    label: "Display Name",
    description: "Your chosen name visible to others",
    icon: User,
    zkExplanation: "Others can verify you have a valid identity without seeing your actual name.",
  },
  {
    key: "email",
    label: "Email Address",
    description: "Your authentication email",
    icon: Mail,
    zkExplanation: "Others can confirm your email is verified without learning what it is.",
  },
  {
    key: "avatar",
    label: "Avatar",
    description: "Your profile picture",
    icon: Image,
    zkExplanation: "Others can confirm you have a valid avatar without viewing it.",
  },
  {
    key: "bio",
    label: "Bio",
    description: "Your personal description",
    icon: FileText,
    zkExplanation: "Others can verify you have a bio without reading its contents.",
  },
  {
    key: "handle",
    label: "Handle",
    description: "Your @handle.uor address",
    icon: AtSign,
    zkExplanation: "Others can verify your handle exists without learning what it is.",
  },
  {
    key: "canonicalId",
    label: "Canonical ID",
    description: "Your universal content address",
    icon: Fingerprint,
    zkExplanation: "Others can verify your identity is anchored without seeing the full address.",
  },
  {
    key: "cid",
    label: "Content ID (CID)",
    description: "Your content-addressed identifier",
    icon: Hash,
    zkExplanation: "Others can confirm your CID is valid without accessing its hash.",
  },
  {
    key: "ipv6",
    label: "IPv6 Address",
    description: "Your network layer address",
    icon: Globe,
    zkExplanation: "Others can verify your address is routable without seeing it.",
  },
  {
    key: "glyph",
    label: "Glyph",
    description: "Your visual identity marker",
    icon: Sparkles,
    zkExplanation: "Others can confirm you have a unique glyph without viewing it.",
  },
  {
    key: "ceremonyCid",
    label: "Ceremony Proof",
    description: "Your founding ceremony receipt",
    icon: Shield,
    zkExplanation: "Others can verify your ceremony was valid without seeing the proof data.",
  },
  {
    key: "trustNode",
    label: "Trust Node",
    description: "Your position in the trust mesh",
    icon: Lock,
    zkExplanation: "Others can confirm you are part of the trust network without seeing your node.",
  },
];

const DEFAULT_RULES: PrivacyRules = {
  name: true,
  email: false,
  avatar: true,
  bio: true,
  handle: true,
  canonicalId: false,
  cid: false,
  ipv6: false,
  glyph: true,
  ceremonyCid: false,
  trustNode: false,
};

export default function PrivacySettingsPanel({ onBack }: PrivacySettingsPanelProps) {
  const { profile, user, refreshProfile } = useAuth();

  const savedRules = profile?.privacyRules ?? DEFAULT_RULES;
  const [rules, setRules] = useState<PrivacyRules>(() => ({ ...DEFAULT_RULES, ...savedRules }));
  const [saving, setSaving] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Track if there are unsaved changes
  const hasChanges = JSON.stringify(rules) !== JSON.stringify({ ...DEFAULT_RULES, ...savedRules });

  const toggleCategory = useCallback((key: string) => {
    setRules(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ privacy_rules: rules as Record<string, boolean> })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Privacy settings saved");
    } catch {
      toast.error("Could not save privacy settings");
    } finally {
      setSaving(false);
    }
  }, [user, rules, refreshProfile]);

  const handleUndo = useCallback(() => {
    setRules({ ...DEFAULT_RULES, ...savedRules });
    toast("Reverted to last saved state");
  }, [savedRules]);

  const visibleCount = CATEGORIES.filter(c => rules[c.key]).length;
  const privateCount = CATEGORIES.length - visibleCount;
  const [diffOpen, setDiffOpen] = useState(false);

  const changedCategories = CATEGORIES.filter(
    c => !!rules[c.key] !== !!({ ...DEFAULT_RULES, ...savedRules })[c.key]
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: `${KP.bg}ee`, borderBottom: `1px solid ${KP.border}` }}>
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: KP.gold }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold" style={{ color: KP.text }}>Privacy Settings</h1>
            <p className="text-xs mt-0.5" style={{ color: KP.dim }}>Control what others can see</p>
          </div>
          {hasChanges && (
            <button
              onClick={handleUndo}
              className="p-2 rounded-full hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: KP.dim }}
              title="Undo all changes"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Diff view (when changes exist) ── */}
      {hasChanges && changedCategories.length > 0 && (
        <div className="px-5 pt-4">
          <button
            onClick={() => setDiffOpen(p => !p)}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-colors"
            style={{
              background: `${KP.gold}0a`,
              border: `1px solid ${KP.gold}20`,
            }}
          >
            <Shield className="w-4 h-4 shrink-0" style={{ color: KP.gold }} />
            <span className="flex-1 text-left text-xs font-medium" style={{ color: KP.text }}>
              {changedCategories.length} unsaved change{changedCategories.length > 1 ? "s" : ""}
            </span>
            <span className="text-[10px]" style={{ color: KP.dim }}>
              {diffOpen ? "Hide diff" : "Show diff"}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {diffOpen && (
              <motion.div
                key="diff-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2 rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${KP.cardBorder}`, background: KP.card }}
                >
                  {/* Column headers */}
                  <div
                    className="grid grid-cols-[1fr_80px_24px_80px] items-center px-4 py-2.5"
                    style={{ borderBottom: `1px solid ${KP.border}` }}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: KP.dim }}>Category</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-center" style={{ color: KP.dim }}>Before</span>
                    <span />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-center" style={{ color: KP.dim }}>After</span>
                  </div>

                  {changedCategories.map((cat, i) => {
                    const Icon = cat.icon;
                    const wasBefore = !!({ ...DEFAULT_RULES, ...savedRules })[cat.key];
                    const isNow = !!rules[cat.key];
                    return (
                      <motion.div
                        key={cat.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        className="grid grid-cols-[1fr_80px_24px_80px] items-center px-4 py-2.5"
                        style={{
                          borderBottom: i < changedCategories.length - 1 ? `1px solid ${KP.border}` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: KP.gold }} />
                          <span className="text-xs font-medium truncate" style={{ color: KP.text }}>{cat.label}</span>
                        </div>
                        <div className="flex justify-center">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: wasBefore ? "hsla(152, 40%, 50%, 0.15)" : "hsla(0, 40%, 50%, 0.15)",
                              color: wasBefore ? "hsl(152, 40%, 55%)" : "hsl(0, 40%, 60%)",
                            }}
                          >
                            {wasBefore ? "Visible" : "Private"}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <span style={{ color: KP.dim, fontSize: "12px" }}>→</span>
                        </div>
                        <div className="flex justify-center">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: isNow ? "hsla(152, 40%, 50%, 0.15)" : "hsla(0, 40%, 50%, 0.15)",
                              color: isNow ? "hsl(152, 40%, 55%)" : "hsl(0, 40%, 60%)",
                            }}
                          >
                            {isNow ? "Visible" : "Private"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Summary bar ── */}
      <div className="px-5 py-4">
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
          style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}
        >
          <Shield className="w-5 h-5 shrink-0" style={{ color: KP.gold }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: KP.text }}>
              {privateCount} of {CATEGORIES.length} categories are private
            </p>
            <p className="text-xs mt-0.5" style={{ color: KP.dim }}>
              Private categories use zero-knowledge proofs for verification
            </p>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="px-5 mb-2">
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg"
          style={{ background: `${KP.gold}08`, border: `1px solid ${KP.gold}12` }}
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: KP.gold }} />
          <div>
            <p className="text-xs leading-relaxed" style={{ color: KP.muted }}>
              <strong style={{ color: KP.text }}>Visible</strong> means others can see this data directly.{" "}
              <strong style={{ color: KP.text }}>Private</strong> means they receive a cryptographic proof
              that the data exists and is valid, without ever seeing it. You stay verified. They stay informed. Nobody sees what they do not need to.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toggle list ── */}
      <div className="px-5 py-4 space-y-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isVisible = !!rules[cat.key];
          const isExpanded = expandedKey === cat.key;

          return (
            <div key={cat.key}>
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors"
                style={{
                  background: isExpanded ? KP.card : "transparent",
                  border: isExpanded ? `1px solid ${KP.cardBorder}` : "1px solid transparent",
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: isVisible ? KP.gold : KP.dim }} />
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : cat.key)}
                  className="flex-1 text-left min-w-0 cursor-pointer"
                >
                  <p className="text-sm font-medium" style={{ color: KP.text }}>{cat.label}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: KP.dim }}>{cat.description}</p>
                </button>

                {/* Toggle */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="relative shrink-0 cursor-pointer"
                  style={{ width: 44, height: 24 }}
                  aria-label={`Toggle ${cat.label} visibility`}
                >
                  <div
                    className="absolute inset-0 rounded-full transition-colors duration-200"
                    style={{
                      background: isVisible ? KP.gold : "hsl(25 8% 18%)",
                      border: `1px solid ${isVisible ? KP.gold : "hsl(25 8% 25%)"}`,
                    }}
                  />
                  <div
                    className="absolute top-[2px] rounded-full transition-all duration-200 flex items-center justify-center"
                    style={{
                      width: 18,
                      height: 18,
                      left: isVisible ? 23 : 3,
                      background: isVisible ? KP.bg : "hsl(25 8% 30%)",
                    }}
                  >
                    {isVisible ? (
                      <Eye className="w-2.5 h-2.5" style={{ color: KP.gold }} />
                    ) : (
                      <EyeOff className="w-2.5 h-2.5" style={{ color: KP.dim }} />
                    )}
                  </div>
                </button>
              </div>

              {/* ZK explanation (expanded) */}
              {isExpanded && (
                <div
                  className="ml-11 mr-4 mt-1 mb-2 px-4 py-3 rounded-lg"
                  style={{ background: `${KP.gold}06`, borderLeft: `2px solid ${KP.gold}30` }}
                >
                  <p className="text-xs flex items-start gap-2" style={{ color: KP.muted }}>
                    <Lock className="w-3 h-3 mt-0.5 shrink-0" style={{ color: KP.gold }} />
                    <span>
                      <strong style={{ color: KP.text }}>Zero-knowledge mode:</strong>{" "}
                      {cat.zkExplanation}
                    </span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Save button ── */}
      {hasChanges && (
        <div className="sticky bottom-0 px-5 py-4 backdrop-blur-xl" style={{ background: `${KP.bg}ee`, borderTop: `1px solid ${KP.border}` }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: KP.gold, color: KP.bg }}
          >
            {saving ? "Saving…" : "Save Privacy Settings"}
          </button>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

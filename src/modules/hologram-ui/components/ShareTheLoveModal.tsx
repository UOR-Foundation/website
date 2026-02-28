/**
 * ShareTheLoveModal — Viral invite link generator with share options
 * ══════════════════════════════════════════════════════════════════
 *
 * Generates a unique invite code, persists it, and provides
 * copy-to-clipboard + social sharing buttons.
 *
 * @module hologram-ui/components/ShareTheLoveModal
 */

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Link2, Share2, Loader2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface ShareTheLoveModalProps {
  open: boolean;
  onClose: () => void;
}

const PUBLISHED_BASE = "https://univeral-coordinate-hub.lovable.app";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function ShareTheLoveModal({ open, onClose }: ShareTheLoveModalProps) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ clicks: 0, signups: 0 });

  // Generate or fetch existing invite link
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Check for existing invite link
      const { data: existing } = await supabase
        .from("invite_links")
        .select("code, click_count, signup_count")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setInviteCode(existing.code);
        setInviteUrl(`${PUBLISHED_BASE}?ref=${existing.code}`);
        setStats({ clicks: existing.click_count, signups: existing.signup_count });
      } else {
        // Generate new code
        const code = generateCode();
        await supabase.from("invite_links").insert({
          user_id: session.user.id,
          code,
        });
        setInviteCode(code);
        setInviteUrl(`${PUBLISHED_BASE}?ref=${code}`);
        setStats({ clicks: 0, signups: 0 });
      }
      setLoading(false);
    })();
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [inviteUrl]);

  const shareText = "Join me on the Universal Coordinate Hub — own your identity, data, and digital life.";

  const handleShareTwitter = useCallback(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`,
      "_blank"
    );
  }, [inviteUrl, shareText]);

  const handleShareLinkedIn = useCallback(() => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`,
      "_blank"
    );
  }, [inviteUrl]);

  const handleShareEmail = useCallback(() => {
    window.open(
      `mailto:?subject=${encodeURIComponent("Join me on the Universal Coordinate Hub")}&body=${encodeURIComponent(`${shareText}\n\n${inviteUrl}`)}`,
      "_blank"
    );
  }, [inviteUrl, shareText]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Universal Coordinate Hub", text: shareText, url: inviteUrl });
      } catch {}
    }
  }, [inviteUrl, shareText]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Purple heart icon */}
              <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "linear-gradient(135deg, hsl(270, 80%, 65%), hsl(290, 70%, 50%))" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              <h2 className="text-foreground text-xl font-body font-bold tracking-tight">Share the Love</h2>
              <p className="text-muted-foreground text-sm font-body mt-1.5 leading-relaxed">
                Invite someone to claim their sovereign identity. Your unique link tracks referrals.
              </p>
            </div>

            {/* Invite link */}
            <div className="px-6 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/50">
                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 bg-transparent text-foreground text-sm font-mono focus:outline-none truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {copied && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-primary text-xs font-body mt-2 text-center"
                    >
                      Copied to clipboard!
                    </motion.p>
                  )}
                </>
              )}
            </div>

            {/* Share buttons */}
            <div className="px-6 pb-4">
              <p className="text-muted-foreground text-xs font-body mb-3 uppercase tracking-widest">Share via</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: "𝕏",
                    onClick: handleShareTwitter,
                    bg: "bg-foreground/10 hover:bg-foreground/20",
                    icon: <span className="text-foreground text-base font-bold">𝕏</span>,
                  },
                  {
                    label: "LinkedIn",
                    onClick: handleShareLinkedIn,
                    bg: "bg-blue-500/10 hover:bg-blue-500/20",
                    icon: <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">in</span>,
                  },
                  {
                    label: "Email",
                    onClick: handleShareEmail,
                    bg: "bg-orange-500/10 hover:bg-orange-500/20",
                    icon: <span className="text-orange-600 dark:text-orange-400 text-sm">✉</span>,
                  },
                  {
                    label: "More",
                    onClick: handleNativeShare,
                    bg: "bg-muted hover:bg-muted/80",
                    icon: <Share2 className="w-4 h-4 text-muted-foreground" />,
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${btn.bg}`}
                  >
                    {btn.icon}
                    <span className="text-muted-foreground text-[10px] font-body">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-foreground text-lg font-body font-bold">{stats.clicks}</span>
                  <span className="text-muted-foreground text-[10px] font-body">Link Clicks</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border">
                  <span className="text-foreground text-lg font-body font-bold">{stats.signups}</span>
                  <span className="text-muted-foreground text-[10px] font-body">Signups</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <p className="text-[10px] text-muted-foreground font-body text-center leading-relaxed">
                Your invite code: <span className="font-mono font-semibold text-foreground">{inviteCode}</span> · 
                Every identity claimed strengthens the network.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

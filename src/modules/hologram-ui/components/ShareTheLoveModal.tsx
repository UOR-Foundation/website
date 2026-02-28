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
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-5 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Heart icon — warm earth with purple tint, tilted like Lovable logo */}
              <div
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(145deg, hsla(280, 25%, 42%, 0.9), hsla(320, 20%, 36%, 0.8))",
                  boxShadow: "0 8px 32px -8px hsla(280, 35%, 30%, 0.35)",
                  transform: "rotate(-12deg)",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(12deg)" }}>
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill="url(#modalHeartGrad)"
                    opacity="0.95"
                  />
                  <defs>
                    <linearGradient id="modalHeartGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="hsl(38, 30%, 88%)" />
                      <stop offset="50%" stopColor="hsl(300, 18%, 84%)" />
                      <stop offset="100%" stopColor="hsl(38, 25%, 80%)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h2 className="text-foreground text-xl font-serif font-normal tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Share the Love
              </h2>
              <p className="text-muted-foreground text-sm font-body mt-2 leading-relaxed max-w-xs mx-auto">
                Invite someone to claim their sovereign identity. Your unique link tracks every referral.
              </p>
            </div>

            {/* Invite link */}
            <div className="px-8 pb-5">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3.5 rounded-xl border border-border bg-muted/30">
                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 bg-transparent text-foreground text-sm font-mono focus:outline-none truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-2 rounded-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-colors"
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
                      Copied to clipboard
                    </motion.p>
                  )}
                </>
              )}
            </div>

            {/* Share buttons — earth-warm styling */}
            <div className="px-8 pb-5">
              <p className="text-muted-foreground text-[10px] font-body mb-3 uppercase tracking-[0.2em]">Share via</p>
              <div className="grid grid-cols-4 gap-2.5">
                {[
                  {
                    label: "𝕏",
                    onClick: handleShareTwitter,
                    icon: <span className="text-foreground text-base font-semibold">𝕏</span>,
                  },
                  {
                    label: "LinkedIn",
                    onClick: handleShareLinkedIn,
                    icon: <span className="text-foreground text-sm font-semibold">in</span>,
                  },
                  {
                    label: "Email",
                    onClick: handleShareEmail,
                    icon: <ExternalLink className="w-4 h-4 text-foreground" />,
                  },
                  {
                    label: "More",
                    onClick: handleNativeShare,
                    icon: <Share2 className="w-4 h-4 text-foreground" />,
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-all duration-300"
                  >
                    {btn.icon}
                    <span className="text-muted-foreground text-[10px] font-body">{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="px-8 pb-6">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col items-center p-3.5 rounded-xl bg-muted/30 border border-border">
                  <span className="text-foreground text-lg font-body font-semibold">{stats.clicks}</span>
                  <span className="text-muted-foreground text-[10px] font-body tracking-wide">Clicks</span>
                </div>
                <div className="flex flex-col items-center p-3.5 rounded-xl bg-muted/30 border border-border">
                  <span className="text-foreground text-lg font-body font-semibold">{stats.signups}</span>
                  <span className="text-muted-foreground text-[10px] font-body tracking-wide">Signups</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8">
              <p className="text-[10px] text-muted-foreground font-body text-center leading-relaxed">
                Invite code <span className="font-mono font-medium text-foreground/70">{inviteCode}</span> · 
                Every identity claimed strengthens the network.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

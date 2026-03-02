/**
 * ShareTheLoveModal — "Pass on the magic"
 * ══════════════════════════════════════════
 *
 * A delightful referral experience that captures the moment of joy
 * users feel within Hologram, and channels it into sharing with
 * friends. Features:
 *  - Emotional narrative (Why → How → What)
 *  - Tier-based rewards with real unlockable features
 *  - Progress visualization with animated rings
 *  - Social sharing with copy-to-clipboard
 *  - Live stats tracking
 *
 * @module hologram-ui/components/ShareTheLoveModal
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, Copy, Check, Link2, Share2, Loader2,
  Sparkles, Star, Crown, Heart, Gift, Users, Zap, Trophy,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface ShareTheLoveModalProps {
  open: boolean;
  onClose: () => void;
}

const PUBLISHED_BASE = "https://univeral-coordinate-hub.lovable.app";

// ── Reward Tiers ─────────────────────────────────────────
// Each tier unlocks a real feature — not vanity points.

interface RewardTier {
  name: string;
  icon: typeof Star;
  threshold: number; // signups needed
  color: string;
  glow: string;
  reward: string;
  rewardDetail: string;
}

const TIERS: RewardTier[] = [
  {
    name: "Spark",
    icon: Heart,
    threshold: 0,
    color: "hsl(30, 45%, 55%)",
    glow: "hsla(30, 45%, 55%, 0.3)",
    reward: "Your unique invite link",
    rewardDetail: "Share Hologram with the people you care about",
  },
  {
    name: "Flame",
    icon: Sparkles,
    threshold: 3,
    color: "hsl(38, 80%, 60%)",
    glow: "hsla(38, 80%, 60%, 0.3)",
    reward: "Custom profile badge",
    rewardDetail: "A unique Flame badge appears on your profile, showing you helped grow the network",
  },
  {
    name: "Beacon",
    icon: Star,
    threshold: 7,
    color: "hsl(45, 90%, 65%)",
    glow: "hsla(45, 90%, 65%, 0.35)",
    reward: "Early access to new features",
    rewardDetail: "Get invited to test new Hologram features before anyone else",
  },
  {
    name: "Luminary",
    icon: Crown,
    threshold: 15,
    color: "hsl(280, 50%, 65%)",
    glow: "hsla(280, 50%, 65%, 0.35)",
    reward: "Priority Lumen context",
    rewardDetail: "Lumen remembers more of your conversations with expanded memory slots",
  },
  {
    name: "Guardian",
    icon: Trophy,
    threshold: 30,
    color: "hsl(152, 55%, 55%)",
    glow: "hsla(152, 55%, 55%, 0.35)",
    reward: "Founding Guardian status",
    rewardDetail: "Permanent founding member recognition + governance input on Hologram's future",
  },
];

function getCurrentTier(signups: number): { current: RewardTier; next: RewardTier | null; progress: number } {
  let currentIdx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (signups >= TIERS[i].threshold) { currentIdx = i; break; }
  }
  const current = TIERS[currentIdx];
  const next = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
  const progress = next
    ? (signups - current.threshold) / (next.threshold - current.threshold)
    : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Sub-views ────────────────────────────────────────────

type Tab = "share" | "rewards" | "network";

export function ShareTheLoveModal({ open, onClose }: ShareTheLoveModalProps) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ clicks: 0, signups: 0 });
  const [tab, setTab] = useState<Tab>("share");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const tierInfo = useMemo(() => getCurrentTier(stats.signups), [stats.signups]);

  // Generate or fetch existing invite link
  useEffect(() => {
    if (!open) return;
    setTab("share");
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

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
        const code = generateCode();
        await supabase.from("invite_links").insert({ user_id: session.user.id, code });
        setInviteCode(code);
        setInviteUrl(`${PUBLISHED_BASE}?ref=${code}`);
        setStats({ clicks: 0, signups: 0 });
      }
      setLoading(false);

      // Fetch leaderboard in background
      const { data: lb } = await supabase.rpc("get_referral_leaderboard", { result_limit: 10 });
      if (lb) setLeaderboard(lb);
    })();
  }, [open]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }, [inviteUrl]);

  const shareText = "I've been exploring Hologram — a space where your identity, data, and creativity are truly yours. Come see what it feels like.";

  const handleShareTwitter = useCallback(() => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`, "_blank");
  }, [inviteUrl]);

  const handleShareLinkedIn = useCallback(() => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`, "_blank");
  }, [inviteUrl]);

  const handleShareEmail = useCallback(() => {
    window.open(`mailto:?subject=${encodeURIComponent("Something beautiful I wanted to share with you")}&body=${encodeURIComponent(`${shareText}\n\n${inviteUrl}`)}`, "_blank");
  }, [inviteUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Hologram", text: shareText, url: inviteUrl }); } catch {}
    }
  }, [inviteUrl]);

  const TierIcon = tierInfo.current.icon;

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
          <div className="absolute inset-0 backdrop-blur-md" style={{ background: `${KP.bg}bb` }} />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-[440px] mx-4 rounded-3xl overflow-hidden"
            style={{
              background: KP.bg,
              border: `1px solid ${KP.border}`,
              boxShadow: `0 40px 80px -20px hsla(0,0%,0%,0.5), 0 0 60px -10px ${tierInfo.current.glow}`,
            }}
          >
            {/* ── Close ── */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-20 p-1.5 rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: KP.muted }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── Header with tier glow ── */}
            <div className="relative px-8 pt-8 pb-6 text-center overflow-hidden">
              {/* Radial glow behind icon */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[180px] pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 30%, ${tierInfo.current.glow}, transparent 70%)`,
                  opacity: 0.6,
                }}
              />

              {/* Tier icon with progress ring */}
              <div className="relative mx-auto w-20 h-20 mb-5">
                <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90">
                  {/* Background ring */}
                  <circle cx="40" cy="40" r="36" fill="none" stroke={KP.border} strokeWidth="2" />
                  {/* Progress ring */}
                  <motion.circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke={tierInfo.current.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - tierInfo.progress) }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                <div
                  className="absolute inset-[6px] rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(145deg, ${tierInfo.current.color}22, transparent)`,
                    border: `1px solid ${tierInfo.current.color}33`,
                  }}
                >
                  <TierIcon className="w-7 h-7" style={{ color: tierInfo.current.color }} />
                </div>
              </div>

              {/* Emotional headline */}
              <h2
                className="text-[22px] font-semibold leading-snug"
                style={{ color: KP.text, fontFamily: KP.serif }}
              >
                Pass on the magic
              </h2>
              <p className="text-sm mt-2.5 leading-relaxed max-w-[300px] mx-auto" style={{ color: KP.muted }}>
                You felt something here. Share that feeling with someone
                who matters to you — and grow together.
              </p>

              {/* Tier badge */}
              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{ background: `${tierInfo.current.color}15`, border: `1px solid ${tierInfo.current.color}25` }}>
                <TierIcon className="w-3 h-3" style={{ color: tierInfo.current.color }} />
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: tierInfo.current.color }}>
                  {tierInfo.current.name}
                </span>
                {tierInfo.next && (
                  <span className="text-[10px]" style={{ color: KP.dim }}>
                    · {tierInfo.next.threshold - stats.signups} to {tierInfo.next.name}
                  </span>
                )}
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="px-8 flex gap-1 mb-1">
              {([
                { id: "share" as Tab, label: "Share", icon: Heart },
                { id: "rewards" as Tab, label: "Rewards", icon: Gift },
                { id: "network" as Tab, label: "Network", icon: Users },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold tracking-wider uppercase transition-all cursor-pointer"
                  style={{
                    background: tab === id ? `${KP.gold}15` : "transparent",
                    color: tab === id ? KP.gold : KP.dim,
                    border: tab === id ? `1px solid ${KP.gold}20` : "1px solid transparent",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="px-8 pb-8 pt-4 min-h-[280px]">
              <AnimatePresence mode="wait">
                {tab === "share" && (
                  <motion.div
                    key="share"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ShareTab
                      loading={loading}
                      inviteUrl={inviteUrl}
                      inviteCode={inviteCode}
                      copied={copied}
                      stats={stats}
                      onCopy={handleCopy}
                      onShareTwitter={handleShareTwitter}
                      onShareLinkedIn={handleShareLinkedIn}
                      onShareEmail={handleShareEmail}
                      onNativeShare={handleNativeShare}
                    />
                  </motion.div>
                )}
                {tab === "rewards" && (
                  <motion.div
                    key="rewards"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RewardsTab signups={stats.signups} />
                  </motion.div>
                )}
                {tab === "network" && (
                  <motion.div
                    key="network"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NetworkTab leaderboard={leaderboard} stats={stats} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// Share Tab
// ═══════════════════════════════════════════════════════════

function ShareTab({
  loading, inviteUrl, inviteCode, copied, stats,
  onCopy, onShareTwitter, onShareLinkedIn, onShareEmail, onNativeShare,
}: {
  loading: boolean;
  inviteUrl: string;
  inviteCode: string;
  copied: boolean;
  stats: { clicks: number; signups: number };
  onCopy: () => void;
  onShareTwitter: () => void;
  onShareLinkedIn: () => void;
  onShareEmail: () => void;
  onNativeShare: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: KP.muted }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Why share — micro-narrative */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: `${KP.gold}08`, border: `1px solid ${KP.gold}12` }}
      >
        <p className="text-[12px] leading-relaxed" style={{ color: KP.muted }}>
          <span style={{ color: KP.gold }}>Every person you invite</span> gets their own sovereign space —
          a place to learn, create, and connect without giving up who they are.
          And as your network grows, so does yours.
        </p>
      </div>

      {/* Invite link */}
      <div>
        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: `${KP.surface}`, border: `1px solid ${KP.border}` }}
        >
          <Link2 className="w-4 h-4 shrink-0" style={{ color: KP.dim }} />
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 bg-transparent text-sm font-mono focus:outline-none truncate"
            style={{ color: KP.text }}
          />
          <button
            onClick={onCopy}
            className="shrink-0 p-2 rounded-lg transition-all active:scale-95 cursor-pointer"
            style={{ background: KP.gold, color: KP.bg }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <AnimatePresence>
          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-medium mt-2 text-center"
              style={{ color: KP.gold }}
            >
              ✓ Link copied — share it with someone you care about
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Share buttons */}
      <div>
        <p className="text-[10px] mb-3 uppercase tracking-[0.2em] font-semibold" style={{ color: KP.dim }}>
          Share via
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "𝕏", onClick: onShareTwitter, icon: <span className="text-sm font-bold" style={{ color: KP.text }}>𝕏</span> },
            { label: "LinkedIn", onClick: onShareLinkedIn, icon: <span className="text-xs font-bold" style={{ color: KP.text }}>in</span> },
            { label: "Email", onClick: onShareEmail, icon: <ExternalLink className="w-3.5 h-3.5" style={{ color: KP.text }} /> },
            { label: "More", onClick: onNativeShare, icon: <Share2 className="w-3.5 h-3.5" style={{ color: KP.text }} /> },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all hover:opacity-80 active:scale-95 cursor-pointer"
              style={{ background: `${KP.surface}`, border: `1px solid ${KP.border}` }}
            >
              {btn.icon}
              <span className="text-[9px] tracking-wider" style={{ color: KP.dim }}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Clicks" value={stats.clicks} icon={Zap} />
        <StatPill label="Joined" value={stats.signups} icon={Users} />
        <StatPill
          label="Rate"
          value={stats.clicks > 0 ? `${Math.round((stats.signups / stats.clicks) * 100)}%` : "—"}
          icon={Sparkles}
        />
      </div>

      {/* Code footer */}
      <p className="text-[10px] text-center leading-relaxed" style={{ color: KP.dim }}>
        Code <span className="font-mono font-medium" style={{ color: KP.muted }}>{inviteCode}</span> ·
        Every identity claimed strengthens the network
      </p>
    </div>
  );
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Zap }) {
  return (
    <div
      className="flex flex-col items-center py-3 rounded-xl"
      style={{ background: `${KP.surface}`, border: `1px solid ${KP.border}` }}
    >
      <Icon className="w-3 h-3 mb-1" style={{ color: KP.dim }} />
      <span className="text-base font-semibold tabular-nums" style={{ color: KP.text }}>{value}</span>
      <span className="text-[9px] tracking-wider" style={{ color: KP.dim }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Rewards Tab
// ═══════════════════════════════════════════════════════════

function RewardsTab({ signups }: { signups: number }) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: KP.muted }}>
        Real rewards that grow with your impact. Each tier unlocks something meaningful — not points, but features that
        make your Hologram experience richer.
      </p>

      {TIERS.map((tier, i) => {
        const unlocked = signups >= tier.threshold;
        const TIcon = tier.icon;
        const isActive = signups >= tier.threshold && (i === TIERS.length - 1 || signups < TIERS[i + 1].threshold);

        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative p-3.5 rounded-xl transition-all"
            style={{
              background: isActive ? `${tier.color}10` : unlocked ? `${KP.surface}` : `${KP.bg}`,
              border: `1px solid ${isActive ? `${tier.color}30` : unlocked ? KP.border : `${KP.border}`}`,
              opacity: unlocked ? 1 : 0.5,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: unlocked ? `${tier.color}20` : `${KP.dim}15`,
                  border: `1px solid ${unlocked ? `${tier.color}30` : `${KP.dim}15`}`,
                }}
              >
                <TIcon className="w-4 h-4" style={{ color: unlocked ? tier.color : KP.dim }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold" style={{ color: unlocked ? KP.text : KP.dim }}>
                    {tier.name}
                  </span>
                  <span className="text-[10px]" style={{ color: KP.dim }}>
                    {tier.threshold === 0 ? "Start" : `${tier.threshold} friends`}
                  </span>
                  {unlocked && (
                    <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${tier.color}20`, color: tier.color }}>
                      Unlocked
                    </span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: unlocked ? KP.muted : KP.dim }}>
                  {tier.reward}
                </p>
                {isActive && (
                  <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: KP.muted }}>
                    {tier.rewardDetail}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Network Tab
// ═══════════════════════════════════════════════════════════

function NetworkTab({ leaderboard, stats }: { leaderboard: any[]; stats: { clicks: number; signups: number } }) {
  return (
    <div className="space-y-5">
      {/* Personal impact */}
      <div
        className="p-4 rounded-2xl text-center"
        style={{ background: `${KP.gold}08`, border: `1px solid ${KP.gold}12` }}
      >
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold mb-2" style={{ color: KP.dim }}>
          Your impact
        </p>
        <div className="flex items-center justify-center gap-6">
          <div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: KP.text }}>{stats.signups}</span>
            <p className="text-[10px] mt-0.5" style={{ color: KP.muted }}>People joined</p>
          </div>
          <div className="w-px h-8" style={{ background: KP.border }} />
          <div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: KP.text }}>{stats.clicks}</span>
            <p className="text-[10px] mt-0.5" style={{ color: KP.muted }}>Link visits</p>
          </div>
          <div className="w-px h-8" style={{ background: KP.border }} />
          <div>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: KP.text }}>
              {stats.clicks > 0 ? `${Math.round((stats.signups / stats.clicks) * 100)}%` : "—"}
            </span>
            <p className="text-[10px] mt-0.5" style={{ color: KP.muted }}>Conversion</p>
          </div>
        </div>
      </div>

      {/* Community leaderboard */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-3.5 h-3.5" style={{ color: KP.gold }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: KP.muted }}>
            Community Champions
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 mx-auto mb-2" style={{ color: KP.dim, opacity: 0.4 }} />
            <p className="text-[12px]" style={{ color: KP.dim }}>Be the first champion</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {leaderboard.slice(0, 5).map((entry: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: i < 3 ? `${KP.surface}` : "transparent", border: `1px solid ${i < 3 ? KP.border : "transparent"}` }}
              >
                <span className="text-sm w-6 text-center" style={{ color: i === 0 ? "hsl(45, 90%, 60%)" : i === 1 ? "hsl(0, 0%, 72%)" : i === 2 ? "hsl(25, 60%, 50%)" : KP.dim }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <span className="flex-1 text-[12px] font-medium truncate" style={{ color: KP.text }}>
                  {entry.display_name_masked}
                </span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: KP.gold }}>
                  {entry.signup_count}
                </span>
                <span className="text-[9px]" style={{ color: KP.dim }}>joined</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Network philosophy */}
      <div className="pt-2">
        <p className="text-[10px] text-center leading-relaxed" style={{ color: KP.dim }}>
          This isn't a competition — it's a collective. Every person who joins
          makes the network stronger for everyone.
        </p>
      </div>
    </div>
  );
}

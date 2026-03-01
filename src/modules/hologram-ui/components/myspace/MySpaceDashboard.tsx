/**
 * MySpaceDashboard — Sovereign social profile
 * ═════════════════════════════════════════════
 *
 * Mirrors the familiar social-network profile layout (Twitter/X style)
 * but with a critical difference: YOU own your network and data.
 * Everything is private by default. Others request access; you grant it
 * selectively via zero-knowledge proofs.
 */

import { useState, useCallback, useRef, useMemo } from "react";
import {
  Shield, Fingerprint, Lock, LogOut, Copy, Check,
  Camera, ChevronRight, Settings, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface MySpaceDashboardProps {
  onClose: () => void;
  onSignOut: () => void;
}

export default function MySpaceDashboard({ onClose, onSignOut }: MySpaceDashboardProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(profile?.bio ?? "");
  const [editHandle, setEditHandle] = useState(profile?.handle ?? "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({
        bio: editBio.trim() || null,
        handle: editHandle.trim() || null,
      }).eq("user_id", user.id);
      await refreshProfile();
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  }, [user, editBio, editHandle, refreshProfile]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("app-assets").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("app-assets").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("Avatar updated");
  }, [user, refreshProfile]);

  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/cover.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("app-assets").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Upload failed"); return; }
    const { data: { publicUrl } } = supabase.storage.from("app-assets").getPublicUrl(path);
    await supabase.from("profiles").update({ cover_image_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    toast.success("Cover updated");
  }, [user, refreshProfile]);

  const displayName = profile?.displayName ?? "User";
  const handle = profile?.handle ?? profile?.threeWordName?.toLowerCase().replace(/\s+/g, "") ?? null;
  const hasCeremony = !!profile?.ceremonyCid;
  const uorAddress = profile?.uorCanonicalId
    ? `uor:${profile.uorCanonicalId.substring(0, 40)}…`
    : null;

  const joinedDate = useMemo(() => {
    const d = profile?.claimedAt ? new Date(profile.claimedAt) : new Date();
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [profile?.claimedAt]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>

      {/* ═══════════════════════════════════════════════ */}
      {/* COVER IMAGE                                     */}
      {/* ═══════════════════════════════════════════════ */}
      <div
        className="relative h-48 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(25 12% 10%) 0%, hsl(30 15% 14%) 40%, hsl(38 20% 16%) 100%)",
        }}
      >
        {profile?.coverImageUrl && (
          <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(25 10% 8% / 0.6), transparent 50%)" }} />

        {/* Top-right actions on cover */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <button className="p-2 rounded-full backdrop-blur-md hover:opacity-80 transition-opacity cursor-pointer" style={{ background: "hsl(25 10% 8% / 0.45)" }} title="Settings">
            <Settings className="w-4 h-4" style={{ color: KP.muted }} />
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-sm hover:opacity-80 transition-opacity cursor-pointer"
            style={{ background: "hsl(25 10% 8% / 0.45)", color: KP.muted }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

        {/* Cover camera button */}
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute bottom-4 right-4 p-2.5 rounded-full backdrop-blur-md hover:opacity-80 transition-opacity cursor-pointer"
          style={{ background: "hsl(25 10% 8% / 0.55)", border: `1px solid ${KP.border}` }}
          title="Change cover"
        >
          <Camera className="w-4 h-4" style={{ color: KP.muted }} />
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* AVATAR + EDIT PROFILE ROW                       */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 -mt-14 relative z-10 flex items-end justify-between">
        {/* Avatar — circular like social networks */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative group shrink-0 cursor-pointer"
        >
          <div
            className="w-28 h-28 rounded-full overflow-hidden"
            style={{ border: `4px solid ${KP.bg}`, background: KP.bg }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `hsl(25 12% 12%)`, border: `2px solid ${KP.border}` , borderRadius: "50%" }}
              >
                {/* User icon SVG matching the reference */}
                <svg viewBox="0 0 48 48" className="w-12 h-12" style={{ color: KP.gold }}>
                  <circle cx="24" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          {/* Plus badge */}
          <div
            className="absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: KP.gold, color: KP.bg }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "hsl(0 0% 0% / 0.35)" }}>
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        {/* Edit profile button */}
        <button
          onClick={() => {
            if (editing) handleSaveProfile();
            else { setEditBio(profile?.bio ?? ""); setEditHandle(profile?.handle ?? ""); setEditing(true); }
          }}
          disabled={saving}
          className="mb-2 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all hover:opacity-80 cursor-pointer"
          style={{
            background: editing ? KP.gold : "transparent",
            color: editing ? KP.bg : KP.muted,
            border: `1px solid ${editing ? KP.gold : KP.border}`,
          }}
        >
          {editing ? (saving ? "Saving…" : "Save") : (
            <>
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
              </svg>
              Edit profile
            </>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* NAME + UOR ADDRESS                              */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-5">
        <h1 className="text-3xl font-display font-semibold" style={{ color: KP.text }}>
          {displayName}
        </h1>
        {uorAddress && (
          <p className="text-sm font-mono mt-1.5 truncate" style={{ color: KP.dim }}>
            UOR: &nbsp;{uorAddress}
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* BIO                                             */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-5">
        {editing ? (
          <div className="space-y-3">
            <input
              value={editHandle}
              onChange={(e) => setEditHandle(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase())}
              placeholder="your-handle"
              maxLength={30}
              className="w-full bg-transparent text-sm px-0 py-1 outline-none"
              style={{ borderBottom: `1px solid ${KP.border}`, color: KP.text }}
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell the world about yourself…"
              maxLength={280}
              rows={3}
              className="w-full bg-transparent text-sm px-0 py-2 outline-none resize-none"
              style={{ borderBottom: `1px solid ${KP.border}`, color: KP.muted }}
            />
          </div>
        ) : (
          <p className="text-base leading-relaxed" style={{ color: KP.muted }}>
            {profile?.bio || "A self-sovereign identity anchored in the Universal Object Reference framework."}
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* META ROW: @handle · Privacy · Joined            */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: KP.dim }}>
        {handle && (
          <>
            <span style={{ color: KP.gold }}>@{handle}.uor</span>
            <span>·</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3" />
          100% Private
        </span>
        <span>·</span>
        <span>Joined {joinedDate}</span>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* FOLLOWING / FOLLOWERS                           */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-4 flex items-center gap-5">
        <span className="text-sm">
          <span className="font-bold" style={{ color: KP.text }}>0</span>
          <span className="ml-1" style={{ color: KP.dim }}>Following</span>
        </span>
        <span className="text-sm">
          <span className="font-bold" style={{ color: KP.text }}>0</span>
          <span className="ml-1" style={{ color: KP.dim }}>Followers</span>
        </span>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* DIVIDER                                         */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="mt-8 mx-6" style={{ borderTop: `1px solid ${KP.border}` }} />

      {/* ═══════════════════════════════════════════════ */}
      {/* YOUR IDENTITY, AT A GLANCE                      */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-8">
        <div className="mb-1">
          <div className="w-8 h-0.5 rounded-full" style={{ background: KP.gold }} />
        </div>
        <h2 className="text-2xl font-serif mt-4" style={{ color: KP.text, fontFamily: KP.serif }}>
          Your identity, at a glance
        </h2>
        <p className="text-sm mt-3 leading-relaxed" style={{ color: KP.dim }}>
          Everything below is cryptographically anchored and belongs only to you.
          No platform, no corporation, no government can modify or revoke it.
        </p>
      </div>

      {/* ── Identity card ── */}
      {profile?.uorCanonicalId && (
        <div className="px-6 mt-6">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint className="w-4 h-4" style={{ color: KP.gold }} />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: KP.gold }}>
                Sovereign Identity
              </span>
            </div>
            {profile.threeWordName && <IdentityRow label="Name" value={profile.threeWordName} />}
            <IdentityRow label="Canonical ID" value={profile.uorCanonicalId} />
            {profile.uorCid && <IdentityRow label="CID" value={profile.uorCid} />}
            {profile.uorIpv6 && <IdentityRow label="IPv6" value={profile.uorIpv6} />}
            {profile.uorGlyph && <IdentityRow label="Glyph" value={profile.uorGlyph} />}
            {profile.ceremonyCid && <IdentityRow label="Ceremony" value={profile.ceremonyCid} />}
            {profile.trustNodeCid && <IdentityRow label="Trust Node" value={profile.trustNodeCid} />}
            {profile.disclosurePolicyCid && <IdentityRow label="Disclosure" value={profile.disclosurePolicyCid} />}
          </div>
        </div>
      )}

      {/* ── Security badge ── */}
      {hasCeremony && (
        <div className="px-6 mt-5">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${KP.gold}08`, border: `1px solid ${KP.gold}18` }}
          >
            <Shield className="w-4 h-4 shrink-0" style={{ color: KP.gold }} />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: KP.gold }}>
                Sovereign · {profile?.pqcAlgorithm || "ML-DSA-65"}
              </span>
              <span className="text-[10px] ml-2" style={{ color: KP.dim }}>
                {profile?.collapseIntact ? "Collapse intact" : "Observed"}
              </span>
            </div>
            <Lock className="w-3 h-3 shrink-0" style={{ color: KP.dim }} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* PRIVACY PHILOSOPHY                              */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="px-6 mt-8">
        <div className="mb-1">
          <div className="w-8 h-0.5 rounded-full" style={{ background: KP.gold }} />
        </div>
        <h2 className="text-2xl font-serif mt-4" style={{ color: KP.text, fontFamily: KP.serif }}>
          Your network is yours
        </h2>
        <p className="text-sm mt-3 leading-relaxed" style={{ color: KP.dim }}>
          Unlike traditional social networks, your connections, content, and context
          never leave your sovereign space. Others can <em>request</em> access — you
          grant it selectively through zero-knowledge proofs. They verify your claims
          without ever seeing the underlying data.
        </p>
        <div className="flex items-center gap-2 mt-4 cursor-pointer group" style={{ color: KP.gold }}>
          <span className="text-sm font-medium group-hover:opacity-80 transition-opacity">Privacy settings</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
}

/* ── Sub-components ───────────────────────────────── */

function IdentityRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center gap-3 group text-left hover:opacity-80 transition-opacity cursor-pointer"
    >
      <span className="text-[11px] font-medium tracking-wider uppercase shrink-0 w-20" style={{ color: KP.dim }}>
        {label}
      </span>
      <span className="text-xs font-mono truncate flex-1" style={{ color: KP.muted }}>
        {value}
      </span>
      {copied ? (
        <Check className="w-3 h-3 shrink-0" style={{ color: KP.gold }} />
      ) : (
        <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: KP.muted }} />
      )}
    </button>
  );
}

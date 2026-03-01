/**
 * MySpaceDashboard — Full sovereign profile page
 * ════════════════════════════════════════════════
 *
 * The personal space after identity creation. Shows:
 * - Cover image + avatar + display name + handle
 * - Bio section
 * - Trust graph stats (nodes, attestations, integrity)
 * - Sovereign identity card
 * - Privacy section
 * - Edit profile + Sign out
 *
 * Single canonical entry point: everything routes through MySpacePanel.
 */

import { useState, useCallback, useRef } from "react";
import {
  Shield, Fingerprint, Lock, LogOut, Copy, Check,
  Edit3, Camera, ChevronRight, Users, Network, Eye,
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
  const handle = profile?.handle ?? profile?.threeWordName?.toLowerCase().replace(/\s+/g, "-") ?? null;
  const hasCeremony = !!profile?.ceremonyCid;

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>
      {/* ── Cover Image ──────────────────────────────── */}
      <div className="relative h-36 overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(25 12% 10%) 0%, hsl(30 15% 14%) 50%, hsl(38 20% 12%) 100%)" }}>
        {profile?.coverImageUrl && (
          <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
        )}
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(25 10% 8% / 0.7), transparent 60%)" }} />
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-opacity hover:opacity-80 cursor-pointer"
          style={{ background: "hsl(25 10% 8% / 0.5)", border: `1px solid ${KP.border}` }}
          title="Change cover"
        >
          <Camera className="w-3.5 h-3.5" style={{ color: KP.muted }} />
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* ── Avatar + Name ────────────────────────────── */}
      <div className="px-6 -mt-10 relative z-10">
        <div className="flex items-end gap-4">
          {/* Avatar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group shrink-0 cursor-pointer"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" style={{ border: `3px solid ${KP.bg}` }} />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-display font-bold"
                style={{ background: `${KP.gold}1a`, color: KP.gold, border: `3px solid ${KP.bg}` }}
              >
                {profile?.uorGlyph || displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "hsl(0 0% 0% / 0.4)" }}>
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

          {/* Name block */}
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="text-xl font-display font-semibold truncate" style={{ color: KP.text }}>
              {displayName}
            </h2>
            {handle && (
              <p className="text-sm truncate" style={{ color: KP.gold }}>
                @{handle}.uor
              </p>
            )}
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => {
              if (editing) handleSaveProfile();
              else { setEditBio(profile?.bio ?? ""); setEditHandle(profile?.handle ?? ""); setEditing(true); }
            }}
            disabled={saving}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase transition-all hover:opacity-80 cursor-pointer"
            style={{
              background: editing ? KP.gold : `${KP.gold}15`,
              color: editing ? KP.bg : KP.gold,
              border: `1px solid ${editing ? KP.gold : KP.gold + "30"}`,
            }}
          >
            {editing ? (saving ? "Saving…" : "Save") : "Edit"}
          </button>
        </div>
      </div>

      {/* ── Bio ──────────────────────────────────────── */}
      <div className="px-6 mt-4">
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
          <p className="text-sm leading-relaxed" style={{ color: KP.muted }}>
            {profile?.bio || "No bio yet. Tap Edit to add one."}
          </p>
        )}
      </div>

      {/* ── Stats row ────────────────────────────────── */}
      <div className="flex items-center gap-6 px-6 mt-5">
        <StatPill icon={<Network className="w-3.5 h-3.5" />} label="Trust Nodes" value={hasCeremony ? "1" : "0"} />
        <StatPill icon={<Users className="w-3.5 h-3.5" />} label="Attestations" value="0" />
        <StatPill icon={<Eye className="w-3.5 h-3.5" />} label="Projections" value={hasCeremony ? "370+" : "0"} />
      </div>

      {/* ── Security badge ────────────────────────────── */}
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

      {/* ── Identity Card ────────────────────────────── */}
      {profile?.uorCanonicalId && (
        <div className="px-6 mt-5">
          <div className="rounded-2xl p-5 space-y-2.5" style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}>
            <div className="flex items-center gap-2 mb-3">
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

      {/* ── Privacy section ───────────────────────────── */}
      <div className="px-6 py-5 mt-3" style={{ borderTop: `1px solid ${KP.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs tracking-[0.2em] uppercase font-medium" style={{ color: KP.dim }}>
            Privacy
          </p>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: KP.dim }} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: KP.muted }}>
          Everything is private by default. Your identity is protected by post-quantum cryptography
          and observer-collapse detection. No data leaves without your explicit consent.
        </p>
      </div>

      {/* ── Sign out ──────────────────────────────────── */}
      <div className="px-6 py-5" style={{ borderTop: `1px solid ${KP.border}` }}>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: KP.muted }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Bottom spacer for mobile */}
      <div className="h-6" />
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────── */

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: KP.dim }}>{icon}</span>
      <span className="text-sm font-semibold" style={{ color: KP.text }}>{value}</span>
      <span className="text-xs" style={{ color: KP.dim }}>{label}</span>
    </div>
  );
}

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

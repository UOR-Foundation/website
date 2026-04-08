/**
 * Sovereign Identity Panel — slide-out panel for identity & auth.
 *
 * Shows profile info when logged in, or sign-in/sign-up when not.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, ShieldCheck, LogOut, User, Fingerprint, Globe, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SovereignIdentityPanel({ open, onClose }: Props) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed top-0 right-0 z-50 h-full w-full max-w-sm border-l border-white/[0.08] bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 border border-white/[0.12] flex items-center justify-center">
                  {user ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
                  ) : (
                    <Shield className="w-4 h-4 text-foreground/60" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground/90">
                  Sovereign Identity
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground/70 hover:bg-white/[0.04] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                </div>
              ) : user ? (
                /* ═══ Authenticated View ═══ */
                <div className="space-y-5">
                  {/* Profile card */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border border-white/[0.1] flex items-center justify-center">
                          <User className="w-5 h-5 text-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground/90 truncate">
                          {profile?.displayName ?? "User"}
                        </p>
                        {profile?.handle && (
                          <p className="text-xs text-muted-foreground/50 truncate">@{profile.handle}</p>
                        )}
                        {profile?.threeWordName && (
                          <p className="text-[11px] font-mono text-primary/60 mt-0.5">{profile.threeWordName}</p>
                        )}
                      </div>
                    </div>
                    {profile?.bio && (
                      <p className="text-xs text-muted-foreground/60 leading-relaxed">{profile.bio}</p>
                    )}
                  </div>

                  {/* Identity fields */}
                  {(profile?.uorCid || profile?.uorCanonicalId || profile?.uorIpv6 || profile?.uorGlyph) && (
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
                        Identity Coordinates
                      </p>

                      {profile.uorGlyph && (
                        <IdentityRow
                          icon={<Fingerprint className="w-3.5 h-3.5" />}
                          label="Glyph"
                          value={profile.uorGlyph}
                          copied={copied}
                          onCopy={copyField}
                          fieldKey="glyph"
                        />
                      )}
                      {profile.uorCid && (
                        <IdentityRow
                          icon={<Globe className="w-3.5 h-3.5" />}
                          label="CID"
                          value={profile.uorCid}
                          copied={copied}
                          onCopy={copyField}
                          fieldKey="cid"
                          truncate
                        />
                      )}
                      {profile.uorIpv6 && (
                        <IdentityRow
                          icon={<Globe className="w-3.5 h-3.5" />}
                          label="IPv6"
                          value={profile.uorIpv6}
                          copied={copied}
                          onCopy={copyField}
                          fieldKey="ipv6"
                          truncate
                        />
                      )}
                      {profile.uorCanonicalId && (
                        <IdentityRow
                          icon={<ShieldCheck className="w-3.5 h-3.5" />}
                          label="Canonical"
                          value={profile.uorCanonicalId}
                          copied={copied}
                          onCopy={copyField}
                          fieldKey="canonical"
                          truncate
                        />
                      )}
                    </div>
                  )}

                  {/* Ceremony status */}
                  {profile?.ceremonyCid && (
                    <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.1] p-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400/60 shrink-0" />
                      <p className="text-xs text-emerald-400/70">Ceremony complete</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => { navigate("/identity"); onClose(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-sm text-foreground/70 hover:text-foreground/90 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Manage Identity
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg hover:bg-red-500/[0.06] border border-transparent hover:border-red-500/[0.1] text-sm text-muted-foreground/50 hover:text-red-400/80 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                /* ═══ Unauthenticated View ═══ */
                <div className="space-y-5">
                  <div className="text-center space-y-2 py-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-white/[0.08] flex items-center justify-center mb-4">
                      <Shield className="w-7 h-7 text-primary/60" />
                    </div>
                    <h3 className="text-base font-medium text-foreground/90">Claim Your Identity</h3>
                    <p className="text-xs text-muted-foreground/50 leading-relaxed max-w-[260px] mx-auto">
                      Your sovereign identity is derived from who you are — not assigned by a central authority.
                    </p>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      minLength={6}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-sm text-foreground/90 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-sm font-medium text-foreground/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? "…" : mode === "signin" ? "Sign In" : "Create Identity"}
                    </button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground/40">
                    {mode === "signin" ? (
                      <>
                        No identity yet?{" "}
                        <button onClick={() => setMode("signup")} className="text-primary/60 hover:text-primary/80 transition-colors">
                          Create one
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an identity?{" "}
                        <button onClick={() => setMode("signin")} className="text-primary/60 hover:text-primary/80 transition-colors">
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Identity row sub-component ── */
function IdentityRow({
  icon,
  label,
  value,
  copied,
  onCopy,
  fieldKey,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  fieldKey: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 group">
      <span className="text-muted-foreground/40 shrink-0">{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 w-16 shrink-0">{label}</span>
      <span className={`text-xs font-mono text-foreground/60 flex-1 min-w-0 ${truncate ? "truncate" : ""}`}>
        {value}
      </span>
      <button
        onClick={() => onCopy(value, fieldKey)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/30 hover:text-foreground/60 transition-all shrink-0"
      >
        {copied === fieldKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

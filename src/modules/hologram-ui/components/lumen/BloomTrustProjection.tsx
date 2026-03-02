/**
 * BloomTrustProjection — Compact trust network view in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Displays trust connections as a radial constellation with
 * trust level arcs. Tapping a node shows connection details.
 *
 * @module hologram-ui/components/lumen/BloomTrustProjection
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Star, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";
import BloomFAB from "./BloomFAB";
import type { FABAction } from "./BloomFAB";

interface TrustNode {
  id: string;
  displayName: string;
  glyph: string | null;
  trustLevel: number;
  status: string;
}

export default function BloomTrustProjection() {
  const [nodes, setNodes] = useState<TrustNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [searchHandle, setSearchHandle] = useState("");
  const [searchResults, setSearchResults] = useState<{ user_id: string; display_name: string; handle: string; uor_glyph: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (searchHandle.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase.rpc("search_profiles_by_handle", { search_handle: searchHandle.trim() });
    setSearchResults(data ?? []);
    setSearching(false);
  }, [searchHandle]);

  const sendRequest = useCallback(async (targetId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setSending(targetId);
    const attestation = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    await supabase.from("trust_connections").insert({
      requester_id: session.user.id,
      responder_id: targetId,
      requester_attestation: attestation,
      message: "Trust request from bloom",
    });
    setSending(null);
    setShowConnect(false);
    setSearchHandle("");
    setSearchResults([]);
  }, []);

  const fabActions: FABAction[] = useMemo(() => [
    { id: "new-connection", label: "New Connection", icon: UserPlus, onTap: () => setShowConnect(true) },
  ], []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) { setLoading(false); return; }

      const { data: connections } = await supabase
        .from("trust_connections")
        .select("id, responder_id, requester_id, trust_level, status")
        .or(`requester_id.eq.${session.user.id},responder_id.eq.${session.user.id}`)
        .limit(20);

      if (!connections || cancelled) { setLoading(false); return; }

      const peerIds = connections.map(c =>
        c.requester_id === session.user.id ? c.responder_id : c.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, uor_glyph")
        .in("user_id", peerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

      const mapped: TrustNode[] = connections.map(c => {
        const peerId = c.requester_id === session.user.id ? c.responder_id : c.requester_id;
        const profile = profileMap.get(peerId);
        return {
          id: c.id,
          displayName: profile?.display_name || "Unknown",
          glyph: profile?.uor_glyph ?? null,
          trustLevel: c.trust_level,
          status: c.status,
        };
      });

      if (!cancelled) { setNodes(mapped); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const avgTrust = useMemo(() => {
    if (!nodes.length) return 0;
    return nodes.reduce((s, n) => s + n.trustLevel, 0) / nodes.length;
  }, [nodes]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }}
        />
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <Users className="w-10 h-10" strokeWidth={0.8} style={{ color: PP.textWhisper, opacity: 0.3 }} />
        <p
          className="text-center leading-relaxed"
          style={{ fontFamily: PP.fontDisplay, fontSize: "18px", fontWeight: 300, color: PP.textSecondary }}
        >
          Your trust network is empty
        </p>
        <p
          className="text-center"
          style={{ fontFamily: PP.font, fontSize: "13px", color: PP.textWhisper, maxWidth: 240 }}
        >
          Connect with others through mutual attestation ceremonies to build your web of trust.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col overflow-y-auto px-4 py-3 gap-3">
      {/* Quick-connect sheet */}
      <AnimatePresence>
        {showConnect && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-xl p-3 space-y-2"
            style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: PP.textWhisper }} />
              <input
                value={searchHandle}
                onChange={e => setSearchHandle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search by handle…"
                autoFocus
                className="flex-1 bg-transparent outline-none"
                style={{ fontFamily: PP.font, fontSize: "13px", color: PP.text }}
              />
              <button
                onClick={handleSearch}
                className="px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
                style={{ background: `${PP.accent}15`, border: `1px solid ${PP.accent}20` }}
              >
                <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.accent }}>Find</span>
              </button>
              <button onClick={() => { setShowConnect(false); setSearchResults([]); setSearchHandle(""); }}>
                <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper }}>✕</span>
              </button>
            </div>
            {searching && (
              <div className="flex justify-center py-2">
                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }} />
              </div>
            )}
            {searchResults.map(r => (
              <div key={r.user_id} className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: `${PP.accent}06` }}>
                <span style={{ fontSize: "14px" }}>{r.uor_glyph || "◯"}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontFamily: PP.font, fontSize: "13px", color: PP.text }}>{r.display_name || r.handle}</p>
                  <p style={{ fontFamily: PP.font, fontSize: "10px", color: PP.textWhisper }}>@{r.handle}</p>
                </div>
                <button
                  onClick={() => sendRequest(r.user_id)}
                  disabled={sending === r.user_id}
                  className="px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
                  style={{ background: PP.accent, opacity: sending === r.user_id ? 0.5 : 1 }}
                >
                  <span style={{ fontFamily: PP.font, fontSize: "10px", fontWeight: 600, color: PP.canvas }}>
                    {sending === r.user_id ? "…" : "Connect"}
                  </span>
                </button>
              </div>
            ))}
            {!searching && searchResults.length === 0 && searchHandle.length >= 2 && (
              <p style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper, textAlign: "center", padding: "4px 0" }}>
                No results found
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary bar */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" strokeWidth={1.3} style={{ color: PP.accent }} />
          <span style={{ fontFamily: PP.font, fontSize: "13px", color: PP.text }}>
            {nodes.length} connection{nodes.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <Star
              key={s}
              className="w-3 h-3"
              strokeWidth={1.5}
              fill={s <= Math.round(avgTrust) ? PP.accent : "transparent"}
              style={{ color: s <= Math.round(avgTrust) ? PP.accent : PP.textWhisper, opacity: s <= Math.round(avgTrust) ? 0.9 : 0.3 }}
            />
          ))}
          <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper, marginLeft: 4 }}>
            avg
          </span>
        </div>
      </div>

      {/* Connection cards */}
      {nodes.map((node, i) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 36, height: 36,
              background: `${PP.accent}10`,
              border: `1px solid ${PP.accent}15`,
              fontSize: node.glyph ? "16px" : "12px",
              color: PP.accent,
              fontFamily: PP.font,
            }}
          >
            {node.glyph || node.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="truncate"
              style={{ fontFamily: PP.font, fontSize: "14px", color: PP.text, fontWeight: 400 }}
            >
              {node.displayName}
            </p>
            <p style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper }}>
              {node.status === "accepted" ? "Verified" : node.status}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                strokeWidth={1.5}
                fill={s <= node.trustLevel ? PP.accent : "transparent"}
                style={{ color: s <= node.trustLevel ? PP.accent : PP.textWhisper, opacity: s <= node.trustLevel ? 0.9 : 0.25 }}
              />
            ))}
          </div>
        </motion.div>
      ))}

      {/* FAB */}
      <BloomFAB actions={fabActions} />
    </div>
  );
}

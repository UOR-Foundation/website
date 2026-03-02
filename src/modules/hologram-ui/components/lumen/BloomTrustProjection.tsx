/**
 * BloomTrustProjection — Compact trust network view in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Displays trust connections as a radial constellation with
 * trust level arcs. Tapping a node shows connection details.
 *
 * @module hologram-ui/components/lumen/BloomTrustProjection
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP, GR } from "@/modules/hologram-ui/theme/portal-palette";

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
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-3 gap-3">
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
    </div>
  );
}

/**
 * TrustTimeline — Visual timeline of trust level evolution
 * ═══════════════════════════════════════════════════════════
 *
 * Shows historical trust level changes for all connections,
 * rendered as a vertical timeline with ceremony markers.
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { KP } from "@/modules/hologram-os/kernel-palette";
import { format } from "date-fns";

interface HistoryEntry {
  id: string;
  connection_id: string;
  previous_level: number;
  new_level: number;
  ceremony_cid: string | null;
  created_at: string;
  peer_name?: string | null;
  peer_glyph?: string | null;
}

interface TrustConnection {
  id: string;
  requester_id: string;
  responder_id: string;
  peer_name?: string | null;
  peer_glyph?: string | null;
}

interface TrustTimelineProps {
  connections: TrustConnection[];
}

export default function TrustTimeline({ connections }: TrustTimelineProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user || connections.length === 0) {
      setLoading(false);
      return;
    }

    const connIds = connections.map((c) => c.id);
    const { data, error } = await supabase
      .from("trust_level_history")
      .select("*")
      .in("connection_id", connIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const connMap = new Map(connections.map((c) => [c.id, c]));
      const enriched: HistoryEntry[] = data.map((h: any) => {
        const conn = connMap.get(h.connection_id);
        return {
          ...h,
          peer_name: conn?.peer_name ?? null,
          peer_glyph: conn?.peer_glyph ?? null,
        };
      });
      setHistory(enriched);
    }
    setLoading(false);
  }, [user, connections]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: KP.gold }} />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: `${KP.gold}10`, border: `1px solid ${KP.gold}15` }}
        >
          <TrendingUp className="w-6 h-6" style={{ color: KP.dim }} />
        </div>
        <p className="text-sm" style={{ color: KP.dim }}>
          No trust history yet
        </p>
        <p className="text-xs" style={{ color: KP.dimmer }}>
          Trust level changes will appear here as ceremonies occur
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div
        className="absolute left-[19px] top-3 bottom-3 w-px"
        style={{ background: `${KP.gold}20` }}
      />

      <div className="space-y-1">
        {history.map((entry, i) => {
          const isUpgrade = entry.new_level > entry.previous_level;
          const isInitial = entry.previous_level === 0;
          const levelDiff = entry.new_level - entry.previous_level;

          return (
            <div key={entry.id} className="relative flex items-start gap-3 pl-1 py-2">
              {/* Timeline dot */}
              <div
                className="relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-1"
                style={{
                  background: isInitial
                    ? `${KP.gold}20`
                    : isUpgrade
                    ? `${KP.gold}25`
                    : `hsl(0, 50%, 50%, 0.2)`,
                  border: `2px solid ${
                    isInitial ? KP.gold : isUpgrade ? KP.gold : "hsl(0, 50%, 50%)"
                  }`,
                }}
              >
                {isInitial ? (
                  <Shield className="w-2.5 h-2.5" style={{ color: KP.gold }} />
                ) : isUpgrade ? (
                  <Sparkles className="w-2.5 h-2.5" style={{ color: KP.gold }} />
                ) : (
                  <TrendingUp
                    className="w-2.5 h-2.5 rotate-180"
                    style={{ color: "hsl(0, 50%, 50%)" }}
                  />
                )}
              </div>

              {/* Content card */}
              <div
                className="flex-1 rounded-lg px-3.5 py-2.5"
                style={{
                  background: KP.card,
                  border: `1px solid ${KP.cardBorder}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Peer glyph */}
                    <span
                      className="text-sm shrink-0"
                      style={{ color: KP.gold }}
                    >
                      {entry.peer_glyph || entry.peer_name?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: KP.text }}
                    >
                      {entry.peer_name || "Unknown"}
                    </span>
                  </div>

                  {/* Trust level badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isInitial && (
                      <>
                        <span className="text-xs" style={{ color: KP.dim }}>
                          {"★".repeat(entry.previous_level)}
                        </span>
                        <span className="text-xs" style={{ color: KP.dim }}>
                          →
                        </span>
                      </>
                    )}
                    <span
                      className="text-xs font-semibold"
                      style={{ color: KP.gold }}
                    >
                      {"★".repeat(entry.new_level)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs mt-1" style={{ color: KP.muted }}>
                  {isInitial
                    ? "Trust ceremony completed — connection established"
                    : isUpgrade
                    ? `Trust renewed — upgraded ${levelDiff > 1 ? `${levelDiff} levels` : "1 level"}`
                    : `Trust level decreased by ${Math.abs(levelDiff)}`}
                </p>

                {/* Timestamp & ceremony CID */}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: KP.dimmer }}>
                    {format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
                  </span>
                  {entry.ceremony_cid && (
                    <span
                      className="text-[9px] font-mono truncate max-w-[120px]"
                      style={{ color: KP.dimmer }}
                      title={entry.ceremony_cid}
                    >
                      {entry.ceremony_cid.slice(0, 16)}…
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ConnectivityPopover — Lightweight system status popover
 * triggered by clicking the Wifi icon in the menu bar.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Database, Brain, Globe, Mic, Shield, RefreshCw } from "lucide-react";
import { useConnectivity, type FeatureId } from "@/modules/desktop/hooks/useConnectivity";
import { localGraphStore } from "@/modules/knowledge-graph/local-store";

interface Props {
  open: boolean;
  onClose: () => void;
  isLight: boolean;
}

const FEATURE_META: { id: FeatureId; label: string; icon: typeof Wifi }[] = [
  { id: "oracle",    label: "Oracle AI",       icon: Brain },
  { id: "kgSync",    label: "Graph Sync",      icon: RefreshCw },
  { id: "dataBank",  label: "Data Bank",       icon: Database },
  { id: "webBridge", label: "Web Bridge",      icon: Globe },
  { id: "voice",     label: "Voice Input",     icon: Mic },
  { id: "auth",      label: "Authentication",  icon: Shield },
];

export default function ConnectivityPopover({ open, onClose, isLight }: Props) {
  const conn = useConnectivity();
  const ref = useRef<HTMLDivElement>(null);
  const [kgStats, setKgStats] = useState<{ nodes: number; edges: number } | null>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Load KG stats
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const stats = await localGraphStore.getStats();
        setKgStats({ nodes: stats.nodeCount, edges: stats.edgeCount });
      } catch { setKgStats(null); }
    })();
  }, [open]);

  const bg = isLight ? "bg-white/95" : "bg-[hsl(220_10%_10%/0.95)]";
  const border = isLight ? "border-black/[0.08]" : "border-white/[0.08]";
  const textPrimary = isLight ? "text-black/80" : "text-white/85";
  const textSecondary = isLight ? "text-black/45" : "text-white/45";

  const timeSince = conn.lastSyncedAt
    ? formatTimeAgo(conn.lastSyncedAt)
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className={`absolute top-8 right-0 z-[300] w-64 rounded-xl ${bg} ${border} border shadow-xl backdrop-blur-2xl overflow-hidden`}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b ${border} flex items-center gap-2.5`}>
            <div className="relative">
              {conn.online
                ? <Wifi className={`w-4 h-4 ${textSecondary}`} />
                : <WifiOff className={`w-4 h-4 ${isLight ? "text-red-500/70" : "text-red-400/70"}`} />
              }
              <span className={`absolute -top-0.5 -right-0.5 w-[5px] h-[5px] rounded-full ${
                conn.online
                  ? "bg-emerald-500 shadow-[0_0_4px_1px_rgba(16,185,129,0.4)]"
                  : "bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.4)]"
              }`} />
            </div>
            <div className="flex-1">
              <p className={`text-xs font-semibold ${textPrimary}`}>
                {conn.online ? "All Systems Operational" : "Offline Mode"}
              </p>
              {!conn.online && (
                <p className={`text-[10px] ${textSecondary} mt-0.5`}>
                  Local data fully available
                </p>
              )}
            </div>
          </div>

          {/* Feature list */}
          <div className="px-3 py-2 space-y-0.5">
            {FEATURE_META.map(({ id, label, icon: Icon }) => {
              const feat = conn.features[id];
              const dotColor = feat.available
                ? feat.localOnly
                  ? "bg-amber-400"
                  : "bg-emerald-500"
                : "bg-white/20";
              return (
                <div key={id} className={`flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg`}>
                  <Icon className={`w-3.5 h-3.5 ${textSecondary}`} />
                  <span className={`flex-1 text-[11px] font-medium ${textPrimary}`}>{label}</span>
                  <div className="flex items-center gap-1.5">
                    {!feat.available && (
                      <span className={`text-[9px] ${textSecondary}`}>offline</span>
                    )}
                    {feat.localOnly && feat.available && (
                      <span className={`text-[9px] ${textSecondary}`}>local</span>
                    )}
                    <span className={`w-[6px] h-[6px] rounded-full ${dotColor}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: KG stats + last sync */}
          <div className={`px-4 py-2.5 border-t ${border}`}>
            {kgStats && (
              <p className={`text-[10px] ${textSecondary}`}>
                Knowledge Graph: {kgStats.nodes.toLocaleString()} nodes · {kgStats.edges.toLocaleString()} edges
              </p>
            )}
            {timeSince && (
              <p className={`text-[10px] ${textSecondary} mt-0.5`}>
                Last synced: {timeSince}
              </p>
            )}
            {conn.pendingSync && (
              <p className={`text-[10px] text-amber-400/70 mt-0.5`}>
                Pending changes will sync when online
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

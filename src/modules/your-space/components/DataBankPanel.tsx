/**
 * DataBankPanel — Settings panel for the Data Bank Box
 * ═════════════════════════════════════════════════════
 *
 * Shows all stored slots, compression stats, sync controls,
 * and encrypted data export. Uses semantic design tokens.
 *
 * @module your-space/components/DataBankPanel
 */

import { useState, useEffect, useCallback } from "react";
import {
  DatabaseZap, RefreshCw, Download, Trash2, Loader2,
  Check, AlertTriangle, Lock, HardDrive, Archive,
} from "lucide-react";
import { useDataBank } from "@/modules/data-bank";
import { supabase } from "@/integrations/supabase/client";

interface SlotInfo {
  key: string;
  cid: string;
  byteLength: number;
  version: number;
  updatedAt: string;
}

interface DataBankPanelProps {
  isDark: boolean;
}

export const DataBankPanel = ({ isDark }: DataBankPanelProps) => {
  const { authenticated, syncing, status, sync } = useDataBank();
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [totalBytes, setTotalBytes] = useState(0);

  const fetchSlots = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("user_data_bank")
        .select("slot_key, cid, byte_length, version, updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (data) {
        setSlots(data.map(d => ({
          key: d.slot_key,
          cid: d.cid,
          byteLength: d.byte_length,
          version: d.version,
          updatedAt: d.updated_at,
        })));
        setTotalBytes(data.reduce((sum, d) => sum + d.byte_length, 0));
      }
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleSync = useCallback(async () => {
    await sync();
    await fetchSlots();
  }, [sync, fetchSlots]);

  const handleExport = useCallback(async () => {
    if (!authenticated) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data } = await supabase
        .from("user_data_bank")
        .select("slot_key, cid, encrypted_blob, iv, byte_length, version, updated_at")
        .eq("user_id", session.user.id);

      if (!data) return;

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        userId: session.user.id,
        format: "data-bank-export-v1",
        encryption: "AES-256-GCM",
        note: "All blobs remain encrypted. You need your account key to decrypt.",
        slots: data.map(d => ({
          key: d.slot_key,
          cid: d.cid,
          iv: d.iv,
          encryptedBlob: d.encrypted_blob,
          byteLength: d.byte_length,
          version: d.version,
          updatedAt: d.updated_at,
        })),
      };

      const blob = new Blob(
        [JSON.stringify(exportPayload, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-bank-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <p className="text-muted-foreground text-sm font-body">
          Sign in to access your encrypted Data Bank.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary Stats ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          icon={<HardDrive className="w-3.5 h-3.5" />}
          label="Slots"
          value={`${status.slotCount}`}
        />
        <StatBox
          icon={<Archive className="w-3.5 h-3.5" />}
          label="Size"
          value={formatBytes(totalBytes)}
        />
        <StatBox
          icon={<Lock className="w-3.5 h-3.5" />}
          label="Cipher"
          value="AES-256"
        />
      </div>

      {/* ── Sync Status Bar ─────────────────────────── */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: status.pendingWrites > 0
                ? "hsl(30, 80%, 55%)"
                : "hsl(152, 50%, 50%)",
            }}
          />
          <span className="text-xs text-muted-foreground font-body">
            {syncing
              ? "Syncing…"
              : status.pendingWrites > 0
                ? `${status.pendingWrites} pending write${status.pendingWrites > 1 ? "s" : ""}`
                : "All synced"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {status.lastSyncAt ? timeSince(status.lastSyncAt) : "Never"}
        </span>
      </div>

      {/* ── Slot List ───────────────────────────────── */}
      <div>
        <h4 className="text-foreground font-body text-sm font-semibold mb-2">
          Stored Slots
        </h4>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : slots.length === 0 ? (
          <p className="text-muted-foreground text-xs font-body italic py-2">
            No slots stored yet.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {slots.map((slot) => (
              <div
                key={slot.key}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-xs font-body font-medium truncate">
                    {slot.key}
                  </p>
                  <p className="text-muted-foreground text-[10px] font-mono truncate">
                    {slot.cid.slice(0, 16)}… · v{slot.version} · {formatBytes(slot.byteLength)}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                  {timeSince(slot.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors disabled:opacity-50 font-body"
        >
          {syncing
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />
          }
          {syncing ? "Syncing…" : "Full Sync"}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting || slots.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors disabled:opacity-50 font-body"
        >
          {exporting
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Download className="w-3 h-3" />
          }
          Export
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
        All data is encrypted client-side with AES-256-GCM before leaving your device.
        Exports contain ciphertext only — your key never leaves the browser.
      </p>
    </div>
  );
};

/* ── Helpers ────────────────────────────────────────────── */

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-muted/50 border border-border">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-foreground text-sm font-body font-semibold">{value}</span>
      <span className="text-muted-foreground text-[10px] font-body">{label}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

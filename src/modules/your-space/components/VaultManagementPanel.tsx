/**
 * VaultManagementPanel — Full CRUD for encrypted vault slots
 * ═══════════════════════════════════════════════════════════
 *
 * Read, write, delete, and export encrypted user_data_bank slots.
 * All encryption is AES-256-GCM client-side — the server only sees ciphertext.
 *
 * Visual indicators: slot count, encryption status, total storage used.
 *
 * @module your-space/components/VaultManagementPanel
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock, HardDrive, Archive, Plus, Download, Trash2,
  Eye, EyeOff, Loader2, AlertTriangle, Check, RefreshCw,
  FileText, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────

interface SlotRow {
  id: string;
  slot_key: string;
  cid: string;
  iv: string;
  encrypted_blob: string;
  byte_length: number;
  version: number;
  updated_at: string;
}

// ── Encryption helpers (AES-256-GCM / HKDF) ──────────────

async function deriveKey(userId: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(userId);
  const material = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("uor-vault-v1"), info: new TextEncoder().encode("vault-slots") },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptSlot(key: CryptoKey, plaintext: string): Promise<{ blob: string; iv: string; byteLen: number }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, encoded.buffer as ArrayBuffer);
  const cipherBytes = new Uint8Array(cipher);
  let binary = "";
  for (const b of cipherBytes) binary += String.fromCharCode(b);
  return {
    blob: btoa(binary),
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join(""),
    byteLen: cipherBytes.byteLength,
  };
}

async function decryptSlot(key: CryptoKey, blob: string, ivHex: string): Promise<string> {
  const binaryStr = atob(blob);
  const cipherBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) cipherBytes[i] = binaryStr.charCodeAt(i);
  const iv = new Uint8Array(ivHex.length / 2);
  for (let i = 0; i < ivHex.length; i += 2) iv[i / 2] = parseInt(ivHex.substring(i, i + 2), 16);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, key, cipherBytes.buffer as ArrayBuffer);
  return new TextDecoder().decode(plain);
}

async function sha256hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Component ─────────────────────────────────────────────

export const VaultManagementPanel = () => {
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [totalBytes, setTotalBytes] = useState(0);

  // New slot form
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Read / preview
  const [previewSlot, setPreviewSlot] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // ── Init ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);
      const key = await deriveKey(session.user.id);
      setCryptoKey(key);
    })();
  }, []);

  // ── Fetch slots ──
  const fetchSlots = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_data_bank")
      .select("id, slot_key, cid, iv, encrypted_blob, byte_length, version, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data) {
      setSlots(data as SlotRow[]);
      setTotalBytes(data.reduce((s, d) => s + d.byte_length, 0));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (userId) fetchSlots(); }, [userId, fetchSlots]);

  // ── Write ──
  const handleWrite = useCallback(async () => {
    if (!cryptoKey || !userId || !newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const { blob, iv, byteLen } = await encryptSlot(cryptoKey, newValue);
      const cid = await sha256hex(new TextEncoder().encode(blob));

      // Check if slot already exists
      const existing = slots.find(s => s.slot_key === newKey.trim());
      if (existing) {
        await supabase.from("user_data_bank").update({
          encrypted_blob: blob,
          iv,
          cid,
          byte_length: byteLen,
          version: existing.version + 1,
        }).eq("id", existing.id);
      } else {
        await supabase.from("user_data_bank").insert({
          user_id: userId,
          slot_key: newKey.trim(),
          encrypted_blob: blob,
          iv,
          cid,
          byte_length: byteLen,
          version: 1,
        });
      }
      setNewKey("");
      setNewValue("");
      setShowForm(false);
      await fetchSlots();
    } finally {
      setSaving(false);
    }
  }, [cryptoKey, userId, newKey, newValue, slots, fetchSlots]);

  // ── Read / decrypt preview ──
  const handlePreview = useCallback(async (slot: SlotRow) => {
    if (!cryptoKey) return;
    if (previewSlot === slot.slot_key) {
      setPreviewSlot(null);
      setPreviewText(null);
      return;
    }
    setDecrypting(true);
    setPreviewSlot(slot.slot_key);
    try {
      const text = await decryptSlot(cryptoKey, slot.encrypted_blob, slot.iv);
      setPreviewText(text);
    } catch {
      setPreviewText("[Decryption failed]");
    } finally {
      setDecrypting(false);
    }
  }, [cryptoKey, previewSlot]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string) => {
    await supabase.from("user_data_bank").delete().eq("id", id);
    setPreviewSlot(null);
    setPreviewText(null);
    await fetchSlots();
  }, [fetchSlots]);

  // ── Export ──
  const handleExport = useCallback(async () => {
    if (!userId || slots.length === 0) return;
    setExporting(true);
    try {
      const bundle = {
        format: "uor-vault-export-v1",
        exportedAt: new Date().toISOString(),
        encryption: "AES-256-GCM",
        slotCount: slots.length,
        totalBytes,
        note: "All blobs remain encrypted. You need your account to decrypt.",
        slots: slots.map(s => ({
          key: s.slot_key,
          cid: s.cid,
          iv: s.iv,
          encryptedBlob: s.encrypted_blob,
          byteLength: s.byte_length,
          version: s.version,
        })),
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [userId, slots, totalBytes]);

  // ── Not authed ──
  if (!userId && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
        <p className="text-muted-foreground text-sm font-body">Sign in to access your vault.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary Stats ────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox icon={<HardDrive className="w-3.5 h-3.5" />} label="Slots" value={`${slots.length}`} />
        <StatBox icon={<Archive className="w-3.5 h-3.5" />} label="Storage" value={formatBytes(totalBytes)} />
        <StatBox
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="Status"
          value={cryptoKey ? "Encrypted" : "Locked"}
          highlight={!!cryptoKey}
        />
      </div>

      {/* ── Slot List ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-foreground font-body text-sm font-semibold">Vault Slots</h4>
          <div className="flex gap-1.5">
            <button
              onClick={() => fetchSlots()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="New slot"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : slots.length === 0 && !showForm ? (
          <div className="text-center py-6">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-xs font-body">
              No vault slots yet. Click <Plus className="w-3 h-3 inline" /> to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {slots.map((slot) => (
              <div key={slot.id}>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-foreground text-xs font-body font-medium truncate">{slot.slot_key}</p>
                    </div>
                    <p className="text-muted-foreground text-[10px] font-mono truncate ml-5.5">
                      v{slot.version} · {formatBytes(slot.byte_length)} · {timeSince(slot.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => handlePreview(slot)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title={previewSlot === slot.slot_key ? "Hide" : "Decrypt & preview"}
                    >
                      {previewSlot === slot.slot_key ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Decrypt preview */}
                <AnimatePresence>
                  {previewSlot === slot.slot_key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-2 mt-1 p-3 rounded-lg bg-muted/50 border border-border">
                        {decrypting ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Decrypting…
                          </div>
                        ) : (
                          <pre className="text-xs text-foreground font-mono whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
                            {previewText}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New Slot Form ────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <h4 className="text-foreground text-sm font-body font-semibold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" />
                New Vault Slot
              </h4>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Slot name (e.g. contacts, notes)"
                className="w-full bg-background border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Data to encrypt…"
                rows={3}
                className="w-full bg-background border border-border text-foreground rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleWrite}
                  disabled={saving || !newKey.trim() || !newValue.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-body font-medium transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {saving ? "Encrypting…" : "Encrypt & Save"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewKey(""); setNewValue(""); }}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground font-body">
                Data is encrypted with AES-256-GCM on your device before saving.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ──────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exporting || slots.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-foreground transition-colors disabled:opacity-50 font-body"
        >
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          {exporting ? "Exporting…" : "Export Vault"}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground font-body leading-relaxed">
        All data is encrypted client-side with AES-256-GCM before leaving your device.
        Exports contain ciphertext only — your key never leaves the browser.
      </p>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────

function StatBox({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-muted/50 border border-border">
      <div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div>
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

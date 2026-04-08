/**
 * Identity Hub — Share this address in any format.
 *
 * Shows the primary address (IPv6 + triword), with a button
 * that opens a full-screen overlay to browse all available
 * identity formats — all deterministically linked to the same object.
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ChevronRight, X, Search, Share2 } from "lucide-react";
import { toast } from "sonner";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import type { ProjectionInput, Hologram, HologramProjection } from "@/modules/uns/core/hologram";
import type { EnrichedReceipt } from "@/modules/oracle/lib/receipt-registry";

// ── Category definitions with human-friendly descriptions ──────────────────

interface Category {
  label: string;
  description: string;
  icon: string;
  keys: string[];
}

/** The 12 curated formats — the most valuable and interesting ones */
const CURATED_KEYS = [
  "cid",          // IPFS Content ID — the gold standard
  "did",          // Decentralized ID — W3C standard
  "glyph",        // Braille — visual, playful
  "emoji",        // Emoji — fun, shareable
  "ipv6",         // IPv6 — routing, practical
  "jsonld",       // JSON-LD — semantic web
  "nostr",        // Nostr — decentralized social
  "atproto",      // Bluesky — social federation
  "bitcoin",      // Bitcoin — on-chain anchor
  "lightning",    // Lightning — instant payments
  "webfinger",    // WebFinger — email-style sharing
  "vc",           // Verifiable Credential — trust
] as const;

const CATEGORIES: Category[] = [
  {
    label: "Core Identifiers",
    description: "The foundational addresses used across the web",
    icon: "🏛",
    keys: ["cid", "jsonld", "did", "vc"],
  },
  {
    label: "Visual & Playful",
    description: "Visual and compact ways to represent this address",
    icon: "🔮",
    keys: ["ipv6", "glyph", "emoji"],
  },
  {
    label: "Social & Sharing",
    description: "Share across social networks and federated platforms",
    icon: "🌐",
    keys: ["webfinger", "atproto", "nostr"],
  },
  {
    label: "Value & Trust",
    description: "Anchored on-chain for permanent, verifiable proof",
    icon: "⛓",
    keys: ["bitcoin", "lightning"],
  },
];

// ── Friendly display names ─────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  cid: "IPFS Content ID",
  jsonld: "JSON-LD Identifier",
  did: "Decentralized ID",
  vc: "Verifiable Credential",
  ipv6: "IPv6 Address",
  glyph: "Braille Glyph",
  emoji: "Emoji Shorthand",
  webfinger: "WebFinger",
  activitypub: "ActivityPub (Mastodon, etc.)",
  atproto: "AT Protocol (Bluesky)",
  oidc: "OpenID Connect",
  gs1: "GS1 Digital Link",
  oci: "Container Image Digest",
  solid: "Solid WebID",
  openbadges: "Open Badges",
  scitt: "Supply Chain Transparency",
  mls: "Messaging Layer Security",
  dnssd: "DNS Service Discovery",
  stac: "Geospatial Catalog",
  croissant: "ML Dataset",
  crdt: "Sync-friendly (CRDT)",
  bitcoin: "Bitcoin (OP_RETURN)",
  "bitcoin-hashlock": "Bitcoin Hash Lock",
  lightning: "Lightning Invoice",
  "zcash-transparent": "Zcash Address",
  "zcash-memo": "Zcash Memo Field",
  nostr: "Nostr Event ID",
  "nostr-note": "Nostr Note",
  erc8004: "ERC-8004 Agent ID",
  x402: "x402 Payment Header",
  "mcp-tool": "MCP Tool Binding",
  "mcp-context": "MCP Context",
  "skill-md": "Skill Manifest",
  a2a: "Agent-to-Agent Card",
  "a2a-task": "Agent Task",
  oasf: "Open Agent Service",
  onnx: "ONNX Model",
  "onnx-op": "ONNX Operator",
};

const FIDELITY_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  lossless: { label: "Exact", color: "bg-emerald-400/70", desc: "Contains the full original identity — nothing lost" },
  lossy: { label: "Compact", color: "bg-amber-400/70", desc: "Shortened to fit this format — still uniquely linked" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function truncate(value: string, max = 42): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}

// ── Component ──────────────────────────────────────────────────────────────

interface IdentityHubProps {
  receipt: EnrichedReceipt;
}

export default function IdentityHub({ receipt }: IdentityHubProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hologram = useMemo<Hologram | null>(() => {
    try {
      const hashBytes = hexToBytes(receipt.hashHex);
      const input: ProjectionInput = { hashBytes, cid: receipt.cid, hex: receipt.hashHex };
      return project(input);
    } catch {
      return null;
    }
  }, [receipt.hashHex, receipt.cid]);

  const copyValue = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast("Copied to clipboard", { icon: "📋", duration: 1500 });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const totalProjections = hologram ? Object.keys(hologram.projections).length : 0;

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (overlayOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [overlayOpen]);

  // ESC to close
  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOverlayOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  // Show only curated formats count
  const curatedCount = hologram ? CURATED_KEYS.filter(k => hologram.projections[k]).length : 0;

  return (
    <>
      {/* ── Compact format preview row ── */}
      <button
        onClick={() => setOverlayOpen(true)}
        className="w-full flex items-center gap-3 rounded-xl border border-border/12 bg-muted/5 hover:bg-muted/10 hover:border-border/20 transition-all px-4 py-3 group text-left"
      >
        <Share2 className="w-4 h-4 text-primary/50 shrink-0" />
        <span className="text-sm text-foreground/60 font-medium">Share this address</span>
        <span className="text-xs text-muted-foreground/35 font-mono">{curatedCount} formats</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/50 ml-auto transition-colors" />
      </button>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ═══ FULL-SCREEN FORMAT EXPLORER OVERLAY ═══ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {overlayOpen && hologram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
          >
            {/* ── Overlay Header ── */}
            <div className="shrink-0 border-b border-border/10">
              <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                   <h2 className="text-lg font-display font-semibold text-foreground tracking-wide">
                     Share This Address
                   </h2>
                   <p className="text-sm text-muted-foreground/50 mt-0.5">
                     One object, {curatedCount} ways to share it — every format points to the same thing
                   </p>
                </div>

                {/* Search */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter formats…"
                    className="bg-muted/10 border border-border/15 rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-primary/25 w-56"
                    autoFocus
                  />
                </div>

                <button
                  onClick={() => setOverlayOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted/15 text-muted-foreground/50 hover:text-foreground transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Source identity ── */}
            <div className="shrink-0 border-b border-border/5">
              <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/35 font-semibold">Source</span>
                <code className="text-sm font-mono text-primary/70 truncate">{receipt.ipv6}</code>
                <span className="text-muted-foreground/20">·</span>
                <span className="text-sm italic text-muted-foreground/40 truncate">{receipt.triwordFormatted || receipt.triword}</span>
              </div>
            </div>

            {/* ── Scrollable format gallery ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

                {/* Legend */}
                <div className="flex items-center gap-6 text-xs text-muted-foreground/40">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400/70" />
                    Exact — full identity preserved
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400/70" />
                    Compact — shortened to fit, still uniquely linked
                  </span>
                </div>

                {CATEGORIES.map((cat) => {
                  const entries = cat.keys
                    .filter((k) => hologram.projections[k])
                    .map((k) => ({ key: k, projection: hologram.projections[k] }));

                  // Apply search filter
                  const filtered = searchQuery
                    ? entries.filter(({ key }) => {
                        const name = (DISPLAY_NAMES[key] || key).toLowerCase();
                        const q = searchQuery.toLowerCase();
                        return name.includes(q) || key.includes(q) || cat.label.toLowerCase().includes(q);
                      })
                    : entries;

                  if (filtered.length === 0) return null;

                  return (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Category header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground/80">{cat.label}</h3>
                          <p className="text-xs text-muted-foreground/40">{cat.description}</p>
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground/25 font-mono">{filtered.length} format{filtered.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Format cards — responsive grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filtered.map(({ key, projection }) => (
                          <FormatCard
                            key={key}
                            name={DISPLAY_NAMES[key] || key}
                            projectionKey={key}
                            projection={projection}
                            onCopy={() => copyValue(projection.value, key)}
                            copied={copiedKey === key}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Uncategorized */}
                {(() => {
                  const categorized = new Set(CATEGORIES.flatMap((c) => c.keys));
                  let uncategorized = Object.entries(hologram.projections).filter(([k]) => !categorized.has(k));
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    uncategorized = uncategorized.filter(([k]) => {
                      const name = (DISPLAY_NAMES[k] || k).toLowerCase();
                      return name.includes(q) || k.includes(q);
                    });
                  }
                  if (uncategorized.length === 0) return null;
                  return (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">📡</span>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground/80">Other Formats</h3>
                          <p className="text-xs text-muted-foreground/40">Additional protocol representations</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {uncategorized.map(([key, projection]) => (
                          <FormatCard
                            key={key}
                            name={DISPLAY_NAMES[key] || key}
                            projectionKey={key}
                            projection={projection}
                            onCopy={() => copyValue(projection.value, key)}
                            copied={copiedKey === key}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Footer */}
                <div className="pt-6 pb-4 border-t border-border/10">
                  <p className="text-sm text-muted-foreground/35 text-center leading-relaxed">
                    Every format above is derived from the same underlying content.
                    <br />
                    Same data → same identity → different expression.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Format Card (used in overlay) ──────────────────────────────────────────

function FormatCard({
  name,
  projectionKey,
  projection,
  onCopy,
  copied,
}: {
  name: string;
  projectionKey: string;
  projection: HologramProjection;
  onCopy: () => void;
  copied: boolean;
}) {
  const fidelity = FIDELITY_LABELS[projection.fidelity] || FIDELITY_LABELS.lossy;

  return (
    <div className="group rounded-xl border border-border/10 bg-muted/[0.03] hover:bg-muted/[0.08] hover:border-border/20 transition-all p-4 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${fidelity.color}`} title={fidelity.desc} />
          <span className="text-sm font-medium text-foreground/75 truncate">{name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground/30 font-mono">{projectionKey}</span>
          <button
            onClick={onCopy}
            className="p-1.5 rounded-md hover:bg-muted/20 transition-colors"
            title="Copy this format"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* Value */}
      <code className="block text-[13px] font-mono text-foreground/50 break-all leading-relaxed select-all">
        {truncate(projection.value, 120)}
      </code>
    </div>
  );
}

// ── Copy Button (compact, for the sidebar card) ────────────────────────────

function CopyBtn({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded-md hover:bg-muted/20 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
      )}
    </button>
  );
}

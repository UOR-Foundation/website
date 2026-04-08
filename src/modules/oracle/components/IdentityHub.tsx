/**
 * Identity Hub — Holographic Address Projections
 *
 * Anchors on IPv6 as primary identity, then lets users explore
 * all canonical projections of the same identity across protocols.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import type { ProjectionInput, Hologram, HologramProjection } from "@/modules/uns/core/hologram";
import type { EnrichedReceipt } from "@/modules/oracle/lib/receipt-registry";

// ── Category definitions ───────────────────────────────────────────────────

interface Category {
  label: string;
  icon: string;
  keys: string[];
}

const CATEGORIES: Category[] = [
  {
    label: "Foundational",
    icon: "🏛",
    keys: ["cid", "jsonld", "did", "vc"],
  },
  {
    label: "Native",
    icon: "🔮",
    keys: ["ipv6", "glyph", "emoji"],
  },
  {
    label: "Federation",
    icon: "🌐",
    keys: ["webfinger", "activitypub", "atproto"],
  },
  {
    label: "Enterprise",
    icon: "🏢",
    keys: ["oidc", "gs1", "oci", "solid", "openbadges"],
  },
  {
    label: "Infrastructure",
    icon: "⚙️",
    keys: ["scitt", "mls", "dnssd", "stac", "croissant", "crdt"],
  },
  {
    label: "Blockchain",
    icon: "⛓",
    keys: ["bitcoin", "bitcoin-hashlock", "lightning", "zcash-transparent", "zcash-memo", "nostr", "nostr-note"],
  },
  {
    label: "Agentic AI",
    icon: "🤖",
    keys: ["erc8004", "x402", "mcp-tool", "mcp-context", "skill-md", "a2a", "a2a-task", "oasf", "onnx", "onnx-op"],
  },
];

// ── Friendly display names ─────────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  cid: "IPFS CID",
  jsonld: "JSON-LD URN",
  did: "DID",
  vc: "Verifiable Credential",
  ipv6: "IPv6 ULA",
  glyph: "Braille Glyph",
  emoji: "Emoji",
  webfinger: "WebFinger",
  activitypub: "ActivityPub",
  atproto: "AT Protocol",
  oidc: "OpenID Connect",
  gs1: "GS1 Digital Link",
  oci: "OCI Digest",
  solid: "Solid WebID",
  openbadges: "Open Badges",
  scitt: "SCITT",
  mls: "MLS Group",
  dnssd: "DNS-SD",
  stac: "STAC",
  croissant: "Croissant",
  crdt: "CRDT / Automerge",
  bitcoin: "Bitcoin OP_RETURN",
  "bitcoin-hashlock": "Bitcoin Hash Lock",
  lightning: "Lightning BOLT-11",
  "zcash-transparent": "Zcash Transparent",
  "zcash-memo": "Zcash Memo",
  nostr: "Nostr Event ID",
  "nostr-note": "Nostr note1…",
  erc8004: "ERC-8004 Agent",
  x402: "x402 Payment",
  "mcp-tool": "MCP Tool",
  "mcp-context": "MCP Context",
  "skill-md": "Skill.md",
  a2a: "A2A Agent",
  "a2a-task": "A2A Task",
  oasf: "OASF Service",
  onnx: "ONNX Model",
  "onnx-op": "ONNX Operator",
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
  const [expanded, setExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const hologram = useMemo<Hologram | null>(() => {
    try {
      const hashBytes = hexToBytes(receipt.hashHex);
      const input: ProjectionInput = {
        hashBytes,
        cid: receipt.cid,
        hex: receipt.hashHex,
      };
      return project(input);
    } catch {
      return null;
    }
  }, [receipt.hashHex, receipt.cid]);

  const copyValue = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast("Copied", { icon: "📋", duration: 1500 });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Count available projections
  const totalProjections = hologram ? Object.keys(hologram.projections).length : 0;

  return (
    <div>
      {/* ── Section Label ── */}
      <p className="text-xs font-semibold text-primary/60 uppercase tracking-[0.15em] mb-3">
        Identity
      </p>

      {/* ── Primary Identity: IPv6 Hero ── */}
      <div className="rounded-xl border border-border/15 bg-muted/5 overflow-hidden">
        {/* IPv6 — Hero */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold">
              IPv6 Address
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70"
              title="Lossy — 80-bit truncation of 256-bit hash (routing projection)"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <code className="text-[16px] font-mono text-primary tracking-wide flex-1 truncate">
              {receipt.ipv6}
            </code>
            <CopyBtn
              onClick={() => copyValue(receipt.ipv6, "ipv6-hero")}
              copied={copiedKey === "ipv6-hero"}
            />
          </div>
        </div>

        {/* Triword — Alias */}
        <div className="px-5 pb-4 -mt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm italic text-muted-foreground/50 flex-1 truncate">
              {receipt.triwordFormatted || receipt.triword}
            </span>
            <CopyBtn
              onClick={() => copyValue(receipt.triword, "triword-hero")}
              copied={copiedKey === "triword-hero"}
            />
          </div>
        </div>

        {/* ── Expand toggle ── */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 border-t border-border/10 text-xs font-medium text-primary/60 hover:text-primary/80 hover:bg-muted/10 transition-all"
        >
          <span>
            {expanded
              ? "Hide formats"
              : `Express in ${totalProjections} other formats`}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* ── Projection Gallery ── */}
        <AnimatePresence>
          {expanded && hologram && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/10">
                {CATEGORIES.map((cat) => {
                  const entries = cat.keys
                    .filter((k) => hologram.projections[k])
                    .map((k) => ({
                      key: k,
                      projection: hologram.projections[k],
                    }));
                  if (entries.length === 0) return null;

                  return (
                    <div key={cat.label}>
                      {/* Category header */}
                      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-primary/40 font-semibold">
                          {cat.label}
                        </span>
                      </div>

                      {/* Projection rows */}
                      {entries.map(({ key, projection }, i) => (
                        <ProjectionRow
                          key={key}
                          name={DISPLAY_NAMES[key] || key}
                          projection={projection}
                          onCopy={() => copyValue(projection.value, key)}
                          copied={copiedKey === key}
                          even={i % 2 === 0}
                        />
                      ))}
                    </div>
                  );
                })}

                {/* Uncategorized projections */}
                {(() => {
                  const categorized = new Set(CATEGORIES.flatMap((c) => c.keys));
                  const uncategorized = Object.entries(hologram.projections).filter(
                    ([k]) => !categorized.has(k)
                  );
                  if (uncategorized.length === 0) return null;
                  return (
                    <div>
                      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                        <span className="text-sm">📡</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-primary/40 font-semibold">
                          Other
                        </span>
                      </div>
                      {uncategorized.map(([key, projection], i) => (
                        <ProjectionRow
                          key={key}
                          name={DISPLAY_NAMES[key] || key}
                          projection={projection}
                          onCopy={() => copyValue(projection.value, key)}
                          copied={copiedKey === key}
                          even={i % 2 === 0}
                        />
                      ))}
                    </div>
                  );
                })()}

                {/* Footer note */}
                <div className="px-5 py-3 border-t border-border/10">
                  <p className="text-[11px] text-muted-foreground/35 italic">
                    Every format above is a deterministic projection of the same canonical SHA-256 identity.
                    <span className="inline-flex items-center gap-1 ml-2 not-italic">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/70" /> lossless
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/70 ml-1" /> lossy
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Projection Row ─────────────────────────────────────────────────────────

function ProjectionRow({
  name,
  projection,
  onCopy,
  copied,
  even,
}: {
  name: string;
  projection: HologramProjection;
  onCopy: () => void;
  copied: boolean;
  even: boolean;
}) {
  const isLossless = projection.fidelity === "lossless";

  return (
    <div
      className={`flex items-center gap-3 px-5 py-2.5 ${even ? "bg-muted/[0.03]" : ""} hover:bg-muted/[0.08] transition-colors group`}
    >
      {/* Fidelity dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLossless ? "bg-emerald-400/70" : "bg-amber-400/70"}`}
        title={
          isLossless
            ? "Lossless — full 256-bit identity preserved"
            : projection.lossWarning || "Lossy — truncated projection"
        }
      />

      {/* Name */}
      <span className="text-xs text-foreground/50 font-medium w-28 shrink-0 truncate">
        {name}
      </span>

      {/* Value */}
      <code className="text-[13px] font-mono text-foreground/55 flex-1 truncate">
        {truncate(projection.value, 52)}
      </code>

      {/* Copy */}
      <CopyBtn onClick={onCopy} copied={copied} />
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────────────────────────

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

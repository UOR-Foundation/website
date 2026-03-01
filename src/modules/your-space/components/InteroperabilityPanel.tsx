/**
 * InteroperabilityPanel — Universal Projection Configuration
 * ══════════════════════════════════════════════════════════════
 *
 * Every digital system speaks its own language — IPFS, DID, ActivityPub,
 * Bitcoin, OpenAPI, and hundreds more. Hologram solves this by treating
 * each standard as a deterministic projection of a single identity.
 * One object. Every protocol. Zero bridging.
 *
 * This panel lets users see and control which projection families
 * are active in their workspace, with live preview of how their
 * identity appears through each standard's lens.
 *
 * Architecture: Lazy — projections are pure functions that cost nothing
 * until materialized. Only enabled categories compute on demand.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Globe, Shield, Coins, Users, Brain, Code2,
  Database, Image, Cloud, Cpu, Atom, FlaskConical,
  ChevronRight, ChevronDown, Eye, Zap, Check,
  Info, Layers, ArrowRight, Play, Copy, X,
  CheckCircle, AlertTriangle, Loader2, LayoutGrid,
} from "lucide-react";
import { SPECS } from "@/modules/uns/core/hologram/specs";
import { project, type Hologram, type HologramProjection } from "@/modules/uns/core/hologram/index";
import type { HologramSpec } from "@/modules/uns/core/hologram/index";
import { supabase } from "@/integrations/supabase/client";

// ── Category Taxonomy ─────────────────────────────────────────────────────
// Maps each of the 370+ projection keys into 12 human-readable domains.
// The classifyTier logic from coherence-gate.ts is distilled here into
// a user-facing taxonomy.

interface Category {
  key: string;
  label: string;
  icon: typeof Globe;
  description: string;       // Why this category matters
  color: string;             // HSL accent
  colorBg: string;           // HSL accent/10
}

const CATEGORIES: Category[] = [
  {
    key: "foundation",
    label: "UOR Foundation",
    icon: Layers,
    description: "The bedrock — content addressing, linked data, verifiable credentials, and decentralized identifiers. These four standards make every other projection possible.",
    color: "hsl(38, 70%, 55%)",
    colorBg: "hsl(38, 70%, 55%, 0.1)",
  },
  {
    key: "identity",
    label: "Identity & Trust",
    icon: Shield,
    description: "How systems prove who you are. From OpenID Connect to X.509 certificates, each projection lets your single identity authenticate with any trust framework.",
    color: "hsl(200, 70%, 55%)",
    colorBg: "hsl(200, 70%, 55%, 0.1)",
  },
  {
    key: "web3",
    label: "Web3 & Settlement",
    icon: Coins,
    description: "Immutable anchoring on distributed ledgers. Your identity can be verified on Bitcoin, Ethereum, Zcash, and Lightning — cryptographic proof that something existed at a point in time.",
    color: "hsl(45, 80%, 55%)",
    colorBg: "hsl(45, 80%, 55%, 0.1)",
  },
  {
    key: "federation",
    label: "Federation & Social",
    icon: Users,
    description: "How people and systems discover each other across networks. ActivityPub, AT Protocol, WebFinger — your identity works natively in every social protocol.",
    color: "hsl(280, 60%, 60%)",
    colorBg: "hsl(280, 60%, 60%, 0.1)",
  },
  {
    key: "agents",
    label: "AI Agents",
    icon: Brain,
    description: "Machine-to-machine coordination. A2A, MCP, OASF, ONNX — projections that let autonomous agents discover, trust, and transact with each other using your canonical identity.",
    color: "hsl(160, 60%, 50%)",
    colorBg: "hsl(160, 60%, 50%, 0.1)",
  },
  {
    key: "languages",
    label: "Programming Languages",
    icon: Code2,
    description: "Your identity expressed as a native construct in 60+ languages. Python module, Rust crate, Go module, Solidity contract — same object, every runtime.",
    color: "hsl(220, 65%, 60%)",
    colorBg: "hsl(220, 65%, 60%, 0.1)",
  },
  {
    key: "data",
    label: "Data & Encoding",
    icon: Database,
    description: "Serialization formats, schemas, and ontologies. From Protobuf to JSON-LD, your object can be faithfully represented in any data interchange format.",
    color: "hsl(180, 50%, 50%)",
    colorBg: "hsl(180, 50%, 50%, 0.1)",
  },
  {
    key: "media",
    label: "Media & Content",
    icon: Image,
    description: "Content authentication and provenance. C2PA, IPTC, EXIF — projections that embed verifiable identity into media files, proving origin and integrity.",
    color: "hsl(330, 60%, 60%)",
    colorBg: "hsl(330, 60%, 60%, 0.1)",
  },
  {
    key: "cloud",
    label: "Network & Cloud",
    icon: Cloud,
    description: "Infrastructure-level addressing. OCI containers, OpenTelemetry traces, DNS records — your identity resolves at every layer of the network stack.",
    color: "hsl(210, 50%, 55%)",
    colorBg: "hsl(210, 50%, 55%, 0.1)",
  },
  {
    key: "iot",
    label: "IoT & Hardware",
    icon: Cpu,
    description: "Physical device identity. Matter, BLE GATT, OPC UA — each connected device can be addressed with the same canonical identity used everywhere else.",
    color: "hsl(25, 65%, 55%)",
    colorBg: "hsl(25, 65%, 55%, 0.1)",
  },
  {
    key: "quantum",
    label: "Quantum Computing",
    icon: Atom,
    description: "Quantum circuit and instruction set projections. OpenQASM, QIR, Quil — your identity expressed as quantum-native constructs for the post-classical era.",
    color: "hsl(270, 70%, 60%)",
    colorBg: "hsl(270, 70%, 60%, 0.1)",
  },
  {
    key: "science",
    label: "Industry & Science",
    icon: FlaskConical,
    description: "Domain-specific standards. GS1 supply chain, FHIR healthcare, VCF genomics, FIX financial — your identity works natively in every industry vertical.",
    color: "hsl(140, 50%, 50%)",
    colorBg: "hsl(140, 50%, 50%, 0.1)",
  },
];

// ── Projection → Category Classifier ─────────────────────────────────────

const LANGUAGE_NAMES = new Set([
  "python-module","js-module","java-class","csharp-assembly","cpp-unit","c-unit",
  "go-module","rust-crate","ts-module","sql-schema","zig","nim","d-lang","ada",
  "fortran","pascal","assembly","kotlin","scala","groovy","clojure","haskell",
  "ocaml","fsharp","erlang","elixir","common-lisp","scheme","racket","ruby",
  "php","perl","lua","bash","powershell","raku","tcl","swift","objective-c",
  "dart","r-lang","julia","matlab","html","css","wasm","wgsl","graphql",
  "sparql","xquery","solidity","vyper","move","cairo","vhdl","verilog",
  "systemverilog","coq","lean","agda","tlaplus","hcl","nix","dockerfile",
  "makefile","cuda","opencl","glsl","hlsl","apl","forth","prolog","smalltalk",
  "crystal","pony",
]);

const MARKUP_NAMES = new Set([
  "xml","markdown","latex","asciidoc","rst","yaml","toml","json-schema","ini",
  "dotenv","protobuf","thrift","capnproto","flatbuffers","avro","msgpack","cbor",
  "openapi","asyncapi","wsdl","raml","xsd","shacl","shex","owl","rdfs",
  "mermaid","plantuml","dot","svg",
]);

const AGENT_NAMES = new Set([
  "erc8004","x402","a2a","a2a-task","mcp-tool","mcp-context","skill-md",
  "oasf","onnx","onnx-op","nanda-index","nanda-agentfacts","nanda-resolver",
]);

function classifyCategory(name: string, spec: HologramSpec): string {
  if (LANGUAGE_NAMES.has(name)) return "languages";
  if (MARKUP_NAMES.has(name)) return "data";
  if (AGENT_NAMES.has(name)) return "agents";
  const s = spec.spec;
  if (["jsonld","did","vc","cidv1","multicodec","multihash","ipfs-path","braille","ipv6","ni-uri"].includes(name)) return "foundation";
  if (s.includes("w3.org") && !LANGUAGE_NAMES.has(name)) return "foundation";
  if (["oidc","webauthn","x509","dnslink","macaroon","biscuit","ucan"].includes(name) || name.startsWith("tsp-") || name.startsWith("fpp-") || name.startsWith("pq-")) return "identity";
  if (["bitcoin","lightning","nostr","ethereum","zcash-orchard","zcash-sapling"].includes(name) || name.startsWith("erc")) return "web3";
  if (["activitypub","atproto","webfinger","schema-org","solid-pod"].includes(name)) return "federation";
  if (s.includes("opentelemetry") || s.includes("oci") || name === "oci" || name === "dns-sd" || name.startsWith("dns")) return "cloud";
  if (name.startsWith("gs1") || name === "doi" || name.startsWith("cobol") || name.startsWith("fhir") || name.startsWith("hl7") || s.includes("fix") || s.includes("iso-20022") || s.includes("vcf") || s.includes("sam") || s.includes("neurodata") || s.includes("bids")) return "science";
  if (name.startsWith("matter") || name.startsWith("ble") || name.startsWith("opc") || name.startsWith("mqtt")) return "iot";
  if (name.startsWith("openqasm") || name === "qir" || name === "quil" || name.startsWith("qiskit") || name.startsWith("cirq") || name.startsWith("pennylane") || name.startsWith("tket") || name.startsWith("q#") || s.includes("quantum")) return "quantum";
  if (s.includes("c2pa") || s.includes("iptc") || s.includes("exif") || name.includes("media") || name.includes("hls") || name.includes("dash")) return "media";
  if (name.startsWith("polytree-")) return "foundation";
  // Default: check for common patterns
  if (s.includes("rfc-editor") || s.includes("ietf")) return "cloud";
  return "foundation";
}

// ── Pre-computed Category Index ──────────────────────────────────────────

function buildCategoryIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const cat of CATEGORIES) index.set(cat.key, []);
  for (const [name, spec] of SPECS) {
    const cat = classifyCategory(name, spec);
    if (!index.has(cat)) index.set(cat, []);
    index.get(cat)!.push(name);
  }
  return index;
}

const CATEGORY_INDEX = buildCategoryIndex();

// ── Preferences (persisted) ─────────────────────────────────────────────

const STORAGE_KEY = "hologram:interop:enabled";

function loadEnabled(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set(CATEGORIES.map(c => c.key));
}

function saveEnabled(enabled: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabled]));
}

// ── Component ────────────────────────────────────────────────────────────

interface InteroperabilityPanelProps {
  isDark: boolean;
}

export function InteroperabilityPanel({ isDark }: InteroperabilityPanelProps) {
  const [enabled, setEnabled] = useState<Set<string>>(loadEnabled);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Bulk invocation state
  const [bulkResults, setBulkResults] = useState<Map<string, HologramProjection> | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkTimeMs, setBulkTimeMs] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bulkFilter, setBulkFilter] = useState("");

  const totalProjections = SPECS.size;
  const enabledCount = useMemo(
    () => [...enabled].reduce((sum, key) => sum + (CATEGORY_INDEX.get(key)?.length ?? 0), 0),
    [enabled]
  );

  const toggle = useCallback((key: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      saveEnabled(next);
      return next;
    });
  }, []);

  const toggleAll = useCallback((on: boolean) => {
    const next = on ? new Set(CATEGORIES.map(c => c.key)) : new Set<string>();
    saveEnabled(next);
    setEnabled(next);
  }, []);

  // ── Bulk Invocation ─────────────────────────────────────────────────
  const runBulkProjection = useCallback(async () => {
    setBulkRunning(true);
    setBulkError(null);
    setBulkResults(null);
    const t0 = performance.now();

    try {
      // Get user's canonical identity from profile
      const { data: { session } } = await supabase.auth.getSession();
      let identityHex: string | null = null;

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("uor_canonical_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile?.uor_canonical_id) {
          // Extract hex from canonical ID format "uor:sha256:{hex}"
          const parts = profile.uor_canonical_id.split(":");
          identityHex = parts[parts.length - 1];
        }
      }

      // Fallback: generate a demo identity from a fixed seed
      if (!identityHex) {
        const seed = new TextEncoder().encode("hologram:demo:identity");
        const digest = await crypto.subtle.digest("SHA-256", seed);
        identityHex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
      }

      // Build ProjectionInput
      const hexBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        hexBytes[i] = parseInt(identityHex.substring(i * 2, i * 2 + 2), 16);
      }
      const input = {
        hashBytes: hexBytes,
        cid: `bafk${identityHex.slice(0, 52)}`,
        hex: identityHex,
      };

      // Collect active spec keys
      const activeKeys = new Set<string>();
      for (const catKey of enabled) {
        const members = CATEGORY_INDEX.get(catKey) ?? [];
        for (const m of members) activeKeys.add(m);
      }

      // Project through all active specs
      const results = new Map<string, HologramProjection>();
      for (const key of activeKeys) {
        const spec = SPECS.get(key);
        if (!spec) continue;
        try {
          const value = spec.project(input);
          const lossWarning = spec.fidelity === "lossless" ? undefined : spec.lossWarning ?? "lossy";
          results.set(key, { value, fidelity: spec.fidelity, spec: spec.spec, ...(lossWarning ? { lossWarning } : {}) });
        } catch {
          results.set(key, { value: "⚠ projection error", fidelity: spec.fidelity, spec: spec.spec, lossWarning: "runtime error" });
        }
      }

      setBulkTimeMs(Math.round(performance.now() - t0));
      setBulkResults(results);
    } catch (err: any) {
      setBulkError(err?.message ?? "Bulk projection failed");
    } finally {
      setBulkRunning(false);
    }
  }, [enabled]);

  const copyValue = useCallback((key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  return (
    <div className="space-y-4">
      {/* Why — the motivation */}
      <p className="text-muted-foreground text-sm font-body leading-relaxed">
        Every standard is a viewing angle of your single identity.
        Toggle which projection families are active — disabled families cost zero compute.
      </p>

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-primary" />
          <span className="text-sm font-body font-medium text-foreground">
            {enabledCount} <span className="text-muted-foreground">of</span> {totalProjections} <span className="text-muted-foreground">projections active</span>
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => toggleAll(true)}
            className="text-[11px] font-body font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            All
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="text-[11px] font-body font-medium px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            None
          </button>
        </div>
      </div>

      {/* Category grid */}
      <div className="space-y-1">
        {CATEGORIES.map(cat => {
          const members = CATEGORY_INDEX.get(cat.key) ?? [];
          const isEnabled = enabled.has(cat.key);
          const isExpanded = expandedCat === cat.key;
          const Icon = cat.icon;

          return (
            <div key={cat.key} className="rounded-lg border border-border overflow-hidden transition-colors">
              {/* Category row */}
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
              >
                {/* Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggle(cat.key); }}
                  className="w-8 h-[18px] rounded-full shrink-0 transition-colors relative"
                  style={{ background: isEnabled ? cat.color : "hsl(var(--muted))" }}
                  title={isEnabled ? "Disable" : "Enable"}
                >
                  <div
                    className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
                    style={{ left: isEnabled ? 15 : 2 }}
                  />
                </button>

                {/* Icon + label */}
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: cat.colorBg }}
                >
                  <Icon size={14} style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-body font-medium text-foreground">{cat.label}</span>
                </div>

                {/* Count */}
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {members.length}
                </span>

                {/* Expand chevron */}
                {isExpanded
                  ? <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                  : <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                }
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border bg-muted/20">
                  {/* Description — the "why" */}
                  <p className="text-xs font-body text-muted-foreground leading-relaxed mt-2.5 mb-3">
                    {cat.description}
                  </p>

                  {/* Projection list — the "what" */}
                  <div className="flex flex-wrap gap-1.5">
                    {members.slice(0, 24).map(name => {
                      const spec = SPECS.get(name);
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-md border border-border bg-background text-muted-foreground"
                          title={spec ? `${spec.fidelity} — ${spec.spec}` : name}
                        >
                          {spec?.fidelity === "lossless" && (
                            <Check size={9} style={{ color: "hsl(142, 60%, 45%)" }} />
                          )}
                          {name}
                        </span>
                      );
                    })}
                    {members.length > 24 && (
                      <span className="text-[11px] font-body text-muted-foreground px-1.5 py-0.5">
                        +{members.length - 24} more
                      </span>
                    )}
                  </div>

                  {/* Fidelity breakdown */}
                  <div className="flex items-center gap-3 mt-3 text-[11px] font-body text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Check size={10} style={{ color: "hsl(142, 60%, 45%)" }} />
                      {members.filter(m => SPECS.get(m)?.fidelity === "lossless").length} lossless
                    </span>
                    <span className="flex items-center gap-1">
                      <Info size={10} style={{ color: "hsl(45, 80%, 50%)" }} />
                      {members.filter(m => SPECS.get(m)?.fidelity === "lossy").length} lossy
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bulk Invocation ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30">
          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className="text-primary" />
            <span className="text-sm font-body font-medium text-foreground">
              Bulk Project
            </span>
            <span className="text-[11px] text-muted-foreground font-body">
              — invoke all {enabledCount} active projections at once
            </span>
          </div>
          <button
            onClick={runBulkProjection}
            disabled={bulkRunning || enabledCount === 0}
            className="flex items-center gap-1.5 text-[12px] font-body font-medium px-3 py-1.5 rounded-lg border border-border bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {bulkRunning ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            {bulkRunning ? "Projecting…" : "Project All"}
          </button>
        </div>

        {bulkError && (
          <div className="px-3 py-2 border-t border-border bg-destructive/10 text-destructive text-xs font-body">
            {bulkError}
          </div>
        )}

        {bulkResults && (
          <div className="border-t border-border">
            {/* Results header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
              <div className="flex items-center gap-3 text-[11px] font-body text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle size={11} style={{ color: "hsl(142, 60%, 45%)" }} />
                  {[...bulkResults.values()].filter(r => r.fidelity === "lossless").length} lossless
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle size={11} style={{ color: "hsl(45, 80%, 50%)" }} />
                  {[...bulkResults.values()].filter(r => r.fidelity === "lossy").length} lossy
                </span>
                <span>•</span>
                <span>{bulkTimeMs}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter results…"
                  value={bulkFilter}
                  onChange={e => setBulkFilter(e.target.value)}
                  className="text-[11px] font-body bg-background border border-border rounded-md px-2 py-1 w-[140px] outline-none text-foreground placeholder:text-muted-foreground/50"
                />
                <button
                  onClick={() => { setBulkResults(null); setBulkFilter(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Close results"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Results grid */}
            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {(() => {
                const q = bulkFilter.toLowerCase();
                const entries = [...bulkResults.entries()]
                  .filter(([key, r]) => !q || key.includes(q) || r.value.toLowerCase().includes(q))
                  .sort((a, b) => {
                    // lossless first, then alphabetical
                    if (a[1].fidelity !== b[1].fidelity) return a[1].fidelity === "lossless" ? -1 : 1;
                    return a[0].localeCompare(b[0]);
                  });

                if (entries.length === 0) {
                  return (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground font-body">
                      No matching projections
                    </div>
                  );
                }

                return entries.map(([key, result]) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 px-3 py-2 border-b border-border/50 hover:bg-muted/30 transition-colors group/row"
                  >
                    {/* Fidelity indicator */}
                    <div className="mt-1 shrink-0">
                      {result.fidelity === "lossless" ? (
                        <Check size={10} style={{ color: "hsl(142, 60%, 45%)" }} />
                      ) : (
                        <AlertTriangle size={10} style={{ color: "hsl(45, 80%, 50%)" }} />
                      )}
                    </div>

                    {/* Key */}
                    <span className="text-[11px] font-mono text-primary w-[140px] shrink-0 truncate mt-0.5" title={key}>
                      {key}
                    </span>

                    {/* Value */}
                    <span
                      className="text-[11px] font-mono text-muted-foreground flex-1 truncate mt-0.5 select-all"
                      title={result.value}
                    >
                      {result.value}
                    </span>

                    {/* Copy button */}
                    <button
                      onClick={() => copyValue(key, result.value)}
                      className="opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
                      title="Copy value"
                    >
                      {copiedKey === key ? (
                        <Check size={12} style={{ color: "hsl(142, 60%, 45%)" }} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Footer — the "how" */}
      <div className="rounded-lg bg-muted/50 border border-border p-3">
        <div className="flex items-start gap-2">
          <Info size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs font-body text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">How it works: </span>
            Each projection is a deterministic, pure function — same input always produces the same output.
            Disabled categories consume zero resources. Enable only what you need, or keep all {totalProjections} active for maximum interoperability.
          </div>
        </div>
      </div>
    </div>
  );
}

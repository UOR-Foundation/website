/**
 * Lens Inspector — Bidirectional Holographic Lens Playground
 * ══════════════════════════════════════════════════════════
 *
 * Paste any JSON object → dehydrate → refract through all modalities.
 * Visual proof that UOR is a universal, lossless encoder-decoder.
 *
 * @module lens-inspector/pages/LensInspectorPage
 */

import { useState, useCallback } from "react";
import {
  IconPrism, IconCode, IconHash, IconCopy, IconCheck,
  IconPlayerPlay, IconBraces, IconWorld, IconArrowsExchange, IconFileCode, IconSchema,
} from "@tabler/icons-react";
import { PageShell } from "@/modules/hologram-ui";
import {
  dehydrate,
  rehydrate,
  type RefractionModality,
  type SingleProofResult,
} from "@/modules/uor-sdk/canonical";
import type { Hologram } from "@/modules/uns/core/hologram";

// ── Sample objects ─────────────────────────────────────────────────────────

const SAMPLES: Record<string, unknown> = {
  "Schema.org Person": {
    "@context": {
      name: "https://schema.org/name",
      xsd: "http://www.w3.org/2001/XMLSchema#",
      age: { "@id": "https://schema.org/age", "@type": "xsd:integer" },
    },
    "@type": "https://schema.org/Person",
    name: "Ada Lovelace",
    age: 36,
  },
  "Plain Object": {
    title: "Universal Object Reference",
    version: "1.0.0",
    tags: ["content-addressing", "lossless", "deterministic"],
  },
  "UOR Store Object": {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "store:StoredObject",
    "store:cid": "bafyreib...",
    "store:serialisation": '{"hello":"world"}',
  },
};

// ── Modality metadata ──────────────────────────────────────────────────────

const MODALITIES: {
  key: RefractionModality;
  label: string;
  icon: typeof IconCode;
  description: string;
}[] = [
  { key: "nquads", label: "N-Quads", icon: IconCode, description: "W3C URDNA2015 canonical form" },
  { key: "jsonld", label: "JSON-LD", icon: IconBraces, description: "Expanded JSON-LD document" },
  { key: "jsonld-framed", label: "Framed", icon: IconBraces, description: "JSON-LD compacted via @frame — cleaner structure" },
  { key: "compact-json", label: "Compact JSON", icon: IconBraces, description: "Flattened, readable JSON" },
  { key: "turtle", label: "Turtle", icon: IconCode, description: "Terse RDF Triple Language" },
  { key: "rdf-xml", label: "RDF/XML", icon: IconFileCode, description: "W3C RDF/XML serialization" },
  { key: "graphql-sdl", label: "GraphQL SDL", icon: IconSchema, description: "GraphQL Schema Definition Language — API integration" },
  { key: "hologram", label: "Hologram", icon: IconWorld, description: "All 25+ protocol projections" },
  { key: "identity", label: "Identity", icon: IconHash, description: "SingleProofResult passthrough" },
];

// ── Clipboard helper ───────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? <IconCheck size={14} className="text-primary" /> : <IconCopy size={14} />}
    </button>
  );
}

// ── Code block ─────────────────────────────────────────────────────────────

function CodeBlock({ value, language }: { value: string; language: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <span className="text-[9px] font-mono text-muted-foreground uppercase">{language}</span>
        <CopyButton text={value} />
      </div>
      <pre className="bg-secondary/50 border border-border rounded-lg p-4 overflow-x-auto text-[11px] leading-relaxed font-mono text-foreground whitespace-pre-wrap break-all max-h-[400px] overflow-y-auto">
        {value}
      </pre>
    </div>
  );
}

// ── Identity summary card ──────────────────────────────────────────────────

function IdentityCard({ proof }: { proof: SingleProofResult }) {
  const fields = [
    { label: "Derivation ID", value: proof.derivationId },
    { label: "CID (IPFS)", value: proof.cid },
    { label: "SHA-256", value: proof.hashHex },
    { label: "UOR Glyph", value: proof.uorAddress["u:glyph"] },
    { label: "IPv6 (ULA)", value: proof.ipv6Address["u:ipv6"] },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center gap-2">
        <IconHash size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">Content-Addressed Identity</span>
        <span className="ml-auto text-[9px] font-mono text-muted-foreground">
          morphism:Isometry — lossless
        </span>
      </div>
      <div className="divide-y divide-border">
        {fields.map((f) => (
          <div key={f.label} className="px-4 py-2 flex items-start gap-3">
            <span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0 pt-0.5">
              {f.label}
            </span>
            <span className="text-[11px] font-mono text-foreground break-all flex-1">
              {f.value}
            </span>
            <CopyButton text={f.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hologram projections panel ─────────────────────────────────────────────

function HologramPanel({ hologram }: { hologram: Hologram }) {
  const entries = Object.entries(hologram.projections).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center gap-2">
        <IconWorld size={14} className="text-primary" />
        <span className="text-xs font-semibold text-foreground">
          Hologram Projections ({entries.length})
        </span>
      </div>
      <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
        {entries.map(([name, proj]) => (
          <div key={name} className="px-4 py-2 flex items-start gap-3 hover:bg-muted/30 transition-colors">
            <span className="text-[10px] font-mono font-medium text-primary w-28 shrink-0 pt-0.5">
              {name}
            </span>
            <span className="text-[10px] font-mono text-foreground break-all flex-1">
              {proj.value}
            </span>
            <span className={`text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
              proj.fidelity === "lossless"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}>
              {proj.fidelity}
            </span>
            <CopyButton text={proj.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LensInspectorPage() {
  const [input, setInput] = useState(JSON.stringify(SAMPLES["Schema.org Person"], null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [proof, setProof] = useState<SingleProofResult | null>(null);
  const [hologram, setHologram] = useState<Hologram | null>(null);
  const [refractions, setRefractions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<RefractionModality>("nquads");

  const handleDehydrate = useCallback(async () => {
    setParseError(null);
    setProcessing(true);
    try {
      const obj = JSON.parse(input);
      const result = await dehydrate(obj);
      setProof(result.proof);
      setHologram(result.hologram);

      // Rehydrate all modalities in parallel
      const keys: RefractionModality[] = ["nquads", "jsonld", "jsonld-framed", "compact-json", "turtle", "rdf-xml", "graphql-sdl"];
      const results = await Promise.all(
        keys.map(async (m) => {
          const out = await rehydrate(result.proof, m);
          const text = typeof out === "string" ? out : JSON.stringify(out, null, 2);
          return [m, text] as const;
        }),
      );
      setRefractions(Object.fromEntries(results));
    } catch (err: any) {
      setParseError(err.message ?? "Invalid JSON");
    } finally {
      setProcessing(false);
    }
  }, [input]);

  const loadSample = useCallback((name: string) => {
    setInput(JSON.stringify(SAMPLES[name], null, 2));
    setProof(null);
    setHologram(null);
    setRefractions({});
  }, []);

  return (
    <PageShell
      title="Lens Inspector"
      subtitle="Bidirectional Holographic Lens — Universal Encoder-Decoder"
      icon={<IconPrism size={18} />}
      backTo="/hologram-ui"
      badge="EOR"
    >
      {/* Input section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <IconArrowsExchange size={14} className="text-primary" />
              Input Object
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Paste any JSON or JSON-LD object. Dehydrate to canonical form, then refract into any modality.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(SAMPLES).map((name) => (
              <button
                key={name}
                onClick={() => loadSample(name)}
                className="px-2.5 py-1 text-[10px] font-medium rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-48 bg-secondary/50 border border-border rounded-lg p-4 font-mono text-[11px] text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
            spellCheck={false}
            placeholder='{"@context": {...}, "@type": "...", ...}'
          />
          {parseError && (
            <div className="mt-1 text-[10px] text-destructive font-mono">
              ✕ {parseError}
            </div>
          )}
        </div>

        <button
          onClick={handleDehydrate}
          disabled={processing || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <IconPlayerPlay size={14} />
          {processing ? "Dehydrating…" : "Dehydrate → Refract"}
        </button>
      </section>

      {/* Results */}
      {proof && (
        <>
          {/* Identity card */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <IconHash size={14} className="text-primary" />
              Dehydrated Identity
              <span className="text-[9px] font-mono text-muted-foreground ml-1">
                (1 object → 1 hash → 5 identity forms)
              </span>
            </h2>
            <IdentityCard proof={proof} />
          </section>

          {/* Refraction tabs */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <IconPrism size={14} className="text-primary" />
              Refracted Modalities
              <span className="text-[9px] font-mono text-muted-foreground ml-1">
                Same canonical bytes → every representation
              </span>
            </h2>

            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-border pb-px overflow-x-auto">
              {MODALITIES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            {/* Active panel */}
            <div className="mt-2">
              {activeTab === "hologram" && hologram ? (
                <HologramPanel hologram={hologram} />
              ) : activeTab === "identity" && proof ? (
                <CodeBlock
                  value={JSON.stringify({
                    derivationId: proof.derivationId,
                    cid: proof.cid,
                    hashHex: proof.hashHex,
                    uorAddress: proof.uorAddress,
                    ipv6Address: proof.ipv6Address,
                    nquadsByteLength: proof.canonicalBytes.length,
                  }, null, 2)}
                  language="json"
                />
              ) : refractions[activeTab] ? (
                <CodeBlock
                  value={refractions[activeTab]}
                  language={activeTab === "nquads" || activeTab === "turtle" ? "nquads" : "json"}
                />
              ) : (
                <div className="text-[11px] text-muted-foreground italic py-8 text-center">
                  Dehydrate an object first to see this modality.
                </div>
              )}

              {/* Modality description */}
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                {MODALITIES.find((m) => m.key === activeTab)?.description}
              </p>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

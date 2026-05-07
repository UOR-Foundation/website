import { useEffect, useRef, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Copy, Check, BookOpen, Github, Package, ArrowRight, Code2 } from "lucide-react";
import {
  GITHUB_FRAMEWORK_URL,
  GITHUB_FRAMEWORK_DOCS_URL,
  CRATE_URL,
  CRATE_DOCS_URL,
} from "@/data/external-links";
import { encode, decode, type EnrichedReceipt } from "@/lib/uor-codec";
// Load the actual on-disk source of every file in the encode/decode pipeline,
// verbatim, at build time. This is what the audit panel renders — no paraphrase,
// no hand-written excerpt. If the file changes, this view changes with it.
import uorCodecSource from "@/lib/uor-codec.ts?raw";
import uorCanonicalSource from "@/lib/uor-canonical.ts?raw";
import receiptRegistrySource from "@/modules/oracle/lib/receipt-registry.ts?raw";
import { ExternalLink } from "lucide-react";

// Every file in the pipeline, loaded verbatim, in dependency order:
//   uor-codec.ts          — public encode / decode entry points
//   uor-canonical.ts      — URDNA2015 canonicalization + SHA-256 + identity forms
//   receipt-registry.ts   — WASM ring algebra enrichment + lookup
const PIPELINE_SOURCES: ReadonlyArray<{
  label: string;
  path: string;
  source: string;
  githubUrl: string;
}> = [
  {
    label: "encode / decode entry",
    path: "src/lib/uor-codec.ts",
    source: uorCodecSource,
    githubUrl: "https://github.com/UOR-Foundation/UOR-Framework/blob/main/src/lib/uor-codec.ts",
  },
  {
    label: "normalize + hash",
    path: "src/lib/uor-canonical.ts",
    source: uorCanonicalSource,
    githubUrl: "https://github.com/UOR-Foundation/UOR-Framework/blob/main/src/lib/uor-canonical.ts",
  },
  {
    label: "registry + lookup",
    path: "src/modules/oracle/lib/receipt-registry.ts",
    source: receiptRegistrySource,
    githubUrl: "https://github.com/UOR-Foundation/UOR-Framework/blob/main/src/modules/oracle/lib/receipt-registry.ts",
  },
];

const DEMO_DEFAULT = `{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "Hello UOR",
  "author": "you"
}`;

type Preset = { label: string; hint: string; value: string };

const PRESETS: Preset[] = [
  {
    label: "Person",
    hint: "schema.org/Person — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jane Doe",
  "jobTitle": "Professor",
  "telephone": "(425) 123-4567",
  "url": "http://www.janedoe.com"
}`,
  },
  {
    label: "Book",
    hint: "schema.org/Book — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Book",
  "name": "The Catcher in the Rye",
  "author": { "@type": "Person", "name": "J.D. Salinger" },
  "isbn": "978-0316769174",
  "datePublished": "1951-07-16"
}`,
  },
  {
    label: "Recipe",
    hint: "schema.org/Recipe — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Mom's World Famous Banana Bread",
  "author": { "@type": "Person", "name": "John Smith" },
  "datePublished": "2009-05-08",
  "recipeIngredient": [
    "3 or 4 ripe bananas, smashed",
    "1 cup of sugar",
    "1 egg"
  ],
  "recipeInstructions": "Preheat the oven to 350 degrees. Mix in the ingredients in a bowl. Add the flour last. Pour the mixture into a loaf pan and bake for one hour."
}`,
  },
  {
    label: "Event",
    hint: "schema.org/Event — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Miami Heat at Philadelphia 76ers",
  "startDate": "2016-04-21T20:00",
  "location": {
    "@type": "Place",
    "name": "Wells Fargo Center",
    "address": "3601 South Broad Street, Philadelphia, PA"
  }
}`,
  },
  {
    label: "Product",
    hint: "schema.org/Product — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Executive Anvil",
  "image": "http://www.example.com/anvil_executive.jpg",
  "description": "Sleeker than ACME's Classic Anvil, the Executive Anvil is perfect for the business traveler.",
  "brand": { "@type": "Brand", "name": "ACME" },
  "offers": {
    "@type": "Offer",
    "price": "119.99",
    "priceCurrency": "USD"
  }
}`,
  },
  {
    label: "LocalBusiness",
    hint: "schema.org/LocalBusiness — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "GreatFood",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1901 Lemur Ave",
    "addressLocality": "Sunnyvale",
    "addressRegion": "CA",
    "postalCode": "94086"
  },
  "telephone": "(408) 714-1489",
  "servesCuisine": "Italian"
}`,
  },
  {
    label: "Movie",
    hint: "schema.org/Movie — example",
    value: `{
  "@context": "https://schema.org",
  "@type": "Movie",
  "name": "Pirates of the Carribean: On Stranger Tides",
  "director": { "@type": "Person", "name": "Rob Marshall" },
  "datePublished": "2011-05-20",
  "duration": "PT2H17M"
}`,
  },
];

/**
 * Parse a JSON.parse error message and try to point at the offending location
 * with a short snippet of context. Returns a user-readable string.
 */
function formatJsonError(input: string): string {
  try {
    JSON.parse(input);
    return "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const posMatch = msg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = Number(posMatch[1]);
      const upTo = input.slice(0, pos);
      const line = upTo.split("\n").length;
      const col = pos - upTo.lastIndexOf("\n");
      const snippet = input.slice(Math.max(0, pos - 12), pos + 12).replace(/\n/g, "⏎");
      return `Invalid JSON at line ${line}, col ${col}: ${msg.replace(/^.*?:\s*/, "")} — near "${snippet}"`;
    }
    return `Invalid JSON: ${msg}`;
  }
}

/**
 * Lightweight schema check for the UOR demo input. The canonical pipeline
 * accepts any JSON-LD object, but we surface the most common authoring
 * mistakes with precise messages before hashing.
 */
function validateUorInput(value: unknown): string | null {
  if (value === null) return "Top-level value must be an object, not null.";
  if (Array.isArray(value)) return "Top-level value must be an object, not an array.";
  if (typeof value !== "object") {
    return `Top-level value must be an object, not ${typeof value}.`;
  }
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) {
    return "Object is empty — add at least @context and @type.";
  }
  if (!("@context" in obj)) {
    return 'Missing "@context" — required for JSON-LD canonicalization.';
  }
  const ctx = obj["@context"];
  if (
    typeof ctx !== "string" &&
    !(ctx && typeof ctx === "object")
  ) {
    return '"@context" must be a string IRI or an object.';
  }
  if (!("@type" in obj)) {
    return 'Missing "@type" — required to identify the kind of thing.';
  }
  if (typeof obj["@type"] !== "string" && !Array.isArray(obj["@type"])) {
    return '"@type" must be a string or array of strings.';
  }
  if ("@id" in obj && typeof obj["@id"] !== "string") {
    return '"@id" must be a string IRI.';
  }
  return null;
}

/**
 * UOR canonical address per the `uor-foundation` crate (v0.3.x):
 * `ContentAddress` is a sealed 128-bit handle. We surface it as
 * `uor:<32-hex>` — the upper 128 bits of the SHA-256 of the URDNA2015
 * canonical N-Quads. This is the stable, short, sortable form a user
 * sees and shares; the full 256-bit derivation ID stays internal.
 */
function uorAddress(hashHex: string): string {
  return `uor:${hashHex.slice(0, 32)}`;
}

/** Detect which canonical form an input string represents. */
type AddressKind = "uor" | "glyph" | "ipv6" | "cid" | "unknown";
function detectAddressKind(raw: string): AddressKind {
  const s = raw.trim();
  if (!s) return "unknown";
  if (/^uor:[0-9a-f]+$/i.test(s)) return "uor";
  // Braille glyph: any character in U+2800..U+28FF
  if (/^[\u2800-\u28FF]+$/.test(s)) return "glyph";
  // IPv6 ULA used by UOR (fd00:0075:6f72:…) — accept any well-formed v6 too
  if (/^[0-9a-f:]+$/i.test(s) && s.includes(":")) return "ipv6";
  // IPFS CIDv1 base32: starts with "b" followed by base32 chars
  if (/^b[a-z2-7]{20,}$/i.test(s)) return "cid";
  return "unknown";
}

const KIND_LABEL: Record<AddressKind, string> = {
  uor: "UOR address",
  glyph: "Braille glyph",
  ipv6: "IPv6",
  cid: "IPFS CID",
  unknown: "—",
};

const LiveDemo = () => {
  const [input, setInput] = useState(DEMO_DEFAULT);
  const [receipt, setReceipt] = useState<EnrichedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [decoded, setDecoded] = useState<unknown | undefined>(undefined);
  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "mismatch">("idle");
  // Local map: every surface form (uor, glyph, ipv6, cid) → source object.
  // The shared registry indexes by long derivation ID / cid / triword / ipv6;
  // we mirror all forms here so decode works for the short uor: and glyph too.
  const formMap = useRef<Map<string, unknown>>(new Map());
  const kind = detectAddressKind(address);
  const [showCode, setShowCode] = useState(false);
  const [decodeReceipt, setDecodeReceipt] = useState<EnrichedReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      setError(formatJsonError(input));
      return;
    }
    const schemaError = validateUorInput(parsed);
    if (schemaError) {
      setError(schemaError);
      return;
    }
    encode(parsed)
      .then((r) => {
        if (cancelled) return;
        setReceipt(r);
        formMap.current.set(uorAddress(r.hashHex), parsed);
        formMap.current.set(r.glyph, parsed);
        formMap.current.set(r.ipv6.toLowerCase(), parsed);
        formMap.current.set(r.cid, parsed);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Could not derive identity.");
      });
    return () => {
      cancelled = true;
    };
  }, [input]);

  // Decode whenever the address changes
  useEffect(() => {
    if (!address.trim()) {
      setDecoded(undefined);
      setVerifyState("idle");
      return;
    }
    const key = address.trim();
    const lookupKey = detectAddressKind(key) === "ipv6" ? key.toLowerCase() : key;
    const value = decode(key);
    const resolved = value !== undefined ? value : formMap.current.get(lookupKey);
    setDecoded(resolved);
    if (resolved !== undefined && receipt) {
      // Re-encode to verify round-trip determinism
      encode(resolved)
        .then((r2) => {
          setVerifyState(r2.derivationId === receipt.derivationId ? "ok" : "mismatch");
          setDecodeReceipt(r2);
        })
        .catch(() => {
          setVerifyState("mismatch");
          setDecodeReceipt(null);
        });
    } else {
      setVerifyState("idle");
      setDecodeReceipt(null);
    }
  }, [address, receipt]);

  const useDerivedAddress = () => {
    if (receipt) setAddress(uorAddress(receipt.hashHex));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
          const active = input.trim() === p.value.trim();
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => setInput(p.value)}
              title={p.hint}
              className={`px-3.5 py-1.5 rounded-full border text-[14px] font-body transition-colors ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border text-foreground/70 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] font-body transition-colors ${
              showCode
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
            }`}
            title="See the actual source files and the values from this run"
          >
            <Code2 size={14} />
            {showCode ? "Hide code" : "View code"}
          </button>
        </div>
      </div>

      {/* Stage 1 → Stage 2 : Encode */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
          <div className="text-[14px] tracking-[0.16em] uppercase text-foreground/55 font-body">1 · Content</div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            aria-label="Your data"
            className="w-full min-h-[260px] font-mono text-[14px] leading-[1.65] bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          />
        </div>
        <div className="hidden lg:flex items-center justify-center text-foreground/40">
          <ArrowRight size={22} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="text-[14px] tracking-[0.16em] uppercase text-foreground/55 font-body">2 · UOR address</div>
          {showCode ? (
            <SourceAudit encodeReceipt={receipt} />
          ) : error ? (
            <div className="font-mono text-[14px] leading-[1.65] bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/55 min-h-[88px]">
              {error}
            </div>
          ) : receipt ? (
            <div className="flex flex-col gap-3">
              <AddressRow label="address" value={uorAddress(receipt.hashHex)} />
              <AddressRow label="glyph" value={receipt.glyph} />
              <AddressRow label="ipv6" value={receipt.ipv6} />
              <AddressRow label="cid" value={receipt.cid} />
              <button
                type="button"
                onClick={useDerivedAddress}
                className="self-start text-[14px] font-body text-primary/80 hover:text-primary transition-colors"
              >
                Use this address to decode →
              </button>
            </div>
          ) : (
            <div className="font-mono text-[14px] text-foreground/40 p-4">Computing…</div>
          )}
        </div>
      </div>

      {/* Stage 3 : Decode */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[14px] tracking-[0.16em] uppercase text-foreground/55 font-body">
            3 · Decode — address back to content
            {address.trim() && (
              <span className="ml-3 normal-case tracking-normal text-foreground/60">
                detected: <span className="text-foreground/80">{KIND_LABEL[kind]}</span>
              </span>
            )}
          </div>
          {decoded !== undefined && verifyState === "ok" && (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-body text-primary">
              <Check size={14} /> Round-trip verified — same content, same address
            </span>
          )}
        </div>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste any form: UOR address, Braille glyph, IPv6, or IPFS CID"
          spellCheck={false}
          className="w-full font-mono text-[14px] bg-background/60 border border-border/70 rounded-lg px-4 py-3 text-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="font-mono text-[14px] leading-[1.65] bg-background/60 border border-border/70 rounded-lg p-4 text-foreground/90 min-h-[120px] whitespace-pre-wrap break-all">
          {!address.trim() ? (
            <span className="text-foreground/40">Decoded content appears here.</span>
          ) : decoded !== undefined ? (
            JSON.stringify(decoded, null, 2)
          ) : (
            <span className="text-foreground/55">
              Address not in this session's registry. Encode something above first, or paste an address derived in this browser.
            </span>
          )}
        </div>
        {showCode && decodeReceipt && decoded !== undefined && (
          <PipelineTrace
            receipt={decodeReceipt}
            title="Run output — decode (re-encoded to verify round-trip)"
          />
        )}
      </div>
    </div>
  );
};

const AddressRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-3 group">
      <div className="text-[14px] tracking-[0.16em] uppercase text-foreground/55 font-body w-[88px] shrink-0 pt-2.5">{label}</div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="flex-1 text-left font-mono text-[14px] leading-[1.65] bg-background/60 border border-border/70 rounded-lg px-3 py-2 text-foreground/90 hover:border-primary/40 transition-colors break-all"
        title="Copy"
      >
        {value}
        <span className="ml-2 inline-flex align-middle opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
        </span>
      </button>
    </div>
  );
};

// Compute SHA-256 of a string in the browser, hex-encoded.
// Used so the audit panel shows a verifiable fingerprint of the file
// the user is currently looking at.
const useSha256Hex = (text: string) => {
  const [hex, setHex] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    const buf = new TextEncoder().encode(text);
    crypto.subtle.digest("SHA-256", buf).then((d) => {
      if (cancelled) return;
      const arr = Array.from(new Uint8Array(d));
      setHex(arr.map((b) => b.toString(16).padStart(2, "0")).join(""));
    });
    return () => { cancelled = true; };
  }, [text]);
  return hex;
};

const SourceAudit = ({ encodeReceipt }: { encodeReceipt: EnrichedReceipt | null }) => {
  // Tab 0 = "Run output" (values from this encode), 1..N = source files
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const isRunTab = activeIdx === 0;
  const file = isRunTab ? null : PIPELINE_SOURCES[activeIdx - 1];
  const lines = file ? file.source.split("\n") : [];
  const lineCount = lines.length;
  const byteCount = file ? new TextEncoder().encode(file.source).length : 0;
  const sha = useSha256Hex(file?.source ?? "");
  return (
    <div className="flex flex-col gap-2">
      {/* Tabs: Run output + source files */}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveIdx(0)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-body transition-colors border ${
            isRunTab
              ? "border-primary/60 bg-primary/10 text-foreground"
              : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
          }`}
          title="Intermediate values from this encode"
        >
          Run output
        </button>
        {PIPELINE_SOURCES.map((f, i) => {
          const tabIdx = i + 1;
          const active = tabIdx === activeIdx;
          return (
            <button
              key={f.path}
              type="button"
              onClick={() => setActiveIdx(tabIdx)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-body transition-colors border ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border text-foreground/60 hover:border-primary/40 hover:text-foreground"
              }`}
              title={f.path}
            >
              <span className="font-mono">{f.path.split("/").pop()}</span>
              <span className="ml-1.5 text-foreground/45">· {f.label}</span>
            </button>
          );
        })}
      </div>

      {isRunTab ? (
        encodeReceipt ? (
          <PipelineTrace receipt={encodeReceipt} title="Run output — encode" />
        ) : (
          <div className="rounded-lg border border-border/70 bg-background/60 p-4 font-body text-[12px] text-foreground/55">
            Computing…
          </div>
        )
      ) : (
      <div className="rounded-lg border border-border/70 bg-background/60 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-border/60 flex-wrap">
          <span className="font-mono text-[11px] text-foreground/70 break-all">{file!.path}</span>
          <div className="flex items-center gap-3 text-[10.5px] font-body text-foreground/55">
            <span>{lineCount} lines · {byteCount} bytes</span>
            <a
              href={file!.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition-colors"
              title="Open this file on GitHub"
            >
              <Github size={11} /> GitHub
              <ExternalLink size={10} />
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(file!.source);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition-colors"
            >
              {copied ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy file"}
            </button>
          </div>
        </div>

        {/* SHA-256 fingerprint of the file shown */}
        <div className="px-3 py-1 border-b border-border/60 text-[10.5px] font-mono text-foreground/50 break-all">
          sha256: <span className="text-foreground/75">{sha || "computing…"}</span>
        </div>

        {/* Verbatim source with line numbers, scrollable */}
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((ln, i) => (
                <tr key={i} className="align-top">
                  <td className="select-none text-right pr-3 pl-3 py-px font-mono text-[11px] text-foreground/30 border-r border-border/40 w-[1%] whitespace-nowrap">
                    {i + 1}
                  </td>
                  <td className="pl-3 pr-3 py-px font-mono text-[11.5px] leading-[1.55] text-foreground/85 whitespace-pre">
                    {ln || "\u00A0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <p className="text-[12px] font-body text-foreground/55 leading-[1.6]">
        {isRunTab
          ? "Live values from your last encode — what each step produced before reaching the final address. Switch tabs to read the actual source that ran."
          : "Verbatim source loaded at build time via Vite's ?raw loader. The SHA-256 above fingerprints exactly what your browser is executing — diff it against GitHub to confirm nothing's hidden between input and address."}
      </p>
    </div>
  );
};

const PipelineTrace = ({ receipt, title }: { receipt: EnrichedReceipt; title: string }) => {
  const nquadsPreview = receipt.nquads.length > 600
    ? receipt.nquads.slice(0, 600) + `\n… (${receipt.nquads.length - 600} more chars)`
    : receipt.nquads;
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border/60 flex items-center justify-between">
        <span className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/50 font-body">{title}</span>
        <span className="text-[10.5px] font-body text-foreground/50">
          engine: <span className="text-foreground/80">{receipt.engine}</span>
          {receipt.crateVersion && <span className="text-foreground/50"> · v{receipt.crateVersion}</span>}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        <TraceStep n={1} label="Normalized input (canonical string)" body={nquadsPreview} />
        <TraceStep n={2} label="SHA-256 hash (hex)" body={receipt.hashHex} />
        <TraceStep
          n={3}
          label="Output addresses (derived from the hash)"
          body={[
            `address = uor:${receipt.hashHex.slice(0, 32)}`,
            `glyph   = ${receipt.glyph}`,
            `ipv6    = ${receipt.ipv6}`,
            `cid     = ${receipt.cid}`,
          ].join("\n")}
        />
      </div>
    </div>
  );
};

const TraceStep = ({ n, label, body }: { n: number; label: string; body: string }) => (
  <div className="px-3 py-2.5 flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-body">{n}</span>
      <span className="text-[10.5px] tracking-[0.18em] uppercase text-foreground/55 font-body">{label}</span>
    </div>
    <pre className="font-mono text-[11.5px] leading-[1.55] text-foreground/85 whitespace-pre-wrap break-all">
{body}
    </pre>
  </div>
);

const CopyableCommand = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group inline-flex items-center gap-3 font-mono text-[14px] bg-card border border-border rounded-full pl-5 pr-4 py-2.5 text-foreground/90 hover:border-primary/40 transition-colors"
    >
      <span>{value}</span>
      {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="opacity-60 group-hover:opacity-100" />}
    </button>
  );
};

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <h1 className="font-display text-fluid-page-title font-bold text-foreground animate-fade-in-up">
            UOR Framework
          </h1>
          <p
            className="mt-10 text-foreground/70 font-body text-fluid-body leading-[1.7] max-w-4xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.15s" }}
          >
            Data needs an identity anyone can trust without asking permission.
            UOR turns any piece of content into a unique address derived from
            the content itself — verifiable by anyone, anywhere. Read the spec,
            install the crate, and start building.
          </p>
          <div
            className="mt-8 flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <BookOpen size={16} />
              Read the docs
            </a>
            <a
              href={GITHUB_FRAMEWORK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <Github size={16} />
              View on GitHub
            </a>
            <a
              href={CRATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-foreground/60 text-foreground font-medium font-body text-fluid-body hover:bg-foreground hover:text-background transition-all duration-200"
            >
              <Package size={16} />
              crates.io
            </a>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="py-section-sm bg-background">
      </section>
      {/* placeholder removed */}
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Install
          </p>
          <h2 className="font-display text-fluid-heading font-bold text-foreground mb-8">
            Add it to your project
          </h2>
          <div className="flex flex-col items-start gap-5">
            <CopyableCommand value="cargo add uor-foundation" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fluid-label font-body text-foreground/65">
              <a href={CRATE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">crates.io</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={CRATE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">docs.rs</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={GITHUB_FRAMEWORK_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">source on GitHub</a>
              <span aria-hidden className="text-foreground/30">·</span>
              <a href={GITHUB_FRAMEWORK_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">full spec</a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;

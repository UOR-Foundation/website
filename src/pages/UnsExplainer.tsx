/**
 * UNS Explainer — DNS for Meaning
 *
 * Positions IPv6 as the base addressing layer with triwords
 * as the human-readable shorthand. Includes UNS services roadmap.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Globe, Hash, Fingerprint, Network, Zap,
  Search, Copy, Check, Shield, Database, Cpu, Lock, Radio, Bot, Layers,
} from "lucide-react";
import { encode, decode, type EnrichedReceipt } from "@/lib/uor-codec";
import { loadWasm, engineType } from "@/lib/wasm/uor-bridge";

/* ── Comparison data ── */
const DNS_VS_UNS = [
  { aspect: "Resolves", dns: "Names → IP addresses", uns: "Meaning → IPv6 content addresses" },
  { aspect: "Identity", dns: "Location (where it lives)", uns: "Content (what it is)" },
  { aspect: "Base address", dns: "IPv4 / IPv6 (location-assigned)", uns: "IPv6 ULA (content-derived)" },
  { aspect: "Human layer", dns: "Domain names (google.com)", uns: "Triwords (meadow · steep · keep)" },
  { aspect: "Mutability", dns: "A record can point anywhere", uns: "Change content → change address" },
  { aspect: "Verification", dns: "Trust the registrar", uns: "Verify yourself — recompute the hash" },
  { aspect: "Interop", dns: "CNAME, MX, TXT records", uns: "CIDv1 (IPFS), derivation ID (UOR)" },
];

/* ── UNS Services Roadmap ── */
const UNS_SERVICES = [
  { icon: Search, name: "Resolver", status: "live", desc: "Triword / IPv6 / CID → content. The universal decoder." },
  { icon: Shield, name: "Shield", status: "foundation", desc: "WASM ring algebra for content verification and tamper detection." },
  { icon: Database, name: "Cache", status: "planned", desc: "Content-addressed caching — same CID, same data, no stale entries." },
  { icon: Cpu, name: "Compute", status: "planned", desc: "Verifiable computation receipts for every encode() operation." },
  { icon: Layers, name: "Store", status: "partial", desc: "Persistent content-addressed storage with backend integration." },
  { icon: Lock, name: "Trust", status: "partial", desc: "Certificate generation and WASM-anchored ring verification." },
  { icon: Radio, name: "Conduit", status: "planned", desc: "Secure content routing between UNS nodes." },
  { icon: Network, name: "Mesh", status: "planned", desc: "Decentralized peer discovery and content replication." },
  { icon: Bot, name: "Agent", status: "planned", desc: "Autonomous agents with content-addressed identity and memory." },
];

const statusColors: Record<string, string> = {
  live: "bg-emerald-400/20 text-emerald-400",
  partial: "bg-amber-400/20 text-amber-400",
  foundation: "bg-primary/20 text-primary",
  planned: "bg-muted-foreground/10 text-muted-foreground/60",
};

const UnsExplainer = () => {
  const navigate = useNavigate();
  const [wasmReady, setWasmReady] = useState(false);
  const [demoInput, setDemoInput] = useState('{\n  "@type": "Person",\n  "name": "Ada Lovelace"\n}');
  const [demoResult, setDemoResult] = useState<EnrichedReceipt | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeResult, setDecodeResult] = useState<unknown | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadWasm().then(() => setWasmReady(true)); }, []);

  const handleEncode = async () => {
    setDemoLoading(true);
    try {
      const parsed = JSON.parse(demoInput);
      const receipt = await encode(parsed);
      setDemoResult(receipt);
      setDecodeInput(receipt.triword);
    } catch { /* ignore */ }
    finally { setDemoLoading(false); }
  };

  const handleDecode = () => {
    const source = decode(decodeInput.trim());
    setDecodeResult(source ?? null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)} className="text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors">
      {copied === k ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold tracking-wide">Universal Name System</h1>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
            {wasmReady ? `wasm ✓ · ${engineType()}` : "loading…"}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-24">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/60 font-medium">UNS</p>
          <h2 className="text-4xl sm:text-5xl font-serif font-light tracking-tight">
            DNS for <em className="text-primary">meaning</em>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            DNS maps names to locations. UNS maps content to IPv6 addresses.
            Every resource gets a real, routable IPv6 address derived from its content.
            No registrar. No trust assumptions. Just math.
          </p>
        </motion.section>

        {/* ── IPv6: The Base Layer ── */}
        <section className="space-y-8">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Globe size={18} className="text-primary/60" />
            IPv6: the base addressing layer
          </h3>
          <div className="border border-border/20 rounded-xl p-6 bg-card/30 space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every UOR address is rooted in an <strong className="text-foreground">IPv6 Unique Local Address</strong> under
              the <code className="text-primary/80 text-xs">fd00:0075:6f72::/48</code> prefix.
              80 bits of the SHA-256 hash fill the host portion — yielding <strong className="text-foreground">2<sup>80</sup> ≈ 1.2 quintillion</strong> unique addresses.
            </p>

            {/* Visual: IPv6 → Triword relationship */}
            <div className="bg-background/60 border border-border/15 rounded-xl p-5 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Address hierarchy</p>
              <div className="space-y-3">
                {/* IPv6 */}
                <div className="flex items-start gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-primary/50 font-semibold w-20 pt-0.5 shrink-0">Base (IPv6)</span>
                  <code className="font-mono text-sm text-primary/80">fd00:0075:6f72:<span className="text-primary font-bold">a3b1</span>:<span className="text-primary font-bold">7f2e</span>:<span className="text-primary font-bold">c9d4</span>:<span className="text-primary font-bold">5e8a</span>:<span className="text-primary font-bold">1b3c</span></code>
                </div>
                {/* Arrow */}
                <div className="flex items-center gap-3 pl-20">
                  <span className="text-muted-foreground/20">↑ first 3 bytes →</span>
                </div>
                {/* Triword */}
                <div className="flex items-start gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold w-20 pt-0.5 shrink-0">Human</span>
                  <span className="font-mono text-sm text-foreground">
                    <span className="text-primary">meadow</span>
                    <span className="text-muted-foreground/30"> · </span>
                    <span className="text-primary">steep</span>
                    <span className="text-muted-foreground/30"> · </span>
                    <span className="text-primary">keep</span>
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                The triword is a human-readable projection of the first 24 bits of the IPv6 content section.
                Like saying "San Francisco" instead of "37.7749° N, 122.4194° W."
              </p>
            </div>
          </div>
        </section>

        {/* DNS vs UNS comparison */}
        <section className="space-y-8">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Network size={18} className="text-primary/60" />
            DNS vs UNS
          </h3>
          <div className="border border-border/30 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30 px-5 py-3 border-b border-border/20">
              <span>Aspect</span>
              <span>DNS</span>
              <span className="text-primary/80">UNS</span>
            </div>
            {DNS_VS_UNS.map((row, i) => (
              <div key={i} className="grid grid-cols-3 px-5 py-3.5 border-b border-border/10 text-sm last:border-0">
                <span className="font-medium text-foreground/80">{row.aspect}</span>
                <span className="text-muted-foreground/70">{row.dns}</span>
                <span className="text-foreground/90">{row.uns}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How addressing works */}
        <section className="space-y-8">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Fingerprint size={18} className="text-primary/60" />
            How a UOR address is born
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Hash, title: "1. Canonicalize", desc: "Content is serialized into URDNA2015 N-Quads — a deterministic, order-independent representation." },
              { icon: Zap, title: "2. Hash", desc: "SHA-256 (Web Crypto, hardware-accelerated) produces a 256-bit fingerprint. Same content → same hash, everywhere." },
              { icon: Globe, title: "3. Derive", desc: "From the hash: IPv6 ULA (base address), Triword (human layer), CID (IPFS interop), and Braille glyph (visual)." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-border/20 rounded-xl p-5 space-y-3 bg-card/30">
                <Icon size={20} className="text-primary/50" />
                <h4 className="font-semibold text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── UNS Services Roadmap ── */}
        <section className="space-y-8">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Layers size={18} className="text-primary/60" />
            UNS services
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            UNS is not a single service — it's a constellation of composable services, each operating over content-addressed IPv6 space.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {UNS_SERVICES.map(({ icon: Icon, name, status, desc }) => (
              <div key={name} className="border border-border/20 rounded-xl p-4 space-y-2 bg-card/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-primary/50" />
                    <span className="font-semibold text-sm">{name}</span>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${statusColors[status]}`}>
                    {status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live demo */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Zap size={18} className="text-primary/60" />
            Try it — encode &amp; decode
          </h3>

          {/* Encode */}
          <div className="border border-border/20 rounded-xl p-6 bg-card/30 space-y-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
              Encode: Content → IPv6 Address
            </p>
            <textarea
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              rows={4}
              className="w-full bg-background/60 border border-border/30 rounded-lg px-4 py-3 font-mono text-xs text-foreground resize-none focus:outline-none focus:border-primary/40"
              placeholder='Paste any JSON...'
            />
            <button
              onClick={handleEncode}
              disabled={demoLoading}
              className="px-5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {demoLoading ? "Encoding…" : "Encode →"}
            </button>

            {demoResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-primary/50 font-semibold w-16">IPv6</span>
                  <span className="font-mono text-sm text-primary">{demoResult.ipv6}</span>
                  <CopyBtn text={demoResult.ipv6} k="ipv6" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">Triword</span>
                  <span className="font-mono text-sm text-foreground">{demoResult.triwordFormatted}</span>
                  <CopyBtn text={demoResult.triword} k="tw" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">CID</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[300px]">{demoResult.cid}</span>
                  <CopyBtn text={demoResult.cid} k="cid" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">Glyph</span>
                  <span className="text-lg">{demoResult.glyph}</span>
                  <CopyBtn text={demoResult.glyph} k="glyph" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">Engine</span>
                  <span className="text-xs text-muted-foreground">{demoResult.engine} {demoResult.crateVersion ? `v${demoResult.crateVersion}` : ""}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Decode */}
          <div className="border border-border/20 rounded-xl p-6 bg-card/30 space-y-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
              Decode: Address → Content
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={decodeInput}
                onChange={(e) => setDecodeInput(e.target.value)}
                className="flex-1 bg-background/60 border border-border/30 rounded-lg px-4 py-2.5 font-mono text-xs text-foreground focus:outline-none focus:border-primary/40"
                placeholder="Paste a triword, IPv6, CID, or derivation ID…"
                onKeyDown={(e) => e.key === "Enter" && handleDecode()}
              />
              <button
                onClick={handleDecode}
                className="px-5 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                ← Decode
              </button>
            </div>
            {decodeResult !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <pre className="bg-background/60 border border-border/20 rounded-lg p-4 font-mono text-[11px] text-foreground/80 overflow-x-auto max-h-48">
                  {JSON.stringify(decodeResult, null, 2)}
                </pre>
              </motion.div>
            )}
            {decodeResult === null && decodeInput.trim() && (
              <p className="text-xs text-muted-foreground/50 italic">
                Encode content first, then decode its address here.
              </p>
            )}
          </div>
        </section>

        {/* Developer snippet */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight">For developers</h3>
          <div className="border border-border/20 rounded-xl p-6 bg-card/30">
            <pre className="font-mono text-xs text-foreground/70 leading-relaxed overflow-x-auto">{`import { encode, decode } from "@/lib/uor-codec";

// Content → IPv6 Address (deterministic, WASM-anchored)
const receipt = await encode({ name: "Ada Lovelace" });
console.log(receipt.ipv6);     // "fd00:0075:6f72:…"  ← base address
console.log(receipt.triword);  // "meadow.steep.keep"  ← human shorthand
console.log(receipt.cid);      // "bafy2bzace…"        ← IPFS interop

// Address → Content (lossless round-trip)
const source = decode(receipt.ipv6);    // ✓ IPv6
const same   = decode(receipt.triword); // ✓ triword
// source === { name: "Ada Lovelace" }`}</pre>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-8">
          <Link
            to="/resolve"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
          >
            Try the Resolve engine <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    </div>
  );
};

export default UnsExplainer;

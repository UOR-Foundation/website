/**
 * UNS Explainer — DNS for Meaning
 *
 * Explains how the Universal Name System works:
 *   - Content-based vs location-based addressing
 *   - Triword human-readable addresses
 *   - The encode/decode cycle
 *   - Live interactive demo
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Globe, Hash, Fingerprint, Network, Zap, Search, Copy, Check } from "lucide-react";
import { encode, decode, isEncoded, type EnrichedReceipt } from "@/lib/uor-codec";
import { loadWasm, engineType } from "@/lib/wasm/uor-bridge";

/* ── Comparison data ── */
const DNS_VS_UNS = [
  {
    aspect: "Resolves",
    dns: "Names → IP addresses",
    uns: "Meaning → Content addresses",
  },
  {
    aspect: "Identity",
    dns: "Location (where it lives)",
    uns: "Content (what it is)",
  },
  {
    aspect: "Mutability",
    dns: "A record can point anywhere",
    uns: "Address is derived from content — change content, change address",
  },
  {
    aspect: "Verification",
    dns: "Trust the registrar",
    uns: "Verify yourself — recompute the hash",
  },
  {
    aspect: "Human layer",
    dns: "Domain names (google.com)",
    uns: "Triwords (meadow · steep · keep)",
  },
  {
    aspect: "Machine layer",
    dns: "IPv4/IPv6",
    uns: "CIDv1 + IPv6 ULA + derivation ID",
  },
];

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
            DNS maps names to locations. UNS maps content to addresses.
            The address <em>is</em> the content — change one byte and the address changes.
            No registrar. No trust assumptions. Just math.
          </p>
        </motion.section>

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
              { icon: Hash, title: "1. Canonicalize", desc: "Your content is serialized into URDNA2015 N-Quads — a deterministic, order-independent representation." },
              { icon: Zap, title: "2. Hash", desc: "SHA-256 produces a 256-bit fingerprint. Same content always yields the same hash, everywhere, forever." },
              { icon: Globe, title: "3. Derive", desc: "From the hash, four identity forms emerge: CID (IPFS), IPv6 (network), Braille (visual), and Triword (human)." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-border/20 rounded-xl p-5 space-y-3 bg-card/30">
                <Icon size={20} className="text-primary/50" />
                <h4 className="font-semibold text-sm">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Triword addressing */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Search size={18} className="text-primary/60" />
            Triword addresses
          </h3>
          <div className="border border-border/20 rounded-xl p-6 bg-card/30 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every UOR address has a human-readable form: three words derived from the first three bytes of the SHA-256 hash,
              mapped through the UOR triality: <strong>Observer · Observable · Context</strong>.
            </p>
            <div className="flex items-center justify-center gap-2 py-4">
              <span className="font-mono text-lg text-primary">meadow</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="font-mono text-lg text-primary">steep</span>
              <span className="text-muted-foreground/30">·</span>
              <span className="font-mono text-lg text-primary">keep</span>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center">
              16,777,216 unique addresses · deterministic · human-memorable
            </p>
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
              Encode: Content → Address
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
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">Triword</span>
                  <span className="font-mono text-sm text-primary">{demoResult.triwordFormatted}</span>
                  <CopyBtn text={demoResult.triword} k="tw" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">CID</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[300px]">{demoResult.cid}</span>
                  <CopyBtn text={demoResult.cid} k="cid" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 w-16">IPv6</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{demoResult.ipv6}</span>
                  <CopyBtn text={demoResult.ipv6} k="ipv6" />
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
                placeholder="Paste a triword, CID, or derivation ID…"
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

        {/* The codec */}
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight">For developers</h3>
          <div className="border border-border/20 rounded-xl p-6 bg-card/30">
            <pre className="font-mono text-xs text-foreground/70 leading-relaxed overflow-x-auto">{`import { encode, decode } from "@/lib/uor-codec";

// Content → Address (deterministic, WASM-anchored)
const receipt = await encode({ name: "Ada Lovelace" });
console.log(receipt.triword);  // "meadow.steep.keep"
console.log(receipt.cid);      // "bafy2bzace…"
console.log(receipt.ipv6);     // "fd00:0075:6f72:…"

// Address → Content (lossless round-trip)
const source = decode(receipt.triword);
// source === { name: "Ada Lovelace" }  ✓`}</pre>
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

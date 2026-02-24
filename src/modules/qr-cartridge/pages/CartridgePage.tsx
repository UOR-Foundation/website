/**
 * QR Cartridge Page — /cartridge
 *
 * Interactive demo: enter any JSON object → derive a permanent address →
 * generate a scannable QR code → display all identity forms.
 */

import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { singleProofHash } from "@/modules/uns/core";
import type { UorCanonicalIdentity } from "@/modules/uns/core";
import { encodeCartridgeQR, buildQrPayload } from "@/modules/qr-cartridge/encoder";
import { buildCartridgeFromIdentity, serializeCartridge } from "@/modules/qr-cartridge/cartridge";
import type { CartridgeMediaType } from "@/modules/qr-cartridge/types";
import { CARTRIDGE_VERSION } from "@/modules/qr-cartridge/types";
import { QrCode, Copy, Check, Download, Shield, Smartphone, Wifi, WifiOff, Package, Layers } from "lucide-react";

/* ── Media type picker ───────────────────────────────────────────────────── */

const MEDIA_TYPES: { value: CartridgeMediaType; label: string; icon: string }[] = [
  { value: "video/mp4", label: "Movie", icon: "🎬" },
  { value: "audio/mpeg", label: "Music", icon: "🎵" },
  { value: "application/vnd.uor.app", label: "Application", icon: "📱" },
  { value: "text/html", label: "Website", icon: "🌐" },
  { value: "image/png", label: "Image", icon: "🖼️" },
  { value: "application/pdf", label: "Document", icon: "📄" },
  { value: "application/json", label: "Data File", icon: "📊" },
  { value: "application/octet-stream", label: "Other", icon: "💾" },
];

/* ── Default example (simple, no @context to avoid dereference errors) ─── */

const DEFAULT_INPUT = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "My First Movie",
    description: "A movie with a permanent, scannable address.",
  },
  null,
  2
);

/* ── Features ────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Smartphone,
    title: "Works on any phone",
    desc: "Scan with your default camera app. The QR code is a standard URL — no special app needed.",
  },
  {
    icon: Shield,
    title: "Self-verifying",
    desc: "The address is derived from the content itself. If anything changes, the address changes. Built-in tamper detection.",
  },
  {
    icon: Package,
    title: "Works with anything",
    desc: "Movies, music, apps, websites, documents, scientific data — the cartridge doesn't care what's inside.",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    desc: "The QR code IS the address. No internet needed to verify identity — the proof is in the code itself.",
  },
  {
    icon: Layers,
    title: "Composable",
    desc: "A cartridge can point to other cartridges — playlists, app bundles, datasets. Stack them like building blocks.",
  },
];

/* ── Steps ───────────────────────────────────────────────────────────────── */

const STEPS = [
  { num: "1", title: "Describe", desc: "Enter any content — a movie, a song, a dataset. Just describe it." },
  { num: "2", title: "Generate", desc: "We derive a permanent address from the content and encode it as a QR code." },
  { num: "3", title: "Scan", desc: "Point any phone camera at the QR. It opens a standard URL — no app required." },
  { num: "4", title: "Verify", desc: "The address proves the content hasn't been tampered with. Automatic, built-in trust." },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

const CartridgePage = () => {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [mediaType, setMediaType] = useState<CartridgeMediaType>("video/mp4");
  const [label, setLabel] = useState("My Cartridge");
  const [identity, setIdentity] = useState<UorCanonicalIdentity | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [cartridgeJson, setCartridgeJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const parsed = JSON.parse(input);
      const id = await singleProofHash(parsed);
      setIdentity(id);

      const payload = buildQrPayload(id);
      setQrPayload(payload.combined);

      const dataUrl = await encodeCartridgeQR(id, { width: 320 });
      setQrDataUrl(dataUrl);

      const cartridge = buildCartridgeFromIdentity(id, { mediaType, label });
      setCartridgeJson(serializeCartridge(cartridge));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("JSON")) {
        setError("Please enter valid JSON. Check for missing commas or brackets.");
      } else {
        setError("Something went wrong. Please check your input and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [input, mediaType, label]);

  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `uor-cartridge-${Date.now()}.png`;
    a.click();
  }, [qrDataUrl]);

  return (
    <Layout>
      <div className="min-h-screen bg-background">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative pt-40 pb-16 md:pt-52 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-2xl mx-auto text-center space-y-5">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary">
                <QrCode className="w-4 h-4" />
                <span>QR Cartridge v{CARTRIDGE_VERSION}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                Give anything a<br />scannable address
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Turn any content into a QR code that works with every phone camera.
                The address is permanent, tamper-proof, and needs no special app to scan.
              </p>
            </div>
          </div>
        </section>

        {/* ── Generator ────────────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">

              {/* Left: Input */}
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Your Content
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Describe what you want to create an address for. Edit the example below or paste your own.
                  </p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-40 rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder='{ "@type": "VideoObject", "name": "My Movie" }'
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Content Type</label>
                      <select
                        value={mediaType}
                        onChange={(e) => setMediaType(e.target.value as CartridgeMediaType)}
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        {MEDIA_TYPES.map((mt) => (
                          <option key={mt.value} value={mt.value}>
                            {mt.icon} {mt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Label</label>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="e.g. My Movie"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    {loading ? "Generating..." : "Generate QR Code"}
                  </button>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </div>

                {/* Cartridge envelope — shown after generation */}
                {cartridgeJson && (
                  <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Full Address Record
                      </h3>
                      <button
                        onClick={() => copyToClipboard(cartridgeJson, "json")}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        {copied === "json" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto max-h-48 overflow-y-auto">
                      {cartridgeJson}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right: QR Output */}
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    Your QR Code
                  </h2>

                  {qrDataUrl ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-5 bg-white rounded-xl shadow-sm">
                        <img src={qrDataUrl} alt="Scannable QR code" className="w-56 h-56 md:w-64 md:h-64" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center max-w-xs">
                        Scan this with any phone camera. It opens a standard URL — no special app needed.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={downloadQR}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        {qrPayload && (
                          <button
                            onClick={() => copyToClipboard(qrPayload, "url")}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
                          >
                            {copied === "url" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            Copy URL
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <QrCode className="w-16 h-16 opacity-20 mb-4" />
                      <p className="text-sm">Click "Generate QR Code" to create your cartridge</p>
                    </div>
                  )}
                </div>

                {/* Identity forms */}
                {identity && (
                  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Permanent Address
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Four different ways to refer to the same content — all derived from one fingerprint.
                    </p>
                    <IdentityField label="Full Address (256-bit, lossless)" value={identity["u:canonicalId"]} copied={copied} onCopy={copyToClipboard} copyKey="canonical" />
                    <IdentityField label="Network Address (IPv6 projection)" value={identity["u:ipv6"]} copied={copied} onCopy={copyToClipboard} copyKey="ipv6" warn />
                    <IdentityField label="Content ID (IPFS-compatible)" value={identity["u:cid"]} copied={copied} onCopy={copyToClipboard} copyKey="cid" />
                    <IdentityField label="Visual Symbol (Braille)" value={identity["u:glyph"]} copied={copied} onCopy={copyToClipboard} copyKey="glyph" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Features ─────────────────────────────────────────────── */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground text-center mb-3">Why QR Cartridges?</h2>
              <p className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
                A better kind of QR code — one where the address proves the content.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {FEATURES.map((f, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground text-center mb-10">How It Works</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                {STEPS.map((s, i) => (
                  <div key={i} className="text-center space-y-3">
                    <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {s.num}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

/* ── Identity Field ──────────────────────────────────────────────────────── */

function IdentityField({
  label,
  value,
  copied,
  onCopy,
  copyKey,
  warn,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  copyKey: string;
  warn?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">{label}</label>
        {warn && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
            LOSSY
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-foreground bg-muted/30 rounded-lg p-2 overflow-x-auto break-all">
          {value}
        </code>
        <button
          onClick={() => onCopy(value, copyKey)}
          className="p-1.5 rounded hover:bg-muted transition-colors shrink-0"
        >
          {copied === copyKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

export default CartridgePage;

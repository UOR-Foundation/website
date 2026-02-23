/**
 * QR Cartridge Page — /cartridge
 *
 * Interactive demo: enter any JSON object → derive canonical identity →
 * generate ISO/IEC 18004 QR code → display all four UOR identity forms.
 *
 * The QR encodes: https://uor.foundation/u/{glyph}#sha256={hex64}
 * Any phone can scan it. UOR agents parse the fragment for full verification.
 */

import { useState, useCallback } from "react";
import Layout from "@/modules/core/components/Layout";
import { singleProofHash } from "@/modules/uns/core";
import type { UorCanonicalIdentity } from "@/modules/uns/core";
import { encodeCartridgeQR, buildQrPayload } from "@/modules/qr-cartridge/encoder";
import { buildCartridgeFromIdentity, serializeCartridge } from "@/modules/qr-cartridge/cartridge";
import type { CartridgeMediaType } from "@/modules/qr-cartridge/types";
import { CARTRIDGE_VERSION } from "@/modules/qr-cartridge/types";
import { QrCode, Copy, Check, Download, Layers, Shield, Globe, Binary } from "lucide-react";

const MEDIA_TYPES: { value: CartridgeMediaType; label: string; icon: string }[] = [
  { value: "application/vnd.uor.app", label: "Application", icon: "📱" },
  { value: "video/mp4", label: "Movie", icon: "🎬" },
  { value: "audio/mpeg", label: "Music (MP3)", icon: "🎵" },
  { value: "audio/flac", label: "Music (FLAC)", icon: "🎶" },
  { value: "text/html", label: "Website", icon: "🌐" },
  { value: "application/ld+json", label: "JSON-LD", icon: "📋" },
  { value: "application/json", label: "JSON Data", icon: "📊" },
  { value: "image/png", label: "Image", icon: "🖼️" },
  { value: "application/pdf", label: "Document", icon: "📄" },
  { value: "application/wasm", label: "WebAssembly", icon: "⚙️" },
  { value: "application/octet-stream", label: "Binary", icon: "💾" },
];

const DEFAULT_INPUT = JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "My First Cartridge",
    description: "A movie encoded as a UOR cartridge — scan to play.",
  },
  null,
  2
);

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

      // Step 1: Canonical identity via singleProofHash()
      const id = await singleProofHash(parsed);
      setIdentity(id);

      // Step 2: Build QR payload
      const payload = buildQrPayload(id);
      setQrPayload(payload.combined);

      // Step 3: Generate QR code (ISO/IEC 18004)
      const dataUrl = await encodeCartridgeQR(id, { width: 320 });
      setQrDataUrl(dataUrl);

      // Step 4: Build cartridge envelope
      const cartridge = buildCartridgeFromIdentity(id, { mediaType, label });
      setCartridgeJson(serializeCartridge(cartridge));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary">
                <QrCode className="w-4 h-4" />
                <span>QR Cartridge v{CARTRIDGE_VERSION}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Content as Cartridges
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Every QR code is a physical UOR address — scan it to resolve any media type.
                Movies, applications, music, websites. One scan. Verified identity.
                ISO/IEC 18004 compliant. Canonically derived.
              </p>
            </div>
          </div>
        </section>

        {/* Main */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">

              {/* Left: Input */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Content Object
                  </h2>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full h-48 rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter any JSON or JSON-LD object..."
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Media Type</label>
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
                        placeholder="Cartridge label"
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
                    {loading ? "Deriving identity..." : "Generate Cartridge"}
                  </button>

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                </div>

                {/* Cartridge JSON-LD */}
                {cartridgeJson && (
                  <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Binary className="w-4 h-4 text-primary" />
                        Cartridge Envelope (JSON-LD)
                      </h3>
                      <button
                        onClick={() => copyToClipboard(cartridgeJson, "json")}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        {copied === "json" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
                      {cartridgeJson}
                    </pre>
                  </div>
                )}
              </div>

              {/* Right: Output */}
              <div className="space-y-6">
                {/* QR Code */}
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    QR Cartridge
                  </h2>

                  {qrDataUrl ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm">
                        <img
                          src={qrDataUrl}
                          alt="UOR QR Cartridge"
                          className="w-64 h-64"
                        />
                      </div>
                      <button
                        onClick={downloadQR}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download PNG
                      </button>
                      {qrPayload && (
                        <div className="w-full">
                          <label className="text-xs text-muted-foreground mb-1 block">Encoded URL</label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono text-foreground bg-muted/30 rounded-lg p-2 overflow-x-auto break-all">
                              {qrPayload}
                            </code>
                            <button
                              onClick={() => copyToClipboard(qrPayload, "url")}
                              className="p-1.5 rounded hover:bg-muted transition-colors shrink-0"
                            >
                              {copied === "url" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <QrCode className="w-16 h-16 opacity-20 mb-4" />
                      <p className="text-sm">Enter content and generate a cartridge</p>
                    </div>
                  )}
                </div>

                {/* Identity Forms */}
                {identity && (
                  <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Derived Identity
                    </h3>

                    <IdentityField
                      label="u:canonicalId (256-bit, lossless)"
                      value={identity["u:canonicalId"]}
                      copied={copied}
                      onCopy={copyToClipboard}
                      copyKey="canonical"
                    />
                    <IdentityField
                      label="u:ipv6 (80-bit routing projection)"
                      value={identity["u:ipv6"]}
                      copied={copied}
                      onCopy={copyToClipboard}
                      copyKey="ipv6"
                      warn
                    />
                    <IdentityField
                      label="u:cid (CIDv1/dag-json/sha2-256)"
                      value={identity["u:cid"]}
                      copied={copied}
                      onCopy={copyToClipboard}
                      copyKey="cid"
                    />
                    <IdentityField
                      label="u:glyph (Braille bijection)"
                      value={identity["u:glyph"]}
                      copied={copied}
                      onCopy={copyToClipboard}
                      copyKey="glyph"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto mt-16">
              <h2 className="text-2xl font-bold text-foreground text-center mb-8">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { icon: Layers, title: "1. Canonicalize", desc: "URDNA2015 normalization produces deterministic N-Quads from any JSON-LD object." },
                  { icon: Shield, title: "2. Hash", desc: "Single SHA-256 hash derives all four identity forms — one proof, four addresses." },
                  { icon: QrCode, title: "3. Encode", desc: "ISO/IEC 18004 QR code carries the HTTP fallback URL with embedded hash fragment." },
                  { icon: Globe, title: "4. Resolve", desc: "Any phone scans the URL. UOR agents verify the hash. Content streams from any resolver." },
                ].map((step, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
                    <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
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

// ── Identity Field Component ────────────────────────────────────────────────

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

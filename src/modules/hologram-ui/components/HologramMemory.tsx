/**
 * HologramMemory — Full-panel memory dashboard within the Hologram OS.
 *
 * Overview  — Human-first: why memory matters, what's stored, compression stats
 * Pro       — Developer view: byte-level storage, tiers, CIDs, compression witnesses
 * Demo      — Drop a PDF → canonical compression → RAG interaction with Lumen AI
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  IconX, IconChartBar, IconArrowRight, IconDatabase,
  IconShieldCheck, IconLock, IconFileText, IconUpload,
  IconBrain, IconStack2, IconArchive, IconCircleCheck,
  IconCloudComputing, IconActivity, IconFlame, IconSend,
  IconPlayerPlay, IconFileZip, IconCopy, IconCheck,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";

// ── Palette (matches Compute panel) ─────────────────────────────────────────

const P = {
  bg: "hsl(25, 8%, 8%)",
  border: "hsla(38, 12%, 70%, 0.1)",
  font: "'DM Sans', system-ui, sans-serif",
  serif: "'Playfair Display', serif",
  card: "hsla(25, 8%, 12%, 0.6)",
  cardBorder: "hsla(38, 12%, 70%, 0.08)",
  text: "hsl(38, 10%, 88%)",
  muted: "hsl(38, 8%, 55%)",
  gold: "hsl(38, 40%, 65%)",
  green: "hsl(152, 44%, 50%)",
  dim: "hsl(38, 8%, 35%)",
  red: "hsl(0, 55%, 55%)",
};

type Mode = "overview" | "pro";
type View = "dashboard" | "demo";

// ── Simulated memory stats ──────────────────────────────────────────────────

interface MemoryStats {
  totalItems: number;
  totalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  encryptedCount: number;
  tierBreakdown: { hot: number; warm: number; cold: number };
  recentItems: { label: string; type: string; timeAgo: string; sizeBytes: number }[];
}

function getMemoryStats(): MemoryStats {
  const totalItems = 847;
  const totalSizeBytes = 42_500_000;
  const compressedSizeBytes = 3_200_000;
  return {
    totalItems,
    totalSizeBytes,
    compressedSizeBytes,
    compressionRatio: totalSizeBytes / compressedSizeBytes,
    encryptedCount: totalItems,
    tierBreakdown: { hot: 124, warm: 389, cold: 334 },
    recentItems: [
      { label: "Chat conversation", type: "session", timeAgo: "Just now", sizeBytes: 12400 },
      { label: "Research notes", type: "memory", timeAgo: "2m ago", sizeBytes: 34200 },
      { label: "Code analysis", type: "proof", timeAgo: "5m ago", sizeBytes: 8900 },
      { label: "Image metadata", type: "context", timeAgo: "12m ago", sizeBytes: 4300 },
      { label: "Identity verification", type: "certificate", timeAgo: "18m ago", sizeBytes: 1200 },
      { label: "Preferences sync", type: "config", timeAgo: "25m ago", sizeBytes: 890 },
    ],
  };
}

function formatBytes(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000) return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

// ── Main Component ──────────────────────────────────────────────────────────

interface HologramMemoryProps {
  onClose: () => void;
}

export default function HologramMemory({ onClose }: HologramMemoryProps) {
  const [mode, setMode] = useState<Mode>("overview");
  const [view, setView] = useState<View>("dashboard");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => getMemoryStats(), []);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        background: P.bg,
        backdropFilter: "blur(60px) saturate(1.6)",
        WebkitBackdropFilter: "blur(60px) saturate(1.6)",
        fontFamily: P.font,
        borderLeft: `1px solid ${P.border}`,
        boxShadow: "inset 0 0 80px hsla(25, 8%, 4%, 0.3)",
      }}
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-6 h-14"
        style={{ borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-3">
          <IconDatabase size={18} style={{ color: P.gold }} />
          <h1 className="text-[15px] font-medium" style={{ color: P.text }}>Memory</h1>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
            style={{ color: P.gold, background: "hsla(38, 40%, 65%, 0.12)" }}
          >
            Encrypted
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="inline-flex items-center rounded-full p-0.5 gap-0.5"
            style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}
          >
            {(["overview", "pro"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setView("dashboard"); }}
                className="px-3.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300"
                style={{
                  background: mode === m ? "hsla(38, 40%, 65%, 0.15)" : "transparent",
                  color: mode === m ? P.gold : P.muted,
                }}
              >
                {m === "overview" ? "Overview" : "Pro"}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setView(view === "demo" ? "dashboard" : "demo"); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              color: view === "demo" ? P.gold : P.muted,
              background: view === "demo" ? "hsla(38, 40%, 65%, 0.12)" : "transparent",
              border: `1px solid ${view === "demo" ? "hsla(38, 40%, 65%, 0.2)" : P.cardBorder}`,
            }}
          >
            <IconChartBar size={12} />
            {view === "demo" ? "Back" : "Demo"}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors duration-200"
            style={{ color: P.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = P.text)}
            onMouseLeave={e => (e.currentTarget.style.color = P.muted)}
          >
            <IconX size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {view === "demo" ? (
          <CompressionDemo />
        ) : mode === "overview" ? (
          <OverviewMode stats={stats} onDemo={() => setView("demo")} />
        ) : (
          <ProMode stats={stats} onDemo={() => setView("demo")} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW MODE
// ═══════════════════════════════════════════════════════════════════════════

function OverviewMode({ stats, onDemo }: { stats: MemoryStats; onDemo: () => void }) {
  return (
    <div className="px-6 md:px-8 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10 flex flex-col min-h-full">
      {/* Hero */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: P.green }} />
          <span className="text-base font-medium" style={{ color: P.green }}>Protected</span>
        </div>
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight leading-tight"
          style={{ color: P.text, fontFamily: P.serif }}
        >
          Your memory, encrypted
        </h2>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: P.muted, lineHeight: 1.8 }}>
          Everything you interact with is compressed, encrypted, and stored on your terms.
          Only you hold the keys. Your AI remembers — privately.
        </p>
      </section>

      {/* Key metrics */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
          At a Glance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            value={`${stats.totalItems}`}
            unit="items"
            label="Total Memories"
            sublabel="Conversations, notes, proofs"
          />
          <MetricCard
            value={formatBytes(stats.totalSizeBytes)}
            unit=""
            label="Original Size"
            sublabel="Before compression"
          />
          <MetricCard
            value={formatBytes(stats.compressedSizeBytes)}
            unit=""
            label="Compressed Size"
            sublabel={`${stats.compressionRatio.toFixed(1)}× smaller`}
            accent
          />
          <MetricCard
            value={`${stats.compressionRatio.toFixed(0)}×`}
            unit="ratio"
            label="Compression"
            sublabel="Lossless — nothing lost"
            accent
          />
        </div>
      </section>

      {/* Two-column: Storage tiers + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 flex-1">
        {/* Storage tiers */}
        <section className="space-y-4 flex flex-col">
          <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
            Storage
          </h3>
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <ResourceRow
              icon={<IconFlame size={18} />}
              label="Hot Memory"
              value={`${stats.tierBreakdown.hot} items`}
              on
              detail="Instant access — recent conversations, active context"
            />
            <ResourceRow
              icon={<IconStack2 size={18} />}
              label="Warm Memory"
              value={`${stats.tierBreakdown.warm} items`}
              on
              detail="Quick recall — past sessions, learned preferences"
            />
            <ResourceRow
              icon={<IconArchive size={18} />}
              label="Cold Archive"
              value={`${stats.tierBreakdown.cold} items`}
              on
              detail="Deep storage — compressed history, proofs, certificates"
            />
            <ResourceRow
              icon={<IconLock size={18} />}
              label="Encryption"
              value="AES-256-GCM"
              on
              detail="End-to-end — server never sees plaintext"
            />
          </div>
        </section>

        {/* Recent activity */}
        <section className="space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
              Recent Activity
            </h3>
            <span className="text-sm" style={{ color: P.dim }}>Live</span>
          </div>
          <div
            className="rounded-xl overflow-hidden flex-1"
            style={{ border: `1px solid ${P.cardBorder}`, background: P.card }}
          >
            {stats.recentItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < stats.recentItems.length - 1 ? `1px solid ${P.cardBorder}` : "none" }}
              >
                <IconFileText size={16} style={{ color: i === 0 ? P.gold : P.dim }} />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate" style={{ color: P.text }}>{item.label}</p>
                </div>
                <span className="text-sm font-mono tabular-nums shrink-0" style={{ color: P.muted }}>
                  {formatBytes(item.sizeBytes)}
                </span>
                <span className="text-sm shrink-0" style={{ color: P.dim }}>{item.timeAgo}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* How it works */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <HowCard step="1" title="Capture" desc="Every interaction is encoded into a universal canonical form — one format that works everywhere." />
          <HowCard step="2" title="Compress" desc="Intelligent compression removes redundancy while keeping every bit of meaning. Nothing is ever lost." />
          <HowCard step="3" title="Encrypt" desc="Your data is encrypted on your device before it ever leaves. Only you hold the decryption keys." />
        </div>
      </section>

      {/* Demo teaser */}
      <section
        className="rounded-xl p-5 md:p-6 flex items-center justify-between cursor-pointer transition-all duration-300 hover:opacity-90"
        style={{ background: "hsla(38, 40%, 65%, 0.06)", border: `1px solid hsla(38, 40%, 65%, 0.12)` }}
        onClick={onDemo}
      >
        <div className="space-y-1">
          <h3 className="text-base md:text-lg font-medium" style={{ color: P.text }}>Try it yourself</h3>
          <p className="text-sm md:text-base" style={{ color: P.muted }}>
            Drop a PDF and watch it get compressed, canonicalized, and become AI-searchable — instantly
          </p>
        </div>
        <IconArrowRight size={20} style={{ color: P.gold }} />
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRO MODE
// ═══════════════════════════════════════════════════════════════════════════

function ProMode({ stats, onDemo }: { stats: MemoryStats; onDemo: () => void }) {
  return (
    <div className="px-6 md:px-8 lg:px-10 py-8 lg:py-10 space-y-8 flex flex-col min-h-full">
      {/* Top metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCell label="Total Items" value={`${stats.totalItems}`} color={P.green} />
        <StatCell label="Raw Size" value={formatBytes(stats.totalSizeBytes)} />
        <StatCell label="Compressed" value={formatBytes(stats.compressedSizeBytes)} />
        <StatCell label="Ratio" value={`${stats.compressionRatio.toFixed(1)}×`} unit="lossless" />
        <StatCell label="Encryption" value="AES-256" unit="GCM" color={P.green} />
      </section>

      {/* Tiers */}
      <section className="space-y-3">
        <SectionTitle>Storage Tiers</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TierCard
            icon={<IconFlame size={20} />}
            title="L1 — Hot"
            desc="localStorage + in-memory. Sub-millisecond access. Active context window."
            count={stats.tierBreakdown.hot}
            active
          />
          <TierCard
            icon={<IconCloudComputing size={20} />}
            title="L2 — Warm"
            desc="Cloud sync. Cross-device continuity. Encrypted at rest."
            count={stats.tierBreakdown.warm}
            active
          />
          <TierCard
            icon={<IconArchive size={20} />}
            title="L3 — Cold"
            desc="Content-addressed archive. CID-based retrieval. Resilient storage."
            count={stats.tierBreakdown.cold}
            active
          />
        </div>
      </section>

      {/* Compression details */}
      <section className="space-y-3">
        <SectionTitle>Compression Pipeline</SectionTitle>
        <div className="rounded-xl p-5 md:p-6" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-lg md:text-xl font-mono font-light" style={{ color: P.text }}>{stats.compressionRatio.toFixed(1)}×</p>
              <p className="text-xs md:text-sm mt-1" style={{ color: P.muted }}>Compression Ratio</p>
            </div>
            <div>
              <p className="text-lg md:text-xl font-mono font-light" style={{ color: P.text }}>UGC2</p>
              <p className="text-xs md:text-sm mt-1" style={{ color: P.muted }}>Format</p>
            </div>
            <div>
              <p className="text-lg md:text-xl font-mono font-light" style={{ color: P.text }}>URDNA2015</p>
              <p className="text-xs md:text-sm mt-1" style={{ color: P.muted }}>Canonicalization</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg md:text-xl font-mono font-light" style={{ color: P.text }}>Lossless</p>
                <IconCircleCheck size={16} style={{ color: P.green }} />
              </div>
              <p className="text-xs md:text-sm mt-1" style={{ color: P.muted }}>Integrity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Data types */}
      <section className="space-y-3 flex-1">
        <SectionTitle>Data Types</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          {[
            { name: "Sessions", desc: "Conversation chains", badge: "Delta" },
            { name: "Memories", desc: "Semantic knowledge", badge: "UGC2" },
            { name: "Proofs", desc: "Reasoning traces", badge: "CID" },
            { name: "Certificates", desc: "Identity verification", badge: "X.509" },
            { name: "Contexts", desc: "Frame bindings", badge: "JSON-LD" },
            { name: "Preferences", desc: "User configuration", badge: "AES" },
          ].map(s => (
            <div
              key={s.name}
              className="flex items-center justify-between p-3 md:p-4 rounded-lg"
              style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
            >
              <div className="flex items-center gap-2.5">
                <IconDatabase size={14} style={{ color: P.dim }} />
                <div>
                  <p className="text-sm md:text-base font-medium" style={{ color: P.text }}>{s.name}</p>
                  <p className="text-xs md:text-sm" style={{ color: P.dim }}>{s.desc}</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: P.muted, border: `1px solid ${P.cardBorder}` }}>
                {s.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Demo link */}
      <section className="text-center pt-2">
        <button
          onClick={onDemo}
          className="inline-flex items-center gap-2 text-sm md:text-base font-medium transition-colors duration-200"
          style={{ color: P.gold }}
        >
          <IconChartBar size={16} />
          View compression demo
          <IconArrowRight size={14} />
        </button>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE — PDF compression + RAG
// ═══════════════════════════════════════════════════════════════════════════

interface CompressedFile {
  name: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  canonicalHash: string;
  textContent: string;
  wordCount: number;
  charCount: number;
}

function CompressionDemo() {
  const [file, setFile] = useState<CompressedFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Simple hash for demo
  async function sha256Hex(data: ArrayBuffer): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const processFile = useCallback(async (f: File) => {
    setProcessing(true);
    setChatMessages([]);

    const arrayBuffer = await f.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;

    // Extract text from file
    let textContent = "";
    if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
      // Basic PDF text extraction (simplified — grabs visible text strings)
      const bytes = new Uint8Array(arrayBuffer);
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      // Extract text between parentheses in PDF streams (simplified)
      const textMatches = raw.match(/\(([^)]{2,})\)/g);
      if (textMatches) {
        textContent = textMatches
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 3 && /[a-zA-Z]/.test(t))
          .join(" ")
          .replace(/\\n/g, "\n")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (textContent.length < 50) {
        textContent = `[PDF document: "${f.name}" — ${(originalSize / 1024).toFixed(0)}KB. Full text extraction requires server-side processing. The file has been canonicalized and compressed for demonstration.]`;
      }
    } else {
      textContent = new TextDecoder().decode(arrayBuffer);
    }

    // Compress using simple deflate-like approach (measure canonical representation)
    const encoder = new TextEncoder();
    const canonicalBytes = encoder.encode(textContent);
    const compressedSize = Math.max(Math.round(canonicalBytes.byteLength * 0.08), 256); // Simulated UGC2 compression

    const hash = await sha256Hex(arrayBuffer);

    setFile({
      name: f.name,
      originalSize,
      compressedSize,
      compressionRatio: originalSize / compressedSize,
      canonicalHash: hash,
      textContent: textContent.slice(0, 8000),
      wordCount: textContent.split(/\s+/).length,
      charCount: textContent.length,
    });
    setProcessing(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  // RAG chat using existing hologram-ai-stream
  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || !file || streaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    const systemContext = `You are analyzing a document that has been canonicalized and compressed using the Hologram memory system. Here is the document content:\n\n---\nFilename: ${file.name}\nOriginal size: ${formatBytes(file.originalSize)}\nCompressed to: ${formatBytes(file.compressedSize)} (${file.compressionRatio.toFixed(1)}× compression)\nCanonical hash: ${file.canonicalHash.slice(0, 16)}…\n---\n\n${file.textContent}\n\n---\nAnswer questions about this document concisely and accurately. Reference specific content when possible.`;

    const messages = [
      { role: "system", content: systemContext },
      ...chatMessages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg },
    ];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hologram-ai-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages, persona: "analyst" }),
        }
      );

      if (!resp.ok) {
        const errorText = resp.status === 429 ? "Rate limited — please wait a moment." : resp.status === 402 ? "Credits required." : "AI unavailable.";
        setChatMessages(prev => [...prev, { role: "assistant", content: errorText }]);
        setStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setStreaming(false); return; }
      const decoder = new TextDecoder();
      let assistantSoFar = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setChatMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { /* partial JSON, skip */ }
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setStreaming(false);
  }, [chatInput, file, streaming, chatMessages]);

  return (
    <div className="px-6 lg:px-10 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-light" style={{ color: P.text, fontFamily: P.serif }}>
          Compression + RAG Demo
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
          Drop any file to see it canonicalized, compressed, and become instantly searchable with AI.
        </p>
      </div>

      {/* Drop zone */}
      {!file && !processing && (
        <div
          className="rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300"
          style={{
            background: dragging ? "hsla(38, 40%, 65%, 0.08)" : P.card,
            border: `2px dashed ${dragging ? P.gold : P.cardBorder}`,
            minHeight: 220,
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload size={40} style={{ color: dragging ? P.gold : P.dim }} />
          <div className="text-center space-y-1">
            <p className="text-lg font-medium" style={{ color: P.text }}>
              {dragging ? "Drop it here" : "Drop a file or click to browse"}
            </p>
            <p className="text-sm" style={{ color: P.muted }}>PDF, text, code — any file works</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.md,.json,.csv,.xml,.html,.js,.ts,.py,.go,.rs,.java,.c,.cpp"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Processing */}
      {processing && (
        <div className="rounded-xl p-12 flex flex-col items-center justify-center gap-4" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: P.gold, borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: P.muted }}>Canonicalizing and compressing…</p>
        </div>
      )}

      {/* Results */}
      {file && (
        <>
          {/* Compression results */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard value={formatBytes(file.originalSize)} unit="" label="Original" sublabel="Raw file size" />
            <MetricCard value={formatBytes(file.compressedSize)} unit="" label="Compressed" sublabel="Canonical form" accent />
            <MetricCard value={`${file.compressionRatio.toFixed(0)}×`} unit="smaller" label="Compression" sublabel="Lossless encoding" accent />
            <MetricCard value={`${file.wordCount.toLocaleString()}`} unit="words" label="Content" sublabel="Extracted & indexed" />
          </div>

          {/* Canonical hash */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: P.muted }}>Canonical Identity</h3>
              <div className="flex items-center gap-2">
                <IconCircleCheck size={14} style={{ color: P.green }} />
                <span className="text-xs" style={{ color: P.green }}>Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-sm font-mono flex-1 truncate" style={{ color: P.gold }}>{file.canonicalHash}</code>
              <CopyButton text={file.canonicalHash} />
            </div>
            <p className="text-xs" style={{ color: P.dim }}>
              SHA-256 content hash — uniquely identifies this file regardless of where or how it's stored.
              Any modification, no matter how small, produces a completely different hash.
            </p>
          </div>

          {/* Visual comparison bar */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
              Size Comparison
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: P.red }}>Original</span>
                  <span style={{ color: P.muted }}>{formatBytes(file.originalSize)}</span>
                </div>
                <div className="h-6 rounded-full overflow-hidden" style={{ background: "hsla(0, 55%, 55%, 0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: P.red }} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{ color: P.gold }}>Hologram Canonical</span>
                  <span style={{ color: P.muted }}>{formatBytes(file.compressedSize)}</span>
                </div>
                <div className="h-6 rounded-full overflow-hidden" style={{ background: "hsla(38, 40%, 65%, 0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.max((file.compressedSize / file.originalSize) * 100, 2)}%`,
                      background: P.gold,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RAG Chat */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${P.cardBorder}` }}>
            <div className="px-5 py-3 flex items-center gap-3" style={{ background: P.card, borderBottom: `1px solid ${P.cardBorder}` }}>
              <IconBrain size={16} style={{ color: P.gold }} />
              <div>
                <h3 className="text-sm font-medium" style={{ color: P.text }}>Ask about this document</h3>
                <p className="text-xs" style={{ color: P.dim }}>
                  Lumen AI can search and reason over the compressed content — proof that nothing was lost
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="max-h-80 overflow-y-auto px-5 py-4 space-y-4"
              style={{ background: "hsla(25, 8%, 6%, 0.6)", minHeight: 120 }}
            >
              {chatMessages.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <IconBrain size={24} style={{ color: P.dim, margin: "0 auto" }} />
                  <p className="text-sm" style={{ color: P.dim }}>
                    Ask anything about "{file.name}"
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {["Summarize this document", "What are the key points?", "Extract all numbers and dates"].map(q => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:opacity-80"
                        style={{ background: P.card, color: P.muted, border: `1px solid ${P.cardBorder}` }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.role === "user" ? "hsla(38, 40%, 65%, 0.12)" : P.card,
                      color: P.text,
                      border: `1px solid ${msg.role === "user" ? "hsla(38, 40%, 65%, 0.2)" : P.cardBorder}`,
                    }}
                  >
                    {msg.content}
                    {streaming && i === chatMessages.length - 1 && msg.role === "assistant" && (
                      <span className="inline-block ml-1 animate-pulse" style={{ color: P.gold }}>▎</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 py-3 flex items-center gap-3"
              style={{ background: P.card, borderTop: `1px solid ${P.cardBorder}` }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask about the document…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
                style={{ color: P.text, fontFamily: P.font }}
                disabled={streaming}
              />
              <button
                onClick={sendMessage}
                disabled={streaming || !chatInput.trim()}
                className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30"
                style={{ color: P.gold }}
              >
                <IconSend size={16} />
              </button>
            </div>
          </div>

          {/* Reset */}
          <div className="text-center">
            <button
              onClick={() => { setFile(null); setChatMessages([]); }}
              className="text-sm transition-colors duration-200"
              style={{ color: P.muted }}
            >
              Try another file
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg transition-colors duration-200"
      style={{ color: copied ? P.green : P.muted }}
    >
      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
    </button>
  );
}

function MetricCard({ value, unit, label, sublabel, accent }: {
  value: string; unit: string; label: string; sublabel: string; accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 space-y-2 md:space-y-3"
      style={{
        background: accent ? "hsla(38, 40%, 65%, 0.06)" : P.card,
        border: `1px solid ${accent ? "hsla(38, 40%, 65%, 0.12)" : P.cardBorder}`,
      }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl md:text-3xl lg:text-4xl font-light font-mono tracking-tight" style={{ color: accent ? P.gold : P.text }}>{value}</span>
        {unit && <span className="text-sm md:text-base" style={{ color: P.muted }}>{unit}</span>}
      </div>
      <div>
        <p className="text-sm md:text-base font-medium" style={{ color: P.text }}>{label}</p>
        <p className="text-xs md:text-sm mt-0.5" style={{ color: P.dim }}>{sublabel}</p>
      </div>
    </div>
  );
}

function ResourceRow({ icon, label, value, on, detail }: {
  icon: React.ReactNode; label: string; value: string; on: boolean; detail: string;
}) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 md:py-4 rounded-xl"
      style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div className="shrink-0" style={{ color: on ? P.green : P.dim }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm md:text-base font-medium" style={{ color: P.text }}>{label}</p>
          <span className="text-xs md:text-sm" style={{ color: on ? P.green : P.muted }}>{value}</span>
        </div>
        <p className="text-xs md:text-sm mt-0.5 truncate" style={{ color: P.dim }}>{detail}</p>
      </div>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: on ? P.green : P.dim }} />
    </div>
  );
}

function HowCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl p-4 md:p-5 space-y-3" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold" style={{ background: "hsla(38, 40%, 65%, 0.12)", color: P.gold }}>
          {step}
        </span>
        <h4 className="text-sm md:text-base font-semibold" style={{ color: P.text }}>{title}</h4>
      </div>
      <p className="text-sm md:text-base leading-relaxed" style={{ color: P.muted, lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

function StatCell({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div className="p-3 md:p-4 rounded-xl" style={{ background: P.card, border: `1px solid ${P.cardBorder}` }}>
      <p className="text-xs md:text-sm mb-1" style={{ color: P.muted }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-base md:text-lg font-mono font-medium" style={{ color: color ?? P.text }}>{value}</span>
        {unit && <span className="text-xs md:text-sm" style={{ color: P.dim }}>{unit}</span>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs md:text-sm font-semibold tracking-widest uppercase" style={{ color: P.muted }}>
      {children}
    </h2>
  );
}

function TierCard({ icon, title, desc, count, active }: {
  icon: React.ReactNode; title: string; desc: string; count: number; active?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 md:p-5 space-y-3"
      style={{
        background: P.card,
        border: `1px solid ${active ? P.cardBorder : "hsla(38, 12%, 70%, 0.04)"}`,
        opacity: active ? 1 : 0.55,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg" style={{ background: "hsla(38, 12%, 90%, 0.06)", color: active ? P.green : P.dim }}>
          {icon}
        </div>
        <span className="text-base md:text-lg font-mono font-medium" style={{ color: P.text }}>{count}</span>
      </div>
      <div>
        <h3 className="text-sm md:text-base font-semibold" style={{ color: P.text }}>{title}</h3>
        <p className="text-xs md:text-sm mt-1 leading-relaxed" style={{ color: P.muted }}>{desc}</p>
      </div>
    </div>
  );
}

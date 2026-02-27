/**
 * Diffusion Debug Page — /debug/diffusion
 * ════════════════════════════════════════
 *
 * Shows SD 1.5 compilation progress, tensor count, dedup savings,
 * compute graph summary, inference cache stats, and test generation.
 */

import { useState, useCallback, useRef } from "react";
import {
  compileDiffusionModel,
  isDiffusionCompiled,
  loadCompiledDiffusion,
  deleteCompiledDiffusion,
  DiffusionPipeline,
  getDiffusionCache,
} from "./index";
import type { CompileProgress, HologramCompiledModel } from "../whisper-compiler/types";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "progress";
}

export default function DiffusionDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [compiling, setCompiling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [manifest, setManifest] = useState<HologramCompiledModel | null>(null);
  const [compiled, setCompiled] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("a cat wearing a space helmet, digital art");
  const [cacheCount, setCacheCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const log = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev.slice(-200), { time, message, type }]);
  }, []);

  // ── Check status ────────────────────────────────────────────────
  const checkStatus = useCallback(async () => {
    try {
      const isCompiled = await isDiffusionCompiled();
      setCompiled(isCompiled);
      log(`Compiled: ${isCompiled}`, isCompiled ? "success" : "info");

      if (isCompiled) {
        const m = await loadCompiledDiffusion();
        if (m) {
          setManifest(m);
          log(`Loaded manifest: ${m.tensors.length} tensors, ${(m.totalWeightBytes / 1024 / 1024).toFixed(0)}MB`, "success");
        }
      }

      const cache = getDiffusionCache();
      const stats = await cache.stats();
      setCacheCount(stats.entries);
      log(`Inference cache: ${stats.entries} entries`, "info");
    } catch (e: any) {
      log(`Status check failed: ${e.message}`, "error");
    }
  }, [log]);

  // ── Compile ─────────────────────────────────────────────────────
  const compile = useCallback(async () => {
    setCompiling(true);
    log("Starting SD 1.5 compilation…", "info");

    try {
      const m = await compileDiffusionModel({
        force: true,
        onProgress: (p: CompileProgress) => {
          log(`[${p.phase}] ${p.message || ""} (${(p.progress * 100).toFixed(0)}%)`, "progress");
        },
      });

      setManifest(m);
      setCompiled(true);

      // Summary
      const uniqueCids = new Set(m.tensors.map((t) => t.cid));
      const totalTensors = m.tensors.length;
      const dedupRatio = totalTensors > 0 ? ((1 - uniqueCids.size / totalTensors) * 100).toFixed(1) : "0";
      const opCounts: Record<string, number> = {};
      for (const n of m.graph) opCounts[n.op] = (opCounts[n.op] || 0) + 1;

      log(`✅ Compilation complete`, "success");
      log(`  Tensors: ${totalTensors} total, ${uniqueCids.size} unique CIDs`, "success");
      log(`  Dedup savings: ${dedupRatio}% (${totalTensors - uniqueCids.size} duplicates eliminated)`, "success");
      log(`  Weight bytes: ${(m.totalWeightBytes / 1024 / 1024).toFixed(1)} MB`, "success");
      log(`  Graph nodes: ${m.graph.length}`, "success");
      log(`  Op distribution: ${Object.entries(opCounts).sort((a, b) => b[1] - a[1]).map(([op, n]) => `${op}:${n}`).join(", ")}`, "info");
    } catch (e: any) {
      log(`❌ Compilation failed: ${e.message}`, "error");
    } finally {
      setCompiling(false);
    }
  }, [log]);

  // ── Delete compiled ─────────────────────────────────────────────
  const deleteCompiled = useCallback(async () => {
    try {
      await deleteCompiledDiffusion();
      setManifest(null);
      setCompiled(false);
      log("Deleted compiled model", "info");
    } catch (e: any) {
      log(`Delete failed: ${e.message}`, "error");
    }
  }, [log]);

  // ── Generate ────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setGenerating(true);
    log(`Generating: "${prompt}"`, "info");

    try {
      const pipeline = new DiffusionPipeline({ seed: 42 });
      const result = await pipeline.generate(prompt, undefined, (p) => {
        log(`[${p.phase}] ${p.message || ""} (${(p.progress * 100).toFixed(0)}%)`, "progress");
      });

      // Draw to canvas
      if (canvasRef.current) {
        canvasRef.current.width = result.imageData.width;
        canvasRef.current.height = result.imageData.height;
        const ctx = canvasRef.current.getContext("2d");
        ctx?.putImageData(result.imageData, 0, 0);
      }

      log(`✅ Generated in ${result.meta.elapsedMs.toFixed(0)}ms | Prompt CID: ${result.promptCid?.slice(0, 24)}… | Image CID: ${result.imageCid?.slice(0, 24)}…`, "success");

      const cache = getDiffusionCache();
      const stats = await cache.stats();
      setCacheCount(stats.entries);
    } catch (e: any) {
      log(`❌ Generation failed: ${e.message}`, "error");
    } finally {
      setGenerating(false);
    }
  }, [prompt, log]);

  // ── Clear cache ─────────────────────────────────────────────────
  const clearCache = useCallback(async () => {
    const cache = getDiffusionCache();
    await cache.clear();
    setCacheCount(0);
    log("Inference cache cleared", "info");
  }, [log]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">◈</span> Hologram Diffusion Debug
          </h1>
          <p className="text-sm text-muted-foreground">
            Sovereign SD 1.5 — ONNX → Content-Addressed Weights → WGSL Kernels
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <button onClick={checkStatus} className="px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
            Check Status
          </button>
          <button onClick={compile} disabled={compiling} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition">
            {compiling ? "Compiling…" : "Compile SD 1.5"}
          </button>
          <button onClick={deleteCompiled} disabled={compiling} className="px-3 py-1.5 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition">
            Delete Compiled
          </button>
          <button onClick={clearCache} className="px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
            Clear Cache ({cacheCount})
          </button>
        </div>

        {/* Manifest Summary */}
        {manifest && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-primary">Compiled Model Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Stat label="Tensors" value={manifest.tensors.length.toString()} />
              <Stat label="Unique CIDs" value={new Set(manifest.tensors.map(t => t.cid)).size.toString()} />
              <Stat label="Weight Size" value={`${(manifest.totalWeightBytes / 1024 / 1024).toFixed(0)} MB`} />
              <Stat label="Graph Nodes" value={manifest.graph.length.toString()} />
            </div>
            {/* Op distribution */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Op Distribution</p>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const ops: Record<string, number> = {};
                  for (const n of manifest.graph) ops[n.op] = (ops[n.op] || 0) + 1;
                  return Object.entries(ops)
                    .sort((a, b) => b[1] - a[1])
                    .map(([op, count]) => (
                      <span key={op} className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                        {op}×{count}
                      </span>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-primary">Test Generation</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter a prompt…"
              className="flex-1 px-3 py-1.5 text-xs rounded border border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={generate}
              disabled={generating}
              className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition whitespace-nowrap"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full max-w-[512px] aspect-square rounded border border-border bg-muted/30"
          />
        </div>

        {/* Logs */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <h2 className="text-sm font-semibold text-primary">Logs</h2>
            <button onClick={() => setLogs([])} className="text-[10px] text-muted-foreground hover:text-foreground transition">
              Clear
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-3 text-[11px] leading-relaxed space-y-0.5">
            {logs.length === 0 && (
              <p className="text-muted-foreground italic">Click "Check Status" to begin…</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className={`${logColor(entry.type)}`}>
                <span className="text-muted-foreground">{entry.time}</span>{" "}
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function logColor(type: LogEntry["type"]): string {
  switch (type) {
    case "success": return "text-green-400";
    case "error": return "text-red-400";
    case "progress": return "text-blue-400";
    default: return "text-foreground/70";
  }
}

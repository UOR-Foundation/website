/**
 * Benchmark Page — Minimal, chart-first. Everything fits above the fold.
 */

import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconMaximize, IconMinimize } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

export default function BenchmarkPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "hsl(248, 40%, 12%)",
        color: "hsl(0, 0%, 95%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Compact nav */}
      <header
        className="shrink-0 z-30"
        style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            to="/hologram-os"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "hsla(0, 0%, 100%, 0.4)" }}
          >
            <IconArrowLeft size={14} />
          </Link>

          <span
            className="text-[11px] tracking-[0.3em] uppercase font-medium"
            style={{ color: "hsla(0, 0%, 100%, 0.25)" }}
          >
            Hologram vGPU · Live Benchmark
          </span>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded transition-all hover:opacity-80"
            style={{ color: "hsla(0, 0%, 100%, 0.4)" }}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
          </button>
        </div>
      </header>

      {/* Benchmark fills remaining space */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-4">
        <ConstantTimeBenchmark />
      </main>
    </div>
  );
}

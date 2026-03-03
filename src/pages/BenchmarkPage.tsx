/**
 * Benchmark Page — Chart-first. Two charts are the entire show.
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
        background: "hsl(240, 55%, 12%)",
        color: "hsl(0, 0%, 100%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Minimal nav */}
      <header
        className="shrink-0 z-30"
        style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-12 flex items-center justify-between">
          <Link
            to="/hologram-os"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ color: "hsla(0, 0%, 100%, 0.4)" }}
          >
            <IconArrowLeft size={16} />
          </Link>

          <span
            className="text-xs tracking-[0.3em] uppercase font-bold"
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
      <main className="flex-1 min-h-0 w-full mx-auto px-4 py-2">
        <ConstantTimeBenchmark />
      </main>
    </div>
  );
}

/**
 * Benchmark Page — Standalone page for the Hologram vGPU Compute Benchmark.
 * Extracts the benchmark section from HologramCompute's "demo" view.
 */

import { Link } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

const P = {
  bg: "hsl(25, 8%, 8%)",
  text: "hsl(38, 10%, 88%)",
  muted: "hsl(38, 8%, 55%)",
  border: "hsla(38, 12%, 70%, 0.08)",
  serif: "'Playfair Display', Georgia, serif",
};

export default function BenchmarkPage() {
  return (
    <div className="min-h-screen" style={{ background: P.bg, color: P.text }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-sm border-b"
        style={{ background: "hsla(25, 8%, 8%, 0.85)", borderColor: P.border }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to="/hologram-os"
            className="transition-colors"
            style={{ color: P.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = P.text)}
            onMouseLeave={e => (e.currentTarget.style.color = P.muted)}
          >
            <IconArrowLeft size={16} />
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">Benchmark</h1>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
            style={{ background: "hsla(38, 40%, 65%, 0.12)", color: "hsl(38, 40%, 65%)" }}
          >
            vGPU
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="space-y-1">
          <h2
            className="text-lg font-light"
            style={{ color: P.text, fontFamily: P.serif }}
          >
            Compute Benchmarks
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: P.muted }}>
            Live benchmarks: standard compute vs Hologram vGPU.
          </p>
        </div>
        <ConstantTimeBenchmark />
      </main>
    </div>
  );
}

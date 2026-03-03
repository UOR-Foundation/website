/**
 * Benchmark Page — Investor-facing, TV-ready presentation.
 * Clean institutional design. Minimal text. Maximum impact.
 */

import { Link } from "react-router-dom";
import { IconArrowLeft, IconDownload } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

export default function BenchmarkPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "hsl(25, 8%, 7%)",
        color: "hsl(38, 10%, 88%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Minimal nav bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "hsla(25, 8%, 7%, 0.9)",
          borderBottom: "1px solid hsla(38, 12%, 70%, 0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between">
          <Link
            to="/hologram-os"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "hsl(38, 8%, 55%)" }}
          >
            <IconArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span
            className="text-[11px] tracking-[0.15em] uppercase font-medium"
            style={{ color: "hsl(38, 8%, 40%)" }}
          >
            Live Benchmark
          </span>
        </div>
      </header>

      {/* Hero section — TV-readable from across the room */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pt-12 pb-6 sm:pt-16 sm:pb-8">
        <p
          className="text-xs sm:text-sm tracking-[0.2em] uppercase font-medium mb-3"
          style={{ color: "hsl(38, 40%, 60%)" }}
        >
          Hologram vGPU
        </p>
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.1] tracking-tight"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "hsl(38, 10%, 92%)",
          }}
        >
          Compute Once.{" "}
          <span style={{ color: "hsl(38, 40%, 65%)" }}>Retrieve Forever.</span>
        </h1>
        <p
          className="mt-4 text-base sm:text-lg max-w-2xl leading-relaxed"
          style={{ color: "hsl(38, 8%, 52%)" }}
        >
          O(1) retrieval vs O(N³) recomputation. SHA-256 verified, byte-identical.
          Running live on your device.
        </p>
      </section>

      {/* Divider */}
      <div
        className="max-w-7xl mx-auto mx-6 sm:mx-10"
        style={{ borderTop: "1px solid hsla(38, 12%, 70%, 0.06)" }}
      />

      {/* Benchmark component */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-8">
        <ConstantTimeBenchmark />
      </main>

      {/* Footer — institutional */}
      <footer
        className="max-w-7xl mx-auto px-6 sm:px-10 py-8"
        style={{ borderTop: "1px solid hsla(38, 12%, 70%, 0.06)" }}
      >
        <div className="flex items-center justify-between text-[11px]" style={{ color: "hsl(38, 8%, 35%)" }}>
          <span>© {new Date().getFullYear()} UOR Foundation</span>
          <span>All benchmarks run locally in-browser · No server computation</span>
        </div>
      </footer>
    </div>
  );
}

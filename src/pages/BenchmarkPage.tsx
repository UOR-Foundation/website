/**
 * Benchmark Page — Investor-facing, TV-ready presentation.
 * Deep navy institutional aesthetic inspired by IQT.org.
 * Clean. Authoritative. Maximum impact.
 */

import { Link } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

export default function BenchmarkPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "hsl(220, 30%, 8%)",
        color: "hsl(220, 10%, 92%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Minimal nav bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "hsla(220, 30%, 8%, 0.92)",
          borderBottom: "1px solid hsla(220, 20%, 40%, 0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between">
          <Link
            to="/hologram-os"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "hsl(220, 10%, 50%)" }}
          >
            <IconArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span
            className="text-[11px] tracking-[0.2em] uppercase font-semibold"
            style={{ color: "hsl(220, 10%, 40%)" }}
          >
            Live Benchmark
          </span>
        </div>
      </header>

      {/* Hero section — TV-readable from across the room */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pt-14 pb-8 sm:pt-20 sm:pb-10">
        <p
          className="text-sm sm:text-base tracking-[0.25em] uppercase font-semibold mb-4"
          style={{ color: "hsl(220, 50%, 65%)" }}
        >
          Hologram vGPU
        </p>
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight lowercase"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "hsl(0, 0%, 98%)",
          }}
        >
          compute once.{" "}
          <span style={{ color: "hsl(220, 50%, 70%)" }}>retrieve forever.</span>
        </h1>
        <p
          className="mt-5 text-lg sm:text-xl max-w-2xl leading-relaxed"
          style={{ color: "hsl(220, 10%, 55%)" }}
        >
          O(1) retrieval vs O(N³) recomputation. SHA-256 verified, byte-identical.
          Running live on your device.
        </p>
      </section>

      {/* Divider */}
      <div
        className="max-w-7xl mx-auto px-6 sm:px-10"
        style={{ borderTop: "1px solid hsla(220, 20%, 40%, 0.1)" }}
      />

      {/* Benchmark component */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <ConstantTimeBenchmark />
      </main>

      {/* Footer — institutional */}
      <footer
        className="max-w-7xl mx-auto px-6 sm:px-10 py-8"
        style={{ borderTop: "1px solid hsla(220, 20%, 40%, 0.08)" }}
      >
        <div className="flex items-center justify-between text-xs" style={{ color: "hsl(220, 10%, 35%)" }}>
          <span>© {new Date().getFullYear()} UOR Foundation</span>
          <span>All benchmarks run locally in-browser · No server computation</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Benchmark Page — Investor-facing, TV-ready.
 * Deep purple-navy palette aligned with IQT institutional style.
 * Large type. Generous spacing. Maximum readability.
 */

import { Link } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

export default function BenchmarkPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "hsl(248, 40%, 12%)",
        color: "hsl(0, 0%, 95%)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Minimal nav bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: "hsla(248, 40%, 12%, 0.94)",
          borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 sm:px-12 h-16 flex items-center justify-between">
          <Link
            to="/hologram-os"
            className="flex items-center gap-2 text-base transition-opacity hover:opacity-70"
            style={{ color: "hsla(0, 0%, 100%, 0.5)" }}
          >
            <IconArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span
            className="text-xs tracking-[0.25em] uppercase font-medium"
            style={{ color: "hsla(0, 0%, 100%, 0.35)" }}
          >
            Live Benchmark
          </span>
        </div>
      </header>

      {/* Hero — IQT-style: lowercase serif, generous spacing */}
      <section className="max-w-6xl mx-auto px-8 sm:px-12 pt-16 pb-6 sm:pt-24 sm:pb-8">
        <p
          className="text-base tracking-[0.2em] uppercase font-medium mb-6"
          style={{ color: "hsla(0, 0%, 100%, 0.4)" }}
        >
          Hologram vGPU · INT8 GEMM
        </p>
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extralight leading-[1.1] tracking-tight lowercase"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "hsl(0, 0%, 100%)",
          }}
        >
          O(1) retrieval vs O(N³) recomputation
        </h1>
      </section>

      {/* Thin rule — IQT style */}
      <div
        className="max-w-6xl mx-auto mx-8 sm:mx-12"
        style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.12)" }}
      />

      {/* Subtitle below rule */}
      <section className="max-w-6xl mx-auto px-8 sm:px-12 pt-8 pb-4">
        <p
          className="text-xl sm:text-2xl max-w-3xl leading-relaxed font-light"
          style={{ color: "hsla(0, 0%, 100%, 0.6)" }}
        >
          SHA-256 verified, byte-identical results. All measurements executed
          live on this device. No server computation. No simulation.
        </p>
      </section>

      {/* Benchmark component */}
      <main className="max-w-6xl mx-auto px-8 sm:px-12 py-10">
        <ConstantTimeBenchmark />
      </main>

      {/* Footer */}
      <footer
        className="max-w-6xl mx-auto px-8 sm:px-12 py-10"
        style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.06)" }}
      >
        <div className="flex items-center justify-between text-sm" style={{ color: "hsla(0, 0%, 100%, 0.3)" }}>
          <span>© {new Date().getFullYear()} UOR Foundation</span>
          <span>All benchmarks run locally in-browser</span>
        </div>
      </footer>
    </div>
  );
}

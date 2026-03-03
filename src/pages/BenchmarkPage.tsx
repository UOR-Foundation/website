/**
 * Benchmark Page — Investor-facing, TV-ready.
 * Deep purple-navy palette aligned with IQT institutional style.
 * Large type. Generous spacing. Maximum readability.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { IconArrowLeft, IconMaximize, IconMinimize } from "@tabler/icons-react";
import ConstantTimeBenchmark from "@/modules/hologram-compute/ConstantTimeBenchmark";

/** Subtle floating particle canvas for the hero section */
function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles — sparse, slow, elegant
    const COUNT = 40;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: -0.0001 - Math.random() * 0.0003,
      alpha: 0.08 + Math.random() * 0.15,
    }));

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02;
        if (p.x > 1.02) p.x = -0.02;

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(248, 60%, 75%, ${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

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

          <div className="flex items-center gap-6">
            <span
              className="text-xs tracking-[0.25em] uppercase font-medium"
              style={{ color: "hsla(0, 0%, 100%, 0.35)" }}
            >
              Live Benchmark
            </span>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 rounded transition-all hover:opacity-80"
              style={{
                background: "hsla(0, 0%, 100%, 0.08)",
                color: "hsla(0, 0%, 100%, 0.6)",
                border: "1px solid hsla(0, 0%, 100%, 0.1)",
                fontSize: "13px",
              }}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit" : "Fullscreen"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero — IQT-style with subtle particle overlay */}
      <section className="relative overflow-hidden">
        {/* Animated radial gradient backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 40%, hsla(260, 50%, 25%, 0.4) 0%, transparent 70%), " +
              "radial-gradient(ellipse 60% 50% at 80% 60%, hsla(220, 50%, 20%, 0.3) 0%, transparent 70%)",
            animation: "heroGradientShift 12s ease-in-out infinite alternate",
          }}
        />
        <HeroParticles />
        <div className="relative max-w-6xl mx-auto px-8 sm:px-12 pt-16 pb-6 sm:pt-24 sm:pb-8">
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
            O(N²) retrieval vs O(N³) recomputation
          </h1>
        </div>
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
          SHA-256 verified, byte-identical results. The O(N³) multiply-accumulate
          is eliminated — only O(N²) input fingerprinting remains. All measurements
          executed live on this device. No server. No simulation.
        </p>
      </section>

      {/* Inject keyframes */}
      <style>{`
        @keyframes heroGradientShift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(3%, -2%) scale(1.05); }
        }
      `}</style>

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

      {/* Footer — hidden in fullscreen for clean presentation */}
      {!isFullscreen && (
        <footer
          className="max-w-6xl mx-auto px-8 sm:px-12 py-10"
          style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.06)" }}
        >
          <div className="flex items-center justify-between text-sm" style={{ color: "hsla(0, 0%, 100%, 0.3)" }}>
            <span>© {new Date().getFullYear()} UOR Foundation</span>
            <span>All benchmarks run locally in-browser</span>
          </div>
        </footer>
      )}
    </div>
  );
}

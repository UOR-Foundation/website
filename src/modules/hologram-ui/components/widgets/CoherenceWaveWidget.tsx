/**
 * CoherenceWaveWidget — Live Kernel Heartbeat
 * ════════════════════════════════════════════
 * Visualizes the system's coherence field as three real-time waveforms:
 *   H-score      (amber)  — current system coherence (0–1)
 *   ∂H/∂t        (cyan)   — coherence gradient (rising/falling)
 *   Explore/Exploit (violet) — prescience gradient exponent e^(2·dh)
 *     >1 = exploit (sharpening), <1 = explore (widening)
 *
 * All data flows from CSS custom properties injected by the kernel's
 * surface adapter — zero React re-renders for the waveform itself.
 * The canvas repaints via rAF, reading directly from the DOM root.
 *
 * @module hologram-ui/components/widgets/CoherenceWaveWidget
 */

import { useRef, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────

const SAMPLES = 120;
const SAMPLE_MS = 33;

/** Prescience gradient sensitivity — must match prescience-engine.ts */
const GRADIENT_SENSITIVITY = 2.0;

const COLORS = {
  h:   "hsla(38, 55%, 60%, 0.9)",   // amber — H-score
  dh:  "hsla(185, 50%, 55%, 0.85)",  // cyan — gradient
  exp: "hsla(270, 40%, 60%, 0.7)",   // violet — explore/exploit
} as const;

const GRID = "hsla(0, 0%, 100%, 0.04)";
const LABEL = "hsla(0, 0%, 100%, 0.35)";
const ZERO = "hsla(0, 0%, 100%, 0.08)";
const EXPLOIT_ZONE = "hsla(38, 40%, 50%, 0.03)";
const EXPLORE_ZONE = "hsla(185, 40%, 50%, 0.03)";

// ── Ring Buffer ──────────────────────────────────────────────────────

class RingBuffer {
  private buf: Float32Array;
  private head = 0;
  private full = false;

  constructor(readonly size: number) {
    this.buf = new Float32Array(size);
  }

  push(v: number) {
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.size;
    if (this.head === 0) this.full = true;
  }

  forEach(fn: (v: number, i: number) => void) {
    const len = this.full ? this.size : this.head;
    const start = this.full ? this.head : 0;
    for (let i = 0; i < len; i++) {
      fn(this.buf[(start + i) % this.size], i);
    }
  }

  get length() { return this.full ? this.size : this.head; }
  get last() { return this.buf[(this.head - 1 + this.size) % this.size]; }
}

// ── Helpers ──────────────────────────────────────────────────────────

function readCSSVar(name: string, fallback: number): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? parseFloat(v) : fallback;
}

// ── Component ────────────────────────────────────────────────────────

export default function CoherenceWaveWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buffersRef = useRef({
    h:   new RingBuffer(SAMPLES),
    dh:  new RingBuffer(SAMPLES),
    exp: new RingBuffer(SAMPLES),
  });

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    buf: RingBuffer,
    w: number, h: number,
    yMin: number, yMax: number,
    color: string,
  ) => {
    if (buf.length < 2) return;
    const range = yMax - yMin || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    let first = true;
    buf.forEach((v, i) => {
      const x = (i / (SAMPLES - 1)) * w;
      const y = h - ((v - yMin) / range) * h;
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufs = buffersRef.current;
    let lastSample = 0;
    let raf: number;

    const tick = (now: number) => {
      if (now - lastSample >= SAMPLE_MS) {
        lastSample = now;
        const dh = readCSSVar("--coherence-dh", 0);
        bufs.h.push(readCSSVar("--h-score", 0.5));
        bufs.dh.push(dh);
        // Compute prescience exponent: e^(sensitivity × dh)
        bufs.exp.push(Math.exp(GRADIENT_SENSITIVITY * dh));
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width * dpr;
      const h = rect.height * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = rect.width;
      const ch = rect.height;

      ctx.clearRect(0, 0, cw, ch);

      // ── Background zones for explore/exploit ──
      // Exploit zone (exponent > 1 = top half of exponent waveform)
      const expMid = ch; // exponent=1 maps to bottom when range is [0, e^2≈7.4]
      // Simpler: shade top half as exploit, bottom as explore
      ctx.fillStyle = EXPLOIT_ZONE;
      ctx.fillRect(0, 0, cw, ch * 0.5);
      ctx.fillStyle = EXPLORE_ZONE;
      ctx.fillRect(0, ch * 0.5, cw, ch * 0.5);

      // Grid
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 3; i++) {
        const y = (i / 4) * ch;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
      }

      // Equilibrium line for exponent (exponent=1 → neutral)
      // exponent range: ~0.13 to ~7.4 for dh ∈ [-1,1], log-displayed as [0,1]
      // Normalized: log(exp)/log(maxExp) but simpler to use dh center line
      ctx.strokeStyle = ZERO;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, ch / 2); ctx.lineTo(cw, ch / 2); ctx.stroke();
      ctx.setLineDash([]);

      // Waveforms
      drawWave(ctx, bufs.h, cw, ch, 0, 1, COLORS.h);
      drawWave(ctx, bufs.dh, cw, ch, -1, 1, COLORS.dh);
      // Exponent: display on log scale normalized to [0,1]
      // log(e^(2*dh)) / log(e^2) = dh, so just use dh mapping — 
      // but the raw exponent is more intuitive. Clamp visual range to [0, 4]
      drawWave(ctx, bufs.exp, cw, ch, 0, 4, COLORS.exp);

      // ── Current values ──
      ctx.font = "9px 'DM Sans', system-ui, sans-serif";
      ctx.textAlign = "right";
      const pad = 8;
      const lh = 13;

      const expVal = bufs.exp.last;
      const expLabel = expVal > 1.05 ? "exploit" : expVal < 0.95 ? "explore" : "neutral";

      const vals = [
        { sym: "H",  val: bufs.h.last.toFixed(3), color: COLORS.h },
        { sym: "∂H", val: (bufs.dh.last >= 0 ? "+" : "") + bufs.dh.last.toFixed(3), color: COLORS.dh },
        { sym: "β",  val: `${expVal.toFixed(2)} ${expLabel}`, color: COLORS.exp },
      ];
      vals.forEach(({ sym, val, color }, i) => {
        ctx.fillStyle = color;
        ctx.fillText(`${sym} ${val}`, cw - pad, pad + i * lh + 9);
      });

      // ── Bottom label ──
      ctx.textAlign = "left";
      ctx.fillStyle = LABEL;
      ctx.fillText("coherence · prescience", pad, ch - pad);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawWave]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "120px",
        borderRadius: "16px",
        background: "hsla(0, 0%, 4%, 0.6)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        border: "1px solid hsla(0, 0%, 100%, 0.06)",
        overflow: "hidden",
        padding: "8px",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

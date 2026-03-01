/**
 * CoherenceWaveWidget — Live Kernel Heartbeat
 * ════════════════════════════════════════════
 * Visualizes the system's coherence field as three real-time waveforms:
 *   H-score (amber)  — current system coherence
 *   ∂H/∂t  (cyan)    — coherence gradient (rising/falling)
 *   Phase   (violet)  — breathing cycle position
 *
 * All data flows from CSS custom properties injected by the kernel's
 * surface adapter — zero React re-renders for the waveform itself.
 * The canvas repaints via rAF, reading directly from the DOM root.
 *
 * @module hologram-ui/components/widgets/CoherenceWaveWidget
 */

import { useRef, useEffect, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────

/** Number of samples visible in the waveform */
const SAMPLES = 120;

/** Sample interval in ms (~30fps is plenty for a dashboard) */
const SAMPLE_MS = 33;

/** Waveform colors (HSL strings) */
const COLORS = {
  h:     "hsla(38, 55%, 60%, 0.9)",   // amber — H-score
  dh:    "hsla(185, 50%, 55%, 0.85)",  // cyan — gradient
  phase: "hsla(270, 40%, 60%, 0.7)",   // violet — phase
} as const;

const GRID_COLOR = "hsla(0, 0%, 100%, 0.04)";
const LABEL_COLOR = "hsla(0, 0%, 100%, 0.35)";
const ZERO_LINE = "hsla(0, 0%, 100%, 0.08)";

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

  /** Read samples oldest→newest */
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
    h:     new RingBuffer(SAMPLES),
    dh:    new RingBuffer(SAMPLES),
    phase: new RingBuffer(SAMPLES),
  });

  const drawWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    buf: RingBuffer,
    w: number,
    h: number,
    yMin: number,
    yMax: number,
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
      // Sample at ~30fps
      if (now - lastSample >= SAMPLE_MS) {
        lastSample = now;
        bufs.h.push(readCSSVar("--h-score", 0.5));
        bufs.dh.push(readCSSVar("--coherence-dh", 0));
        bufs.phase.push(readCSSVar("--h-phase", 0));
      }

      // Draw
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

      // Grid lines (4 horizontal)
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 3; i++) {
        const y = (i / 4) * ch;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }

      // Zero line for ∂H/∂t (center)
      ctx.strokeStyle = ZERO_LINE;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, ch / 2);
      ctx.lineTo(cw, ch / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waveforms
      drawWaveform(ctx, bufs.h, cw, ch, 0, 1, COLORS.h);
      drawWaveform(ctx, bufs.dh, cw, ch, -1, 1, COLORS.dh);
      drawWaveform(ctx, bufs.phase, cw, ch, 0, 1, COLORS.phase);

      // Current values (top-right)
      ctx.font = "9px 'DM Sans', system-ui, sans-serif";
      ctx.textAlign = "right";
      const pad = 8;
      const lineH = 13;
      const vals = [
        { label: "H", val: bufs.h.last.toFixed(3), color: COLORS.h },
        { label: "∂H", val: (bufs.dh.last >= 0 ? "+" : "") + bufs.dh.last.toFixed(3), color: COLORS.dh },
        { label: "φ", val: bufs.phase.last.toFixed(2), color: COLORS.phase },
      ];
      vals.forEach(({ label, val, color }, i) => {
        const y = pad + i * lineH + 9;
        ctx.fillStyle = color;
        ctx.fillText(`${label} ${val}`, cw - pad, y);
      });

      // Labels (bottom-left)
      ctx.textAlign = "left";
      ctx.fillStyle = LABEL_COLOR;
      ctx.fillText("coherence field", pad, ch - pad);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drawWaveform]);

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

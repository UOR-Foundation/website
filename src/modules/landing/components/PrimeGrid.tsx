import { useEffect, useRef, useMemo, useCallback } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import { useIsMobile } from "@/hooks/use-mobile";

/* ── Prime sieve ─────────────────────────────────────────────── */
function sievePrimes(max: number): Set<number> {
  const flags = new Uint8Array(max + 1).fill(1);
  flags[0] = flags[1] = 0;
  for (let i = 2; i * i <= max; i++) {
    if (flags[i]) for (let j = i * i; j <= max; j += i) flags[j] = 0;
  }
  const s = new Set<number>();
  for (let i = 2; i <= max; i++) if (flags[i]) s.add(i);
  return s;
}

/* ── Factorization with superscript unicode ──────────────────── */
const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
function toSuperscript(n: number): string {
  return String(n).split("").map(c => SUPERSCRIPTS[c] || c).join("");
}
function factorize(n: number): string {
  if (n <= 1) return String(n);
  const parts: string[] = [];
  let rem = n;
  for (let p = 2; p * p <= rem; p++) {
    let exp = 0;
    while (rem % p === 0) { rem /= p; exp++; }
    if (exp === 1) parts.push(String(p));
    else if (exp > 1) parts.push(p + toSuperscript(exp));
  }
  if (rem > 1) parts.push(String(rem));
  return parts.join("·");
}

/* ── Grid constants — fewer, BIGGER numbers ──────────────────── */
const COLS = 28;
const ROWS = 16;
const TOTAL = COLS * ROWS;
const PADDING = 40;
const LENS_RADIUS = 240;

// Base opacities — visible but quiet
const BASE_PRIME_ALPHA = 0.07;
const BASE_COMPOSITE_ALPHA = 0.03;

// Searchlight peak — dramatic reveal
const LENS_PRIME_ALPHA = 0.45;
const LENS_COMPOSITE_ALPHA = 0.20;

const GOLD_HUE = "38, 65%, 55%";
const NEUTRAL_HUE = "40, 10%, 75%";

/* ── Pretext measurement cache ───────────────────────────────── */
const widthCache = new Map<string, number>();
function measureWidth(text: string, font: string): number {
  const key = font + "|" + text;
  if (widthCache.has(key)) return widthCache.get(key)!;
  try {
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, 99999, 20);
    const w = result.lines.length > 0 ? result.lines[0].width : 0;
    widthCache.set(key, w);
    return w;
  } catch {
    widthCache.set(key, text.length * 8);
    return text.length * 8;
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ── Component ───────────────────────────────────────────────── */
const PrimeGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef(0);
  const needsDrawRef = useRef(true);
  const isMobile = useIsMobile();

  const primes = useMemo(() => sievePrimes(TOTAL + 1), []);

  // Pre-compute factorization strings
  const factStrings = useMemo(() => {
    const m = new Map<number, string>();
    for (let i = 1; i <= TOTAL; i++) m.set(i, factorize(i));
    return m;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cellW = (w - PADDING * 2) / COLS;
    const cellH = (h - PADDING * 2) / ROWS;
    // Bigger font — clearly readable numbers
    const fontSize = Math.max(11, Math.min(16, cellW * 0.38));
    const font = `${fontSize}px ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`;

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const mouse = mouseRef.current;

    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const num = i + 1;
      const isPrime = primes.has(num);

      const cx = PADDING + col * cellW + cellW / 2;
      const cy = PADDING + row * cellH + cellH / 2;

      // Searchlight lens effect
      let lensT = 0;
      if (mouse && !isMobile) {
        const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
        if (dist < LENS_RADIUS) {
          // Smooth cubic falloff for natural searchlight feel
          const normalized = dist / LENS_RADIUS;
          lensT = 1 - normalized * normalized * normalized;
        }
      }

      const baseAlpha = isPrime ? BASE_PRIME_ALPHA : BASE_COMPOSITE_ALPHA;
      const peakAlpha = isPrime ? LENS_PRIME_ALPHA : LENS_COMPOSITE_ALPHA;
      const alpha = lerp(baseAlpha, peakAlpha, lensT);

      const hue = isPrime ? GOLD_HUE : NEUTRAL_HUE;

      // Inside the searchlight, show factorization for composites
      let displayText = String(num);
      if (lensT > 0.35 && !isPrime && num > 1) {
        const factStr = factStrings.get(num);
        if (factStr && factStr !== String(num)) displayText = factStr;
      }

      ctx.fillStyle = `hsla(${hue}, ${alpha.toFixed(3)})`;

      // Use pretext to measure variable-width factorizations for centering
      if (displayText !== String(num) && displayText.length > 2) {
        const measuredWidth = measureWidth(displayText, font);
        const scale = Math.min(1, (cellW * 0.85) / measuredWidth);
        if (scale < 1) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);
          ctx.fillText(displayText, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(displayText, cx, cy);
        }
      } else {
        ctx.fillText(displayText, cx, cy);
      }
    }

    ctx.restore();
  }, [primes, factStrings, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      needsDrawRef.current = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      needsDrawRef.current = true;
    };

    const onMouseLeave = () => {
      mouseRef.current = null;
      needsDrawRef.current = true;
    };

    const loop = () => {
      if (needsDrawRef.current) {
        draw();
        needsDrawRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    resize();

    const observer = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) {
      observer.observe(parent);
      parent.addEventListener("mousemove", onMouseMove);
      parent.addEventListener("mouseleave", onMouseLeave);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      if (parent) {
        parent.removeEventListener("mousemove", onMouseMove);
        parent.removeEventListener("mouseleave", onMouseLeave);
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1] pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default PrimeGrid;

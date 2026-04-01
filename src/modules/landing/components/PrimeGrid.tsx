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

/* ── Prime ordinal map (prime → its index in the sequence) ──── */
function primeOrdinals(max: number): Map<number, number> {
  const m = new Map<number, number>();
  const flags = new Uint8Array(max + 1).fill(1);
  flags[0] = flags[1] = 0;
  for (let i = 2; i * i <= max; i++) {
    if (flags[i]) for (let j = i * i; j <= max; j += i) flags[j] = 0;
  }
  let ord = 0;
  for (let i = 2; i <= max; i++) if (flags[i]) m.set(i, ++ord);
  return m;
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

/* ── Grid constants ──────────────────────────────────────────── */
const COLS = 48;
const ROWS = 29;
const TOTAL = COLS * ROWS;
const PADDING = 32;
const LENS_RADIUS = 200;
const AXIS_INTERVAL = 7;

// Base opacities — very subtle at rest
const BASE_PRIME_ALPHA = 0.05;
const BASE_COMPOSITE_ALPHA = 0.02;
const BASE_AXIS_ALPHA = 0.04;

// Lens peak opacities
const LENS_PRIME_ALPHA = 0.22;
const LENS_COMPOSITE_ALPHA = 0.12;

// Scroll-boosted base opacities (at depth=1)
const SCROLL_PRIME_ALPHA = 0.10;
const SCROLL_COMPOSITE_ALPHA = 0.05;

const GOLD_HUE = "38, 65%, 55%";
const NEUTRAL_HUE = "0, 0%, 85%";

/* ── Pretext measurement cache ───────────────────────────────── */
const widthCache = new Map<string, number>();
function measureText(text: string, font: string): number {
  const key = font + "|" + text;
  if (widthCache.has(key)) return widthCache.get(key)!;
  try {
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, 99999, 20);
    const w = result.lines.length > 0 ? result.lines[0].width : 0;
    widthCache.set(key, w);
    return w;
  } catch {
    // Fallback: won't happen in practice but guard against edge cases
    widthCache.set(key, text.length * 6);
    return text.length * 6;
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Component ───────────────────────────────────────────────── */
const PrimeGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const scrollDepthRef = useRef(0);
  const rafRef = useRef(0);
  const needsDrawRef = useRef(true);
  const isMobile = useIsMobile();

  const primes = useMemo(() => sievePrimes(TOTAL + 1), []);
  const ordinals = useMemo(() => primeOrdinals(TOTAL + 1), []);

  // Pre-compute factorization strings
  const factStrings = useMemo(() => {
    const m = new Map<number, string>();
    for (let i = 1; i <= TOTAL; i++) {
      m.set(i, factorize(i));
    }
    return m;
  }, []);

  // Pre-compute π ordinal strings
  const ordinalStrings = useMemo(() => {
    const m = new Map<number, string>();
    ordinals.forEach((ord, prime) => {
      m.set(prime, `π${toSuperscript(ord)}`);
    });
    return m;
  }, [ordinals]);

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
    const fontSize = Math.max(7, Math.min(10, cellW * 0.42));
    const font = `${fontSize}px ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`;
    const smallFont = `${Math.max(6, fontSize * 0.75)}px ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`;

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const mouse = mouseRef.current;
    const depth = scrollDepthRef.current; // 0→1

    // Depth-based mode thresholds (smooth transitions)
    const ordinalBlend = clamp((depth - 0.25) / 0.25, 0, 1);    // 0.25→0.5
    const factBlend = clamp((depth - 0.55) / 0.3, 0, 1);        // 0.55→0.85
    const depthBaseBoost = depth * 0.6; // subtle base opacity boost as you scroll

    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const num = i + 1;
      const isPrime = primes.has(num);

      const cx = PADDING + col * cellW + cellW / 2;
      const cy = PADDING + row * cellH + cellH / 2;

      // Base alpha (scroll-boosted)
      let baseAlpha = isPrime
        ? lerp(BASE_PRIME_ALPHA, SCROLL_PRIME_ALPHA, depthBaseBoost)
        : lerp(BASE_COMPOSITE_ALPHA, SCROLL_COMPOSITE_ALPHA, depthBaseBoost);

      // Mouse lens effect
      let lensT = 0;
      if (mouse && !isMobile) {
        const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
        if (dist < LENS_RADIUS) {
          lensT = 1 - (dist / LENS_RADIUS) ** 2; // quadratic falloff
        }
      }

      const peakAlpha = isPrime ? LENS_PRIME_ALPHA : LENS_COMPOSITE_ALPHA;
      const alpha = lerp(baseAlpha, peakAlpha, lensT);

      const hue = isPrime ? GOLD_HUE : NEUTRAL_HUE;

      // Decide what text to show
      let displayText = String(num);

      // Scroll depth reveals — only apply when lens is active OR scroll is deep enough
      if (isPrime && ordinalBlend > 0) {
        // Primes show their ordinal πₙ
        const ordStr = ordinalStrings.get(num);
        if (ordStr) {
          // Blend: at partial ordinalBlend, only show if also in lens
          const shouldShow = ordinalBlend > 0.5 || lensT > 0.3;
          if (shouldShow) displayText = ordStr;
        }
      }

      if (!isPrime && factBlend > 0 && num > 1) {
        // Composites show factorization
        const factStr = factStrings.get(num);
        if (factStr && factStr !== String(num)) {
          const shouldShow = factBlend > 0.5 || lensT > 0.3;
          if (shouldShow) displayText = factStr;
        }
      }

      // Mouse lens always shows factorization for composites / ordinals for primes
      if (lensT > 0.4) {
        if (isPrime) {
          const ordStr = ordinalStrings.get(num);
          if (ordStr) displayText = ordStr;
        } else if (num > 1) {
          const factStr = factStrings.get(num);
          if (factStr) displayText = factStr;
        }
      }

      ctx.fillStyle = `hsla(${hue}, ${alpha.toFixed(3)})`;

      // Use pretext measurement for variable-width factorization strings
      if (displayText !== String(num) && displayText.length > 2) {
        const measuredWidth = measureText(displayText, font);
        const scale = Math.min(1, (cellW * 0.9) / measuredWidth);
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

    // Axis labels
    ctx.font = smallFont;
    ctx.fillStyle = `hsla(0, 0%, 85%, ${(BASE_AXIS_ALPHA + depthBaseBoost * 0.03).toFixed(3)})`;
    ctx.textAlign = "center";

    for (let c = AXIS_INTERVAL - 1; c < COLS; c += AXIS_INTERVAL) {
      const x = PADDING + c * cellW + cellW / 2;
      ctx.fillText(String(c + 1).padStart(2, "0"), x, PADDING - 10);
    }

    ctx.textAlign = "right";
    for (let r = AXIS_INTERVAL - 1; r < ROWS; r += AXIS_INTERVAL) {
      const y = PADDING + r * cellH + cellH / 2;
      ctx.fillText(String(r + 1).padStart(2, "0"), PADDING - 8, y);
    }

    ctx.restore();
  }, [primes, ordinals, factStrings, ordinalStrings, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      needsDrawRef.current = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      needsDrawRef.current = true;
    };

    const onMouseLeave = () => {
      mouseRef.current = null;
      needsDrawRef.current = true;
    };

    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollDepthRef.current = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
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
    onScroll();

    const observer = new ResizeObserver(resize);
    observer.observe(document.documentElement);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default PrimeGrid;

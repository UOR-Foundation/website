import { useEffect, useRef, useMemo, useCallback } from "react";

/** Sieve of Eratosthenes — returns a Set of primes up to `max`. */
function sievePrimes(max: number): Set<number> {
  const flags = new Uint8Array(max + 1).fill(1);
  flags[0] = flags[1] = 0;
  for (let i = 2; i * i <= max; i++) {
    if (flags[i]) for (let j = i * i; j <= max; j += i) flags[j] = 0;
  }
  const primes = new Set<number>();
  for (let i = 2; i <= max; i++) if (flags[i]) primes.add(i);
  return primes;
}

const COLS = 48;
const ROWS = 29;
const TOTAL = COLS * ROWS;
const AXIS_INTERVAL = 7;
const PADDING = 32;

// Colors derived from design system tokens (gold primary, muted foreground)
const PRIME_COLOR = "hsla(38, 65%, 55%, 0.10)";
const COMPOSITE_COLOR = "hsla(0, 0%, 90%, 0.025)";
const AXIS_COLOR = "hsla(0, 0%, 90%, 0.04)";

const PrimeGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const primes = useMemo(() => sievePrimes(TOTAL + 1), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cellW = (w - PADDING * 2) / COLS;
    const cellH = (h - PADDING * 2) / ROWS;
    const fontSize = Math.max(7, Math.min(10, cellW * 0.42));

    ctx.font = `${fontSize}px ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const num = i + 1;
      const isPrime = primes.has(num);

      const x = PADDING + col * cellW + cellW / 2;
      const y = PADDING + row * cellH + cellH / 2;

      ctx.fillStyle = isPrime ? PRIME_COLOR : COMPOSITE_COLOR;
      ctx.fillText(String(num), x, y);
    }

    // Axis labels
    ctx.font = `${Math.max(6, fontSize * 0.75)}px ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace`;
    ctx.fillStyle = AXIS_COLOR;

    // Column labels (top)
    for (let c = AXIS_INTERVAL - 1; c < COLS; c += AXIS_INTERVAL) {
      const x = PADDING + c * cellW + cellW / 2;
      ctx.fillText(String(c + 1).padStart(2, "0"), x, PADDING - 10);
    }

    // Row labels (left)
    ctx.textAlign = "right";
    for (let r = AXIS_INTERVAL - 1; r < ROWS; r += AXIS_INTERVAL) {
      const y = PADDING + r * cellH + cellH / 2;
      ctx.fillText(String(r + 1).padStart(2, "0"), PADDING - 8, y);
    }
  }, [primes]);

  useEffect(() => {
    draw();

    const observer = new ResizeObserver(draw);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
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

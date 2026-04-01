import { useEffect, useRef, useCallback } from "react";

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

/* ── Ulam spiral coordinate mapping ──────────────────────────── */
function ulamCoords(n: number): [number, number] {
  if (n === 1) return [0, 0];
  const k = Math.ceil((Math.sqrt(n) - 1) / 2);
  const m = (2 * k + 1) ** 2;
  const side = 2 * k;

  if (n > m - side) {
    return [-k + (n - (m - side)), -k];
  } else if (n > m - 2 * side) {
    return [k, k - (n - (m - 2 * side))];
  } else if (n > m - 3 * side) {
    return [k - (n - (m - 3 * side)), k];
  } else {
    return [-k, -k + (n - (m - 4 * side))];
  }
}

/* ── Constants ───────────────────────────────────────────────── */
const MAX_N = 28000;
const ROTATION_SPEED = 0.00006;
const GOLD = "38, 65%, 55%";

// Scroll thresholds — starts revealing at 8%, peaks at 50%
const SCROLL_START = 0.08;
const SCROLL_FULL = 0.50;

// Dot sizing
const BASE_DOT_R = 1.0;
const PEAK_DOT_R = 2.2;
const PEAK_ALPHA = 0.28; // Much more visible as an overlay

// Constellation lines
const LINE_ALPHA_MULT = 0.25;
const MAX_LINE_DIST = 2;

// Glow pulsation
const PULSE_SPEED = 0.0004;

/* ── Pre-compute prime positions ─────────────────────────────── */
const primes = sievePrimes(MAX_N);
const primePositions: Array<{ n: number; x: number; y: number }> = [];
for (let n = 2; n <= MAX_N; n++) {
  if (primes.has(n)) {
    const [x, y] = ulamCoords(n);
    primePositions.push({ n, x, y });
  }
}

// Pre-compute constellation edges
const constellationEdges: Array<[number, number]> = [];
for (let i = 0; i < primePositions.length; i++) {
  for (let j = i + 1; j < primePositions.length; j++) {
    const dx = Math.abs(primePositions[i].x - primePositions[j].x);
    const dy = Math.abs(primePositions[i].y - primePositions[j].y);
    if (dx <= MAX_LINE_DIST && dy <= MAX_LINE_DIST && dx + dy <= MAX_LINE_DIST) {
      constellationEdges.push([i, j]);
    }
  }
}

/* ── Component ───────────────────────────────────────────────── */
const PrimeConstellationBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const angleRef = useRef(0);
  const scrollRef = useRef(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (document.hidden) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const scrollFrac = scrollRef.current;
    const t = Math.min(1, Math.max(0, (scrollFrac - SCROLL_START) / (SCROLL_FULL - SCROLL_START)));
    const easedT = t * t * (3 - 2 * t);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (easedT < 0.001) {
      angleRef.current += ROTATION_SPEED;
      timeRef.current += PULSE_SPEED;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = w * 0.5;
    const cy = h * 0.5;

    // Scale so spiral fills the viewport nicely
    const minDim = Math.min(w, h);
    const spacing = minDim / (Math.sqrt(MAX_N) * 0.48);

    const globalAngle = angleRef.current;
    const cosA = Math.cos(globalAngle);
    const sinA = Math.sin(globalAngle);

    // Subtle breathing pulse
    const pulse = 1 + 0.08 * Math.sin(timeRef.current);
    const alpha = easedT * PEAK_ALPHA * pulse;
    const dotR = (BASE_DOT_R + easedT * (PEAK_DOT_R - BASE_DOT_R)) * pulse;

    const toScreen = (gx: number, gy: number): [number, number] => {
      const rx = gx * cosA - gy * sinA;
      const ry = gx * sinA + gy * cosA;
      return [cx + rx * spacing, cy + ry * spacing];
    };

    // Draw constellation lines
    if (easedT > 0.1) {
      const lineAlpha = alpha * LINE_ALPHA_MULT * Math.min(1, (easedT - 0.1) / 0.25);
      ctx.strokeStyle = `hsla(${GOLD}, ${lineAlpha})`;
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let e = 0; e < constellationEdges.length; e++) {
        const [i, j] = constellationEdges[e];
        const [x1, y1] = toScreen(primePositions[i].x, primePositions[i].y);
        const [x2, y2] = toScreen(primePositions[j].x, primePositions[j].y);
        if (
          (x1 < -10 && x2 < -10) || (x1 > w + 10 && x2 > w + 10) ||
          (y1 < -10 && y2 < -10) || (y1 > h + 10 && y2 > h + 10)
        ) continue;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    // Draw prime dots with a warm glow
    for (let i = 0; i < primePositions.length; i++) {
      const p = primePositions[i];
      const [x, y] = toScreen(p.x, p.y);
      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      // Larger primes glow slightly brighter (twin primes, etc.)
      const isTwin = primes.has(p.n + 2) || primes.has(p.n - 2);
      const dotAlpha = isTwin ? alpha * 1.4 : alpha;
      const r = isTwin ? dotR * 1.3 : dotR;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${GOLD}, ${dotAlpha})`;
      ctx.fill();
    }

    ctx.restore();

    angleRef.current += ROTATION_SPEED;
    timeRef.current += PULSE_SPEED;
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    };

    resize();
    onScroll();

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[5] pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default PrimeConstellationBg;

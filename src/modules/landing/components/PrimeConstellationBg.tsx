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
// Maps integer n (1-based) to (x, y) on a rectangular spiral
// 1 is at origin, then right, up, left, left, down, down, right, right, right…
function ulamCoords(n: number): [number, number] {
  if (n === 1) return [0, 0];
  // Which "shell" (layer) is n in?
  const k = Math.ceil((Math.sqrt(n) - 1) / 2);
  const m = (2 * k + 1) ** 2; // max number in this shell
  const side = 2 * k; // length of a side in this shell

  if (n > m - side) {
    // bottom side (moving right)
    return [-k + (n - (m - side)), -k];
  } else if (n > m - 2 * side) {
    // right side (moving down)
    return [k, k - (n - (m - 2 * side))];
  } else if (n > m - 3 * side) {
    // top side (moving left)
    return [k - (n - (m - 3 * side)), k];
  } else {
    // left side (moving up)
    return [-k, -k + (n - (m - 4 * side))];
  }
}

/* ── Constants ───────────────────────────────────────────────── */
const MAX_N = 40000;
const ROTATION_SPEED = 0.00008; // rad per frame — very slow, meditative
const GOLD = "38, 65%, 55%";

// Scroll thresholds
const SCROLL_START = 0.05; // start revealing at 5% scroll
const SCROLL_FULL = 0.55; // fully revealed by 55%

const BASE_DOT_R = 0.8;
const PEAK_DOT_R = 1.6;
const PEAK_ALPHA = 0.07;

// Constellation lines
const LINE_ALPHA_MULT = 0.3; // lines are fainter than dots
const MAX_LINE_DIST = 3; // max grid distance for constellation lines

/* ── Pre-compute prime positions ─────────────────────────────── */
const primes = sievePrimes(MAX_N);
const primePositions: Array<{ n: number; x: number; y: number }> = [];
for (let n = 2; n <= MAX_N; n++) {
  if (primes.has(n)) {
    const [x, y] = ulamCoords(n);
    primePositions.push({ n, x, y });
  }
}

// Pre-compute constellation edges (adjacent primes within MAX_LINE_DIST on the grid)
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

    // Calculate scroll progress
    const scrollFrac = scrollRef.current;
    const t = Math.min(
      1,
      Math.max(0, (scrollFrac - SCROLL_START) / (SCROLL_FULL - SCROLL_START))
    );

    // Ease in with cubic
    const easedT = t * t * (3 - 2 * t); // smoothstep

    // Skip drawing if invisible
    if (easedT < 0.001) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angleRef.current += ROTATION_SPEED;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = w * 0.5;
    const cy = h * 0.5;

    // Scale so spiral fills roughly the viewport
    const minDim = Math.min(w, h);
    const spacing = minDim / (Math.sqrt(MAX_N) * 0.52);

    const globalAngle = angleRef.current;
    const cosA = Math.cos(globalAngle);
    const sinA = Math.sin(globalAngle);

    const alpha = easedT * PEAK_ALPHA;
    const dotR = BASE_DOT_R + easedT * (PEAK_DOT_R - BASE_DOT_R);

    // Transform grid coords to screen coords with rotation
    const toScreen = (gx: number, gy: number): [number, number] => {
      const rx = gx * cosA - gy * sinA;
      const ry = gx * sinA + gy * cosA;
      return [cx + rx * spacing, cy + ry * spacing];
    };

    // Draw constellation lines first (behind dots)
    if (easedT > 0.15) {
      const lineAlpha = alpha * LINE_ALPHA_MULT * Math.min(1, (easedT - 0.15) / 0.3);
      ctx.strokeStyle = `hsla(${GOLD}, ${lineAlpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let e = 0; e < constellationEdges.length; e++) {
        const [i, j] = constellationEdges[e];
        const [x1, y1] = toScreen(primePositions[i].x, primePositions[i].y);
        const [x2, y2] = toScreen(primePositions[j].x, primePositions[j].y);
        // Cull if both endpoints are off-screen
        if (
          (x1 < -10 && x2 < -10) ||
          (x1 > w + 10 && x2 > w + 10) ||
          (y1 < -10 && y2 < -10) ||
          (y1 > h + 10 && y2 > h + 10)
        )
          continue;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    // Draw prime dots
    ctx.fillStyle = `hsla(${GOLD}, ${alpha})`;
    for (let i = 0; i < primePositions.length; i++) {
      const p = primePositions[i];
      const [x, y] = toScreen(p.x, p.y);

      // Cull off-screen
      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    angleRef.current += ROTATION_SPEED;
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
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default PrimeConstellationBg;

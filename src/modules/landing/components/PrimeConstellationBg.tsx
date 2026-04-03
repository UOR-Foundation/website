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

/* ── Constants ───────────────────────────────────────────────── */
const MAX_N = 6000;
const GOLDEN_ANGLE = 2.3999632297286533;
const ROTATION_SPEED = 0.00003;
const WARM_WHITE = "220, 15%, 82%";
const COOL_BLUE = "210, 35%, 72%";
const SOFT_SILVER = "230, 12%, 78%";

// Scroll thresholds — stars appear early and gently
const SCROLL_START = 0.08;
const SCROLL_STARS_FULL = 0.40;
const SCROLL_CONSTELLATION_START = 0.35;
const SCROLL_CONSTELLATION_FULL = 0.85;

const DOT_R = 0.9;
const PULSE_SPEED = 0.0003;

/* ── Constellation builder ───────────────────────────────────── */
const primes = sievePrimes(MAX_N);
const primeList: number[] = [];
for (let n = 2; n <= MAX_N; n++) if (primes.has(n)) primeList.push(n);

const primeVogel: Array<{ n: number; ux: number; uy: number }> = primeList.map(n => ({
  n,
  ux: Math.sqrt(n) * Math.cos(n * GOLDEN_ANGLE),
  uy: Math.sqrt(n) * Math.sin(n * GOLDEN_ANGLE),
}));

interface ConstellationStar {
  primeIdx: number;
  brightness: number;
}
interface Constellation {
  stars: ConstellationStar[];
  lines: [number, number][];
  hue: string;
  breathePhase: number; // unique phase offset for organic feel
}

function findNearestPrime(targetUx: number, targetUy: number, exclude: Set<number>): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < primeVogel.length; i++) {
    if (exclude.has(i)) continue;
    const dx = primeVogel[i].ux - targetUx;
    const dy = primeVogel[i].uy - targetUy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function buildConstellations(): Constellation[] {
  const used = new Set<number>();
  const result: Constellation[] = [];

  const pickCluster = (cx: number, cy: number, count: number): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2 + (i % 3) * 1.5;
      const tx = cx + Math.cos(angle) * radius;
      const ty = cy + Math.sin(angle) * radius;
      const idx = findNearestPrime(tx, ty, used);
      indices.push(idx);
      used.add(idx);
    }
    return indices;
  };

  // Scattered across the field — each with a unique cool/warm white hue
  const configs: Array<{ cx: number; cy: number; count: number; lines: [number, number][]; hue: string; phase: number }> = [
    { cx: 25, cy: -15, count: 7, lines: [[0,1],[1,2],[2,3],[3,4],[0,5],[4,6],[1,5]], hue: WARM_WHITE, phase: 0 },
    { cx: -20, cy: -20, count: 5, lines: [[0,1],[1,2],[2,3],[3,4]], hue: COOL_BLUE, phase: 1.2 },
    { cx: -30, cy: 5, count: 5, lines: [[0,1],[1,2],[2,0],[0,3],[3,4]], hue: SOFT_SILVER, phase: 2.4 },
    { cx: 10, cy: 30, count: 7, lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]], hue: WARM_WHITE, phase: 3.8 },
    { cx: 35, cy: 15, count: 5, lines: [[0,2],[2,4],[1,2],[2,3]], hue: COOL_BLUE, phase: 5.0 },
    { cx: -10, cy: 25, count: 4, lines: [[0,1],[1,2],[2,3],[3,0]], hue: SOFT_SILVER, phase: 6.3 },
    { cx: 40, cy: -25, count: 4, lines: [[0,1],[1,2],[2,3]], hue: WARM_WHITE, phase: 7.5 },
  ];

  for (const cfg of configs) {
    const indices = pickCluster(cfg.cx, cfg.cy, cfg.count);
    result.push({
      stars: indices.map((idx, i) => ({
        primeIdx: idx,
        brightness: i === 0 ? 1.6 : i < 3 ? 1.2 : 0.9,
      })),
      lines: cfg.lines,
      hue: cfg.hue,
      breathePhase: cfg.phase,
    });
  }

  return result;
}

const constellations = buildConstellations();

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
    const time = timeRef.current;

    // Phase 1: white star points emerge gently
    const tStars = Math.min(1, Math.max(0, (scrollFrac - SCROLL_START) / (SCROLL_STARS_FULL - SCROLL_START)));
    const easedStars = tStars * tStars * (3 - 2 * tStars); // smoothstep

    // Phase 2: constellation lines form
    const tConst = Math.min(1, Math.max(0, (scrollFrac - SCROLL_CONSTELLATION_START) / (SCROLL_CONSTELLATION_FULL - SCROLL_CONSTELLATION_START)));
    const easedConst = tConst * tConst * (3 - 2 * tConst);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (easedStars < 0.001) {
      angleRef.current += ROTATION_SPEED;
      timeRef.current += PULSE_SPEED;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const diagonal = Math.sqrt(w * w + h * h) * 0.45;
    const spacing = diagonal / Math.sqrt(MAX_N);

    const globalAngle = angleRef.current;
    const cosA = Math.cos(globalAngle);
    const sinA = Math.sin(globalAngle);

    const toScreen = (ux: number, uy: number): [number, number] => {
      const rx = ux * cosA - uy * sinA;
      const ry = ux * sinA + uy * cosA;
      return [cx + rx * spacing, cy + ry * spacing];
    };

    // ── Phase 1: White star points gradually appearing ──
    // Inner stars first, outer stars later — like the universe unfurling
    const maxDist = Math.sqrt(MAX_N);

    for (let i = 0; i < primeVogel.length; i++) {
      const p = primeVogel[i];
      const [x, y] = toScreen(p.ux, p.uy);
      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      const distFromCenter = Math.sqrt(p.ux * p.ux + p.uy * p.uy);
      const normalizedDist = distFromCenter / maxDist;

      // Stagger: inner stars appear first
      const stagger = normalizedDist * 0.7;
      const localT = Math.max(0, Math.min(1, (easedStars - stagger) / 0.3));
      if (localT < 0.01) continue;

      // Each star has a unique gentle twinkle
      const twinkle = 0.6 + 0.4 * Math.sin(time * 1.5 + p.n * 0.37);

      const isTwin = primes.has(p.n + 2) || primes.has(p.n - 2);
      const r = (isTwin ? DOT_R * 1.3 : DOT_R) * localT;
      const alpha = localT * twinkle * (isTwin ? 0.18 : 0.12);

      // Soft radial glow — makes each point feel like a real star
      const glowR = r * 3;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      glow.addColorStop(0, `hsla(${WARM_WHITE}, ${alpha * 0.8})`);
      glow.addColorStop(0.5, `hsla(${WARM_WHITE}, ${alpha * 0.2})`);
      glow.addColorStop(1, `hsla(${WARM_WHITE}, 0)`);
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Core point
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${WARM_WHITE}, ${Math.min(alpha * 2, 0.5)})`;
      ctx.fill();
    }

    // ── Phase 2: Constellations coalesce — lines grow like living threads ──
    if (easedConst > 0.01) {
      for (let ci = 0; ci < constellations.length; ci++) {
        const c = constellations[ci];
        // Each constellation appears at a different scroll depth
        const cDelay = ci * 0.1;
        const cT = Math.max(0, Math.min(1, (easedConst - cDelay) / (1 - cDelay)));
        if (cT < 0.01) continue;

        // Living, breathing pulse unique to each constellation
        const breathe = 1 + 0.08 * Math.sin(time * 1.2 + c.breathePhase);
        const slowDrift = 0.03 * Math.sin(time * 0.7 + c.breathePhase * 0.5);

        const starPos = c.stars.map(s => {
          const p = primeVogel[s.primeIdx];
          const [x, y] = toScreen(p.ux, p.uy);
          return { x, y, brightness: s.brightness };
        });

        // Draw constellation lines — each line draws itself in sequentially
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          // Each line starts drawing at a staggered time
          const lineDelay = li * 0.06;
          const lineT = Math.max(0, Math.min(1, (cT - lineDelay) / 0.4));
          if (lineT < 0.01) continue;

          const eased = lineT * lineT * (3 - 2 * lineT); // smoothstep the line growth

          const ax = starPos[a].x;
          const ay = starPos[a].y;
          const bx = ax + (starPos[b].x - ax) * eased;
          const by = ay + (starPos[b].y - ay) * eased;

          const lineAlpha = cT * 0.15 * breathe;

          // Gradient line that fades at the growing tip
          const lineGrad = ctx.createLinearGradient(ax, ay, bx, by);
          lineGrad.addColorStop(0, `hsla(${c.hue}, ${lineAlpha})`);
          lineGrad.addColorStop(0.7, `hsla(${c.hue}, ${lineAlpha * 0.8})`);
          lineGrad.addColorStop(1, `hsla(${c.hue}, ${lineAlpha * 0.2})`);

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = (0.5 + 0.2 * breathe) * eased;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Draw constellation stars — brighter than field stars, with living glow
        for (const star of starPos) {
          const starAlpha = cT * 0.35 * star.brightness * breathe;
          const starR = 1.5 * star.brightness * breathe;

          // Outer nebula halo
          const nebulaR = starR * 8;
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${c.hue}, ${starAlpha * 0.15})`);
          nebula.addColorStop(0.3, `hsla(${c.hue}, ${starAlpha * 0.05})`);
          nebula.addColorStop(1, `hsla(${c.hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, nebulaR, 0, Math.PI * 2);
          ctx.fillStyle = nebula;
          ctx.fill();

          // Inner glow
          const innerR = starR * 3;
          const inner = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, innerR);
          inner.addColorStop(0, `hsla(${c.hue}, ${starAlpha * 0.5})`);
          inner.addColorStop(1, `hsla(${c.hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, innerR, 0, Math.PI * 2);
          ctx.fillStyle = inner;
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${c.hue}, ${Math.min(starAlpha * 1.5, 0.7)})`;
          ctx.fill();
        }
      }
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

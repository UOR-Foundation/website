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
const GOLD = "38, 65%, 55%";
const WARM_WHITE = "40, 20%, 85%";

// Scroll: faint whisper at 20%, constellations form by 70%, full at 90%
const SCROLL_START = 0.20;
const SCROLL_CONSTELLATION = 0.55;
const SCROLL_FULL = 0.90;

const PEAK_ALPHA = 0.14;
const DOT_R = 1.2;
const PULSE_SPEED = 0.0004;

/* ── Constellation definitions using prime numbers ───────────
 * Each constellation is built from specific prime numbers that
 * naturally fall on the Vogel spiral. Lines connect them.
 */

// Find primes near target positions on the spiral
const primes = sievePrimes(MAX_N);
const primeList: number[] = [];
for (let n = 2; n <= MAX_N; n++) if (primes.has(n)) primeList.push(n);

// Pre-compute Vogel positions for all primes (unit circle, unscaled)
const primeVogel: Array<{ n: number; ux: number; uy: number }> = primeList.map(n => ({
  n,
  ux: Math.sqrt(n) * Math.cos(n * GOLDEN_ANGLE),
  uy: Math.sqrt(n) * Math.sin(n * GOLDEN_ANGLE),
}));

/* ── Build constellations from nearby primes ─────────────────
 * We select clusters of primes that are spatially close on the
 * Vogel spiral and connect them into constellation figures.
 * Each cluster represents a different cosmic pattern.
 */
interface ConstellationStar {
  primeIdx: number; // index into primeVogel
  brightness: number;
}
interface Constellation {
  name: string;
  stars: ConstellationStar[];
  lines: [number, number][]; // indices into stars array
  hue: string;
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

// Build constellations by selecting prime clusters at different regions
function buildConstellations(): Constellation[] {
  const used = new Set<number>();
  const result: Constellation[] = [];

  // Helper: pick a cluster of primes near a center
  const pickCluster = (cx: number, cy: number, count: number): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      // Offset from center in a pattern
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

  // Orion — upper right region
  const orionIndices = pickCluster(25, -15, 7);
  result.push({
    name: "Orion",
    stars: orionIndices.map((idx, i) => ({ primeIdx: idx, brightness: i === 0 ? 1.8 : i < 3 ? 1.4 : 1.0 })),
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [4, 6], [1, 5], [2, 6]],
    hue: GOLD,
  });

  // Cassiopeia — upper left, W shape
  const cassIndices = pickCluster(-20, -20, 5);
  result.push({
    name: "Cassiopeia",
    stars: cassIndices.map((idx, i) => ({ primeIdx: idx, brightness: i === 2 ? 1.6 : 1.2 })),
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    hue: WARM_WHITE,
  });

  // Lyra — center-left, small triangle + stem
  const lyraIndices = pickCluster(-30, 5, 5);
  result.push({
    name: "Lyra",
    stars: lyraIndices.map((idx, i) => ({ primeIdx: idx, brightness: i === 0 ? 1.7 : 1.0 })),
    lines: [[0, 1], [1, 2], [2, 0], [0, 3], [3, 4]],
    hue: "220, 40%, 70%",
  });

  // Ursa Minor — lower region
  const ursaIndices = pickCluster(10, 30, 7);
  result.push({
    name: "Ursa Minor",
    stars: ursaIndices.map((idx, i) => ({ primeIdx: idx, brightness: i === 0 ? 1.9 : i < 4 ? 1.2 : 0.9 })),
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
    hue: "200, 30%, 65%",
  });

  // Cygnus — right region, cross shape
  const cygnusIndices = pickCluster(35, 15, 5);
  result.push({
    name: "Cygnus",
    stars: cygnusIndices.map((idx, i) => ({ primeIdx: idx, brightness: i === 2 ? 1.5 : 1.1 })),
    lines: [[0, 2], [2, 4], [1, 2], [2, 3]],
    hue: "30, 50%, 65%",
  });

  return result;
}

const constellations = buildConstellations();

/* ── Flowing connection lines between nearby primes ──────────── */
const NEIGHBOR_DIST = 5.5;
const neighborEdges: [number, number][] = [];
for (let i = 0; i < primeVogel.length && i < 800; i++) {
  for (let j = i + 1; j < primeVogel.length && j < 800; j++) {
    const dx = primeVogel[i].ux - primeVogel[j].ux;
    const dy = primeVogel[i].uy - primeVogel[j].uy;
    if (dx * dx + dy * dy < NEIGHBOR_DIST * NEIGHBOR_DIST) {
      neighborEdges.push([i, j]);
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
    const time = timeRef.current;

    // Phase 1: dots appear (SCROLL_START → SCROLL_CONSTELLATION)
    const tDots = Math.min(1, Math.max(0, (scrollFrac - SCROLL_START) / (SCROLL_CONSTELLATION - SCROLL_START)));
    const easedDots = tDots * tDots * (3 - 2 * tDots);

    // Phase 2: constellations form (SCROLL_CONSTELLATION → SCROLL_FULL)
    const tConst = Math.min(1, Math.max(0, (scrollFrac - SCROLL_CONSTELLATION) / (SCROLL_FULL - SCROLL_CONSTELLATION)));
    const easedConst = tConst * tConst * (3 - 2 * tConst);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (easedDots < 0.001) {
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

    // Breathing pulse — different frequencies for organic feel
    const pulse1 = 1 + 0.05 * Math.sin(time);
    const pulse2 = 1 + 0.03 * Math.sin(time * 1.618);
    const pulse3 = 1 + 0.04 * Math.sin(time * 0.618);

    const toScreen = (ux: number, uy: number): [number, number] => {
      const rx = ux * cosA - uy * sinA;
      const ry = ux * sinA + uy * cosA;
      return [cx + rx * spacing, cy + ry * spacing];
    };

    // ── Phase 1: Scattered prime dots emerge ──
    const dotAlpha = easedDots * PEAK_ALPHA * pulse1;

    for (let i = 0; i < primeVogel.length; i++) {
      const p = primeVogel[i];
      const [x, y] = toScreen(p.ux, p.uy);
      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      // Stagger appearance: inner primes first, outer later
      const distFromCenter = Math.sqrt(p.ux * p.ux + p.uy * p.uy);
      const maxDist = Math.sqrt(MAX_N);
      const stagger = distFromCenter / maxDist;
      const localT = Math.max(0, (easedDots - stagger * 0.5) / 0.5);
      if (localT < 0.01) continue;

      const isTwin = primes.has(p.n + 2) || primes.has(p.n - 2);
      const r = (isTwin ? DOT_R * 1.4 : DOT_R) * pulse2 * localT;
      const a = dotAlpha * localT * (isTwin ? 1.3 : 1);

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${GOLD}, ${a})`;
      ctx.fill();
    }

    // ── Phase 1.5: Subtle web of connections between nearby primes ──
    if (easedDots > 0.3) {
      const webAlpha = Math.min(1, (easedDots - 0.3) / 0.4) * 0.03 * pulse3;
      ctx.strokeStyle = `hsla(${GOLD}, ${webAlpha})`;
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      for (const [i, j] of neighborEdges) {
        const [x1, y1] = toScreen(primeVogel[i].ux, primeVogel[i].uy);
        const [x2, y2] = toScreen(primeVogel[j].ux, primeVogel[j].uy);
        if (
          (x1 < -10 && x2 < -10) || (x1 > w + 10 && x2 > w + 10) ||
          (y1 < -10 && y2 < -10) || (y1 > h + 10 && y2 > h + 10)
        ) continue;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    // ── Phase 2: Constellations coalesce ──
    if (easedConst > 0.01) {
      for (let ci = 0; ci < constellations.length; ci++) {
        const c = constellations[ci];
        // Stagger constellation appearance
        const cDelay = ci * 0.15;
        const cT = Math.max(0, Math.min(1, (easedConst - cDelay) / (1 - cDelay)));
        if (cT < 0.01) continue;

        const cPulse = 1 + 0.06 * Math.sin(time + ci * 1.618);
        const cAlpha = cT * 0.4 * cPulse;

        // Compute star screen positions
        const starPos = c.stars.map(s => {
          const p = primeVogel[s.primeIdx];
          const [x, y] = toScreen(p.ux, p.uy);
          return { x, y, brightness: s.brightness };
        });

        // Draw constellation lines — animated draw-in
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineT = Math.max(0, Math.min(1, (cT - li * 0.08) / 0.5));
          if (lineT < 0.01) continue;

          const ax = starPos[a].x;
          const ay = starPos[a].y;
          const bx = ax + (starPos[b].x - ax) * lineT;
          const by = ay + (starPos[b].y - ay) * lineT;

          // Gradient line
          const lineGrad = ctx.createLinearGradient(ax, ay, bx, by);
          lineGrad.addColorStop(0, `hsla(${c.hue}, ${cAlpha * 0.6})`);
          lineGrad.addColorStop(1, `hsla(${c.hue}, ${cAlpha * 0.2})`);

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 0.6 * cPulse;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Draw constellation stars with layered glow
        for (const star of starPos) {
          const starR = 2 * star.brightness * cPulse;
          const starAlpha = cAlpha * star.brightness;

          // Outer nebula glow
          const nebulaR = starR * 6;
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${c.hue}, ${starAlpha * 0.25})`);
          nebula.addColorStop(0.4, `hsla(${c.hue}, ${starAlpha * 0.08})`);
          nebula.addColorStop(1, `hsla(${c.hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, nebulaR, 0, Math.PI * 2);
          ctx.fillStyle = nebula;
          ctx.fill();

          // Inner glow
          const inner = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, starR * 2.5);
          inner.addColorStop(0, `hsla(${c.hue}, ${starAlpha * 0.6})`);
          inner.addColorStop(1, `hsla(${c.hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = inner;
          ctx.fill();

          // Core
          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${c.hue}, ${Math.min(starAlpha * 1.2, 0.85)})`;
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

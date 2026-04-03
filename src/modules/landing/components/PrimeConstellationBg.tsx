import { useEffect, useRef, useCallback } from "react";

/* ── Deterministic seeded random ─────────────────────────────── */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Constants ───────────────────────────────────────────────── */
const ROTATION_SPEED = 0.000012;
const PULSE_SPEED = 0.0004;
const FRAME_INTERVAL = 1000 / 30; // 30fps cap

const SCROLL_STARS_START = 0.05;
const SCROLL_STARS_FULL = 0.35;
const SCROLL_CONST_START = 0.30;
const SCROLL_CONST_FULL = 0.85;

const STAR_HUES = [
  "220, 15%, 88%",
  "210, 25%, 80%",
  "240, 10%, 85%",
  "200, 20%, 75%",
  "0, 0%, 90%",
];

const AMBER_HUE = "38, 35%, 65%";

/* ── Vogel spiral (merged from PrimeGrid) ────────────────────── */
const VOGEL_MAX_N = 4000;
const GOLDEN_ANGLE = 2.3999632297286533;
const VOGEL_COMPOSITE_ALPHA = 0.025;
const VOGEL_PRIME_ALPHA = 0.12;
const VOGEL_PEAK_ALPHA = 0.6;
const VOGEL_COMPOSITE_DOT_R = 0.8;
const VOGEL_PRIME_DOT_R = 1.6;
const VOGEL_PEAK_DOT_R = 3.2;
const VOGEL_ROTATION_SPEED = 0.00012;
const SPOTLIGHT_RADIUS = 320;
const VOGEL_GOLD = "38, 65%, 55%";
const VOGEL_NEUTRAL = "0, 0%, 70%";

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

const PRIMES = sievePrimes(VOGEL_MAX_N);

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ── Field stars ─────────────────────────────────────────────── */
interface FieldStar {
  x: number; y: number; size: number; hueIdx: number;
  twinklePhase: number; depth: number;
  orbitRx: number; orbitRy: number; orbitSpeed: number; orbitPhase: number;
}

const rand = mulberry32(42);
const FIELD_STAR_COUNT = 180;
const fieldStars: FieldStar[] = [];

for (let i = 0; i < FIELD_STAR_COUNT; i++) {
  const x = rand(); const y = rand();
  const dx = x - 0.5; const dy = y - 0.5;
  fieldStars.push({
    x, y,
    size: 0.25 + rand() * 0.7,
    hueIdx: Math.floor(rand() * STAR_HUES.length),
    twinklePhase: rand() * Math.PI * 2,
    depth: Math.sqrt(dx * dx + dy * dy) / 0.707,
    orbitRx: 0.0005 + rand() * 0.002,
    orbitRy: 0.0005 + rand() * 0.002,
    orbitSpeed: 0.1 + rand() * 0.2,
    orbitPhase: rand() * Math.PI * 2,
  });
}

/* ── Constellation definitions ───────────────────────────────── */
interface ConstellationDef {
  name: string;
  stars: Array<{ ox: number; oy: number; brightness: number }>;
  lines: [number, number][];
  cx: number; cy: number;
  hueIdx: number; breathePhase: number;
  isFocalCluster?: boolean;
}

const constellationDefs: ConstellationDef[] = [
  {
    name: "Orion", cx: 0.78, cy: 0.28,
    stars: [
      { ox: -0.045, oy: -0.065, brightness: 1.6 },
      { ox: 0.04, oy: -0.06, brightness: 1.2 },
      { ox: -0.015, oy: -0.01, brightness: 1.1 },
      { ox: 0.0, oy: -0.005, brightness: 1.3 },
      { ox: 0.015, oy: 0.0, brightness: 1.1 },
      { ox: -0.04, oy: 0.06, brightness: 1.0 },
      { ox: 0.045, oy: 0.065, brightness: 1.5 },
    ],
    lines: [[0,2],[1,4],[2,3],[3,4],[0,5],[1,6],[2,5],[4,6]],
    hueIdx: 0, breathePhase: 0, isFocalCluster: true,
  },
  {
    name: "Cassiopeia", cx: 0.18, cy: 0.18,
    stars: [
      { ox: -0.06, oy: 0.01, brightness: 1.2 },
      { ox: -0.03, oy: -0.02, brightness: 1.3 },
      { ox: 0.0, oy: 0.005, brightness: 1.4 },
      { ox: 0.03, oy: -0.02, brightness: 1.2 },
      { ox: 0.06, oy: 0.01, brightness: 1.1 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]],
    hueIdx: 1, breathePhase: 1.5,
  },
  {
    name: "Ursa Major", cx: 0.22, cy: 0.52,
    stars: [
      { ox: -0.05, oy: 0.02, brightness: 1.2 },
      { ox: -0.035, oy: -0.015, brightness: 1.1 },
      { ox: -0.01, oy: -0.02, brightness: 1.3 },
      { ox: -0.015, oy: 0.015, brightness: 1.0 },
      { ox: 0.015, oy: -0.015, brightness: 1.1 },
      { ox: 0.04, oy: -0.025, brightness: 1.0 },
      { ox: 0.065, oy: -0.015, brightness: 1.2 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6]],
    hueIdx: 2, breathePhase: 3.0, isFocalCluster: true,
  },
  {
    name: "Scorpius", cx: 0.73, cy: 0.72,
    stars: [
      { ox: -0.06, oy: -0.035, brightness: 1.0 },
      { ox: -0.04, oy: -0.02, brightness: 1.1 },
      { ox: -0.02, oy: -0.01, brightness: 1.5 },
      { ox: -0.01, oy: 0.01, brightness: 1.0 },
      { ox: 0.0, oy: 0.03, brightness: 0.9 },
      { ox: 0.02, oy: 0.04, brightness: 1.0 },
      { ox: 0.04, oy: 0.035, brightness: 1.1 },
      { ox: 0.055, oy: 0.025, brightness: 1.2 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]],
    hueIdx: 3, breathePhase: 4.5, isFocalCluster: true,
  },
  {
    name: "Lyra", cx: 0.48, cy: 0.14,
    stars: [
      { ox: 0.0, oy: -0.03, brightness: 1.6 },
      { ox: -0.015, oy: 0.0, brightness: 0.9 },
      { ox: 0.015, oy: 0.0, brightness: 0.9 },
      { ox: -0.01, oy: 0.025, brightness: 0.8 },
      { ox: 0.01, oy: 0.025, brightness: 0.8 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4]],
    hueIdx: 4, breathePhase: 6.0,
  },
  {
    name: "Crux", cx: 0.14, cy: 0.78,
    stars: [
      { ox: 0.0, oy: -0.03, brightness: 1.4 },
      { ox: 0.0, oy: 0.03, brightness: 1.3 },
      { ox: -0.025, oy: 0.0, brightness: 1.1 },
      { ox: 0.025, oy: 0.0, brightness: 1.1 },
    ],
    lines: [[0,1],[2,3]],
    hueIdx: 1, breathePhase: 7.5,
  },
  {
    name: "Cygnus", cx: 0.50, cy: 0.45,
    stars: [
      { ox: 0.0, oy: -0.05, brightness: 1.4 },
      { ox: 0.0, oy: -0.02, brightness: 1.0 },
      { ox: 0.0, oy: 0.01, brightness: 1.2 },
      { ox: -0.04, oy: 0.0, brightness: 1.0 },
      { ox: 0.04, oy: 0.0, brightness: 1.0 },
      { ox: 0.0, oy: 0.045, brightness: 1.3 },
    ],
    lines: [[0,1],[1,2],[2,5],[3,2],[2,4]],
    hueIdx: 0, breathePhase: 2.2,
  },
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/* ── Component ───────────────────────────────────────────────── */
const PrimeConstellationBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const angleRef = useRef(0);
  const vogelAngleRef = useRef(0);
  const scrollRef = useRef(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback((now: number) => {
    rafRef.current = requestAnimationFrame(draw);

    if (document.hidden) return;
    if (now - lastFrameRef.current < FRAME_INTERVAL) return;
    lastFrameRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const scrollFrac = scrollRef.current;
    const time = timeRef.current;

    const tStars = smoothstep(Math.min(1, Math.max(0, (scrollFrac - SCROLL_STARS_START) / (SCROLL_STARS_FULL - SCROLL_STARS_START))));
    const tConst = smoothstep(Math.min(1, Math.max(0, (scrollFrac - SCROLL_CONST_START) / (SCROLL_CONST_FULL - SCROLL_CONST_START))));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Vogel spiral (hero zone, only when near top) ──────────
    const heroFade = 1 - Math.min(1, scrollFrac * 4);
    if (heroFade > 0.01) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = heroFade;

      const cx = w * 0.5;
      const cy = h * 0.5;
      const diagonal = Math.sqrt(w * w + h * h) * 0.48;
      const spacing = diagonal / Math.sqrt(VOGEL_MAX_N);
      const mouse = mouseRef.current;
      const vAngle = vogelAngleRef.current;

      for (let n = 1; n <= VOGEL_MAX_N; n++) {
        const angle = n * GOLDEN_ANGLE + vAngle;
        const r = spacing * Math.sqrt(n);
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

        const isPrime = PRIMES.has(n);
        let alpha = isPrime ? VOGEL_PRIME_ALPHA : VOGEL_COMPOSITE_ALPHA;
        let dotR = isPrime ? VOGEL_PRIME_DOT_R : VOGEL_COMPOSITE_DOT_R;
        const color = isPrime ? VOGEL_GOLD : VOGEL_NEUTRAL;

        if (mouse) {
          const dist = Math.hypot(x - mouse.x, y - mouse.y);
          if (dist < SPOTLIGHT_RADIUS) {
            const norm = dist / SPOTLIGHT_RADIUS;
            const t = 1 - norm * norm * norm;
            alpha = lerp(alpha, isPrime ? VOGEL_PEAK_ALPHA : VOGEL_PEAK_ALPHA * 0.35, t);
            dotR = lerp(dotR, isPrime ? VOGEL_PEAK_DOT_R : VOGEL_PEAK_DOT_R * 0.5, t);
          }
        }

        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${color}, ${alpha})`;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Early exit if stars not visible yet ──────────────────
    if (tStars < 0.001) {
      angleRef.current += ROTATION_SPEED;
      vogelAngleRef.current += VOGEL_ROTATION_SPEED;
      timeRef.current += PULSE_SPEED;
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const globalAngle = angleRef.current;

    // ── Phase 1: Field stars ─────────────────────────────────
    for (const star of fieldStars) {
      const localT = Math.max(0, Math.min(1, (tStars - star.depth * 0.6) / 0.4));
      if (localT < 0.01) continue;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 1.5 + star.twinklePhase);

      const orbitX = Math.cos(time * star.orbitSpeed + star.orbitPhase) * star.orbitRx;
      const orbitY = Math.sin(time * star.orbitSpeed + star.orbitPhase) * star.orbitRy;

      const dx = star.x + orbitX - 0.5;
      const dy = star.y + orbitY - 0.5;
      const cosA = Math.cos(globalAngle * (0.5 + star.depth));
      const sinA = Math.sin(globalAngle * (0.5 + star.depth));
      const rx = 0.5 + dx * cosA - dy * sinA;
      const ry = 0.5 + dx * sinA + dy * cosA;

      const sx = rx * w;
      const sy = ry * h;
      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

      const alpha = localT * twinkle * 0.45;
      const r = star.size * localT * 1.1;
      const hue = STAR_HUES[star.hueIdx];

      // Simplified: skip radial gradients for small stars
      if (r < 0.5) {
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(r, 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${alpha})`;
        ctx.fill();
        continue;
      }

      const glowR = r * 4;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      glow.addColorStop(0, `hsla(${hue}, ${alpha * 0.6})`);
      glow.addColorStop(0.3, `hsla(${hue}, ${alpha * 0.15})`);
      glow.addColorStop(1, `hsla(${hue}, 0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(r * 0.35, 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${Math.min(alpha * 2, 0.7)})`;
      ctx.fill();
    }

    // ── Phase 2: Constellations ──────────────────────────────
    if (tConst > 0.01) {
      for (let ci = 0; ci < constellationDefs.length; ci++) {
        const c = constellationDefs[ci];
        const cDelay = ci * 0.1;
        const cT = smoothstep(Math.max(0, Math.min(1, (tConst - cDelay) / (1 - cDelay * 0.5))));
        if (cT < 0.01) continue;

        const breathe = 1 + 0.08 * Math.sin(time * 0.8 + c.breathePhase);
        const baseHue = STAR_HUES[c.hueIdx];

        const starPositions = c.stars.map((s, si) => {
          const drift = 0.001 * Math.sin(time * 0.2 + si * 1.7 + c.breathePhase);
          const driftY = 0.001 * Math.cos(time * 0.18 + si * 2.1 + c.breathePhase);
          return {
            x: (c.cx + s.ox + drift) * w,
            y: (c.cy + s.oy + driftY) * h,
            brightness: s.brightness,
          };
        });

        // Lines
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineDelay = li * 0.08;
          const lineT = smoothstep(Math.max(0, Math.min(1, (cT - lineDelay) / 0.4)));
          if (lineT < 0.01) continue;

          const ax = starPositions[a].x;
          const ay = starPositions[a].y;
          const bx = ax + (starPositions[b].x - ax) * lineT;
          const by = ay + (starPositions[b].y - ay) * lineT;

          const lineAlpha = cT * 0.12 * breathe;
          ctx.strokeStyle = `hsla(${baseHue}, ${lineAlpha})`;
          ctx.lineWidth = 0.5 + 0.2 * breathe;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Stars
        for (const star of starPositions) {
          const starAlpha = cT * 0.5 * star.brightness * breathe;
          const starR = 1.2 * star.brightness * breathe;
          const useAmber = c.isFocalCluster && star.brightness >= 1.4;
          const hue = useAmber ? AMBER_HUE : baseHue;

          const nebulaR = starR * (useAmber ? 14 : 10);
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${hue}, ${starAlpha * (useAmber ? 0.15 : 0.1)})`);
          nebula.addColorStop(0.4, `hsla(${hue}, ${starAlpha * 0.03})`);
          nebula.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, nebulaR, 0, Math.PI * 2);
          ctx.fillStyle = nebula;
          ctx.fill();

          const innerR = starR * 3.5;
          const inner = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, innerR);
          inner.addColorStop(0, `hsla(${hue}, ${starAlpha * 0.5})`);
          inner.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, innerR, 0, Math.PI * 2);
          ctx.fillStyle = inner;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${Math.min(starAlpha * 1.5, 0.6)})`;
          ctx.fill();
        }
      }
    }

    ctx.restore();

    angleRef.current += ROTATION_SPEED;
    vogelAngleRef.current += VOGEL_ROTATION_SPEED;
    timeRef.current += PULSE_SPEED;
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

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => { mouseRef.current = null; };

    resize();
    onScroll();

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
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

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
const ROTATION_SPEED = 0.000015;
const PULSE_SPEED = 0.0004;

// Scroll phases
const SCROLL_STARS_START = 0.06;
const SCROLL_STARS_FULL = 0.45;
const SCROLL_CONST_START = 0.40;
const SCROLL_CONST_FULL = 0.90;

// Star colors — cool whites and silvers, NO yellow/gold
const STAR_HUES = [
  "220, 15%, 88%",  // warm white
  "210, 25%, 80%",  // cool blue-white
  "240, 10%, 85%",  // soft lavender-white
  "200, 20%, 75%",  // ice blue
  "0, 0%, 90%",     // pure white
];

/* ── Field stars — sparse, distant, galaxy-like ──────────────── */
interface FieldStar {
  x: number; // normalized 0..1
  y: number;
  size: number; // 0.3..1.2
  hueIdx: number;
  twinklePhase: number;
  depth: number; // 0..1, controls when it appears (inner=0, outer=1)
}

const rand = mulberry32(42);
const FIELD_STAR_COUNT = 90;
const fieldStars: FieldStar[] = [];

for (let i = 0; i < FIELD_STAR_COUNT; i++) {
  const x = rand();
  const y = rand();
  const dx = x - 0.5;
  const dy = y - 0.5;
  fieldStars.push({
    x,
    y,
    size: 0.3 + rand() * 0.9,
    hueIdx: Math.floor(rand() * STAR_HUES.length),
    twinklePhase: rand() * Math.PI * 2,
    depth: Math.sqrt(dx * dx + dy * dy) / 0.707, // distance from center normalized
  });
}

/* ── Constellation definitions ───────────────────────────────── */
interface ConstellationDef {
  // Star positions relative to constellation center (normalized -0.15..0.15)
  stars: Array<{ ox: number; oy: number; brightness: number }>;
  lines: [number, number][];
  cx: number; cy: number; // center position (normalized 0..1)
  hueIdx: number;
  breathePhase: number;
}

const constellationDefs: ConstellationDef[] = [
  {
    // Orion-like — top right
    cx: 0.78, cy: 0.25,
    stars: [
      { ox: 0, oy: -0.06, brightness: 1.5 },
      { ox: 0.04, oy: -0.03, brightness: 1.2 },
      { ox: -0.03, oy: -0.02, brightness: 1.0 },
      { ox: 0.01, oy: 0.02, brightness: 1.3 },
      { ox: -0.02, oy: 0.05, brightness: 1.1 },
      { ox: 0.04, oy: 0.06, brightness: 0.9 },
      { ox: -0.05, oy: 0.07, brightness: 0.8 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[4,5],[4,6]],
    hueIdx: 0, breathePhase: 0,
  },
  {
    // Cassiopeia-like W — top left
    cx: 0.18, cy: 0.20,
    stars: [
      { ox: -0.06, oy: 0, brightness: 1.2 },
      { ox: -0.03, oy: -0.03, brightness: 1.0 },
      { ox: 0, oy: 0.01, brightness: 1.4 },
      { ox: 0.03, oy: -0.02, brightness: 1.0 },
      { ox: 0.06, oy: 0.01, brightness: 1.1 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]],
    hueIdx: 1, breathePhase: 1.5,
  },
  {
    // Triangle — center-left
    cx: 0.25, cy: 0.60,
    stars: [
      { ox: 0, oy: -0.04, brightness: 1.5 },
      { ox: 0.04, oy: 0.03, brightness: 1.1 },
      { ox: -0.04, oy: 0.03, brightness: 1.1 },
      { ox: 0, oy: 0, brightness: 0.8 },
    ],
    lines: [[0,1],[1,2],[2,0],[0,3]],
    hueIdx: 2, breathePhase: 3.0,
  },
  {
    // Dipper-like arc — bottom right
    cx: 0.72, cy: 0.72,
    stars: [
      { ox: -0.07, oy: -0.02, brightness: 1.0 },
      { ox: -0.04, oy: 0, brightness: 1.2 },
      { ox: -0.01, oy: -0.01, brightness: 1.3 },
      { ox: 0.02, oy: 0, brightness: 1.1 },
      { ox: 0.05, oy: 0.02, brightness: 1.0 },
      { ox: 0.05, oy: -0.02, brightness: 0.9 },
      { ox: 0.08, oy: -0.02, brightness: 0.9 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6]],
    hueIdx: 3, breathePhase: 4.5,
  },
  {
    // Cross — center
    cx: 0.50, cy: 0.45,
    stars: [
      { ox: 0, oy: -0.05, brightness: 1.5 },
      { ox: 0, oy: 0, brightness: 1.0 },
      { ox: 0, oy: 0.05, brightness: 1.2 },
      { ox: -0.04, oy: 0, brightness: 0.9 },
      { ox: 0.04, oy: 0, brightness: 0.9 },
    ],
    lines: [[0,1],[1,2],[1,3],[1,4]],
    hueIdx: 4, breathePhase: 6.0,
  },
  {
    // Small cluster — bottom left
    cx: 0.15, cy: 0.82,
    stars: [
      { ox: -0.02, oy: -0.02, brightness: 1.3 },
      { ox: 0.02, oy: -0.01, brightness: 1.0 },
      { ox: 0, oy: 0.02, brightness: 1.1 },
    ],
    lines: [[0,1],[1,2],[2,0]],
    hueIdx: 1, breathePhase: 7.5,
  },
  {
    // Serpent — upper center
    cx: 0.45, cy: 0.15,
    stars: [
      { ox: -0.06, oy: 0.01, brightness: 0.9 },
      { ox: -0.03, oy: -0.01, brightness: 1.1 },
      { ox: 0, oy: 0.01, brightness: 1.3 },
      { ox: 0.03, oy: -0.01, brightness: 1.0 },
      { ox: 0.06, oy: 0, brightness: 0.9 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]],
    hueIdx: 0, breathePhase: 2.2,
  },
];

/* ── Smoothstep helper ───────────────────────────────────────── */
const smoothstep = (t: number) => t * t * (3 - 2 * t);

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

    // Phase progressions
    const tStars = smoothstep(Math.min(1, Math.max(0, (scrollFrac - SCROLL_STARS_START) / (SCROLL_STARS_FULL - SCROLL_STARS_START))));
    const tConst = smoothstep(Math.min(1, Math.max(0, (scrollFrac - SCROLL_CONST_START) / (SCROLL_CONST_FULL - SCROLL_CONST_START))));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tStars < 0.001) {
      angleRef.current += ROTATION_SPEED;
      timeRef.current += PULSE_SPEED;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const globalAngle = angleRef.current;

    // ── Phase 1: Sparse distant stars fade in ──────────────────
    for (const star of fieldStars) {
      // Stagger by depth — inner stars first
      const localT = Math.max(0, Math.min(1, (tStars - star.depth * 0.6) / 0.4));
      if (localT < 0.01) continue;

      // Gentle twinkle
      const twinkle = 0.55 + 0.45 * Math.sin(time * 1.8 + star.twinklePhase);

      // Very subtle parallax rotation around center
      const dx = star.x - 0.5;
      const dy = star.y - 0.5;
      const cosA = Math.cos(globalAngle * (0.5 + star.depth));
      const sinA = Math.sin(globalAngle * (0.5 + star.depth));
      const rx = 0.5 + dx * cosA - dy * sinA;
      const ry = 0.5 + dx * sinA + dy * cosA;

      const sx = rx * w;
      const sy = ry * h;
      if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

      const alpha = localT * twinkle * 0.35;
      const r = star.size * localT;
      const hue = STAR_HUES[star.hueIdx];

      // Soft glow
      const glowR = r * 4;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      glow.addColorStop(0, `hsla(${hue}, ${alpha * 0.6})`);
      glow.addColorStop(0.4, `hsla(${hue}, ${alpha * 0.12})`);
      glow.addColorStop(1, `hsla(${hue}, 0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Sharp core
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(r * 0.35, 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${Math.min(alpha * 2.5, 0.7)})`;
      ctx.fill();
    }

    // ── Phase 2: Constellations emerge and connect ─────────────
    if (tConst > 0.01) {
      for (let ci = 0; ci < constellationDefs.length; ci++) {
        const c = constellationDefs[ci];
        // Stagger constellations
        const cDelay = ci * 0.08;
        const cT = smoothstep(Math.max(0, Math.min(1, (tConst - cDelay) / (1 - cDelay * 0.5))));
        if (cT < 0.01) continue;

        const breathe = 1 + 0.1 * Math.sin(time * 1.0 + c.breathePhase);
        const hue = STAR_HUES[c.hueIdx];

        // Compute constellation star positions
        const starPositions = c.stars.map(s => ({
          x: (c.cx + s.ox) * w,
          y: (c.cy + s.oy) * h,
          brightness: s.brightness,
        }));

        // Draw connecting lines — each grows in sequentially
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineDelay = li * 0.07;
          const lineT = smoothstep(Math.max(0, Math.min(1, (cT - lineDelay) / 0.35)));
          if (lineT < 0.01) continue;

          const ax = starPositions[a].x;
          const ay = starPositions[a].y;
          const bx = ax + (starPositions[b].x - ax) * lineT;
          const by = ay + (starPositions[b].y - ay) * lineT;

          const lineAlpha = cT * 0.12 * breathe;

          // Line with fading tip
          const grad = ctx.createLinearGradient(ax, ay, bx, by);
          grad.addColorStop(0, `hsla(${hue}, ${lineAlpha})`);
          grad.addColorStop(0.8, `hsla(${hue}, ${lineAlpha * 0.6})`);
          grad.addColorStop(1, `hsla(${hue}, ${lineAlpha * 0.1})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = (0.4 + 0.15 * breathe) * lineT;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Draw constellation stars — brighter than field, with nebula halo
        for (const star of starPositions) {
          const starAlpha = cT * 0.4 * star.brightness * breathe;
          const starR = 1.2 * star.brightness * breathe;

          // Nebula halo
          const nebulaR = starR * 10;
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${hue}, ${starAlpha * 0.1})`);
          nebula.addColorStop(0.25, `hsla(${hue}, ${starAlpha * 0.03})`);
          nebula.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, nebulaR, 0, Math.PI * 2);
          ctx.fillStyle = nebula;
          ctx.fill();

          // Inner glow
          const innerR = starR * 3.5;
          const inner = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, innerR);
          inner.addColorStop(0, `hsla(${hue}, ${starAlpha * 0.5})`);
          inner.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, innerR, 0, Math.PI * 2);
          ctx.fillStyle = inner;
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${Math.min(starAlpha * 1.8, 0.8)})`;
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

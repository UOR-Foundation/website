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

// Scroll phases. gentler, slower reveal
const SCROLL_STARS_START = 0.05;
const SCROLL_STARS_FULL = 0.35;
const SCROLL_CONST_START = 0.30;
const SCROLL_CONST_FULL = 0.85;

// Star colors. cool whites and silvers
const STAR_HUES = [
  "220, 15%, 88%",
  "210, 25%, 80%",
  "240, 10%, 85%",
  "200, 20%, 75%",
  "0, 0%, 90%",
];

// Subtle amber for brightest nodes
const AMBER_HUE = "38, 35%, 65%";

/* ── Field stars ─────────────────────────────────────────────── */
interface FieldStar {
  x: number;
  y: number;
  size: number;
  hueIdx: number;
  twinklePhase: number;
  depth: number;
  orbitRx: number;
  orbitRy: number;
  orbitSpeed: number;
  orbitPhase: number;
}

const rand = mulberry32(42);
const FIELD_STAR_COUNT = 180;
const fieldStars: FieldStar[] = [];

for (let i = 0; i < FIELD_STAR_COUNT; i++) {
  const x = rand();
  const y = rand();
  const dx = x - 0.5;
  const dy = y - 0.5;
  fieldStars.push({
    x,
    y,
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

/* ── Real constellation definitions ──────────────────────────── */
// Positions are normalized offsets from cx,cy. Patterns match
// actual star arrangements scaled to fit the viewport.

interface ConstellationDef {
  name: string;
  stars: Array<{ ox: number; oy: number; brightness: number }>;
  lines: [number, number][];
  cx: number; cy: number;
  hueIdx: number;
  breathePhase: number;
  isFocalCluster?: boolean;
}

const constellationDefs: ConstellationDef[] = [
  // ── Orion (top-right). the Hunter, most recognizable
  {
    name: "Orion",
    cx: 0.78, cy: 0.28,
    stars: [
      // Betelgeuse (left shoulder)
      { ox: -0.045, oy: -0.065, brightness: 1.6 },
      // Bellatrix (right shoulder)
      { ox: 0.04, oy: -0.06, brightness: 1.2 },
      // Alnitak (belt left)
      { ox: -0.015, oy: -0.01, brightness: 1.1 },
      // Alnilam (belt center)
      { ox: 0.0, oy: -0.005, brightness: 1.3 },
      // Mintaka (belt right)
      { ox: 0.015, oy: 0.0, brightness: 1.1 },
      // Saiph (left foot)
      { ox: -0.04, oy: 0.06, brightness: 1.0 },
      // Rigel (right foot)
      { ox: 0.045, oy: 0.065, brightness: 1.5 },
    ],
    lines: [[0,2],[1,4],[2,3],[3,4],[0,5],[1,6],[2,5],[4,6]],
    hueIdx: 0, breathePhase: 0,
    isFocalCluster: true,
  },
  // ── Cassiopeia (upper-left). the W shape
  {
    name: "Cassiopeia",
    cx: 0.18, cy: 0.18,
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
  // ── Ursa Major / Big Dipper (left-center)
  {
    name: "Ursa Major",
    cx: 0.22, cy: 0.52,
    stars: [
      // Bowl
      { ox: -0.05, oy: 0.02, brightness: 1.2 },
      { ox: -0.035, oy: -0.015, brightness: 1.1 },
      { ox: -0.01, oy: -0.02, brightness: 1.3 },
      { ox: -0.015, oy: 0.015, brightness: 1.0 },
      // Handle
      { ox: 0.015, oy: -0.015, brightness: 1.1 },
      { ox: 0.04, oy: -0.025, brightness: 1.0 },
      { ox: 0.065, oy: -0.015, brightness: 1.2 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6]],
    hueIdx: 2, breathePhase: 3.0,
    isFocalCluster: true,
  },
  // ── Scorpius (bottom-right). the curved tail
  {
    name: "Scorpius",
    cx: 0.73, cy: 0.72,
    stars: [
      // Head/claws
      { ox: -0.06, oy: -0.035, brightness: 1.0 },
      { ox: -0.04, oy: -0.02, brightness: 1.1 },
      // Antares (heart)
      { ox: -0.02, oy: -0.01, brightness: 1.5 },
      // Body curve
      { ox: -0.01, oy: 0.01, brightness: 1.0 },
      { ox: 0.0, oy: 0.03, brightness: 0.9 },
      // Tail
      { ox: 0.02, oy: 0.04, brightness: 1.0 },
      { ox: 0.04, oy: 0.035, brightness: 1.1 },
      // Stinger
      { ox: 0.055, oy: 0.025, brightness: 1.2 },
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]],
    hueIdx: 3, breathePhase: 4.5,
    isFocalCluster: true,
  },
  // ── Lyra (top-center). small parallelogram + Vega
  {
    name: "Lyra",
    cx: 0.48, cy: 0.14,
    stars: [
      // Vega (brightest)
      { ox: 0.0, oy: -0.03, brightness: 1.6 },
      // Parallelogram
      { ox: -0.015, oy: 0.0, brightness: 0.9 },
      { ox: 0.015, oy: 0.0, brightness: 0.9 },
      { ox: -0.01, oy: 0.025, brightness: 0.8 },
      { ox: 0.01, oy: 0.025, brightness: 0.8 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4]],
    hueIdx: 4, breathePhase: 6.0,
  },
  // ── Crux / Southern Cross (bottom-left)
  {
    name: "Crux",
    cx: 0.14, cy: 0.78,
    stars: [
      { ox: 0.0, oy: -0.03, brightness: 1.4 },
      { ox: 0.0, oy: 0.03, brightness: 1.3 },
      { ox: -0.025, oy: 0.0, brightness: 1.1 },
      { ox: 0.025, oy: 0.0, brightness: 1.1 },
    ],
    lines: [[0,1],[2,3]],
    hueIdx: 1, breathePhase: 7.5,
  },
  // ── Cygnus / Northern Cross (center)
  {
    name: "Cygnus",
    cx: 0.50, cy: 0.45,
    stars: [
      // Deneb (tail)
      { ox: 0.0, oy: -0.05, brightness: 1.4 },
      // Body
      { ox: 0.0, oy: -0.02, brightness: 1.0 },
      // Center
      { ox: 0.0, oy: 0.01, brightness: 1.2 },
      // Wings
      { ox: -0.04, oy: 0.0, brightness: 1.0 },
      { ox: 0.04, oy: 0.0, brightness: 1.0 },
      // Albireo (head)
      { ox: 0.0, oy: 0.045, brightness: 1.3 },
    ],
    lines: [[0,1],[1,2],[2,5],[3,2],[2,4]],
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

    // ── Phase 1: Field stars with orbital drift ────────────────
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

      // More subtle alpha. peak at 0.45 instead of 0.65
      const alpha = localT * twinkle * 0.45;
      const r = star.size * localT * 1.1;
      const hue = STAR_HUES[star.hueIdx];

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

    // ── Phase 2: Constellations. subtle, recognizable ──
    if (tConst > 0.01) {
      for (let ci = 0; ci < constellationDefs.length; ci++) {
        const c = constellationDefs[ci];
        const cDelay = ci * 0.1;
        const cT = smoothstep(Math.max(0, Math.min(1, (tConst - cDelay) / (1 - cDelay * 0.5))));
        if (cT < 0.01) continue;

        const breathe = 1 + 0.08 * Math.sin(time * 0.8 + c.breathePhase);
        const baseHue = STAR_HUES[c.hueIdx];

        // Compute positions with very gentle drift
        const starPositions = c.stars.map((s, si) => {
          const drift = 0.001 * Math.sin(time * 0.2 + si * 1.7 + c.breathePhase);
          const driftY = 0.001 * Math.cos(time * 0.18 + si * 2.1 + c.breathePhase);
          return {
            x: (c.cx + s.ox + drift) * w,
            y: (c.cy + s.oy + driftY) * h,
            brightness: s.brightness,
          };
        });

        // Draw connecting lines. very subtle, no traveling pulse
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineDelay = li * 0.08;
          const lineT = smoothstep(Math.max(0, Math.min(1, (cT - lineDelay) / 0.4)));
          if (lineT < 0.01) continue;

          const ax = starPositions[a].x;
          const ay = starPositions[a].y;
          const bx = ax + (starPositions[b].x - ax) * lineT;
          const by = ay + (starPositions[b].y - ay) * lineT;

          // Much more subtle line alpha. peak ~0.12
          const lineAlpha = cT * 0.12 * breathe;

          ctx.strokeStyle = `hsla(${baseHue}, ${lineAlpha})`;
          ctx.lineWidth = 0.5 + 0.2 * breathe;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Draw constellation stars. gentler glow
        for (const star of starPositions) {
          const starAlpha = cT * 0.5 * star.brightness * breathe;
          const starR = 1.2 * star.brightness * breathe;
          const useAmber = c.isFocalCluster && star.brightness >= 1.4;
          const hue = useAmber ? AMBER_HUE : baseHue;

          // Subtle nebula halo
          const nebulaR = starR * (useAmber ? 14 : 10);
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${hue}, ${starAlpha * (useAmber ? 0.15 : 0.1)})`);
          nebula.addColorStop(0.4, `hsla(${hue}, ${starAlpha * 0.03})`);
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
          ctx.fillStyle = `hsla(${hue}, ${Math.min(starAlpha * 1.5, 0.6)})`;
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

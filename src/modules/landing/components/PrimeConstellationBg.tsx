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
const ROTATION_SPEED = 0.000018;
const PULSE_SPEED = 0.0005;

// Scroll phases — reveal earlier for more visible experience
const SCROLL_STARS_START = 0.03;
const SCROLL_STARS_FULL = 0.30;
const SCROLL_CONST_START = 0.25;
const SCROLL_CONST_FULL = 0.70;

// Star colors — cool whites and silvers, NO yellow/gold
const STAR_HUES = [
  "220, 15%, 88%",  // warm white
  "210, 25%, 80%",  // cool blue-white
  "240, 10%, 85%",  // soft lavender-white
  "200, 20%, 75%",  // ice blue
  "0, 0%, 90%",     // pure white
];

// Foundation amber accent for brightest constellation nodes
const AMBER_HUE = "38, 40%, 70%";

/* ── Field stars — sparse, distant, galaxy-like ──────────────── */
interface FieldStar {
  x: number;
  y: number;
  size: number;
  hueIdx: number;
  twinklePhase: number;
  depth: number;
  // Orbital drift parameters
  orbitRx: number;
  orbitRy: number;
  orbitSpeed: number;
  orbitPhase: number;
}

const rand = mulberry32(42);
const FIELD_STAR_COUNT = 160;
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
    depth: Math.sqrt(dx * dx + dy * dy) / 0.707,
    orbitRx: 0.001 + rand() * 0.003,
    orbitRy: 0.001 + rand() * 0.003,
    orbitSpeed: 0.15 + rand() * 0.25,
    orbitPhase: rand() * Math.PI * 2,
  });
}

/* ── Constellation definitions ───────────────────────────────── */
interface ConstellationDef {
  stars: Array<{ ox: number; oy: number; brightness: number }>;
  lines: [number, number][];
  cx: number; cy: number;
  hueIdx: number;
  breathePhase: number;
  isFocalCluster?: boolean; // brightest nodes get amber tint
}

const constellationDefs: ConstellationDef[] = [
  {
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
    isFocalCluster: true,
  },
  {
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
    isFocalCluster: true,
  },
  {
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
    isFocalCluster: true,
  },
  {
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

      const twinkle = 0.55 + 0.45 * Math.sin(time * 1.8 + star.twinklePhase);

      // Orbital drift — each star traces a tiny ellipse
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

      const alpha = localT * twinkle * 0.65;
      const r = star.size * localT * 1.3;
      const hue = STAR_HUES[star.hueIdx];

      const glowR = r * 5;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      glow.addColorStop(0, `hsla(${hue}, ${alpha * 0.8})`);
      glow.addColorStop(0.3, `hsla(${hue}, ${alpha * 0.2})`);
      glow.addColorStop(1, `hsla(${hue}, 0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(r * 0.4, 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${Math.min(alpha * 2.5, 0.9)})`;
      ctx.fill();
    }

    // ── Phase 2: Constellations with pulsing lines & focal clusters ──
    if (tConst > 0.01) {
      for (let ci = 0; ci < constellationDefs.length; ci++) {
        const c = constellationDefs[ci];
        const cDelay = ci * 0.08;
        const cT = smoothstep(Math.max(0, Math.min(1, (tConst - cDelay) / (1 - cDelay * 0.5))));
        if (cT < 0.01) continue;

        const breathe = 1 + 0.15 * Math.sin(time * 1.0 + c.breathePhase);
        const baseHue = STAR_HUES[c.hueIdx];

        // Compute constellation star positions with orbital drift
        const starPositions = c.stars.map((s, si) => {
          const drift = 0.002 * Math.sin(time * 0.3 + si * 1.7 + c.breathePhase);
          const driftY = 0.002 * Math.cos(time * 0.25 + si * 2.1 + c.breathePhase);
          return {
            x: (c.cx + s.ox + drift) * w,
            y: (c.cy + s.oy + driftY) * h,
            brightness: s.brightness,
          };
        });

        // Draw connecting lines with traveling pulse
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineDelay = li * 0.07;
          const lineT = smoothstep(Math.max(0, Math.min(1, (cT - lineDelay) / 0.35)));
          if (lineT < 0.01) continue;

          const ax = starPositions[a].x;
          const ay = starPositions[a].y;
          const bx = ax + (starPositions[b].x - ax) * lineT;
          const by = ay + (starPositions[b].y - ay) * lineT;

          const lineAlpha = cT * 0.28 * breathe;

          // Traveling pulse along line — Foundation data-flow effect
          const pulsePos = (time * 0.4 + li * 0.5 + ci * 1.2) % 1;
          const pulseMidX = ax + (bx - ax) * pulsePos;
          const pulseMidY = ay + (by - ay) * pulsePos;

          // Base line
          const grad = ctx.createLinearGradient(ax, ay, bx, by);
          grad.addColorStop(0, `hsla(${baseHue}, ${lineAlpha})`);
          grad.addColorStop(0.8, `hsla(${baseHue}, ${lineAlpha * 0.6})`);
          grad.addColorStop(1, `hsla(${baseHue}, ${lineAlpha * 0.1})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = (0.7 + 0.3 * breathe) * lineT;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          // Pulse glow traveling along line
          if (lineT > 0.5) {
            const pulseR = 6;
            const pulseGlow = ctx.createRadialGradient(pulseMidX, pulseMidY, 0, pulseMidX, pulseMidY, pulseR);
            const pulseAlpha = lineAlpha * 1.5 * lineT;
            pulseGlow.addColorStop(0, `hsla(${AMBER_HUE}, ${pulseAlpha * 0.4})`);
            pulseGlow.addColorStop(1, `hsla(${AMBER_HUE}, 0)`);
            ctx.beginPath();
            ctx.arc(pulseMidX, pulseMidY, pulseR, 0, Math.PI * 2);
            ctx.fillStyle = pulseGlow;
            ctx.fill();
          }
        }

        // Draw constellation stars
        for (const star of starPositions) {
          const starAlpha = cT * 0.4 * star.brightness * breathe;
          const starR = 1.2 * star.brightness * breathe;
          // Focal clusters: brightest stars get amber tint
          const useAmber = c.isFocalCluster && star.brightness >= 1.3;
          const hue = useAmber ? AMBER_HUE : baseHue;

          // Nebula halo
          const nebulaR = starR * (useAmber ? 14 : 10);
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${hue}, ${starAlpha * (useAmber ? 0.15 : 0.1)})`);
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

import { useEffect, useRef, useCallback } from "react";

/* ── Deterministic seeded random ── */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROTATION_SPEED = 0.000008;
const PULSE_SPEED = 0.0003;

const STAR_HUES = [
  "220, 15%, 88%",
  "210, 25%, 80%",
  "240, 10%, 85%",
  "200, 20%, 75%",
  "0, 0%, 90%",
];

const AMBER_HUE = "38, 35%, 65%";

/* ── Field stars ── */
interface FieldStar {
  x: number; y: number; size: number; hueIdx: number;
  twinklePhase: number; depth: number;
  orbitRx: number; orbitRy: number; orbitSpeed: number; orbitPhase: number;
}

const rand = mulberry32(137);
const FIELD_STAR_COUNT = 140;
const fieldStars: FieldStar[] = [];

for (let i = 0; i < FIELD_STAR_COUNT; i++) {
  const x = rand();
  const y = rand();
  const dx = x - 0.5;
  const dy = y - 0.5;
  fieldStars.push({
    x, y,
    size: 0.2 + rand() * 0.6,
    hueIdx: Math.floor(rand() * STAR_HUES.length),
    twinklePhase: rand() * Math.PI * 2,
    depth: Math.sqrt(dx * dx + dy * dy) / 0.707,
    orbitRx: 0.0004 + rand() * 0.0015,
    orbitRy: 0.0004 + rand() * 0.0015,
    orbitSpeed: 0.08 + rand() * 0.15,
    orbitPhase: rand() * Math.PI * 2,
  });
}

/* ── Constellation definitions ── */
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
  {
    name: "Orion",
    cx: 0.82, cy: 0.25,
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
    name: "Cassiopeia",
    cx: 0.15, cy: 0.15,
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
    name: "Crux",
    cx: 0.12, cy: 0.75,
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
    name: "Lyra",
    cx: 0.50, cy: 0.12,
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
    name: "Scorpius",
    cx: 0.75, cy: 0.78,
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
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/* ── Component ── */
const SearchConstellationBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const angleRef = useRef(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const fadeInRef = useRef(0);
  const FRAME_INTERVAL = 1000 / 30;

  const draw = useCallback((now: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return; }

    const elapsed = now - lastFrameRef.current;
    if (elapsed < FRAME_INTERVAL) { rafRef.current = requestAnimationFrame(draw); return; }
    lastFrameRef.current = now - (elapsed % FRAME_INTERVAL);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const time = timeRef.current;

    // Gentle fade-in over ~2 seconds
    fadeInRef.current = Math.min(1, fadeInRef.current + 0.016);
    const masterAlpha = smoothstep(fadeInRef.current);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const globalAngle = angleRef.current;

    // ── Field stars ──
    for (const star of fieldStars) {
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

      const alpha = masterAlpha * twinkle * 0.3;
      const r = star.size * 1.1;
      const hue = STAR_HUES[star.hueIdx];

      const glowR = r * 3.5;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      glow.addColorStop(0, `hsla(${hue}, ${alpha * 0.5})`);
      glow.addColorStop(0.3, `hsla(${hue}, ${alpha * 0.12})`);
      glow.addColorStop(1, `hsla(${hue}, 0)`);
      ctx.beginPath();
      ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(r * 0.35, 0.35), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${Math.min(alpha * 1.8, 0.55)})`;
      ctx.fill();
    }

    // ── Constellations ──
    const constAlpha = masterAlpha * smoothstep(Math.min(1, fadeInRef.current * 0.8));
    if (constAlpha > 0.01) {
      for (let ci = 0; ci < constellationDefs.length; ci++) {
        const c = constellationDefs[ci];
        const cDelay = ci * 0.15;
        const cT = smoothstep(Math.max(0, Math.min(1, (fadeInRef.current - cDelay) / (1 - cDelay * 0.5))));
        if (cT < 0.01) continue;

        const breathe = 1 + 0.08 * Math.sin(time * 0.8 + c.breathePhase);
        const baseHue = STAR_HUES[c.hueIdx];

        const starPositions = c.stars.map((s, si) => {
          const drift = 0.001 * Math.sin(time * 0.2 + si * 1.7 + c.breathePhase);
          const driftY = 0.001 * Math.cos(time * 0.18 + si * 2.1 + c.breathePhase);
          return { x: (c.cx + s.ox + drift) * w, y: (c.cy + s.oy + driftY) * h, brightness: s.brightness };
        });

        // Lines
        for (let li = 0; li < c.lines.length; li++) {
          const [a, b] = c.lines[li];
          const lineDelay = li * 0.08;
          const lineT = smoothstep(Math.max(0, Math.min(1, (cT - lineDelay) / 0.4)));
          if (lineT < 0.01) continue;

          const ax = starPositions[a].x, ay = starPositions[a].y;
          const bx = ax + (starPositions[b].x - ax) * lineT;
          const by = ay + (starPositions[b].y - ay) * lineT;

          ctx.strokeStyle = `hsla(${baseHue}, ${cT * 0.08 * breathe * masterAlpha})`;
          ctx.lineWidth = 0.4 + 0.15 * breathe;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }

        // Stars
        for (const star of starPositions) {
          const starAlpha = cT * 0.4 * star.brightness * breathe * masterAlpha;
          const starR = 1.1 * star.brightness * breathe;
          const useAmber = c.isFocalCluster && star.brightness >= 1.4;
          const hue = useAmber ? AMBER_HUE : baseHue;

          const nebulaR = starR * (useAmber ? 12 : 9);
          const nebula = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, nebulaR);
          nebula.addColorStop(0, `hsla(${hue}, ${starAlpha * (useAmber ? 0.12 : 0.08)})`);
          nebula.addColorStop(0.4, `hsla(${hue}, ${starAlpha * 0.02})`);
          nebula.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, nebulaR, 0, Math.PI * 2);
          ctx.fillStyle = nebula;
          ctx.fill();

          const innerR = starR * 3;
          const inner = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, innerR);
          inner.addColorStop(0, `hsla(${hue}, ${starAlpha * 0.4})`);
          inner.addColorStop(1, `hsla(${hue}, 0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, innerR, 0, Math.PI * 2);
          ctx.fillStyle = inner;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(star.x, star.y, starR * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${Math.min(starAlpha * 1.3, 0.5)})`;
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

    resize();
    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
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

export default SearchConstellationBg;

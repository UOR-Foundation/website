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
const MAX_N = 8000;
const GOLDEN_ANGLE = 2.3999632297286533;
const ROTATION_SPEED = 0.00004;
const GOLD = "38, 65%, 55%";
const SILVER = "220, 15%, 70%";

// Scroll: starts faintly at 30%, fully visible by 85%
const SCROLL_START = 0.30;
const SCROLL_FULL = 0.85;

const PEAK_ALPHA = 0.18;
const COMPOSITE_ALPHA = 0.04;
const DOT_R_PRIME = 1.5;
const DOT_R_COMPOSITE = 0.6;
const PULSE_SPEED = 0.0003;

/* ── Orion constellation pattern ─────────────────────────────
 * Defined as normalized coordinates (0-1 range, centered at 0.5).
 * Each star is mapped to the nearest prime in the Vogel spiral.
 * Lines define the stick figure of Orion.
 */
const ORION_STARS = [
  // Belt: Alnitak, Alnilam, Mintaka
  { name: "Alnitak",    nx: 0.44, ny: 0.48, brightness: 1.4 },
  { name: "Alnilam",    nx: 0.50, ny: 0.47, brightness: 1.6 },
  { name: "Mintaka",    nx: 0.56, ny: 0.46, brightness: 1.3 },
  // Shoulders: Betelgeuse, Bellatrix
  { name: "Betelgeuse", nx: 0.38, ny: 0.34, brightness: 1.8 },
  { name: "Bellatrix",  nx: 0.60, ny: 0.35, brightness: 1.3 },
  // Feet: Saiph, Rigel
  { name: "Saiph",      nx: 0.40, ny: 0.64, brightness: 1.1 },
  { name: "Rigel",      nx: 0.58, ny: 0.65, brightness: 1.5 },
  // Sword (below belt)
  { name: "Sword",      nx: 0.49, ny: 0.55, brightness: 1.0 },
];

// Orion stick figure connections (indices into ORION_STARS)
const ORION_LINES: [number, number][] = [
  // Belt
  [0, 1], [1, 2],
  // Shoulders to belt
  [3, 0], [4, 2],
  // Shoulders across
  [3, 4],
  // Belt to feet
  [0, 5], [2, 6],
  // Sword from belt center
  [1, 7],
];

/* ── Pre-compute ─────────────────────────────────────────────── */
const primes = sievePrimes(MAX_N);
const primeList: number[] = [];
for (let n = 2; n <= MAX_N; n++) if (primes.has(n)) primeList.push(n);

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
    const diagonal = Math.sqrt(w * w + h * h) * 0.48;
    const spacing = diagonal / Math.sqrt(MAX_N);

    const globalAngle = angleRef.current;
    const pulse = 1 + 0.06 * Math.sin(timeRef.current);
    const masterAlpha = easedT * pulse;

    // Draw all integers on Vogel spiral — primes brighter
    for (let n = 1; n <= MAX_N; n++) {
      const angle = n * GOLDEN_ANGLE + globalAngle;
      const r = spacing * Math.sqrt(n);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      const isPrime = primes.has(n);
      const alpha = masterAlpha * (isPrime ? PEAK_ALPHA : COMPOSITE_ALPHA);
      const dotR = isPrime ? DOT_R_PRIME : DOT_R_COMPOSITE;
      const color = isPrime ? GOLD : SILVER;

      ctx.beginPath();
      ctx.arc(x, y, dotR * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${color}, ${alpha})`;
      ctx.fill();
    }

    // Draw Orion constellation overlay once sufficiently visible
    if (easedT > 0.25) {
      const orionAlpha = Math.min(1, (easedT - 0.25) / 0.4) * 0.35 * pulse;

      // Compute Orion star screen positions
      const orionScreenPos = ORION_STARS.map(star => ({
        x: star.nx * w,
        y: star.ny * h,
        brightness: star.brightness,
        name: star.name,
      }));

      // Draw constellation lines
      ctx.strokeStyle = `hsla(${GOLD}, ${orionAlpha * 0.5})`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 6]);
      for (const [a, b] of ORION_LINES) {
        ctx.beginPath();
        ctx.moveTo(orionScreenPos[a].x, orionScreenPos[a].y);
        ctx.lineTo(orionScreenPos[b].x, orionScreenPos[b].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw Orion stars as bright prime-gold dots with glow
      for (const star of orionScreenPos) {
        const starR = 2.5 * star.brightness * pulse;
        const starAlpha = orionAlpha * star.brightness;

        // Outer glow
        const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, starR * 4);
        grad.addColorStop(0, `hsla(${GOLD}, ${starAlpha * 0.4})`);
        grad.addColorStop(1, `hsla(${GOLD}, 0)`);
        ctx.beginPath();
        ctx.arc(star.x, star.y, starR * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(star.x, star.y, starR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${GOLD}, ${starAlpha})`;
        ctx.fill();
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

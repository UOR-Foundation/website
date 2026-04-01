import { useEffect, useRef, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
const GOLDEN_ANGLE = 2.3999632297286533; // π * (3 - √5)
const SPOTLIGHT_RADIUS = 320;

const BASE_ALPHA = 0.018;
const BASE_ALPHA_MOBILE = 0.045;
const PEAK_ALPHA = 0.55;
const BASE_DOT_R = 1.2;
const PEAK_DOT_R = 3;
const ROTATION_SPEED = 0.00015; // rad per frame — slow, meditative

const GOLD = "38, 65%, 55%";

/* ── Helpers ─────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ── Component ───────────────────────────────────────────────── */
const PrimeGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef(0);
  const angleRef = useRef(0);
  const isMobile = useIsMobile();

  const primes = useMemo(() => sievePrimes(MAX_N), []);

  const primeIndices = useMemo(() => {
    const arr: number[] = [];
    for (let n = 2; n <= MAX_N; n++) if (primes.has(n)) arr.push(n);
    return arr;
  }, [primes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Center the spiral exactly in the middle of the hero
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Scale so the outermost prime dot reaches the corners
    const diagonal = Math.sqrt(w * w + h * h) * 0.52;
    const spacing = diagonal / Math.sqrt(MAX_N);

    const mouse = mouseRef.current;
    const globalAngle = angleRef.current;
    const baseAlpha = isMobile ? BASE_ALPHA_MOBILE : BASE_ALPHA;

    for (let i = 0; i < primeIndices.length; i++) {
      const n = primeIndices[i];
      // Vogel spiral: angle = n * golden_angle, radius = spacing * √n
      const angle = n * GOLDEN_ANGLE + globalAngle;
      const r = spacing * Math.sqrt(n);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      // Cull off-screen dots
      if (x < -5 || x > w + 5 || y < -5 || y > h + 5) continue;

      let alpha = baseAlpha;
      let dotR = BASE_DOT_R;

      if (mouse) {
        const dist = Math.hypot(x - mouse.x, y - mouse.y);
        if (dist < SPOTLIGHT_RADIUS) {
          const norm = dist / SPOTLIGHT_RADIUS;
          const t = 1 - norm * norm * norm; // cubic falloff
          alpha = lerp(baseAlpha, PEAK_ALPHA, t);
          dotR = lerp(BASE_DOT_R, PEAK_DOT_R, t);
        }
      }

      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${GOLD}, ${alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }, [primeIndices, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseLeave = () => {
      mouseRef.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const onTouchEnd = () => {
      mouseRef.current = null;
    };

    const loop = () => {
      angleRef.current += ROTATION_SPEED;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    resize();

    const observer = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) observer.observe(parent);

    // Listen on the canvas itself (it now has pointer-events)
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      observer.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[1]"
      aria-hidden="true"
    />
  );
};

export default PrimeGrid;

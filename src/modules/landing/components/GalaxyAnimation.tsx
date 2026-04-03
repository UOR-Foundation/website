import { useEffect, useRef } from "react";

/**
 * Galaxy animation — canvas-based replacement for the 1,400-DOM-node version.
 * Draws two mirrored spiral arms (gold → violet → deep blue) on a single canvas.
 * Uses IntersectionObserver + document.hidden to pause when off-screen.
 */

const DOT_COUNT = 35;
const ARM_COUNT = 20;
const ROTATION_SPEED = 0.02; // radians per frame (at ~30fps ≈ one revolution per ~10s)

// Gold → Violet → Deep Blue gradient (matching original galaxy.css)
const DOT_COLORS: string[] = [
  "hsla(38,80%,60%,", "hsla(36,75%,58%,", "hsla(34,72%,56%,",
  "hsla(32,68%,54%,", "hsla(30,64%,52%,", "hsla(28,60%,50%,",
  "hsla(25,55%,48%,", "hsla(22,52%,46%,", "hsla(18,50%,46%,",
  "hsla(14,48%,46%,", "hsla(10,46%,46%,", "hsla(5,44%,46%,",
  "hsla(0,42%,46%,",  "hsla(355,42%,44%,","hsla(348,42%,43%,",
  "hsla(340,40%,42%,","hsla(278,50%,44%,","hsla(272,50%,44%,",
  "hsla(266,50%,44%,","hsla(260,48%,44%,","hsla(255,46%,44%,",
  "hsla(250,44%,44%,","hsla(246,42%,42%,","hsla(242,40%,40%,",
  "hsla(238,38%,38%,","hsla(235,36%,36%,","hsla(232,34%,34%,",
  "hsla(230,32%,32%,","hsla(228,30%,30%,","hsla(226,28%,28%,",
  "hsla(224,26%,26%,","hsla(222,24%,24%,","hsla(220,22%,22%,",
  "hsla(218,20%,20%,","hsla(216,18%,18%,",
];

// Scale per dot index (1 → 0.01)
const DOT_SCALES: number[] = Array.from({ length: DOT_COUNT }, (_, i) =>
  Math.max(0.01, 1 - i * (0.99 / (DOT_COUNT - 1)))
);

const GalaxyAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const angleRef = useRef(0);
  const visibleRef = useRef(true);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    // Visibility: IntersectionObserver + document.hidden
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const onVisChange = () => {
      if (document.hidden) visibleRef.current = false;
    };
    document.addEventListener("visibilitychange", onVisChange);

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const FRAME_INTERVAL = 1000 / 30; // 30fps cap

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);

      if (!visibleRef.current) return;
      if (now - lastFrameRef.current < FRAME_INTERVAL) return;
      lastFrameRef.current = now;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h / 2;
      const orbitR = Math.min(w, h) * 0.24;
      const dotBase = Math.min(w, h) * 0.008;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const ga = angleRef.current;

      // Draw two galaxies (mirrored)
      for (let g = 0; g < 2; g++) {
        const mirror = g === 0 ? -1 : 1;
        const offsetX = g === 0 ? -w * 0.012 : w * 0.012;

        for (let arm = 0; arm < ARM_COUNT; arm++) {
          const armAngle = (arm / ARM_COUNT) * Math.PI * 2;
          // Animation delay per arm
          const armPhase = ga + armAngle;

          for (let d = 0; d < DOT_COUNT; d++) {
            const scale = DOT_SCALES[d];
            const dotAngle = (d / DOT_COUNT) * Math.PI * 2;
            const r = orbitR * scale;

            // Position: arm rotates, dot orbits within arm
            const totalAngle = armPhase + dotAngle * mirror;
            const x = cx + offsetX + Math.cos(totalAngle) * r;
            const y = cy + Math.sin(totalAngle) * r * mirror;

            const dotR = dotBase * scale * 2.5;
            if (dotR < 0.15) continue;

            const alpha = Math.max(0.08, scale * 0.85);
            ctx.beginPath();
            ctx.arc(x, y, dotR, 0, Math.PI * 2);
            ctx.fillStyle = DOT_COLORS[d] + alpha + ")";
            ctx.fill();
          }
        }
      }

      ctx.restore();
      angleRef.current += ROTATION_SPEED;
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
};

export default GalaxyAnimation;

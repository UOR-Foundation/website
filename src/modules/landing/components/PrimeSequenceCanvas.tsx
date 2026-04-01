import { useEffect, useRef, useCallback } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/** Generate prime numbers up to n */
function primesUpTo(n: number): number[] {
  const flags = new Uint8Array(n + 1).fill(1);
  flags[0] = flags[1] = 0;
  for (let i = 2; i * i <= n; i++) {
    if (flags[i]) for (let j = i * i; j <= n; j += i) flags[j] = 0;
  }
  const result: number[] = [];
  for (let i = 2; i <= n; i++) if (flags[i]) result.push(i);
  return result;
}

const PRIMES = primesUpTo(2000);
const PRIME_TEXT = PRIMES.join("  ");
const DRIFT_SPEED = 0.2; // px per frame — meditative
const LINE_HEIGHT = 28;
const FONT = '10px ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace';
const TEXT_COLOR = "hsla(38, 65%, 55%, 0.04)";

// Pretext-measured width (computed once)
let cachedFullWidth: number | null = null;
function getFullWidth(): number {
  if (cachedFullWidth !== null) return cachedFullWidth;
  try {
    const prepared = prepareWithSegments(PRIME_TEXT + "  ", FONT);
    const result = layoutWithLines(prepared, 999999, LINE_HEIGHT);
    cachedFullWidth = result.lines.length > 0 ? result.lines[0].width : 0;
  } catch {
    cachedFullWidth = 0;
  }
  return cachedFullWidth;
}

const PrimeSequenceCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(0);

  const render = useCallback(() => {
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

    ctx.font = FONT;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textBaseline = "top";

    // Use pretext-measured width, fallback to ctx.measureText
    let fullWidth = getFullWidth();
    if (!fullWidth || fullWidth <= 0) {
      fullWidth = ctx.measureText(PRIME_TEXT + "  ").width;
    }

    offsetRef.current = (offsetRef.current + DRIFT_SPEED) % fullWidth;

    const rows = Math.ceil(h / LINE_HEIGHT) + 1;
    const startY = h * 0.07;

    for (let row = 0; row < rows; row++) {
      const y = startY + row * LINE_HEIGHT;
      if (y > h) break;

      const rowOffset = offsetRef.current + row * 47;
      let x = -(rowOffset % fullWidth);
      while (x < w) {
        ctx.fillText(PRIME_TEXT, x, y);
        x += fullWidth;
      }
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none select-none"
      aria-hidden="true"
    />
  );
};

export default PrimeSequenceCanvas;

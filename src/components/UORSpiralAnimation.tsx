import { useRef, useEffect } from "react";

interface Particle {
  theta: number;
  phi: number;
  sides: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  rotation: number,
  color: string,
  lineWidth: number
) => {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + rotation;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

const UORSpiralAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width: number;
    let height: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    // Create particles arranged on a torus
    const PARTICLE_COUNT = 900;
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Golden angle spiral distribution on torus surface
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenAngle * i;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT);

      // Hue: pink (320) -> purple (280) -> blue (240)
      const t = i / PARTICLE_COUNT;
      const hue = 320 - t * 80; // 320 (pink) to 240 (blue/purple)
      const saturation = 70 + Math.random() * 30;
      const lightness = 55 + Math.random() * 20;
      const alpha = 0.5 + Math.random() * 0.5;

      particles.push({
        theta,
        phi,
        sides: Math.floor(Math.random() * 4) + 4, // 4-7 sides (squares to heptagons)
        size: 2 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        hue,
        saturation,
        lightness,
        alpha,
      });
    }

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.003;

      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.32; // Major radius
      const r = R * 0.45; // Minor radius

      // Sort by depth for proper rendering
      const projected = particles.map((p) => {
        const theta = p.theta + time;
        const phi = p.phi;

        // Torus coordinates
        const x3d = (R + r * Math.cos(phi)) * Math.cos(theta);
        const y3d = (R + r * Math.cos(phi)) * Math.sin(theta);
        const z3d = r * Math.sin(phi);

        // Slight rotation around X axis for 3D tilt
        const tilt = 0.4;
        const y3dRot = y3d * Math.cos(tilt) - z3d * Math.sin(tilt);
        const z3dRot = y3d * Math.sin(tilt) + z3d * Math.cos(tilt);

        // Simple perspective
        const perspective = 800;
        const scale = perspective / (perspective + z3dRot);

        return {
          x: cx + x3d * scale,
          y: cy + y3dRot * scale,
          z: z3dRot,
          scale,
          particle: p,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const item of projected) {
        const p = item.particle;
        p.rotation += p.rotationSpeed;

        const depthFactor = (item.z + r) / (2 * r);
        const adjustedAlpha = p.alpha * (0.3 + 0.7 * item.scale) * (0.4 + 0.6 * depthFactor);
        const adjustedSize = p.size * item.scale;
        const adjustedLineWidth = Math.max(0.5, 1.2 * item.scale);

        const color = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${adjustedAlpha})`;

        drawPolygon(
          ctx,
          item.x,
          item.y,
          adjustedSize,
          p.sides,
          p.rotation,
          color,
          adjustedLineWidth
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
};

export default UORSpiralAnimation;

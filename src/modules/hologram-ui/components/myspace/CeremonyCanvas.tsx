/**
 * CeremonyCanvas — Particle convergence animation for the founding ceremony.
 * Extracted from MySpacePanel for modularity.
 */

import { useEffect, useRef } from "react";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface CeremonyCanvasProps {
  /** Called when animation completes (~4s) */
  onComplete: () => void;
}

export default function CeremonyCanvas({ onComplete }: CeremonyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    interface Particle {
      x: number; y: number; targetX: number; targetY: number;
      size: number; alpha: number; speed: number; hue: number;
    }

    const count = 80;
    const baseRadius = 40;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = baseRadius + Math.random() * 30;
      particles.push({
        x: cx + (Math.random() - 0.5) * w,
        y: cy + (Math.random() - 0.5) * h,
        targetX: cx + Math.cos(angle) * radius,
        targetY: cy + Math.sin(angle) * radius,
        size: 1.5 + Math.random() * 2,
        alpha: 0,
        speed: 0.015 + Math.random() * 0.025,
        hue: 35 + Math.random() * 10,
      });
    }

    let progress = 0;
    let raf: number;

    const draw = () => {
      progress += 0.008;
      ctx.clearRect(0, 0, w, h);

      const glowAlpha = Math.min(progress * 0.8, 0.4);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      gradient.addColorStop(0, `hsla(38, 60%, 60%, ${glowAlpha})`);
      gradient.addColorStop(1, `hsla(38, 60%, 60%, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        const ease = Math.min(progress * p.speed * 60, 1);
        p.x += (p.targetX - p.x) * ease * 0.06;
        p.y += (p.targetY - p.y) * ease * 0.06;
        p.alpha = Math.min(progress * 1.5, 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 60%, ${p.alpha})`;
        ctx.fill();
      }

      if (progress > 0.3) {
        const lineAlpha = Math.min((progress - 0.3) * 1.5, 0.15);
        ctx.strokeStyle = `hsla(38, 60%, 60%, ${lineAlpha})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            if (dx * dx + dy * dy < 2500) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      if (progress < 1.0) {
        raf = requestAnimationFrame(draw);
      } else {
        onComplete();
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.9 }} />
      <div className="relative z-10 text-center animate-fade-in space-y-3">
        <p className="text-lg font-display" style={{ color: KP.muted }}>
          Founding ceremony in progress…
        </p>
        <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: KP.dim }}>
          Vault-isolated · Observer-collapse armed · Entanglement active
        </p>
      </div>
    </div>
  );
}

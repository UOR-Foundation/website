import { useEffect, useRef } from "react";

interface PhysicalTitleProps {
  lineOneClass: string;
  lineTwoClass: string;
  wrapperClass: string;
  delay?: string;
  word?: string;
  lineOne?: string;
}

/**
 * PhysicalTitle — gives the hero headline a sense of physical presence.
 *
 * Three layered cues:
 *   1. Sub-pixel cursor-driven tilt (max 1.5°, max 4px translate).
 *   2. Static contact shadow + top-edge highlight (CSS pseudo-elements).
 *   3. Idle "breathing" via 6s sine on letter-spacing & drop-shadow blur.
 *
 * Honors prefers-reduced-motion: keeps shadow + highlight, drops motion.
 */
const PhysicalTitle = ({
  lineOneClass,
  lineTwoClass,
  wrapperClass,
  delay = "0s",
  word = "UNIVERSAL",
  lineOne = "Make Data Identity",
}: PhysicalTitleProps) => {
  const hostRef = useRef<HTMLHeadingElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ rx: 0, ry: 0, tz: 0 });
  const currentRef = useRef({ rx: 0, ry: 0, tz: 0 });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;

    let active = false;

    const tick = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      // Critically-damped lerp — feels like physical inertia, not animation
      cur.rx += (tgt.rx - cur.rx) * 0.08;
      cur.ry += (tgt.ry - cur.ry) * 0.08;
      cur.tz += (tgt.tz - cur.tz) * 0.08;
      inner.style.transform = `perspective(1200px) rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg) translate3d(0,0,${cur.tz.toFixed(2)}px)`;

      const stillMoving =
        Math.abs(cur.rx - tgt.rx) > 0.002 ||
        Math.abs(cur.ry - tgt.ry) > 0.002 ||
        Math.abs(cur.tz - tgt.tz) > 0.02;
      if (stillMoving) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const schedule = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      // Influence radius extends ~1.4× the title beyond its edges
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const reach = Math.max(rect.width, rect.height) * 0.9;
      const dx = (e.clientX - cx) / reach; // -1..1 within reach
      const dy = (e.clientY - cy) / reach;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      const nx = clamp(dx);
      const ny = clamp(dy);
      // Max 1.5° tilt, max 4px lift toward viewer
      targetRef.current.ry = nx * 1.5;
      targetRef.current.rx = -ny * 1.5;
      targetRef.current.tz = (1 - Math.min(1, Math.hypot(nx, ny))) * 4;
      active = true;
      schedule();
    };

    const onLeave = () => {
      targetRef.current.rx = 0;
      targetRef.current.ry = 0;
      targetRef.current.tz = 0;
      schedule();
      active = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <h1
      ref={hostRef}
      className={`${wrapperClass} hero-physical-title`}
      style={{ animationDelay: delay, transformStyle: "preserve-3d" }}
    >
      <span
        ref={innerRef}
        className="hero-physical-inner block will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <span className={lineOneClass}>{lineOne}</span>
        <span className={lineTwoClass} aria-label={word}>
          {word.split("").map((char, i) => (
            <span key={i} aria-hidden="true">
              {char}
            </span>
          ))}
        </span>
      </span>
    </h1>
  );
};

export default PhysicalTitle;
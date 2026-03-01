import { useNavigate } from "react-router-dom";

/**
 * DesktopSurface — A complete, self-contained desktop layer
 * ═══════════════════════════════════════════════════════════
 *
 * Renders the full visual environment for a single bgMode:
 *   - Background (image / solid color)
 *   - All content (logo, greeting, Lumen CTA)
 *   - Chrome widgets (style toggle, day ring, focus toggle)
 *
 * Three of these are stacked simultaneously. The active one
 * sits on top; transitions simply peel it away via clip-path.
 */

import { useMemo, type CSSProperties } from "react";
import heroLandscape from "@/assets/hologram-hero-landscape.jpg";
import DayProgressRing from "../DayProgressRing";
import AttentionToggle from "../AttentionToggle";
import { useDraggablePosition } from "../../hooks/useDraggablePosition";
import type { DesktopMode } from "@/modules/hologram-os/projection-engine";
import WeatherWidget from "../widgets/WeatherWidget";
import ProductivityTimerWidget from "../widgets/ProductivityTimerWidget";
import BreathingWidget from "../widgets/BreathingWidget";

import { SNAP_ANCHOR_EVENT } from "../../hooks/useDraggablePosition";
// VoiceOrb lifted to page level for single-instance efficiency

/* ── Palette ───────────────────────────────────────── */
function palette(m: DesktopMode) {
  if (m === "white") return {
    wordmark: "hsla(0, 0%, 10%, 0.9)",
    greeting: "hsla(0, 0%, 8%, 0.8)",
    heading:  "hsla(0, 0%, 3%, 0.95)",
    sub:      "hsla(0, 0%, 15%, 0.75)",
    cta:      "hsla(0, 0%, 10%, 0.85)",
    pillText: "hsla(0, 0%, 20%, 0.75)",
    bg:       "hsl(0, 0%, 100%)",
    legalText: "hsla(0, 0%, 25%, 0.7)",
    legalDot:  "hsla(0, 0%, 25%, 0.5)",
  };
  if (m === "dark") return {
    wordmark: "hsla(0, 0%, 92%, 0.9)",
    greeting: "hsla(0, 0%, 100%, 0.75)",
    heading:  "hsla(0, 0%, 97%, 0.95)",
    sub:      "hsla(0, 0%, 85%, 0.7)",
    cta:      "hsla(0, 0%, 90%, 0.8)",
    pillText: "hsla(0, 0%, 85%, 0.7)",
    bg:       "hsl(0, 0%, 5%)",
    legalText: "hsla(38, 15%, 85%, 0.55)",
    legalDot:  "hsla(38, 15%, 85%, 0.3)",
  };
  return {
    wordmark: "hsla(0, 0%, 8%, 0.85)",
    greeting: "hsla(0, 0%, 8%, 0.8)",
    heading:  "hsla(0, 0%, 100%, 0.95)",
    sub:      "hsla(38, 12%, 90%, 0.75)",
    cta:      "hsla(38, 15%, 92%, 0.85)",
    pillText: "hsla(38, 12%, 90%, 0.7)",
    bg:       "transparent",
    legalText: "hsla(38, 15%, 85%, 0.55)",
    legalDot:  "hsla(38, 15%, 85%, 0.3)",
  };
}

/* ── Typewriter ──────────────────────────────────────── */
import { useState, useEffect, useCallback, useRef } from "react";

function getLumenSubtitle(): string {
  const h = new Date().getHours();
  if (h >= 22 || h < 5)  return "Wind down. I\u2019m here if you need me.";
  if (h >= 5 && h < 7)   return "The world is still quiet. A good time to think.";
  if (h >= 7 && h < 10)  return "A fresh start. What matters to you today?";
  if (h >= 10 && h < 12) return "Your companion, here whenever you\u2019re ready.";
  if (h >= 12 && h < 14) return "Take a breath. I\u2019ll be here when you return.";
  if (h >= 14 && h < 17) return "Deep in the day. Let\u2019s make it count.";
  if (h >= 17 && h < 20) return "The day is unwinding. Reflect, or keep going.";
  return "Evening light. A gentle space to explore.";
}

function TypewriterText({ text, delay = 3200, speed = 80 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed(""); setStarted(false); setDone(false);
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  useEffect(() => {
    if (!started || displayed.length >= text.length) return;
    const nextChar = text[displayed.length];
    let charDelay = speed + Math.random() * speed * 0.6;
    if (nextChar === "." || nextChar === "!" || nextChar === "?") charDelay = speed * 6;
    else if (nextChar === ",") charDelay = speed * 3;
    else if (nextChar === " " && Math.random() > 0.6) charDelay = speed * 2;

    const t = setTimeout(() => {
      const next = text.slice(0, displayed.length + 1);
      setDisplayed(next);
      if (next.length >= text.length) setDone(true);
    }, charDelay);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  return (
    <span style={{ position: "relative", display: "block", textAlign: "center" }}>
      <span style={{ visibility: "hidden", display: "block" }} aria-hidden="true">{text}</span>
      <span style={{ position: "absolute", inset: 0, display: "block", textAlign: "center" }}>
        {displayed}
        {started && !done && (
          <span style={{ opacity: 0.5, animation: "blink-caret 0.8s step-end infinite" }}>▎</span>
        )}
        {done && (
          <span style={{ animation: "blink-caret 0.8s step-end 2, fade-out 0.6s ease-out 1.6s forwards", opacity: 0.5 }}>▎</span>
        )}
      </span>
    </span>
  );
}

/* ── BG Mode toggle dots ─────────────────────────────── */
const BG_MODES: { mode: DesktopMode; label: string }[] = [
  { mode: "image", label: "Landscape" },
  { mode: "white", label: "Light" },
  { mode: "dark",  label: "Dark" },
];

/* ── Props ────────────────────────────────────────────── */
interface DesktopSurfaceProps {
  mode: DesktopMode;
  /** Whether this is the currently active (top) desktop */
  isActive: boolean;
  /** Whether this desktop is currently being peeled away */
  isDeparting: boolean;
  greeting: string;
  welcomeName: string;
  isFocus: boolean;
  contextHints: string[];
  onOpenChat: () => void;
  onSwitchDesktop: (m: DesktopMode) => void;
  onOpenLegal: (tab: "privacy" | "terms" | "principles") => void;
  isWidgetVisible: (id: string) => boolean;
  removeWidget: (id: string) => void;
  onOpenConvergence: () => void;
  ambientState?: { playing: boolean; stationHue: string };
  /** Observer briefing prompt text for voice context */
  observerBriefing?: string;
  /** Screen context summary */
  screenContext?: string;
  /** Holographic fusion context */
  fusionContext?: string;
  /** Called after each voice exchange for persistence */
  onExchange?: (userText: string, assistantText: string) => void;
  /** Chat messages for voice context injection */
  chatContext?: { role: "user" | "assistant"; content: string }[];
}

export default function DesktopSurface({
  mode,
  isActive,
  isDeparting,
  greeting,
  welcomeName,
  isFocus,
  contextHints,
  onOpenChat,
  onSwitchDesktop,
  onOpenLegal,
  isWidgetVisible,
  removeWidget,
  onOpenConvergence,
  ambientState,
  observerBriefing,
  screenContext,
  fusionContext,
  onExchange,
  chatContext,
}: DesktopSurfaceProps) {
  const navigate = useNavigate();
  const P = useMemo(() => palette(mode), [mode]);
  const dayRingDrag = useDraggablePosition({
    storageKey: `hologram-pos:day-ring:${mode}`,
    defaultPos: { x: 0, y: 0 },
    mode: "offset",
    snapSize: { width: 64, height: 64 },
  });
  const frameWidgetDrag = useDraggablePosition({
    storageKey: `hologram-pos:frame-widget:${mode}`,
    defaultPos: { x: 0, y: 0 },
    mode: "offset",
    snapSize: { width: 64, height: 64 },
  });

  // ── Snap anchor feedback ──────────────────────────
  const [anchoredKey, setAnchoredKey] = useState<string | null>(null);
  const anchorTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail?.key as string;
      if (!key) return;
      setAnchoredKey(key);
      clearTimeout(anchorTimeout.current);
      anchorTimeout.current = setTimeout(() => setAnchoredKey(null), 400);
    };
    window.addEventListener(SNAP_ANCHOR_EVENT, handler);
    return () => window.removeEventListener(SNAP_ANCHOR_EVENT, handler);
  }, []);

  const isAnchored = useCallback(
    (dragKey: string) => anchoredKey === dragKey,
    [anchoredKey],
  );

  // ── Double-click to hide widget ───────────────────
  const handleDoubleClick = useCallback(
    (widgetId: string, drag: ReturnType<typeof useDraggablePosition>) =>
      () => {
        if (!drag.wasDragged()) removeWidget(widgetId);
      },
    [removeWidget],
  );

  return (
    <div
      className="absolute inset-0"
      style={{
        // Only the active or departing desktop receives pointer events
        pointerEvents: isActive && !isDeparting ? "auto" : "none",
      }}
    >
      {/* ── Background ──────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          transition: "transform 600ms ease",
          transform: isFocus ? "scale(1.04)" : "scale(1)",
        }}
      >
        {/* Solid bg for white/dark */}
        <div
          className="absolute inset-0"
          style={{ background: P.bg, opacity: mode === "image" ? 0 : 1 }}
        />

        {/* Image bg */}
        {mode === "image" && (
          <>
            <img
              src={heroLandscape}
              alt="Serene landscape"
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
              style={{
                animation: "ken-burns-breathe 42s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
                imageRendering: "auto",
                willChange: "transform",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, hsla(30, 8%, 12%, 0.15) 0%, hsla(30, 6%, 10%, 0.08) 35%, hsla(25, 10%, 8%, 0.55) 100%)",
              }}
            />
            {/* Ambient music glow */}
            {ambientState?.playing && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 120% 80% at 50% 100%, hsla(${ambientState.stationHue}, 40%, 35%, 0.12) 0%, hsla(${ambientState.stationHue}, 30%, 25%, 0.06) 40%, transparent 70%)`,
                  animation: "ambient-glow-breathe 7.76s ease-in-out infinite",
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Top-right style toggle removed — frame switching now at bottom center */}

      {/* ── Chrome: Day Ring ──────────────────────── */}
      {isWidgetVisible("day-ring") && (
        <div
          className="absolute bottom-[3vh] right-24 z-[400] flex items-center gap-2 cursor-grab active:cursor-grabbing"
          style={{
            opacity: isFocus ? 0 : 1,
            pointerEvents: isFocus ? "none" : "auto",
            transition: isAnchored(`hologram-pos:day-ring:${mode}`)
              ? "opacity 300ms, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "opacity 300ms, transform 300ms",
            transform: `translate(${dayRingDrag.pos.x}px, ${dayRingDrag.pos.y}px)${
              isAnchored(`hologram-pos:day-ring:${mode}`) ? " scale(1.04)" : ""
            }`,
            touchAction: "none",
            userSelect: "none",
          }}
          onDoubleClick={handleDoubleClick("day-ring", dayRingDrag)}
          {...dayRingDrag.handlers}
        >
          <DayProgressRing bgMode={mode} />
        </div>
      )}

      {/* ── Chrome: Focus Toggle — fades in focus mode, reveals on hover ── */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 z-[400] group/focus-toggle"
        style={{
          opacity: isFocus ? 0.08 : 1,
          pointerEvents: "auto",
          transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        onMouseEnter={e => { if (isFocus) (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
        onMouseLeave={e => { if (isFocus) (e.currentTarget as HTMLElement).style.opacity = "0.08"; }}
      >
        <AttentionToggle bgMode={mode} />
      </div>

      {/* ── Chrome: Frame-exclusive widget (bottom-left, aligned with Day Ring) ── */}
      <div
        className="absolute bottom-[3vh] left-24 z-[400] cursor-grab active:cursor-grabbing"
        style={{
          opacity: isFocus ? 0 : 1,
          pointerEvents: isFocus ? "none" : "auto",
          transition: isAnchored(`hologram-pos:frame-widget:${mode}`)
            ? "opacity 300ms, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "opacity 300ms, transform 300ms",
          transform: isFocus
            ? "translateY(10px)"
            : `translate(${frameWidgetDrag.pos.x}px, ${frameWidgetDrag.pos.y}px)${
                isAnchored(`hologram-pos:frame-widget:${mode}`) ? " scale(1.04)" : ""
              }`,
          animation: "stagger-fade-in 1s ease-out 0.6s both",
          touchAction: "none",
          userSelect: "none",
        }}
        onDoubleClick={handleDoubleClick("frame-widget", frameWidgetDrag)}
        {...frameWidgetDrag.handlers}
      >
        {mode === "image" && <BreathingWidget />}
        {mode === "white" && <ProductivityTimerWidget />}
        {mode === "dark" && <WeatherWidget />}
      </div>

      {/* ── Content: Logo ────────────────────────── */}
      <div
        className="absolute top-[5vh] left-0 right-0 flex items-center justify-center z-[300]"
        style={{
          opacity: isFocus ? 0 : 1,
          pointerEvents: isFocus ? "none" : "auto",
          transition: "opacity 600ms ease, transform 600ms ease",
          transform: isFocus ? "translateY(-10px) scale(1.04)" : "translateY(0) scale(1)",
        }}
      >
        <svg
          viewBox="0 0 360 40"
          className="select-none"
          style={{ width: "clamp(160px, 18vw, 320px)", height: "auto", opacity: 0.85 }}
          aria-label="Hologram"
        >
          <g
            fill="none"
            stroke={P.wordmark}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="10" y1="6" x2="10" y2="34" />
            <line x1="30" y1="6" x2="30" y2="34" />
            <line x1="10" y1="20" x2="30" y2="20" />
            <ellipse cx="60" cy="20" rx="14" ry="14" />
            <line x1="94" y1="6" x2="94" y2="34" />
            <line x1="94" y1="34" x2="114" y2="34" />
            <ellipse cx="144" cy="20" rx="14" ry="14" />
            <path d="M 198 12 A 14 14 0 1 0 198 28 L 198 20 L 188 20" />
            <line x1="222" y1="6" x2="222" y2="34" />
            <path d="M 222 6 L 236 6 A 7 7 0 0 1 236 20 L 222 20" />
            <line x1="232" y1="20" x2="242" y2="34" />
            <line x1="266" y1="34" x2="280" y2="6" />
            <line x1="280" y1="6" x2="294" y2="34" />
            <line x1="318" y1="34" x2="318" y2="6" />
            <line x1="318" y1="6" x2="334" y2="22" />
            <line x1="334" y1="22" x2="350" y2="6" />
            <line x1="350" y1="6" x2="350" y2="34" />
          </g>
        </svg>
      </div>

      {/* ── Content: Welcome text + Lumen CTA ───── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-8 z-[300]"
        style={{
          opacity: isFocus ? 0 : 1,
          pointerEvents: isFocus ? "none" : "auto",
          transition: "opacity 600ms ease, transform 600ms ease",
          transform: isFocus ? "scale(1.04)" : "scale(1)",
        }}
      >
        <div
          className="text-center"
          style={{
            textShadow: mode === "image" ? "0 1px 8px hsla(0, 0%, 0%, 0.5), 0 0 30px hsla(0, 0%, 0%, 0.2)" : "none",
            pointerEvents: "auto",
            maxWidth: "42rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <p
            className="tracking-[0.25em] uppercase transition-all duration-500"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              color: P.greeting,
              fontWeight: 400,
              fontSize: "calc(clamp(11px, 1vw, 16px) * var(--holo-user-scale))",
            }}
          >
            {greeting}
          </p>

          <h1
            className="leading-[1.08] transition-all duration-500"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              color: P.heading,
              letterSpacing: "-0.01em",
              fontSize: "calc(clamp(34px, 4.4vw, 76px) * var(--holo-user-scale))",
            }}
          >
            Welcome{contextHints.length > 0 ? " back" : " home"},
            <br />
            {welcomeName}.
          </h1>

          {/* Vertical line */}
          <div className="flex justify-center" style={{ marginTop: "clamp(16px, 2.5vh, 32px)" }}>
            <div
              style={{
                height: "clamp(48px, 7vh, 100px)",
                width: 0,
                borderLeft: `1px solid ${
                  mode === "white"
                    ? "hsla(0, 0%, 10%, 0.55)"
                    : mode === "dark"
                      ? "hsla(0, 0%, 85%, 0.3)"
                      : "hsla(0, 0%, 5%, 0.4)"
                }`,
                transformOrigin: "center center",
                animation: "line-expand 3s cubic-bezier(0.22, 1, 0.36, 1) 0.8s both",
              }}
            />
          </div>

          {/* ── Genesis-synced circle + dot — directly below line ── */}
          <div
            className="flex flex-col items-center"
            style={{
              marginTop: "clamp(8px, 1.2vh, 16px)",
              animation: "stagger-fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.6s both",
            }}
          >
            <button
              className="relative flex items-center justify-center cursor-pointer group"
              style={{ width: 48, height: 48, background: "none", border: "none", padding: 0 }}
              onClick={onOpenChat}
              aria-label="Open Lumen AI"
            >
              {/* Ripple rings */}
              {[0, 0.8, 1.6].map((delay, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 28,
                    height: 28,
                    border: `1px solid ${
                      mode === "white"
                        ? "hsla(32, 35%, 45%, 0.25)"
                        : "hsla(38, 40%, 55%, 0.2)"
                    }`,
                    animation: `genesis-ripple 2.4s ease-out ${delay}s infinite`,
                  }}
                />
              ))}
              {/* Core dot */}
              <div
                className="rounded-full transition-transform duration-200 group-hover:scale-[1.6]"
                style={{
                  width: 6,
                  height: 6,
                  background: mode === "white"
                    ? "hsla(32, 40%, 50%, 0.85)"
                    : "hsla(38, 50%, 60%, 0.85)",
                  boxShadow: mode === "white"
                    ? `0 0 calc(6px + 8px * var(--h-score, 0.5)) hsla(32, 40%, 45%, calc(0.2 + 0.3 * var(--h-score, 0.5))), 0 0 4px hsla(32, 40%, 45%, 0.2)`
                    : `0 0 calc(8px + 12px * var(--h-score, 0.5)) hsla(38, 50%, 55%, calc(0.2 + 0.4 * var(--h-score, 0.5))), 0 0 calc(3px + 6px * var(--h-score, 0.5)) hsla(38, 50%, 55%, 0.3)`,
                  animation: "heartbeat-love calc(1.8s + 1.2s * (1 - var(--h-score, 0.5))) ease-in-out infinite",
                }}
              />
            </button>
          </div>

          {/* Subtitle text — below the circle */}
          <div
            className="flex flex-col items-center"
            style={{
              marginTop: "clamp(4px, 0.8vh, 12px)",
              animation: "stagger-fade-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) 2.2s both",
            }}
          >
            <p
              className="tracking-[0.08em] transition-all duration-500"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 300,
                fontStyle: "italic",
                fontSize: "calc(clamp(14px, 1vw, 18px) * var(--holo-user-scale))",
                color: mode === "white" ? "hsla(0, 0%, 20%, 0.8)" : "hsla(38, 12%, 85%, 0.6)",
                maxWidth: "30ch",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              <TypewriterText text={getLumenSubtitle()} />
            </p>
          </div>

          {/* ── Queue pill — coherence reasoning entry point ── */}
          <div
            className="flex justify-center"
            style={{
              marginTop: "clamp(12px, 1.5vh, 24px)",
              animation: "stagger-fade-in 1.6s cubic-bezier(0.16, 1, 0.3, 1) 2.8s both",
            }}
          >
            <button
              onPointerDown={() => onOpenConvergence()}
              className="group/conv relative px-5 py-2 rounded-full transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: mode === "white"
                  ? "hsla(32, 20%, 92%, 0.5)"
                  : mode === "dark"
                    ? "hsla(38, 15%, 15%, 0.35)"
                    : "hsla(25, 10%, 12%, 0.35)",
                border: `1px solid ${
                  mode === "white"
                    ? "hsla(32, 25%, 75%, 0.3)"
                    : "hsla(38, 25%, 40%, 0.15)"
                }`,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
              aria-label="Open Lumen reasoning interface"
            >
              <span
                className="flex items-center gap-2 tracking-[0.18em] uppercase transition-all duration-300 group-hover/conv:tracking-[0.22em]"
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "calc(10px * var(--holo-user-scale))",
                  color: mode === "white"
                    ? "hsla(32, 30%, 35%, 0.8)"
                    : "hsla(38, 30%, 70%, 0.7)",
                }}
              >
                <span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{
                    background: mode === "white"
                      ? "hsla(32, 40%, 50%, 0.6)"
                      : "hsla(38, 50%, 55%, 0.5)",
                    boxShadow: mode === "white"
                      ? "0 0 4px hsla(32, 40%, 50%, 0.3)"
                      : "0 0 6px hsla(38, 50%, 55%, 0.3)",
                    animation: "heartbeat-love 2.4s ease-in-out infinite",
                  }}
                />
                Lumen
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Frame switcher (bottom center) ────────── */}
      <div
        className="absolute bottom-14 left-0 right-0 flex flex-col items-center gap-2 z-[500]"
        style={{
          opacity: isFocus ? 0 : 1,
          transition: "opacity 0.7s ease",
        }}
      >
        <div className="flex items-center gap-2.5">
          {(["image", "white", "dark"] as DesktopMode[]).map((m) => {
            const active = mode === m;
            const dotColor = mode === "white"
              ? "hsla(0, 0%, 10%, 0.8)"
              : "hsla(0, 0%, 95%, 0.8)";
            const inactiveColor = mode === "white"
              ? "hsla(0, 0%, 10%, 0.2)"
              : "hsla(0, 0%, 95%, 0.2)";
            return (
              <button
                key={m}
                onClick={() => onSwitchDesktop(m)}
                className="p-1.5 group/dot"
                aria-label={`Switch to ${m === "image" ? "Landscape" : m === "white" ? "Light" : "Dark"} frame`}
              >
                <div
                  className="rounded-full transition-all duration-500 ease-out group-hover/dot:scale-150"
                  style={{
                    width: active ? 8 : 5,
                    height: active ? 8 : 5,
                    background: active ? dotColor : inactiveColor,
                    boxShadow: active ? `0 0 8px 2px ${dotColor}` : "none",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Legal links ──────────────────────────── */}
      <div
        className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-6 z-[501]"
        style={{
          opacity: isFocus ? 0 : 1,
          transition: "opacity 0.7s ease",
        }}
      >
        <button
          onClick={() => onOpenLegal("principles")}
          className="transition-opacity duration-500 hover:opacity-90"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "calc(10px * var(--holo-user-scale))",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: P.legalText,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Our Principles
        </button>
        <span style={{ width: "2px", height: "2px", borderRadius: "50%", background: P.legalDot }} />
        <button
          onClick={() => onOpenLegal("privacy")}
          className="transition-opacity duration-500 hover:opacity-70"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "calc(10px * var(--holo-user-scale))",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: P.legalText,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Privacy Policy
        </button>
        <span style={{ width: "2px", height: "2px", borderRadius: "50%", background: P.legalDot }} />
        <button
          onClick={() => onOpenLegal("terms")}
          className="transition-opacity duration-500 hover:opacity-70"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "calc(10px * var(--holo-user-scale))",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: P.legalText,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Terms of Use
        </button>
      </div>
    </div>
  );
}

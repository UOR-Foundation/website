/**
 * TriadicWelcome — Learn / Work / Play Entry Point
 * ═══════════════════════════════════════════════════
 *
 * A tranquil, phase-first introduction to Hologram Intelligence.
 * Three calm sections invite the user into a mode of engagement.
 * Selecting a phase transitions to show its personas and skills.
 *
 * @module hologram-ui/components/TriadicWelcome
 */

import { useState, useCallback, useRef, useEffect } from "react";
import TriadicOnboarding, { hasSeenOnboarding } from "@/modules/hologram-ui/components/TriadicOnboarding";
import { PHASES, PHASE_ORDER, type TriadicPhase } from "@/modules/hologram-ui/sovereign-creator";
import {
  AGENT_PERSONAS,
  AGENT_SKILLS,
  getPersonasByPhase,
  getSkillsForPersona,
  type AgentPersona,
  type AgentSkill,
} from "@/modules/hologram-ui/agent-personas";
import type { CreatorStage } from "@/modules/hologram-ui/sovereign-creator";
import { getSourceCount } from "@/modules/hologram-ui/skill-knowledge-registry";
import { Lock, ChevronLeft } from "lucide-react";

import { KP } from "@/modules/hologram-os/kernel-palette";

// ── Palette (kernel-derived) ──────────────────────────────────────

const P = {
  surface: "hsla(28, 10%, 17%, 0.7)",
  surfaceHover: "hsla(38, 18%, 28%, 0.18)",
  border: KP.border,
  borderLight: KP.borderLight,
  goldLight: KP.gold,
  goldMuted: "hsl(38, 35%, 48%)",
  text: KP.text,
  textMuted: KP.muted,
  textDim: KP.dim,
  textDimmer: KP.dimmer,
  fontDisplay: KP.serif,
  font: KP.font,
} as const;

const PHASE_DESCRIPTIONS: Record<TriadicPhase, { verb: string; essence: string; invitation: string }> = {
  learn: {
    verb: "Explore",
    essence: "Understand before you build.",
    invitation: "Research, read, and reason",
  },
  work: {
    verb: "Build",
    essence: "Turn ideas into reality.",
    invitation: "Plan, code, and ship",
  },
  play: {
    verb: "Create",
    essence: "Experiment without pressure.",
    invitation: "Brainstorm, remix, and discover",
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface TriadicWelcomeProps {
  creatorStage: CreatorStage;
  selectedPersona: AgentPersona;
  activeSkill: AgentSkill | null;
  onSelectPersona: (persona: AgentPersona) => void;
  onSelectSkill: (skill: AgentSkill | null) => void;
  forceOnboarding?: boolean;
}

export default function TriadicWelcome({
  creatorStage,
  selectedPersona,
  activeSkill,
  onSelectPersona,
  onSelectSkill,
  forceOnboarding = false,
}: TriadicWelcomeProps) {
  const [focusedPhase, setFocusedPhase] = useState<TriadicPhase | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => forceOnboarding || !hasSeenOnboarding());
  const [animDirection, setAnimDirection] = useState<"enter" | "exit">("enter");
  const [renderPhase, setRenderPhase] = useState<TriadicPhase | null>(null);
  const personasByPhase = getPersonasByPhase();

  const selectPhase = useCallback((phase: TriadicPhase) => {
    setAnimDirection("enter");
    setFocusedPhase(phase);
    setRenderPhase(phase);
  }, []);

  const goBack = useCallback(() => {
    setAnimDirection("exit");
    // Wait for exit animation before switching view
    setTimeout(() => {
      setFocusedPhase(null);
      setRenderPhase(null);
      setAnimDirection("enter");
    }, 280);
  }, []);

  const isOverview = focusedPhase === null;

  // ── Phase Overview (no phase selected) ──────────────────────────────
  if (isOverview) {
    return (
      <div
        className="relative flex flex-col h-full px-1"
        style={{
          animation: animDirection === "enter"
            ? "triadic-slide-in-left 0.4s cubic-bezier(0.22, 1, 0.36, 1) both"
            : "triadic-slide-out-left 0.28s cubic-bezier(0.55, 0, 1, 0.45) both",
        }}
      >
        {/* Greeting — scales with viewport */}
        <div
          className="flex flex-col justify-end px-7"
          style={{ paddingTop: "clamp(12px, 2vh, 24px)", paddingBottom: "clamp(12px, 2.5vh, 32px)" }}
        >
          <h2
            className="font-light leading-[1.25] tracking-[0.03em]"
            style={{
              fontFamily: P.fontDisplay,
              color: P.text,
              fontSize: "clamp(22px, 3.5vh, 34px)",
            }}
          >
            What would you like
            <br />
            to focus on?
          </h2>
          <p
            className="leading-[1.7] tracking-[0.01em]"
            style={{
              color: P.textDim,
              fontFamily: P.font,
              fontSize: "clamp(12px, 1.8vh, 15px)",
              marginTop: "clamp(6px, 1.2vh, 16px)",
            }}
          >
            Choose a mode to begin
          </p>
        </div>

        {/* Three phase cards — flex-1 fills remaining space */}
        <div
          className="flex-1 flex flex-col justify-start px-5"
          style={{
            gap: "clamp(8px, 1.5vh, 16px)",
            paddingBottom: "clamp(8px, 1.5vh, 24px)",
          }}
        >
          {PHASE_ORDER.map((phase, i) => {
            const phaseDef = PHASES[phase];
            const desc = PHASE_DESCRIPTIONS[phase];
            const personaCount = personasByPhase[phase].filter(p => p.minStage <= creatorStage).length;
            const isCurrentPhase = selectedPersona.phase === phase;

            return (
              <button
                key={phase}
                onClick={() => selectPhase(phase)}
                className="w-full group relative flex items-center rounded-2xl text-left transition-all duration-500 hover:scale-[1.008]"
                style={{
                  gap: "clamp(10px, 2vh, 20px)",
                  padding: "clamp(12px, 2vh, 24px) clamp(14px, 2vh, 24px)",
                  background: isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 25%, 30%, 0.12)`
                    : "hsla(28, 10%, 17%, 0.4)",
                  border: `1px solid ${isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 25%, 45%, 0.2)`
                    : P.borderLight
                  }`,
                  animation: "stagger-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${250 + i * 120}ms`,
                }}
              >
                {/* Phase indicator line */}
                <div
                  className="w-[2px] self-stretch rounded-full flex-shrink-0 transition-all duration-600"
                  style={{
                    background: `hsla(${phaseDef.hue}, 30%, 55%, ${isCurrentPhase ? 0.65 : 0.3})`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-light tracking-[0.04em] capitalize"
                      style={{
                        fontFamily: P.fontDisplay,
                        color: `hsla(${phaseDef.hue}, 25%, 76%, 0.95)`,
                        fontSize: "clamp(16px, 2.5vh, 22px)",
                      }}
                    >
                      {phase}
                    </span>
                    <span
                      className="tracking-[0.2em] uppercase"
                      style={{
                        color: P.textDimmer,
                        fontFamily: P.font,
                        fontSize: "clamp(9px, 1.3vh, 12px)",
                      }}
                    >
                      {desc.verb}
                    </span>
                  </div>
                  <p
                    className="leading-[1.65]"
                    style={{
                      color: P.textMuted,
                      fontFamily: P.font,
                      fontSize: "clamp(11px, 1.6vh, 14px)",
                      marginTop: "clamp(4px, 0.8vh, 8px)",
                    }}
                  >
                    {desc.invitation}
                  </p>
                </div>

                {/* Persona count */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className="tabular-nums tracking-wide"
                    style={{
                      color: P.textDimmer,
                      fontFamily: P.font,
                      fontSize: "clamp(10px, 1.4vh, 13px)",
                    }}
                  >
                    {personaCount} {personaCount === 1 ? "guide" : "guides"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current selection indicator */}
        <div
          className="flex justify-center"
          style={{
            paddingBottom: "clamp(8px, 1.5vh, 20px)",
            paddingTop: "clamp(4px, 0.8vh, 8px)",
          }}
        >
          <p
            className="tracking-[0.2em] uppercase"
            style={{
              color: P.textDimmer,
              fontFamily: P.font,
              fontSize: "clamp(9px, 1.2vh, 12px)",
            }}
          >
            Active guide · {selectedPersona.name}
          </p>
        </div>

        {/* First-time onboarding overlay */}
        {showOnboarding && (
          <TriadicOnboarding onComplete={() => setShowOnboarding(false)} />
        )}
      </div>
    );
  }

  // ── Focused Phase View ──────────────────────────────────────────────
  const phaseDef = PHASES[renderPhase ?? focusedPhase!];
  const phaseKey = renderPhase ?? focusedPhase!;
  const desc = PHASE_DESCRIPTIONS[phaseKey];
  const phasePersonas = personasByPhase[phaseKey];
  const phaseSkills = AGENT_SKILLS.filter(s => s.phase === phaseKey);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto lumen-scroll"
      style={{
        animation: animDirection === "enter"
          ? "triadic-slide-in-right 0.4s cubic-bezier(0.22, 1, 0.36, 1) both"
          : "triadic-slide-out-right 0.28s cubic-bezier(0.55, 0, 1, 0.45) both",
      }}
    >
      {/* Back button */}
      <div className="px-5 pt-5 pb-2">
        <button
          onClick={goBack}
          className="flex items-center gap-2 transition-colors duration-300 hover:opacity-80"
          style={{ color: P.textMuted }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[14px] tracking-[0.14em] uppercase" style={{ fontFamily: P.font }}>
            All modes
          </span>
        </button>
      </div>

      {/* Phase Header */}
      <div className="px-7 pt-8 pb-10">
        <div className="flex items-start gap-5">
          <div
            className="w-[2px] h-10 rounded-full mt-2 flex-shrink-0"
            style={{ background: `hsla(${phaseDef.hue}, 30%, 55%, 0.6)` }}
          />
          <div>
            <h2
              className="text-[clamp(24px,5vw,32px)] font-light tracking-[0.04em] capitalize leading-[1.3]"
              style={{
                fontFamily: P.fontDisplay,
                color: `hsla(${phaseDef.hue}, 25%, 76%, 0.95)`,
              }}
            >
              {focusedPhase}
            </h2>
            <p
              className="text-[15px] mt-3 leading-[1.75] max-w-[280px]"
              style={{ color: P.textDim, fontFamily: P.font }}
            >
              {desc.essence}
            </p>
          </div>
        </div>
      </div>

      {/* Guides */}
      <div className="px-6 pb-10">
        <p className="text-[11px] tracking-[0.22em] uppercase mb-5 px-1" style={{ color: P.textDimmer, fontFamily: P.font }}>
          Choose a guide
        </p>
        <div className="space-y-3">
          {phasePersonas.map((persona, i) => {
            const isActive = selectedPersona.id === persona.id;
            const locked = persona.minStage > creatorStage;
            // Rigor level: 0 = exploratory, 1 = balanced, 2 = rigorous
            const rigor = i;
            const totalGuides = phasePersonas.length;
            // Progressive border width: 1px → 1.5px → 2px
            const borderWidth = 1 + (rigor / Math.max(totalGuides - 1, 1));
            // Progressive border opacity when active
            const activeBorderAlpha = 0.2 + rigor * 0.08;
            // Rigor pips (small dots indicating rigor level)
            const rigorPips = rigor + 1;

            return (
              <button
                key={persona.id}
                onClick={() => !locked && onSelectPersona(persona)}
                disabled={locked}
                className={`w-full flex items-center gap-5 px-6 py-6 rounded-2xl text-left transition-all duration-500 ${
                  locked ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.005]"
                }`}
                style={{
                  background: isActive
                    ? `hsla(${phaseDef.hue}, 25%, 30%, 0.15)`
                    : P.surface,
                  border: `${borderWidth}px solid ${isActive
                    ? `hsla(${phaseDef.hue}, 28%, 45%, ${activeBorderAlpha})`
                    : P.borderLight
                  }`,
                  animation: "stagger-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${150 + i * 100}ms`,
                }}
              >
                <span
                  className="text-lg flex-shrink-0"
                  style={{ color: locked ? P.textDimmer : phaseDef.color }}
                >
                  {locked ? <Lock className="w-4 h-4" /> : persona.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                      {persona.name}
                    </p>
                    {locked && (
                      <span className="text-[13px]" style={{ color: P.textDimmer }}>
                        Stage {persona.minStage}+
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] mt-1.5 leading-[1.7]" style={{ color: P.textDim, fontFamily: P.font }}>
                    {persona.subtitle}
                  </p>
                </div>
                {/* Rigor pips — progressively more dots */}
                <div className="flex flex-col items-center gap-[3px] flex-shrink-0 mr-1">
                  {Array.from({ length: rigorPips }).map((_, j) => (
                    <div
                      key={j}
                      className="rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        background: isActive
                          ? phaseDef.color
                          : `hsla(${phaseDef.hue}, 20%, 50%, ${0.25 + rigor * 0.1})`,
                        transition: "background 0.4s ease",
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      <div className="px-6 pb-10">
        <p className="text-[11px] tracking-[0.22em] uppercase mb-5 px-1" style={{ color: P.textDimmer, fontFamily: P.font }}>
          Available skills
        </p>
        <div className="flex flex-wrap gap-2.5">
          {phaseSkills.map((skill, i) => {
            const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
            const baseDelay = 120 + phasePersonas.length * 80;

            return (
              <button
                key={skill.id}
                onClick={() => onSelectSkill(isActive && activeSkill ? null : skill)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] transition-all duration-300 hover:scale-[1.03]"
                style={{
                  background: isActive
                    ? `hsla(${phaseDef.hue}, 35%, 40%, 0.25)`
                    : "hsla(30, 8%, 26%, 0.5)",
                  border: `1px solid ${isActive
                    ? `hsla(${phaseDef.hue}, 35%, 50%, 0.35)`
                    : P.borderLight
                  }`,
                  color: isActive ? phaseDef.color : P.textMuted,
                  animation: "stagger-fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${baseDelay + i * 50}ms`,
                }}
                title={skill.description}
              >
                <span className="text-[14px]">{skill.icon}</span>
                {skill.name}
                {getSourceCount(skill.id) > 0 && (
                  <span className="text-[13px] opacity-50">·{getSourceCount(skill.id)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Transition keyframes ────────────────────────────────────────────── */
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes triadic-slide-in-right {
    0% { opacity: 0; transform: translateX(24px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes triadic-slide-out-right {
    0% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(24px); }
  }
  @keyframes triadic-slide-in-left {
    0% { opacity: 0; transform: translateX(-24px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes triadic-slide-out-left {
    0% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(-24px); }
  }
  @keyframes stagger-fade-in {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;
if (!document.querySelector('[data-triadic-transitions]')) {
  styleSheet.setAttribute('data-triadic-transitions', '');
  document.head.appendChild(styleSheet);
}

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

// ── Palette (matches HologramAiChat) ──────────────────────────────────────

const P = {
  surface: "hsla(30, 8%, 22%, 0.8)",
  surfaceHover: "hsla(38, 30%, 30%, 0.25)",
  border: "hsla(38, 30%, 30%, 0.25)",
  borderLight: "hsla(38, 30%, 30%, 0.15)",
  goldLight: "hsl(38, 60%, 60%)",
  goldMuted: "hsl(38, 40%, 45%)",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  textDimmer: "hsl(30, 10%, 45%)",
  fontDisplay: "'Playfair Display', serif",
  font: "'DM Sans', sans-serif",
} as const;

const PHASE_DESCRIPTIONS: Record<TriadicPhase, { verb: string; essence: string; invitation: string }> = {
  learn: {
    verb: "Perceive",
    essence: "Vision arises. Meaning is received and structured.",
    invitation: "Explore ideas, research, reason, and understand",
  },
  work: {
    verb: "Build",
    essence: "Vision is enacted. Potential is actualized.",
    invitation: "Plan, code, review, and bring ideas to life",
  },
  play: {
    verb: "Discover",
    essence: "Results are witnessed. Feedback enriches vision.",
    invitation: "Create freely, reflect, connect, and transform",
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
        {/* Greeting — generous top space */}
        <div className="flex-1 flex flex-col justify-end pb-6 px-4">
          <h2
            className="text-[clamp(22px,5vw,28px)] font-light leading-snug tracking-wide"
            style={{ fontFamily: P.fontDisplay, color: P.text }}
          >
            How would you like
            <br />
            to begin?
          </h2>
          <p
            className="text-[13px] mt-3 leading-relaxed"
            style={{ color: P.textDim }}
          >
            Choose a mode of engagement
          </p>
        </div>

        {/* Three phase cards — generous sizing */}
        <div className="flex-[1.6] flex flex-col justify-start gap-2.5 px-2 pb-4">
          {PHASE_ORDER.map((phase, i) => {
            const phaseDef = PHASES[phase];
            const desc = PHASE_DESCRIPTIONS[phase];
            const personaCount = personasByPhase[phase].filter(p => p.minStage <= creatorStage).length;
            const isCurrentPhase = selectedPersona.phase === phase;

            return (
              <button
                key={phase}
                onClick={() => selectPhase(phase)}
                className="w-full group relative flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all duration-500 hover:scale-[1.01]"
                style={{
                  background: isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 30%, 35%, 0.14)`
                    : "hsla(30, 8%, 22%, 0.45)",
                  border: `1px solid ${isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 30%, 50%, 0.22)`
                    : P.borderLight
                  }`,
                  animation: "stagger-fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${200 + i * 100}ms`,
                }}
              >
                {/* Phase indicator line */}
                <div
                  className="w-[3px] self-stretch rounded-full flex-shrink-0 transition-all duration-500"
                  style={{
                    background: `hsla(${phaseDef.hue}, 35%, 55%, ${isCurrentPhase ? 0.7 : 0.35})`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2.5">
                    <span
                      className="text-[17px] font-light tracking-wide capitalize"
                      style={{
                        fontFamily: P.fontDisplay,
                        color: `hsla(${phaseDef.hue}, 28%, 78%, 0.95)`,
                      }}
                    >
                      {phase}
                    </span>
                    <span
                      className="text-[10px] tracking-[0.18em] uppercase"
                      style={{ color: P.textDimmer }}
                    >
                      {desc.verb}
                    </span>
                  </div>
                  <p
                    className="text-[12.5px] mt-1.5 leading-relaxed"
                    style={{ color: P.textMuted }}
                  >
                    {desc.invitation}
                  </p>
                </div>

                {/* Persona count */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: P.textDimmer }}
                  >
                    {personaCount} {personaCount === 1 ? "guide" : "guides"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current selection indicator */}
        <div className="flex justify-center pb-3">
          <p className="text-[11px] tracking-wider" style={{ color: P.textDimmer }}>
            Active · {selectedPersona.name}
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
      className="flex flex-col h-full"
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
          <span className="text-[11px] tracking-[0.18em] uppercase" style={{ fontFamily: P.font }}>
            All phases
          </span>
        </button>
      </div>

      {/* Phase Header — generous spacing */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-5">
        <div className="flex items-start gap-4">
          <div
            className="w-[3px] h-10 rounded-full mt-1 flex-shrink-0"
            style={{ background: `hsla(${phaseDef.hue}, 35%, 55%, 0.7)` }}
          />
          <div>
            <h2
              className="text-[clamp(22px,5vw,26px)] font-light tracking-wide capitalize leading-snug"
              style={{
                fontFamily: P.fontDisplay,
                color: `hsla(${phaseDef.hue}, 28%, 78%, 0.95)`,
              }}
            >
              {focusedPhase}
            </h2>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: P.textDim }}>
              {desc.essence}
            </p>
          </div>
        </div>
      </div>

      {/* Personas — bigger cards */}
      <div className="flex-[1.4] flex flex-col px-5">
        <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: P.textDimmer }}>
          Guides
        </p>
        <div className="space-y-2">
          {phasePersonas.map((persona, i) => {
            const isActive = selectedPersona.id === persona.id;
            const locked = persona.minStage > creatorStage;

            return (
              <button
                key={persona.id}
                onClick={() => !locked && onSelectPersona(persona)}
                disabled={locked}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-500 ${
                  locked ? "opacity-35 cursor-not-allowed" : "hover:scale-[1.005]"
                }`}
                style={{
                  background: isActive
                    ? `hsla(${phaseDef.hue}, 30%, 35%, 0.18)`
                    : P.surface,
                  border: `1px solid ${isActive
                    ? `hsla(${phaseDef.hue}, 35%, 50%, 0.25)`
                    : P.borderLight
                  }`,
                  animation: "stagger-fade-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
                  animationDelay: `${120 + i * 80}ms`,
                }}
              >
                <span
                  className="text-base flex-shrink-0"
                  style={{ color: locked ? P.textDimmer : phaseDef.color }}
                >
                  {locked ? <Lock className="w-4 h-4" /> : persona.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                      {persona.name}
                    </p>
                    {locked && (
                      <span className="text-[10px]" style={{ color: P.textDimmer }}>
                        Stage {persona.minStage}+
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: P.textDim }}>
                    {persona.subtitle}
                  </p>
                </div>
                {isActive && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: phaseDef.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills — slightly larger pills */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-[11px] tracking-[0.2em] uppercase mb-3" style={{ color: P.textDimmer }}>
          Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {phaseSkills.map((skill, i) => {
            const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
            const baseDelay = 120 + phasePersonas.length * 80;

            return (
              <button
                key={skill.id}
                onClick={() => onSelectSkill(isActive && activeSkill ? null : skill)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] transition-all duration-300 hover:scale-[1.03]"
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
                <span className="text-[11px]">{skill.icon}</span>
                {skill.name}
                {getSourceCount(skill.id) > 0 && (
                  <span className="text-[10px] opacity-50">·{getSourceCount(skill.id)}</span>
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

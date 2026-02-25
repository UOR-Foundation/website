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

import { useState, useCallback } from "react";
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
}

export default function TriadicWelcome({
  creatorStage,
  selectedPersona,
  activeSkill,
  onSelectPersona,
  onSelectSkill,
}: TriadicWelcomeProps) {
  const [focusedPhase, setFocusedPhase] = useState<TriadicPhase | null>(null);
  const personasByPhase = getPersonasByPhase();

  const goBack = useCallback(() => setFocusedPhase(null), []);

  // ── Phase Overview (no phase selected) ──────────────────────────────
  if (!focusedPhase) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 py-8 animate-fade-in">
        {/* Greeting */}
        <div className="text-center space-y-2">
          <h2
            className="text-2xl font-light tracking-wide"
            style={{ fontFamily: P.fontDisplay, color: P.text }}
          >
            How would you like to begin?
          </h2>
          <p className="text-xs max-w-xs mx-auto" style={{ color: P.textDim }}>
            Choose a mode of engagement
          </p>
        </div>

        {/* Three phase cards */}
        <div className="w-full max-w-md space-y-2 px-2">
          {PHASE_ORDER.map((phase) => {
            const phaseDef = PHASES[phase];
            const desc = PHASE_DESCRIPTIONS[phase];
            const personaCount = personasByPhase[phase].filter(p => p.minStage <= creatorStage).length;
            const isCurrentPhase = selectedPersona.phase === phase;

            return (
              <button
                key={phase}
                onClick={() => setFocusedPhase(phase)}
                className="w-full group relative flex items-center gap-5 px-5 py-4 rounded-2xl text-left transition-all duration-500 hover:scale-[1.01]"
                style={{
                  background: isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 30%, 35%, 0.12)`
                    : "hsla(30, 8%, 22%, 0.4)",
                  border: `1px solid ${isCurrentPhase
                    ? `hsla(${phaseDef.hue}, 30%, 50%, 0.2)`
                    : P.borderLight
                  }`,
                }}
              >
                {/* Phase indicator line */}
                <div
                  className="w-[3px] h-10 rounded-full flex-shrink-0 transition-all duration-500"
                  style={{
                    background: `hsla(${phaseDef.hue}, 35%, 55%, ${isCurrentPhase ? 0.7 : 0.3})`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-base font-light tracking-wide capitalize"
                      style={{
                        fontFamily: P.fontDisplay,
                        color: `hsla(${phaseDef.hue}, 28%, 75%, 0.9)`,
                      }}
                    >
                      {phase}
                    </span>
                    <span
                      className="text-[10px] tracking-[0.15em] uppercase"
                      style={{ color: P.textDimmer }}
                    >
                      {desc.verb}
                    </span>
                  </div>
                  <p
                    className="text-[11px] mt-1 leading-relaxed"
                    style={{ color: P.textDim }}
                  >
                    {desc.invitation}
                  </p>
                </div>

                {/* Persona count */}
                <div className="flex-shrink-0 text-right">
                  <span
                    className="text-[10px] tabular-nums"
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
        <p className="text-[10px] tracking-wider" style={{ color: P.textDimmer }}>
          Active · {selectedPersona.name}
        </p>
      </div>
    );
  }

  // ── Focused Phase View ──────────────────────────────────────────────
  const phaseDef = PHASES[focusedPhase];
  const desc = PHASE_DESCRIPTIONS[focusedPhase];
  const phasePersonas = personasByPhase[focusedPhase];
  const phaseSkills = AGENT_SKILLS.filter(s => s.phase === focusedPhase);

  return (
    <div className="flex flex-col h-full py-6 animate-fade-in">
      {/* Back + Phase Header */}
      <div className="px-6 mb-6">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 mb-4 transition-colors duration-300 hover:opacity-80"
          style={{ color: P.textMuted }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ fontFamily: P.font }}>
            All phases
          </span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-[3px] h-8 rounded-full"
            style={{ background: `hsla(${phaseDef.hue}, 35%, 55%, 0.7)` }}
          />
          <div>
            <h2
              className="text-xl font-light tracking-wide capitalize"
              style={{
                fontFamily: P.fontDisplay,
                color: `hsla(${phaseDef.hue}, 28%, 78%, 0.95)`,
              }}
            >
              {focusedPhase}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: P.textDim }}>
              {desc.essence}
            </p>
          </div>
        </div>
      </div>

      {/* Personas */}
      <div className="px-6 mb-5">
        <p className="text-[10px] tracking-[0.2em] uppercase mb-2.5" style={{ color: P.textDimmer }}>
          Guides
        </p>
        <div className="space-y-1.5">
          {phasePersonas.map((persona) => {
            const isActive = selectedPersona.id === persona.id;
            const locked = persona.minStage > creatorStage;

            return (
              <button
                key={persona.id}
                onClick={() => !locked && onSelectPersona(persona)}
                disabled={locked}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-500 ${
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
                }}
              >
                <span
                  className="text-sm flex-shrink-0"
                  style={{ color: locked ? P.textDimmer : phaseDef.color }}
                >
                  {locked ? <Lock className="w-4 h-4" /> : persona.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium" style={{ color: isActive ? P.goldLight : P.text }}>
                      {persona.name}
                    </p>
                    {locked && (
                      <span className="text-[9px]" style={{ color: P.textDimmer }}>
                        Stage {persona.minStage}+
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: P.textDim }}>
                    {persona.subtitle}
                  </p>
                </div>
                {isActive && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: phaseDef.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills for this phase */}
      <div className="px-6">
        <p className="text-[10px] tracking-[0.2em] uppercase mb-2.5" style={{ color: P.textDimmer }}>
          Skills
        </p>
        <div className="flex flex-wrap gap-1.5">
          {phaseSkills.map((skill) => {
            const isActive = (activeSkill?.id || selectedPersona.defaultSkillId) === skill.id;
            const isAvailable = selectedPersona.skillIds.includes(skill.id);

            return (
              <button
                key={skill.id}
                onClick={() => isAvailable && onSelectSkill(isActive && activeSkill ? null : skill)}
                disabled={!isAvailable}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] transition-all duration-300 ${
                  !isAvailable ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.03]"
                }`}
                style={{
                  background: isActive
                    ? `hsla(${phaseDef.hue}, 35%, 40%, 0.25)`
                    : "hsla(30, 8%, 26%, 0.5)",
                  border: `1px solid ${isActive
                    ? `hsla(${phaseDef.hue}, 35%, 50%, 0.35)`
                    : P.borderLight
                  }`,
                  color: isActive ? phaseDef.color : (isAvailable ? P.textMuted : P.textDimmer),
                }}
                title={skill.description}
              >
                <span className="text-[10px]">{skill.icon}</span>
                {skill.name}
                {getSourceCount(skill.id) > 0 && (
                  <span className="text-[9px] opacity-50">·{getSourceCount(skill.id)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

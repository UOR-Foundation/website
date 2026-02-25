/**
 * Sovereign Creator Framework — Canonical UOR Representation
 * ═══════════════════════════════════════════════════════════
 *
 * Maps Forrest Landry's Immanent Metaphysics (Form/Process/Substrate)
 * into UOR primitives, providing:
 *
 *   1. Triadic Ontology   — Learn / Work / Play as content-addressed datums
 *   2. Dual Force Model   — Intellect + Compassion as animating vectors
 *   3. Balance Gate        — Validates coherence across all three phases
 *   4. Stage Progression   — Four stages of sovereign development
 *   5. App Classification  — Gate for categorizing apps into L/W/P
 *
 * This module is the single source of truth for the entire
 * Sovereign Creator user journey within Hologram OS.
 *
 * @module hologram-ui/sovereign-creator
 */

// ── Triadic Phases ─────────────────────────────────────────────────────────

export type TriadicPhase = "learn" | "work" | "play";

export interface PhaseDefinition {
  readonly phase: TriadicPhase;
  readonly landryModality: "Form" | "Process" | "Substrate";
  readonly archetype: string;
  readonly function: string;
  readonly produces: string;
  readonly failureSignature: string;
  readonly correction: string;
  /** HSL color token — warm earth tones, each distinct but harmonious */
  readonly hue: number;
  readonly color: string;
  readonly icon: string; // Semantic glyph
}

export const PHASES: Record<TriadicPhase, PhaseDefinition> = {
  learn: {
    phase: "learn",
    landryModality: "Form",
    archetype: "The Oracle",
    function: "Vision arises; meaning is received and structured",
    produces: "Clear, directional vision — a knowing ready to be acted upon",
    failureSignature: "Visionary paralysis — knowing without being",
    correction: "Commit to a specific, time-bounded manifestation",
    hue: 45,
    color: "hsl(45, 38%, 62%)",   // Sage gold — illumination
    icon: "◉",
  },
  work: {
    phase: "work",
    landryModality: "Process",
    archetype: "The Architect",
    function: "Vision is enacted; potential is actualized in time",
    produces: "A real artifact — evidence that the vision was tested",
    failureSignature: "Blind execution — effort without insight",
    correction: "Stop and observe honestly; let the work speak back",
    hue: 160,
    color: "hsl(160, 22%, 52%)",  // Moss sage — grounded action
    icon: "◈",
  },
  play: {
    phase: "play",
    landryModality: "Substrate",
    archetype: "The Mirror",
    function: "Results are witnessed; feedback loops back into vision",
    produces: "Refined input for the next cycle — a richer vision",
    failureSignature: "Perpetual observation without commitment",
    correction: "Articulate a vision and enter Work with it",
    hue: 15,
    color: "hsl(15, 28%, 55%)",   // Warm terracotta — reflective depth
    icon: "◎",
  },
} as const;

export const PHASE_ORDER: readonly TriadicPhase[] = ["learn", "work", "play"];

// ── Dual Forces ────────────────────────────────────────────────────────────

export type DualForce = "intellect" | "compassion";

export interface ForceDefinition {
  readonly force: DualForce;
  readonly capacity: string;
  readonly primaryPhases: readonly TriadicPhase[];
  readonly riskWithout: string;
}

export const FORCES: Record<DualForce, ForceDefinition> = {
  intellect: {
    force: "intellect",
    capacity: "Perceive clearly, reason rigorously, navigate causality",
    primaryPhases: ["learn", "work"],
    riskWithout: "Optimization without ethics — intelligence serving ego",
  },
  compassion: {
    force: "compassion",
    capacity: "Act from genuine care — aligned with the whole",
    primaryPhases: ["play", "learn"],
    riskWithout: "Undirected care — feeling without effective action",
  },
} as const;

// ── Stages of Development ──────────────────────────────────────────────────

export type CreatorStage = 1 | 2 | 3 | 4;

export interface StageDefinition {
  readonly stage: CreatorStage;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  /** Minimum cycles completed to enter this stage */
  readonly minCycles: number;
  /** UOR Observer Zone mapping */
  readonly observerZone: "COLLAPSE" | "DRIFT" | "COHERENCE";
}

export const STAGES: Record<CreatorStage, StageDefinition> = {
  1: {
    stage: 1,
    name: "The Sleeping Creator",
    shortName: "Awakening",
    description: "The loop is unconscious. Begin to notice the three movements.",
    minCycles: 0,
    observerZone: "COLLAPSE",
  },
  2: {
    stage: 2,
    name: "The Awakening Creator",
    shortName: "Exploring",
    description: "The first conscious cycle. Fragmentation becomes visible.",
    minCycles: 1,
    observerZone: "DRIFT",
  },
  3: {
    stage: 3,
    name: "The Practiced Creator",
    shortName: "Practicing",
    description: "The loop is deliberate practice. Something moves through you.",
    minCycles: 7,
    observerZone: "COHERENCE",
  },
  4: {
    stage: 4,
    name: "The Sovereign Creator",
    shortName: "Sovereign",
    description: "Learn, Work, and Play are one continuous movement.",
    minCycles: 21,
    observerZone: "COHERENCE",
  },
} as const;

// ── Balance / Coherence Engine ─────────────────────────────────────────────

export interface TriadicBalance {
  /** Fraction of time in each phase (0–1, summing to 1) */
  readonly learn: number;
  readonly work: number;
  readonly play: number;
}

export interface BalanceReport {
  readonly balance: TriadicBalance;
  /** 0 = perfect balance, 1 = total imbalance */
  readonly entropy: number;
  /** The dominant phase, if any */
  readonly dominant: TriadicPhase | null;
  /** The neglected phase, if any */
  readonly neglected: TriadicPhase | null;
  /** Human-readable guidance */
  readonly guidance: string;
  /** Is the system in coherent balance? */
  readonly coherent: boolean;
}

/**
 * Compute triadic balance from time allocation.
 *
 * Uses normalized entropy: a perfectly balanced allocation
 * (33/33/33) yields entropy=0, while all-in-one yields entropy=1.
 * The coherence threshold is entropy < 0.25 (allows natural variation).
 */
export function computeBalance(balance: TriadicBalance): BalanceReport {
  const { learn, work, play } = balance;
  const total = learn + work + play;
  if (total === 0) {
    return {
      balance,
      entropy: 0,
      dominant: null,
      neglected: null,
      guidance: "Begin your day. Every journey starts with a single step.",
      coherent: true,
    };
  }

  // Normalize
  const l = learn / total;
  const w = work / total;
  const p = play / total;

  // Shannon entropy, normalized to [0, 1] where 1 = max imbalance
  const maxEntropy = Math.log(3);
  const vals = [l, w, p].filter((v) => v > 0);
  const entropy = vals.reduce((acc, v) => acc - v * Math.log(v), 0);
  const normalizedEntropy = 1 - entropy / maxEntropy;

  // Dominant & neglected
  const phases: [TriadicPhase, number][] = [
    ["learn", l],
    ["work", w],
    ["play", p],
  ];
  phases.sort((a, b) => b[1] - a[1]);
  const dominant = phases[0][1] > 0.5 ? phases[0][0] : null;
  const neglected = phases[2][1] < 0.15 ? phases[2][0] : null;

  // Guidance
  let guidance: string;
  if (normalizedEntropy < 0.15) {
    guidance = "Beautiful balance. The spiral ascends.";
  } else if (neglected) {
    const phase = PHASES[neglected];
    guidance = `${phase.archetype} needs attention. ${phase.correction}.`;
  } else if (dominant) {
    const phase = PHASES[dominant];
    guidance = `Notice the pull toward ${phase.phase}. ${phase.failureSignature.split("—")[0].trim()} may be forming.`;
  } else {
    guidance = "Good rhythm. Stay present to the flow.";
  }

  return {
    balance: { learn: l, work: w, play: p },
    entropy: normalizedEntropy,
    dominant,
    neglected,
    guidance,
    coherent: normalizedEntropy < 0.25,
  };
}

// ── App Classification Gate ────────────────────────────────────────────────

export interface AppClassification {
  readonly id: string;
  readonly label: string;
  readonly phase: TriadicPhase;
  /** Secondary phase, if applicable */
  readonly secondaryPhase?: TriadicPhase;
  /** Which dual force does this app primarily cultivate? */
  readonly primaryForce: DualForce;
}

/**
 * Canonical app-to-phase mapping for all Hologram apps.
 * New apps MUST be added here to pass the Sovereign Creator Gate.
 */
export const APP_CLASSIFICATIONS: readonly AppClassification[] = [
  // Learn — Vision, knowledge, discovery
  { id: "framework",    label: "Framework",    phase: "learn",  primaryForce: "intellect" },
  { id: "community",    label: "Community",    phase: "learn",  secondaryPhase: "play",  primaryForce: "compassion" },
  { id: "consciousness",label: "Consciousness",phase: "learn",  primaryForce: "intellect" },
  { id: "semantic-web", label: "Semantic Web", phase: "learn",  primaryForce: "intellect" },

  // Work — Creation, building, manifestation
  { id: "console",      label: "Console",      phase: "work",   primaryForce: "intellect" },
  { id: "code-nexus",   label: "Code Nexus",   phase: "work",   secondaryPhase: "learn",  primaryForce: "intellect" },
  { id: "identity",     label: "Identity",     phase: "work",   primaryForce: "compassion" },
  { id: "intelligence", label: "Intelligence", phase: "work",   secondaryPhase: "learn",  primaryForce: "intellect" },

  // Play — Reflection, exploration, witnessing
  { id: "your-space",   label: "Your Space",   phase: "play",   secondaryPhase: "learn",  primaryForce: "compassion" },
  { id: "interop",      label: "Interop Map",  phase: "play",   secondaryPhase: "learn",  primaryForce: "intellect" },
  { id: "audit",        label: "Audit",        phase: "play",   secondaryPhase: "work",   primaryForce: "intellect" },
  { id: "oracle",       label: "Oracle",       phase: "play",   primaryForce: "intellect" },
] as const;

/**
 * Sovereign Creator Gate — validates an app/content against the framework.
 *
 * Returns a gate report indicating whether the app is properly classified
 * and whether adding it maintains triadic balance in the registry.
 */
export interface GateReport {
  readonly passed: boolean;
  readonly phase: TriadicPhase;
  readonly balanceAfter: BalanceReport;
  readonly warnings: readonly string[];
}

export function sovereignCreatorGate(
  newApp: AppClassification,
  existingApps: readonly AppClassification[] = APP_CLASSIFICATIONS,
): GateReport {
  const warnings: string[] = [];

  // Count phases including the new app
  const counts: Record<TriadicPhase, number> = { learn: 0, work: 0, play: 0 };
  for (const app of existingApps) counts[app.phase]++;
  counts[newApp.phase]++;

  const total = counts.learn + counts.work + counts.play;
  const balance: TriadicBalance = {
    learn: counts.learn / total,
    work: counts.work / total,
    play: counts.play / total,
  };

  const report = computeBalance(balance);

  // Warn if adding this app creates dominance
  if (report.dominant === newApp.phase) {
    warnings.push(
      `Adding "${newApp.label}" increases ${newApp.phase} dominance. Consider balancing with a ${report.neglected || "different"}-phase app.`,
    );
  }

  // Warn if no secondary phase bridges the gap
  if (!newApp.secondaryPhase) {
    warnings.push(
      `"${newApp.label}" has no secondary phase. Cross-phase apps strengthen the spiral.`,
    );
  }

  return {
    passed: report.coherent,
    phase: newApp.phase,
    balanceAfter: report,
    warnings,
  };
}

// ── Agent Coherence Gate ───────────────────────────────────────────────────

export interface AgentPersonaStub {
  readonly id: string;
  readonly name: string;
  readonly phase: TriadicPhase;
  readonly primaryForce: DualForce;
}

export interface AgentGateReport {
  readonly passed: boolean;
  readonly phase: TriadicPhase;
  readonly balanceAfter: BalanceReport;
  readonly warnings: readonly string[];
}

/**
 * Agent Coherence Gate — validates that adding a new persona maintains
 * triadic balance across the persona registry.
 *
 * Works like sovereignCreatorGate but for agent personas instead of apps.
 * Prevents phase-dominant persona registries from forming.
 */
export function agentCoherenceGate(
  newPersona: AgentPersonaStub,
  existingPersonas: readonly AgentPersonaStub[],
): AgentGateReport {
  const warnings: string[] = [];

  const counts: Record<TriadicPhase, number> = { learn: 0, work: 0, play: 0 };
  for (const p of existingPersonas) counts[p.phase]++;
  counts[newPersona.phase]++;

  const total = counts.learn + counts.work + counts.play;
  const balance: TriadicBalance = {
    learn: counts.learn / total,
    work: counts.work / total,
    play: counts.play / total,
  };

  const report = computeBalance(balance);

  if (report.dominant === newPersona.phase) {
    warnings.push(
      `Adding "${newPersona.name}" increases ${newPersona.phase} dominance. Consider a ${report.neglected || "different"}-phase persona.`,
    );
  }

  // Check dual-force balance
  const forces: Record<DualForce, number> = { intellect: 0, compassion: 0 };
  for (const p of existingPersonas) forces[p.primaryForce]++;
  forces[newPersona.primaryForce]++;
  const forceTotal = forces.intellect + forces.compassion;
  const forceRatio = forces[newPersona.primaryForce] / forceTotal;
  if (forceRatio > 0.7) {
    warnings.push(
      `${newPersona.primaryForce} force is over-represented (${Math.round(forceRatio * 100)}%). Both intellect and compassion strengthen the spiral.`,
    );
  }

  return {
    passed: report.coherent && warnings.length === 0,
    phase: newPersona.phase,
    balanceAfter: report,
    warnings,
  };
}

// ── Cycle Cadence ──────────────────────────────────────────────────────────

export type CycleCadence = "micro" | "meso" | "macro";

export const CADENCES: Record<CycleCadence, { label: string; duration: string }> = {
  micro: { label: "Session",  duration: "A single focused interaction" },
  meso:  { label: "Day",      duration: "Today's full cycle" },
  macro: { label: "Season",   duration: "A multi-week arc of growth" },
} as const;

// ── Balance Check Questions (per cycle) ────────────────────────────────────

export const BALANCE_CHECKS = [
  { id: "completeness", question: "Were all three phases genuinely engaged?" },
  { id: "dual-force",   question: "Were both clarity and care present in each phase?" },
  { id: "coherence",    question: "Is the next vision more integrated than the last?" },
  { id: "direction",    question: "Is the spiral ascending — beginning from a higher baseline?" },
] as const;

// ── Axiomatic Summary (for programmatic reference) ─────────────────────────

export const AXIOMS = [
  "Reality is immanent. All knowing occurs from within.",
  "The minimum structure of being is triadic: Form, Process, Substrate.",
  "The loop requires all three phases. Omitting any one breaks the ascent.",
  "Intellect without compassion degrades. Compassion without intellect ineffects.",
  "Balance is the vehicle, not the destination.",
  "The loop is a spiral. Each cycle begins at a higher baseline.",
  "Sovereignty is the internalization of the loop.",
  "The purpose is not personal — it is the universe realizing itself.",
] as const;

// ── Essence ────────────────────────────────────────────────────────────────

export const ESSENCE =
  "Learn to see clearly. Work to create faithfully. Play to receive honestly. Hold both mind and heart together throughout. Repeat — and ascend.";

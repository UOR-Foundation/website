/**
 * Pro Mode — Dimension Engine
 * ════════════════════════════
 *
 * Defines the experiential dimensions that shape Lumen's character.
 * Each dimension is a continuous 0–1 fader on the mixing board.
 *
 * @module hologram-ui/engine/proModeDimensions
 */

// ── Dimension Categories ─────────────────────────────────────────────

export type DimensionCategory = "reasoning" | "expression" | "awareness";

export interface Dimension {
  readonly id: string;
  readonly label: string;
  /** Human-friendly one-line description */
  readonly description: string;
  readonly category: DimensionCategory;
  /** Default value (0–1) */
  readonly defaultValue: number;
  /** Left label for the fader (low end) */
  readonly lowLabel: string;
  /** Right label for the fader (high end) */
  readonly highLabel: string;
  /** HSL color for the fader accent */
  readonly hue: number;
}

export const DIMENSIONS: readonly Dimension[] = [
  // ── Reasoning ──────────────────────────────────────────────────────
  {
    id: "depth",
    label: "Depth",
    description: "How far the reasoning drills into the subject",
    category: "reasoning",
    defaultValue: 0.6,
    lowLabel: "Surface",
    highLabel: "Deep",
    hue: 210,
  },
  {
    id: "breadth",
    label: "Breadth",
    description: "How many angles and connections are explored",
    category: "reasoning",
    defaultValue: 0.5,
    lowLabel: "Focused",
    highLabel: "Wide",
    hue: 200,
  },
  {
    id: "intuition",
    label: "Intuition",
    description: "Balance between logical steps and creative leaps",
    category: "reasoning",
    defaultValue: 0.4,
    lowLabel: "Logical",
    highLabel: "Intuitive",
    hue: 260,
  },
  {
    id: "rigor",
    label: "Rigor",
    description: "How thoroughly each claim is verified and grounded",
    category: "reasoning",
    defaultValue: 0.7,
    lowLabel: "Fluid",
    highLabel: "Rigorous",
    hue: 180,
  },

  // ── Expression ─────────────────────────────────────────────────────
  {
    id: "verbosity",
    label: "Detail",
    description: "How much explanation and context is included",
    category: "expression",
    defaultValue: 0.5,
    lowLabel: "Concise",
    highLabel: "Detailed",
    hue: 38,
  },
  {
    id: "warmth",
    label: "Warmth",
    description: "The emotional temperature of the response",
    category: "expression",
    defaultValue: 0.6,
    lowLabel: "Neutral",
    highLabel: "Warm",
    hue: 25,
  },
  {
    id: "formality",
    label: "Tone",
    description: "How formal or conversational the voice feels",
    category: "expression",
    defaultValue: 0.4,
    lowLabel: "Casual",
    highLabel: "Formal",
    hue: 45,
  },

  // ── Awareness ──────────────────────────────────────────────────────
  {
    id: "focus",
    label: "Focus",
    description: "How tightly the answer stays on the exact question",
    category: "awareness",
    defaultValue: 0.7,
    lowLabel: "Exploratory",
    highLabel: "Laser",
    hue: 150,
  },
  {
    id: "confidence",
    label: "Confidence",
    description: "How openly uncertainty is expressed",
    category: "awareness",
    defaultValue: 0.5,
    lowLabel: "Cautious",
    highLabel: "Assertive",
    hue: 130,
  },
  {
    id: "empathy",
    label: "Empathy",
    description: "How much the response attunes to your emotional state",
    category: "awareness",
    defaultValue: 0.5,
    lowLabel: "Objective",
    highLabel: "Attuned",
    hue: 310,
  },
] as const;

// ── Dimension Values Map ─────────────────────────────────────────────

export type DimensionValues = Record<string, number>;

export function getDefaultValues(): DimensionValues {
  const vals: DimensionValues = {};
  for (const d of DIMENSIONS) vals[d.id] = d.defaultValue;
  return vals;
}

// ── Presets ───────────────────────────────────────────────────────────

export interface DimensionPreset {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly phase: "learn" | "work" | "play";
  readonly values: DimensionValues;
}

export const PRESETS: readonly DimensionPreset[] = [
  // ── Learn ──────────────────────────────────────────────────────────
  {
    id: "guide",
    name: "The Guide",
    subtitle: "Patient Mentor",
    icon: "◈",
    phase: "learn",
    values: { depth: 0.5, breadth: 0.6, intuition: 0.5, rigor: 0.5, verbosity: 0.6, warmth: 0.8, formality: 0.3, focus: 0.6, confidence: 0.5, empathy: 0.7 },
  },
  {
    id: "scholar",
    name: "The Scholar",
    subtitle: "Research & Synthesis",
    icon: "⊛",
    phase: "learn",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.2, rigor: 0.9, verbosity: 0.7, warmth: 0.4, formality: 0.7, focus: 0.7, confidence: 0.6, empathy: 0.3 },
  },
  {
    id: "analyst",
    name: "The Analyst",
    subtitle: "First-Principles",
    icon: "◉",
    phase: "learn",
    values: { depth: 0.9, breadth: 0.4, intuition: 0.1, rigor: 0.95, verbosity: 0.5, warmth: 0.3, formality: 0.6, focus: 0.9, confidence: 0.7, empathy: 0.2 },
  },
  // ── Work ───────────────────────────────────────────────────────────
  {
    id: "craftsman",
    name: "The Craftsman",
    subtitle: "Quality Builder",
    icon: "⟨⟩",
    phase: "work",
    values: { depth: 0.7, breadth: 0.4, intuition: 0.3, rigor: 0.8, verbosity: 0.4, warmth: 0.5, formality: 0.5, focus: 0.8, confidence: 0.6, empathy: 0.4 },
  },
  {
    id: "architect",
    name: "The Architect",
    subtitle: "System Designer",
    icon: "⬡",
    phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.4, rigor: 0.85, verbosity: 0.6, warmth: 0.3, formality: 0.6, focus: 0.7, confidence: 0.7, empathy: 0.3 },
  },
  {
    id: "strategist",
    name: "The Strategist",
    subtitle: "Problem Solver",
    icon: "⊗",
    phase: "work",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.5, rigor: 0.7, verbosity: 0.5, warmth: 0.4, formality: 0.5, focus: 0.8, confidence: 0.8, empathy: 0.3 },
  },
  // ── Play ───────────────────────────────────────────────────────────
  {
    id: "explorer",
    name: "The Explorer",
    subtitle: "Creative Discovery",
    icon: "✦",
    phase: "play",
    values: { depth: 0.5, breadth: 0.9, intuition: 0.8, rigor: 0.3, verbosity: 0.6, warmth: 0.7, formality: 0.2, focus: 0.3, confidence: 0.5, empathy: 0.6 },
  },
  {
    id: "alchemist",
    name: "The Alchemist",
    subtitle: "Pattern Weaver",
    icon: "⟳",
    phase: "play",
    values: { depth: 0.6, breadth: 0.8, intuition: 0.7, rigor: 0.4, verbosity: 0.5, warmth: 0.6, formality: 0.3, focus: 0.4, confidence: 0.5, empathy: 0.7 },
  },
  {
    id: "mirror",
    name: "The Mirror",
    subtitle: "Reflective Witness",
    icon: "◎",
    phase: "play",
    values: { depth: 0.6, breadth: 0.5, intuition: 0.6, rigor: 0.5, verbosity: 0.4, warmth: 0.7, formality: 0.3, focus: 0.5, confidence: 0.3, empathy: 0.9 },
  },
];

// ── Prompt Fragment Builder ──────────────────────────────────────────

/** Converts current dimension values into a system prompt fragment */
export function buildDimensionPrompt(values: DimensionValues): string {
  const parts: string[] = [];

  // Reasoning character
  if (values.depth > 0.7) parts.push("Think deeply and thoroughly before answering.");
  else if (values.depth < 0.3) parts.push("Keep your reasoning at a high level — avoid over-analysis.");

  if (values.breadth > 0.7) parts.push("Explore multiple angles, perspectives, and connections.");
  else if (values.breadth < 0.3) parts.push("Stay narrowly focused on the specific question asked.");

  if (values.intuition > 0.7) parts.push("Trust intuitive leaps and creative connections. Think laterally.");
  else if (values.intuition < 0.3) parts.push("Rely on explicit logical steps. Show your reasoning chain.");

  if (values.rigor > 0.7) parts.push("Verify every claim carefully. Ground assertions in evidence.");
  else if (values.rigor < 0.3) parts.push("Be fluid and speculative — prioritize ideas over proof.");

  // Expression character
  if (values.verbosity > 0.7) parts.push("Provide rich detail, examples, and thorough explanation.");
  else if (values.verbosity < 0.3) parts.push("Be extremely concise. Every word must earn its place.");

  if (values.warmth > 0.7) parts.push("Be warm, encouraging, and personally engaged.");
  else if (values.warmth < 0.3) parts.push("Be professionally neutral and matter-of-fact.");

  if (values.formality > 0.7) parts.push("Use formal, precise language.");
  else if (values.formality < 0.3) parts.push("Be conversational and approachable.");

  // Awareness character
  if (values.focus > 0.7) parts.push("Stay laser-focused on the exact question. No tangents.");
  else if (values.focus < 0.3) parts.push("Feel free to explore adjacent ideas that add value.");

  if (values.confidence > 0.7) parts.push("Be assertive and decisive in your answers.");
  else if (values.confidence < 0.3) parts.push("Express uncertainty openly. Hedge appropriately.");

  if (values.empathy > 0.7) parts.push("Attune to the emotional dimension. Acknowledge feelings and context.");
  else if (values.empathy < 0.3) parts.push("Focus purely on information and analysis.");

  return parts.join(" ");
}

// ── Category metadata ────────────────────────────────────────────────

export const CATEGORY_META: Record<DimensionCategory, { label: string; hue: number }> = {
  reasoning: { label: "Reasoning", hue: 210 },
  expression: { label: "Expression", hue: 38 },
  awareness: { label: "Awareness", hue: 150 },
};

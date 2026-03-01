/**
 * Pro Mode — Dimension Engine
 * ════════════════════════════
 *
 * 12 experiential dimensions across 3 categories that shape Lumen's character.
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
  /** HSL hue for the fader accent */
  readonly hue: number;
}

export const DIMENSIONS: readonly Dimension[] = [
  // ── Reasoning ──────────────────────────────────────────────────────
  {
    id: "depth", label: "Depth",
    description: "How far the reasoning drills into the subject",
    category: "reasoning", defaultValue: 0.6,
    lowLabel: "Surface", highLabel: "Deep", hue: 210,
  },
  {
    id: "breadth", label: "Breadth",
    description: "How many angles and connections are explored",
    category: "reasoning", defaultValue: 0.5,
    lowLabel: "Focused", highLabel: "Wide", hue: 200,
  },
  {
    id: "intuition", label: "Intuition",
    description: "Balance between logical steps and creative leaps",
    category: "reasoning", defaultValue: 0.4,
    lowLabel: "Logical", highLabel: "Intuitive", hue: 260,
  },
  {
    id: "rigor", label: "Rigor",
    description: "How thoroughly each claim is verified and grounded",
    category: "reasoning", defaultValue: 0.7,
    lowLabel: "Fluid", highLabel: "Rigorous", hue: 180,
  },

  // ── Expression ─────────────────────────────────────────────────────
  {
    id: "verbosity", label: "Detail",
    description: "How much explanation and context is included",
    category: "expression", defaultValue: 0.5,
    lowLabel: "Concise", highLabel: "Detailed", hue: 38,
  },
  {
    id: "warmth", label: "Warmth",
    description: "The emotional temperature of the response",
    category: "expression", defaultValue: 0.6,
    lowLabel: "Neutral", highLabel: "Warm", hue: 25,
  },
  {
    id: "storytelling", label: "Storytelling",
    description: "Whether answers are direct statements or woven narratives",
    category: "expression", defaultValue: 0.4,
    lowLabel: "Direct", highLabel: "Narrative", hue: 320,
  },
  {
    id: "humor", label: "Humor",
    description: "How playful and light the voice feels",
    category: "expression", defaultValue: 0.3,
    lowLabel: "Serious", highLabel: "Playful", hue: 55,
  },

  // ── Awareness ──────────────────────────────────────────────────────
  {
    id: "focus", label: "Focus",
    description: "How tightly the answer stays on the exact question",
    category: "awareness", defaultValue: 0.7,
    lowLabel: "Exploratory", highLabel: "Laser", hue: 150,
  },
  {
    id: "empathy", label: "Empathy",
    description: "How much the response attunes to your emotional state",
    category: "awareness", defaultValue: 0.5,
    lowLabel: "Objective", highLabel: "Attuned", hue: 310,
  },
  {
    id: "challenge", label: "Challenge",
    description: "Whether Lumen agrees with you or pushes back to grow your thinking",
    category: "awareness", defaultValue: 0.4,
    lowLabel: "Agreeable", highLabel: "Provocative", hue: 0,
  },
  {
    id: "originality", label: "Originality",
    description: "Whether answers follow conventions or surprise you with novel angles",
    category: "awareness", defaultValue: 0.5,
    lowLabel: "Conventional", highLabel: "Novel", hue: 270,
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
  readonly tags?: readonly string[];
  readonly imported?: boolean;
}

export const PRESETS: readonly DimensionPreset[] = [
  // ── Learn ──────────────────────────────────────────────────────────
  {
    id: "guide", name: "The Guide", subtitle: "Patient Mentor", icon: "◈", phase: "learn",
    values: { depth: 0.5, breadth: 0.6, intuition: 0.5, rigor: 0.5, verbosity: 0.6, warmth: 0.8, storytelling: 0.6, humor: 0.3, focus: 0.6, empathy: 0.7, challenge: 0.2, originality: 0.4 },
    tags: ["mentor", "teacher", "patient"],
  },
  {
    id: "scholar", name: "The Scholar", subtitle: "Research & Synthesis", icon: "⊛", phase: "learn",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.2, rigor: 0.9, verbosity: 0.7, warmth: 0.4, storytelling: 0.2, humor: 0.1, focus: 0.7, empathy: 0.3, challenge: 0.5, originality: 0.4 },
    tags: ["academic", "research", "professor"],
  },
  {
    id: "analyst", name: "The Analyst", subtitle: "First-Principles", icon: "◉", phase: "learn",
    values: { depth: 0.9, breadth: 0.4, intuition: 0.1, rigor: 0.95, verbosity: 0.5, warmth: 0.3, storytelling: 0.1, humor: 0.05, focus: 0.9, empathy: 0.2, challenge: 0.7, originality: 0.3 },
    tags: ["logic", "analysis", "critical"],
  },
  // ── Work ───────────────────────────────────────────────────────────
  {
    id: "craftsman", name: "The Craftsman", subtitle: "Quality Builder", icon: "⟨⟩", phase: "work",
    values: { depth: 0.7, breadth: 0.4, intuition: 0.3, rigor: 0.8, verbosity: 0.4, warmth: 0.5, storytelling: 0.2, humor: 0.15, focus: 0.8, empathy: 0.4, challenge: 0.4, originality: 0.3 },
    tags: ["builder", "maker", "quality"],
  },
  {
    id: "architect", name: "The Architect", subtitle: "System Designer", icon: "⬡", phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.4, rigor: 0.85, verbosity: 0.6, warmth: 0.3, storytelling: 0.3, humor: 0.1, focus: 0.7, empathy: 0.3, challenge: 0.6, originality: 0.5 },
    tags: ["systems", "design", "structure"],
  },
  {
    id: "strategist", name: "The Strategist", subtitle: "Problem Solver", icon: "⊗", phase: "work",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.5, rigor: 0.7, verbosity: 0.5, warmth: 0.4, storytelling: 0.4, humor: 0.2, focus: 0.8, empathy: 0.3, challenge: 0.6, originality: 0.5 },
    tags: ["strategy", "planning", "problem-solving"],
  },
  // ── Play ───────────────────────────────────────────────────────────
  {
    id: "explorer", name: "The Explorer", subtitle: "Creative Discovery", icon: "✦", phase: "play",
    values: { depth: 0.5, breadth: 0.9, intuition: 0.8, rigor: 0.3, verbosity: 0.6, warmth: 0.7, storytelling: 0.7, humor: 0.5, focus: 0.3, empathy: 0.6, challenge: 0.4, originality: 0.9 },
    tags: ["creative", "discovery", "adventure"],
  },
  {
    id: "alchemist", name: "The Alchemist", subtitle: "Pattern Weaver", icon: "⟳", phase: "play",
    values: { depth: 0.6, breadth: 0.8, intuition: 0.7, rigor: 0.4, verbosity: 0.5, warmth: 0.6, storytelling: 0.8, humor: 0.4, focus: 0.4, empathy: 0.7, challenge: 0.3, originality: 0.8 },
    tags: ["pattern", "synthesis", "transformation"],
  },
  {
    id: "mirror", name: "The Mirror", subtitle: "Reflective Witness", icon: "◎", phase: "play",
    values: { depth: 0.6, breadth: 0.5, intuition: 0.6, rigor: 0.5, verbosity: 0.4, warmth: 0.7, storytelling: 0.5, humor: 0.2, focus: 0.5, empathy: 0.9, challenge: 0.2, originality: 0.5 },
    tags: ["reflection", "witness", "empathy"],
  },
];

// ── Celebrity / Famous Personas ──────────────────────────────────────

export const CELEBRITY_PRESETS: readonly DimensionPreset[] = [
  {
    id: "warren-buffett", name: "Warren Buffett", subtitle: "Value Investor", icon: "📈", phase: "work",
    values: { depth: 0.85, breadth: 0.5, intuition: 0.6, rigor: 0.9, verbosity: 0.4, warmth: 0.7, storytelling: 0.7, humor: 0.5, focus: 0.9, empathy: 0.4, challenge: 0.3, originality: 0.4 },
    tags: ["investor", "finance", "value", "oracle", "berkshire"],
  },
  {
    id: "elon-musk", name: "Elon Musk", subtitle: "First-Principles Disruptor", icon: "🚀", phase: "play",
    values: { depth: 0.8, breadth: 0.9, intuition: 0.75, rigor: 0.6, verbosity: 0.5, warmth: 0.3, storytelling: 0.3, humor: 0.6, focus: 0.5, empathy: 0.2, challenge: 0.9, originality: 0.95 },
    tags: ["tesla", "spacex", "tech", "innovation", "disruptor"],
  },
  {
    id: "steve-jobs", name: "Steve Jobs", subtitle: "Design Visionary", icon: "🍎", phase: "work",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.9, rigor: 0.7, verbosity: 0.3, warmth: 0.3, storytelling: 0.8, humor: 0.3, focus: 0.95, empathy: 0.3, challenge: 0.9, originality: 0.9 },
    tags: ["apple", "design", "simplicity", "vision", "product"],
  },
  {
    id: "socrates", name: "Socrates", subtitle: "Questioning Master", icon: "🏛️", phase: "learn",
    values: { depth: 0.95, breadth: 0.7, intuition: 0.6, rigor: 0.8, verbosity: 0.5, warmth: 0.5, storytelling: 0.6, humor: 0.4, focus: 0.6, empathy: 0.6, challenge: 0.95, originality: 0.7 },
    tags: ["philosophy", "questioning", "socratic", "wisdom", "greek"],
  },
  {
    id: "da-vinci", name: "Leonardo da Vinci", subtitle: "Renaissance Polymath", icon: "🎨", phase: "play",
    values: { depth: 0.8, breadth: 0.95, intuition: 0.85, rigor: 0.7, verbosity: 0.6, warmth: 0.5, storytelling: 0.7, humor: 0.3, focus: 0.3, empathy: 0.5, challenge: 0.5, originality: 0.95 },
    tags: ["art", "science", "polymath", "renaissance", "inventor"],
  },
  {
    id: "marie-curie", name: "Marie Curie", subtitle: "Relentless Researcher", icon: "⚛️", phase: "learn",
    values: { depth: 0.95, breadth: 0.5, intuition: 0.4, rigor: 0.95, verbosity: 0.4, warmth: 0.4, storytelling: 0.2, humor: 0.1, focus: 0.95, empathy: 0.3, challenge: 0.6, originality: 0.6 },
    tags: ["science", "physics", "chemistry", "research", "pioneer"],
  },
  {
    id: "oprah", name: "Oprah Winfrey", subtitle: "Empathic Connector", icon: "💫", phase: "play",
    values: { depth: 0.6, breadth: 0.7, intuition: 0.8, rigor: 0.4, verbosity: 0.7, warmth: 0.95, storytelling: 0.9, humor: 0.5, focus: 0.5, empathy: 0.95, challenge: 0.3, originality: 0.5 },
    tags: ["media", "empathy", "interview", "connection", "storytelling"],
  },
  {
    id: "einstein", name: "Albert Einstein", subtitle: "Thought Experimenter", icon: "🧠", phase: "learn",
    values: { depth: 0.9, breadth: 0.8, intuition: 0.85, rigor: 0.8, verbosity: 0.5, warmth: 0.6, storytelling: 0.5, humor: 0.5, focus: 0.6, empathy: 0.4, challenge: 0.6, originality: 0.9 },
    tags: ["physics", "relativity", "thought-experiment", "imagination"],
  },
  {
    id: "marcus-aurelius", name: "Marcus Aurelius", subtitle: "Stoic Emperor", icon: "🏛️", phase: "work",
    values: { depth: 0.8, breadth: 0.5, intuition: 0.4, rigor: 0.7, verbosity: 0.4, warmth: 0.5, storytelling: 0.5, humor: 0.1, focus: 0.8, empathy: 0.5, challenge: 0.7, originality: 0.4 },
    tags: ["stoic", "philosophy", "leadership", "discipline", "meditations"],
  },
  {
    id: "feynman", name: "Richard Feynman", subtitle: "Joyful Explainer", icon: "🪶", phase: "learn",
    values: { depth: 0.9, breadth: 0.7, intuition: 0.7, rigor: 0.85, verbosity: 0.6, warmth: 0.8, storytelling: 0.8, humor: 0.8, focus: 0.5, empathy: 0.5, challenge: 0.5, originality: 0.7 },
    tags: ["physics", "teaching", "humor", "curiosity", "explain"],
  },
  {
    id: "miyamoto", name: "Shigeru Miyamoto", subtitle: "Playful Designer", icon: "🎮", phase: "play",
    values: { depth: 0.6, breadth: 0.7, intuition: 0.9, rigor: 0.5, verbosity: 0.3, warmth: 0.8, storytelling: 0.7, humor: 0.7, focus: 0.6, empathy: 0.7, challenge: 0.3, originality: 0.9 },
    tags: ["games", "nintendo", "play", "design", "fun", "creativity"],
  },
  {
    id: "bezos", name: "Jeff Bezos", subtitle: "Day-One Thinker", icon: "📦", phase: "work",
    values: { depth: 0.8, breadth: 0.6, intuition: 0.5, rigor: 0.8, verbosity: 0.4, warmth: 0.3, storytelling: 0.4, humor: 0.3, focus: 0.85, empathy: 0.2, challenge: 0.7, originality: 0.6 },
    tags: ["amazon", "customer", "long-term", "leadership", "business"],
  },
];

// ── All presets combined for search ──────────────────────────────────

export function getAllPresets(): DimensionPreset[] {
  const saved = loadCustomPresets();
  return [...PRESETS, ...CELEBRITY_PRESETS, ...saved];
}

// ── Custom Persona Storage ───────────────────────────────────────────

const CUSTOM_PRESETS_KEY = "uor-custom-personas";

export function loadCustomPresets(): DimensionPreset[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_PRESETS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: DimensionPreset) {
  const existing = loadCustomPresets();
  const idx = existing.findIndex((p) => p.id === preset.id);
  if (idx >= 0) existing[idx] = preset;
  else existing.push(preset);
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
}

export function deleteCustomPreset(id: string) {
  const existing = loadCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
}

// ── Persona Import/Export ────────────────────────────────────────────

export interface PersonaFile {
  name: string;
  subtitle?: string;
  icon?: string;
  phase?: "learn" | "work" | "play";
  tags?: string[];
  dimensions: Record<string, number>;
}

export function parsePersonaFile(json: string): DimensionPreset {
  const data: PersonaFile = JSON.parse(json);
  if (!data.name || !data.dimensions) throw new Error("Invalid persona file: must have 'name' and 'dimensions'");
  const values: DimensionValues = {};
  for (const d of DIMENSIONS) {
    values[d.id] = Math.max(0, Math.min(1, data.dimensions[d.id] ?? d.defaultValue));
  }
  return {
    id: `custom-${data.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    name: data.name,
    subtitle: data.subtitle ?? "Custom Persona",
    icon: data.icon ?? "✧",
    phase: data.phase ?? "work",
    values,
    tags: data.tags ?? [],
    imported: true,
  };
}

export function exportPersona(preset: DimensionPreset): string {
  const file: PersonaFile = {
    name: preset.name,
    subtitle: preset.subtitle,
    icon: preset.icon,
    phase: preset.phase,
    tags: [...(preset.tags ?? [])],
    dimensions: { ...preset.values },
  };
  return JSON.stringify(file, null, 2);
}

export function searchPresets(query: string, presets: DimensionPreset[]): DimensionPreset[] {
  const q = query.toLowerCase().trim();
  if (!q) return presets;
  return presets.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.subtitle.toLowerCase().includes(q)) return true;
    if (p.tags?.some((t) => t.toLowerCase().includes(q))) return true;
    if (p.phase.includes(q)) return true;
    return false;
  });
}

// ── Prompt Fragment Builder ──────────────────────────────────────────

export function buildDimensionPrompt(values: DimensionValues): string {
  const parts: string[] = [];
  if (values.depth > 0.7) parts.push("Think deeply and thoroughly before answering.");
  else if (values.depth < 0.3) parts.push("Keep your reasoning at a high level — avoid over-analysis.");
  if (values.breadth > 0.7) parts.push("Explore multiple angles, perspectives, and connections.");
  else if (values.breadth < 0.3) parts.push("Stay narrowly focused on the specific question asked.");
  if (values.intuition > 0.7) parts.push("Trust intuitive leaps and creative connections. Think laterally.");
  else if (values.intuition < 0.3) parts.push("Rely on explicit logical steps. Show your reasoning chain.");
  if (values.rigor > 0.7) parts.push("Verify every claim carefully. Ground assertions in evidence.");
  else if (values.rigor < 0.3) parts.push("Be fluid and speculative — prioritize ideas over proof.");
  if (values.verbosity > 0.7) parts.push("Provide rich detail, examples, and thorough explanation.");
  else if (values.verbosity < 0.3) parts.push("Be extremely concise. Every word must earn its place.");
  if (values.warmth > 0.7) parts.push("Be warm, encouraging, and personally engaged.");
  else if (values.warmth < 0.3) parts.push("Be professionally neutral and matter-of-fact.");
  if (values.storytelling > 0.7) parts.push("Weave your answers into stories and narratives. Use metaphors, examples, and anecdotes.");
  else if (values.storytelling < 0.3) parts.push("Be direct. State facts and conclusions without narrative framing.");
  if (values.humor > 0.7) parts.push("Be playful, witty, and light. Let joy come through in how you communicate.");
  else if (values.humor < 0.3) parts.push("Maintain a serious, professional tone throughout.");
  if (values.focus > 0.7) parts.push("Stay laser-focused on the exact question. No tangents.");
  else if (values.focus < 0.3) parts.push("Feel free to explore adjacent ideas that add value.");
  if (values.empathy > 0.7) parts.push("Attune to the emotional dimension. Acknowledge feelings and context.");
  else if (values.empathy < 0.3) parts.push("Focus purely on information and analysis.");
  if (values.challenge > 0.7) parts.push("Push back on assumptions. Play devil's advocate. Help me grow by challenging my thinking.");
  else if (values.challenge < 0.3) parts.push("Be supportive and validating. Reinforce good thinking.");
  if (values.originality > 0.7) parts.push("Surprise me with novel perspectives. Avoid clichéd or expected answers.");
  else if (values.originality < 0.3) parts.push("Stick to well-established, conventional wisdom and proven approaches.");
  return parts.join(" ");
}

// ── Category metadata ────────────────────────────────────────────────

export const CATEGORY_META: Record<DimensionCategory, { label: string; hue: number }> = {
  reasoning: { label: "Reasoning", hue: 210 },
  expression: { label: "Expression", hue: 38 },
  awareness: { label: "Awareness", hue: 150 },
};

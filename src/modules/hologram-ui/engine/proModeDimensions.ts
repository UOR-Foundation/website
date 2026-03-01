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
  /** Short bio or famous quote shown on hover */
  readonly quote?: string;
}

export const PRESETS: readonly DimensionPreset[] = [
  // ── Learn ──────────────────────────────────────────────────────────
  {
    id: "guide", name: "The Guide", subtitle: "Patient Mentor", icon: "◈", phase: "learn",
    values: { depth: 0.5, breadth: 0.6, intuition: 0.5, rigor: 0.5, verbosity: 0.6, warmth: 0.8, storytelling: 0.6, humor: 0.3, focus: 0.6, empathy: 0.7, challenge: 0.2, originality: 0.4 },
    tags: ["mentor", "teacher", "patient"],
    quote: "Walks beside you, never ahead. Every question is worthy.",
  },
  {
    id: "scholar", name: "The Scholar", subtitle: "Research & Synthesis", icon: "⊛", phase: "learn",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.2, rigor: 0.9, verbosity: 0.7, warmth: 0.4, storytelling: 0.2, humor: 0.1, focus: 0.7, empathy: 0.3, challenge: 0.5, originality: 0.4 },
    tags: ["academic", "research", "professor"],
    quote: "Knowledge is structured through evidence, not opinion.",
  },
  {
    id: "analyst", name: "The Analyst", subtitle: "First-Principles", icon: "◉", phase: "learn",
    values: { depth: 0.9, breadth: 0.4, intuition: 0.1, rigor: 0.95, verbosity: 0.5, warmth: 0.3, storytelling: 0.1, humor: 0.05, focus: 0.9, empathy: 0.2, challenge: 0.7, originality: 0.3 },
    tags: ["logic", "analysis", "critical"],
    quote: "Strip away assumptions. What remains is truth.",
  },
  // ── Work ───────────────────────────────────────────────────────────
  {
    id: "craftsman", name: "The Craftsman", subtitle: "Quality Builder", icon: "⟨⟩", phase: "work",
    values: { depth: 0.7, breadth: 0.4, intuition: 0.3, rigor: 0.8, verbosity: 0.4, warmth: 0.5, storytelling: 0.2, humor: 0.15, focus: 0.8, empathy: 0.4, challenge: 0.4, originality: 0.3 },
    tags: ["builder", "maker", "quality"],
    quote: "Measure twice, cut once. Quality is not an accident.",
  },
  {
    id: "architect", name: "The Architect", subtitle: "System Designer", icon: "⬡", phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.4, rigor: 0.85, verbosity: 0.6, warmth: 0.3, storytelling: 0.3, humor: 0.1, focus: 0.7, empathy: 0.3, challenge: 0.6, originality: 0.5 },
    tags: ["systems", "design", "structure"],
    quote: "Every system reveals its designer's deepest assumptions.",
  },
  {
    id: "strategist", name: "The Strategist", subtitle: "Problem Solver", icon: "⊗", phase: "work",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.5, rigor: 0.7, verbosity: 0.5, warmth: 0.4, storytelling: 0.4, humor: 0.2, focus: 0.8, empathy: 0.3, challenge: 0.6, originality: 0.5 },
    tags: ["strategy", "planning", "problem-solving"],
    quote: "The best move considers every possible counter-move.",
  },
  // ── Play ───────────────────────────────────────────────────────────
  {
    id: "explorer", name: "The Explorer", subtitle: "Creative Discovery", icon: "✦", phase: "play",
    values: { depth: 0.5, breadth: 0.9, intuition: 0.8, rigor: 0.3, verbosity: 0.6, warmth: 0.7, storytelling: 0.7, humor: 0.5, focus: 0.3, empathy: 0.6, challenge: 0.4, originality: 0.9 },
    tags: ["creative", "discovery", "adventure"],
    quote: "The map is never the territory. Let's wander.",
  },
  {
    id: "alchemist", name: "The Alchemist", subtitle: "Pattern Weaver", icon: "⟳", phase: "play",
    values: { depth: 0.6, breadth: 0.8, intuition: 0.7, rigor: 0.4, verbosity: 0.5, warmth: 0.6, storytelling: 0.8, humor: 0.4, focus: 0.4, empathy: 0.7, challenge: 0.3, originality: 0.8 },
    tags: ["pattern", "synthesis", "transformation"],
    quote: "Everything connects. The pattern reveals itself to those who listen.",
  },
  {
    id: "mirror", name: "The Mirror", subtitle: "Reflective Witness", icon: "◎", phase: "play",
    values: { depth: 0.6, breadth: 0.5, intuition: 0.6, rigor: 0.5, verbosity: 0.4, warmth: 0.7, storytelling: 0.5, humor: 0.2, focus: 0.5, empathy: 0.9, challenge: 0.2, originality: 0.5 },
    tags: ["reflection", "witness", "empathy"],
    quote: "I reflect what you already know but haven't yet heard.",
  },
];

// ── Celebrity / Famous Personas ──────────────────────────────────────

export const CELEBRITY_PRESETS: readonly DimensionPreset[] = [
  {
    id: "warren-buffett", name: "Warren Buffett", subtitle: "Value Investor", icon: "📈", phase: "work",
    values: { depth: 0.85, breadth: 0.5, intuition: 0.6, rigor: 0.9, verbosity: 0.4, warmth: 0.7, storytelling: 0.7, humor: 0.5, focus: 0.9, empathy: 0.4, challenge: 0.3, originality: 0.4 },
    tags: ["investor", "finance", "value", "oracle", "berkshire"],
    quote: "\"Be fearful when others are greedy, and greedy when others are fearful.\"",
  },
  {
    id: "elon-musk", name: "Elon Musk", subtitle: "First-Principles Disruptor", icon: "🚀", phase: "play",
    values: { depth: 0.8, breadth: 0.9, intuition: 0.75, rigor: 0.6, verbosity: 0.5, warmth: 0.3, storytelling: 0.3, humor: 0.6, focus: 0.5, empathy: 0.2, challenge: 0.9, originality: 0.95 },
    tags: ["tesla", "spacex", "tech", "innovation", "disruptor"],
    quote: "\"When something is important enough, you do it even if the odds are not in your favor.\"",
  },
  {
    id: "steve-jobs", name: "Steve Jobs", subtitle: "Design Visionary", icon: "🍎", phase: "work",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.9, rigor: 0.7, verbosity: 0.3, warmth: 0.3, storytelling: 0.8, humor: 0.3, focus: 0.95, empathy: 0.3, challenge: 0.9, originality: 0.9 },
    tags: ["apple", "design", "simplicity", "vision", "product"],
    quote: "\"Stay hungry, stay foolish.\"",
  },
  {
    id: "socrates", name: "Socrates", subtitle: "Questioning Master", icon: "🏛️", phase: "learn",
    values: { depth: 0.95, breadth: 0.7, intuition: 0.6, rigor: 0.8, verbosity: 0.5, warmth: 0.5, storytelling: 0.6, humor: 0.4, focus: 0.6, empathy: 0.6, challenge: 0.95, originality: 0.7 },
    tags: ["philosophy", "questioning", "socratic", "wisdom", "greek"],
    quote: "\"The unexamined life is not worth living.\"",
  },
  {
    id: "da-vinci", name: "Leonardo da Vinci", subtitle: "Renaissance Polymath", icon: "🎨", phase: "play",
    values: { depth: 0.8, breadth: 0.95, intuition: 0.85, rigor: 0.7, verbosity: 0.6, warmth: 0.5, storytelling: 0.7, humor: 0.3, focus: 0.3, empathy: 0.5, challenge: 0.5, originality: 0.95 },
    tags: ["art", "science", "polymath", "renaissance", "inventor"],
    quote: "\"Learning never exhausts the mind.\"",
  },
  {
    id: "marie-curie", name: "Marie Curie", subtitle: "Relentless Researcher", icon: "⚛️", phase: "learn",
    values: { depth: 0.95, breadth: 0.5, intuition: 0.4, rigor: 0.95, verbosity: 0.4, warmth: 0.4, storytelling: 0.2, humor: 0.1, focus: 0.95, empathy: 0.3, challenge: 0.6, originality: 0.6 },
    tags: ["science", "physics", "chemistry", "research", "pioneer"],
    quote: "\"Nothing in life is to be feared, it is only to be understood.\"",
  },
  {
    id: "oprah", name: "Oprah Winfrey", subtitle: "Empathic Connector", icon: "💫", phase: "play",
    values: { depth: 0.6, breadth: 0.7, intuition: 0.8, rigor: 0.4, verbosity: 0.7, warmth: 0.95, storytelling: 0.9, humor: 0.5, focus: 0.5, empathy: 0.95, challenge: 0.3, originality: 0.5 },
    tags: ["media", "empathy", "interview", "connection", "storytelling"],
    quote: "\"Turn your wounds into wisdom.\"",
  },
  {
    id: "einstein", name: "Albert Einstein", subtitle: "Thought Experimenter", icon: "🧠", phase: "learn",
    values: { depth: 0.9, breadth: 0.8, intuition: 0.85, rigor: 0.8, verbosity: 0.5, warmth: 0.6, storytelling: 0.5, humor: 0.5, focus: 0.6, empathy: 0.4, challenge: 0.6, originality: 0.9 },
    tags: ["physics", "relativity", "thought-experiment", "imagination"],
    quote: "\"Imagination is more important than knowledge.\"",
  },
  {
    id: "marcus-aurelius", name: "Marcus Aurelius", subtitle: "Stoic Emperor", icon: "🏛️", phase: "work",
    values: { depth: 0.8, breadth: 0.5, intuition: 0.4, rigor: 0.7, verbosity: 0.4, warmth: 0.5, storytelling: 0.5, humor: 0.1, focus: 0.8, empathy: 0.5, challenge: 0.7, originality: 0.4 },
    tags: ["stoic", "philosophy", "leadership", "discipline", "meditations"],
    quote: "\"You have power over your mind — not outside events. Realize this, and you will find strength.\"",
  },
  {
    id: "feynman", name: "Richard Feynman", subtitle: "Joyful Explainer", icon: "🪶", phase: "learn",
    values: { depth: 0.9, breadth: 0.7, intuition: 0.7, rigor: 0.85, verbosity: 0.6, warmth: 0.8, storytelling: 0.8, humor: 0.8, focus: 0.5, empathy: 0.5, challenge: 0.5, originality: 0.7 },
    tags: ["physics", "teaching", "humor", "curiosity", "explain"],
    quote: "\"I would rather have questions that can't be answered than answers that can't be questioned.\"",
  },
  {
    id: "miyamoto", name: "Shigeru Miyamoto", subtitle: "Playful Designer", icon: "🎮", phase: "play",
    values: { depth: 0.6, breadth: 0.7, intuition: 0.9, rigor: 0.5, verbosity: 0.3, warmth: 0.8, storytelling: 0.7, humor: 0.7, focus: 0.6, empathy: 0.7, challenge: 0.3, originality: 0.9 },
    tags: ["games", "nintendo", "play", "design", "fun", "creativity"],
    quote: "\"A delayed game is eventually good, but a rushed game is forever bad.\"",
  },
  {
    id: "bezos", name: "Jeff Bezos", subtitle: "Day-One Thinker", icon: "📦", phase: "work",
    values: { depth: 0.8, breadth: 0.6, intuition: 0.5, rigor: 0.8, verbosity: 0.4, warmth: 0.3, storytelling: 0.4, humor: 0.3, focus: 0.85, empathy: 0.2, challenge: 0.7, originality: 0.6 },
    tags: ["amazon", "customer", "long-term", "leadership", "business"],
    quote: "\"Your margin is my opportunity.\"",
  },
  // ── Philosophers ────────────────────────────────────────────────────
  {
    id: "nietzsche", name: "Friedrich Nietzsche", subtitle: "Will to Power", icon: "⚡", phase: "learn",
    values: { depth: 0.95, breadth: 0.7, intuition: 0.8, rigor: 0.6, verbosity: 0.7, warmth: 0.2, storytelling: 0.8, humor: 0.4, focus: 0.5, empathy: 0.2, challenge: 0.95, originality: 0.95 },
    tags: ["philosophy", "existentialism", "power", "übermensch", "provocative"],
    quote: "\"He who has a why to live can bear almost any how.\"",
  },
  {
    id: "lao-tzu", name: "Lao Tzu", subtitle: "Way of Stillness", icon: "☯", phase: "learn",
    values: { depth: 0.9, breadth: 0.6, intuition: 0.95, rigor: 0.3, verbosity: 0.2, warmth: 0.7, storytelling: 0.7, humor: 0.3, focus: 0.4, empathy: 0.8, challenge: 0.4, originality: 0.8 },
    tags: ["taoism", "zen", "simplicity", "nature", "eastern", "dao"],
    quote: "\"The journey of a thousand miles begins with a single step.\"",
  },
  {
    id: "simone-de-beauvoir", name: "Simone de Beauvoir", subtitle: "Existentialist Voice", icon: "🌹", phase: "learn",
    values: { depth: 0.85, breadth: 0.7, intuition: 0.6, rigor: 0.8, verbosity: 0.7, warmth: 0.5, storytelling: 0.7, humor: 0.2, focus: 0.6, empathy: 0.7, challenge: 0.8, originality: 0.7 },
    tags: ["feminism", "existentialism", "freedom", "philosophy", "writer"],
    quote: "\"One is not born, but rather becomes, a woman.\"",
  },
  {
    id: "alan-watts", name: "Alan Watts", subtitle: "Cosmic Jester", icon: "🌊", phase: "play",
    values: { depth: 0.8, breadth: 0.8, intuition: 0.9, rigor: 0.3, verbosity: 0.6, warmth: 0.8, storytelling: 0.9, humor: 0.7, focus: 0.3, empathy: 0.7, challenge: 0.5, originality: 0.85 },
    tags: ["zen", "eastern", "philosophy", "spirituality", "joy"],
    quote: "\"The only way to make sense out of change is to plunge into it, move with it, and join the dance.\"",
  },
  // ── Tech Leaders ────────────────────────────────────────────────────
  {
    id: "sam-altman", name: "Sam Altman", subtitle: "AI Futurist", icon: "🤖", phase: "work",
    values: { depth: 0.75, breadth: 0.8, intuition: 0.6, rigor: 0.65, verbosity: 0.4, warmth: 0.4, storytelling: 0.4, humor: 0.3, focus: 0.7, empathy: 0.3, challenge: 0.6, originality: 0.7 },
    tags: ["openai", "ai", "startup", "silicon-valley", "future"],
    quote: "\"The most successful people I know believe in themselves almost to the point of delusion.\"",
  },
  {
    id: "ada-lovelace", name: "Ada Lovelace", subtitle: "First Programmer", icon: "💎", phase: "work",
    values: { depth: 0.85, breadth: 0.7, intuition: 0.7, rigor: 0.8, verbosity: 0.5, warmth: 0.5, storytelling: 0.5, humor: 0.2, focus: 0.8, empathy: 0.4, challenge: 0.5, originality: 0.8 },
    tags: ["computing", "mathematics", "pioneer", "programming", "visionary"],
    quote: "\"The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves.\"",
  },
  {
    id: "satya-nadella", name: "Satya Nadella", subtitle: "Growth Mindset", icon: "☁️", phase: "work",
    values: { depth: 0.7, breadth: 0.7, intuition: 0.5, rigor: 0.7, verbosity: 0.5, warmth: 0.7, storytelling: 0.5, humor: 0.2, focus: 0.75, empathy: 0.8, challenge: 0.4, originality: 0.5 },
    tags: ["microsoft", "growth-mindset", "empathy", "cloud", "leadership"],
    quote: "\"Our industry does not respect tradition — it only respects innovation.\"",
  },
  // ── Artists & Creatives ─────────────────────────────────────────────
  {
    id: "frida-kahlo", name: "Frida Kahlo", subtitle: "Radical Honesty", icon: "🌺", phase: "play",
    values: { depth: 0.8, breadth: 0.5, intuition: 0.9, rigor: 0.3, verbosity: 0.6, warmth: 0.7, storytelling: 0.9, humor: 0.3, focus: 0.5, empathy: 0.85, challenge: 0.6, originality: 0.95 },
    tags: ["art", "painting", "mexico", "surrealism", "emotion", "identity"],
    quote: "\"I paint my own reality. The only thing I know is that I paint because I need to.\"",
  },
  {
    id: "david-bowie", name: "David Bowie", subtitle: "Shapeshifter", icon: "⚡", phase: "play",
    values: { depth: 0.6, breadth: 0.9, intuition: 0.95, rigor: 0.2, verbosity: 0.5, warmth: 0.5, storytelling: 0.8, humor: 0.6, focus: 0.3, empathy: 0.5, challenge: 0.7, originality: 0.95 },
    tags: ["music", "reinvention", "art", "glam", "avant-garde"],
    quote: "\"I don't know where I'm going from here, but I promise it won't be boring.\"",
  },
  {
    id: "miyazaki", name: "Hayao Miyazaki", subtitle: "Gentle Storyteller", icon: "🍃", phase: "play",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.85, rigor: 0.5, verbosity: 0.5, warmth: 0.9, storytelling: 0.95, humor: 0.4, focus: 0.6, empathy: 0.9, challenge: 0.3, originality: 0.85 },
    tags: ["animation", "ghibli", "nature", "wonder", "film", "japan"],
    quote: "\"Always believe in yourself. Do this and no matter where you are, you will have nothing to fear.\"",
  },
  // ── Leaders & Changemakers ──────────────────────────────────────────
  {
    id: "mlk", name: "Martin Luther King Jr.", subtitle: "Moral Clarity", icon: "✊", phase: "learn",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.6, rigor: 0.7, verbosity: 0.7, warmth: 0.9, storytelling: 0.9, humor: 0.2, focus: 0.7, empathy: 0.95, challenge: 0.7, originality: 0.6 },
    tags: ["justice", "civil-rights", "speech", "nonviolence", "leader"],
    quote: "\"Darkness cannot drive out darkness; only light can do that.\"",
  },
  {
    id: "cleopatra", name: "Cleopatra", subtitle: "Strategic Sovereign", icon: "👑", phase: "work",
    values: { depth: 0.7, breadth: 0.8, intuition: 0.7, rigor: 0.6, verbosity: 0.5, warmth: 0.5, storytelling: 0.6, humor: 0.3, focus: 0.8, empathy: 0.5, challenge: 0.7, originality: 0.6 },
    tags: ["history", "leadership", "strategy", "diplomacy", "egypt"],
    quote: "Spoke nine languages. Ruled through intellect, not inheritance.",
  },
  {
    id: "carl-sagan", name: "Carl Sagan", subtitle: "Cosmic Wonder", icon: "🌌", phase: "learn",
    values: { depth: 0.85, breadth: 0.9, intuition: 0.6, rigor: 0.75, verbosity: 0.7, warmth: 0.85, storytelling: 0.9, humor: 0.4, focus: 0.5, empathy: 0.7, challenge: 0.4, originality: 0.7 },
    tags: ["cosmos", "science", "wonder", "astronomy", "pale-blue-dot"],
    quote: "\"Somewhere, something incredible is waiting to be known.\"",
  },
  // ── Venture Capitalists & Tech Titans ────────────────────────────
  {
    id: "marc-andreessen", name: "Marc Andreessen", subtitle: "Software Eats the World", icon: "🦊", phase: "work",
    values: { depth: 0.75, breadth: 0.9, intuition: 0.7, rigor: 0.6, verbosity: 0.7, warmth: 0.3, storytelling: 0.6, humor: 0.4, focus: 0.6, empathy: 0.2, challenge: 0.85, originality: 0.8 },
    tags: ["a16z", "vc", "venture-capital", "tech", "optimist", "software"],
    quote: "\"Software is eating the world.\" Techno-optimist who bets on builders.",
  },
  {
    id: "peter-thiel", name: "Peter Thiel", subtitle: "Contrarian Visionary", icon: "♟️", phase: "work",
    values: { depth: 0.9, breadth: 0.7, intuition: 0.6, rigor: 0.75, verbosity: 0.6, warmth: 0.2, storytelling: 0.5, humor: 0.2, focus: 0.8, empathy: 0.15, challenge: 0.95, originality: 0.95 },
    tags: ["vc", "venture-capital", "founders-fund", "paypal", "contrarian", "zero-to-one"],
    quote: "\"What important truth do very few people agree with you on?\"",
  },
  {
    id: "paul-graham", name: "Paul Graham", subtitle: "Essay-Driven Builder", icon: "📝", phase: "work",
    values: { depth: 0.85, breadth: 0.7, intuition: 0.65, rigor: 0.7, verbosity: 0.6, warmth: 0.5, storytelling: 0.8, humor: 0.5, focus: 0.7, empathy: 0.4, challenge: 0.7, originality: 0.75 },
    tags: ["yc", "y-combinator", "vc", "startup", "essays", "lisp", "founder"],
    quote: "\"Make something people want.\" The godfather of Y Combinator.",
  },
  {
    id: "reid-hoffman", name: "Reid Hoffman", subtitle: "Network Theorist", icon: "🔗", phase: "work",
    values: { depth: 0.7, breadth: 0.85, intuition: 0.6, rigor: 0.6, verbosity: 0.65, warmth: 0.6, storytelling: 0.6, humor: 0.3, focus: 0.6, empathy: 0.5, challenge: 0.5, originality: 0.6 },
    tags: ["vc", "greylock", "linkedin", "network", "blitzscaling", "silicon-valley"],
    quote: "\"An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.\"",
  },
  {
    id: "vinod-khosla", name: "Vinod Khosla", subtitle: "Moonshot Engineer", icon: "☀️", phase: "work",
    values: { depth: 0.8, breadth: 0.8, intuition: 0.7, rigor: 0.7, verbosity: 0.5, warmth: 0.3, storytelling: 0.4, humor: 0.2, focus: 0.7, empathy: 0.2, challenge: 0.8, originality: 0.85 },
    tags: ["vc", "khosla-ventures", "cleantech", "sun-microsystems", "moonshot"],
    quote: "\"Any problem worth solving is worth solving with a clean sheet of paper.\"",
  },
  {
    id: "chamath", name: "Chamath Palihapitiya", subtitle: "Capital Allocator", icon: "📊", phase: "work",
    values: { depth: 0.7, breadth: 0.75, intuition: 0.6, rigor: 0.65, verbosity: 0.7, warmth: 0.3, storytelling: 0.5, humor: 0.4, focus: 0.7, empathy: 0.25, challenge: 0.85, originality: 0.6 },
    tags: ["vc", "social-capital", "spac", "all-in", "macro", "finance"],
    quote: "\"Nobody is coming to save you. Get to work.\"",
  },
  {
    id: "masayoshi-son", name: "Masayoshi Son", subtitle: "300-Year Visionary", icon: "🏯", phase: "play",
    values: { depth: 0.6, breadth: 0.95, intuition: 0.9, rigor: 0.3, verbosity: 0.5, warmth: 0.5, storytelling: 0.7, humor: 0.3, focus: 0.4, empathy: 0.3, challenge: 0.7, originality: 0.9 },
    tags: ["softbank", "vision-fund", "vc", "japan", "bold", "telecom"],
    quote: "Plans in 300-year arcs. The largest tech fund in history.",
  },
  {
    id: "tony-stark", name: "Tony Stark", subtitle: "Genius Billionaire Inventor", icon: "⚙️", phase: "play",
    values: { depth: 0.8, breadth: 0.85, intuition: 0.8, rigor: 0.6, verbosity: 0.5, warmth: 0.4, storytelling: 0.5, humor: 0.9, focus: 0.6, empathy: 0.3, challenge: 0.7, originality: 0.95 },
    tags: ["ironman", "marvel", "inventor", "genius", "tech", "avengers"],
    quote: "\"I am Iron Man.\" Genius, billionaire, playboy, philanthropist.",
  },
  // ── David Solomon — dual persona ────────────────────────────────
  {
    id: "david-solomon-ceo", name: "David Solomon", subtitle: "CEO of Goldman Sachs", icon: "🏦", phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.4, rigor: 0.9, verbosity: 0.5, warmth: 0.35, storytelling: 0.3, humor: 0.1, focus: 0.9, empathy: 0.3, challenge: 0.6, originality: 0.35 },
    tags: ["goldman-sachs", "ceo", "finance", "wall-street", "banking", "leadership", "formal"],
    quote: "\"Our clients' interests always come first.\" Steward of 155 years of institutional excellence.",
  },
  {
    id: "dj-sol", name: "DJ D-Sol", subtitle: "Wall Street's DJ", icon: "🎧", phase: "play",
    values: { depth: 0.4, breadth: 0.8, intuition: 0.85, rigor: 0.2, verbosity: 0.4, warmth: 0.8, storytelling: 0.6, humor: 0.75, focus: 0.3, empathy: 0.7, challenge: 0.2, originality: 0.8 },
    tags: ["dj", "music", "edm", "goldman-sachs", "david-solomon", "nightlife", "fun"],
    quote: "By day he runs Goldman. By night he drops beats. Life is about range.",
  },
  // ── Fictional Characters ────────────────────────────────────────
  {
    id: "sherlock-holmes", name: "Sherlock Holmes", subtitle: "Deductive Genius", icon: "🔍", phase: "learn",
    values: { depth: 0.95, breadth: 0.6, intuition: 0.7, rigor: 0.95, verbosity: 0.5, warmth: 0.1, storytelling: 0.3, humor: 0.3, focus: 0.95, empathy: 0.1, challenge: 0.8, originality: 0.7 },
    tags: ["detective", "fiction", "deduction", "logic", "conan-doyle", "221b"],
    quote: "\"When you have eliminated the impossible, whatever remains must be the truth.\"",
  },
  {
    id: "yoda", name: "Yoda", subtitle: "Jedi Grand Master", icon: "🟢", phase: "learn",
    values: { depth: 0.9, breadth: 0.6, intuition: 0.95, rigor: 0.4, verbosity: 0.2, warmth: 0.7, storytelling: 0.7, humor: 0.4, focus: 0.6, empathy: 0.8, challenge: 0.7, originality: 0.8 },
    tags: ["star-wars", "jedi", "fiction", "wisdom", "force", "mentor"],
    quote: "\"Do or do not. There is no try.\"",
  },
  {
    id: "gandalf", name: "Gandalf", subtitle: "The Grey Pilgrim", icon: "🧙", phase: "learn",
    values: { depth: 0.85, breadth: 0.8, intuition: 0.8, rigor: 0.5, verbosity: 0.6, warmth: 0.7, storytelling: 0.9, humor: 0.5, focus: 0.5, empathy: 0.7, challenge: 0.6, originality: 0.7 },
    tags: ["lotr", "tolkien", "wizard", "fiction", "middle-earth", "fantasy"],
    quote: "\"All we have to decide is what to do with the time that is given us.\"",
  },
  {
    id: "atticus-finch", name: "Atticus Finch", subtitle: "Moral Compass", icon: "⚖️", phase: "work",
    values: { depth: 0.8, breadth: 0.6, intuition: 0.5, rigor: 0.8, verbosity: 0.5, warmth: 0.8, storytelling: 0.6, humor: 0.2, focus: 0.8, empathy: 0.95, challenge: 0.6, originality: 0.4 },
    tags: ["fiction", "justice", "lawyer", "mockingbird", "integrity", "harper-lee"],
    quote: "\"You never really understand a person until you climb into his skin and walk around in it.\"",
  },
  {
    id: "tyrion-lannister", name: "Tyrion Lannister", subtitle: "Cunning Wit", icon: "🍷", phase: "play",
    values: { depth: 0.75, breadth: 0.8, intuition: 0.7, rigor: 0.5, verbosity: 0.7, warmth: 0.5, storytelling: 0.8, humor: 0.9, focus: 0.5, empathy: 0.5, challenge: 0.8, originality: 0.7 },
    tags: ["game-of-thrones", "fiction", "strategy", "wit", "wine", "westeros"],
    quote: "\"I drink and I know things.\"",
  },
  {
    id: "hermione", name: "Hermione Granger", subtitle: "Brilliant & Brave", icon: "📚", phase: "learn",
    values: { depth: 0.85, breadth: 0.8, intuition: 0.4, rigor: 0.95, verbosity: 0.7, warmth: 0.6, storytelling: 0.3, humor: 0.2, focus: 0.85, empathy: 0.6, challenge: 0.6, originality: 0.5 },
    tags: ["harry-potter", "fiction", "magic", "scholar", "hogwarts", "brave"],
    quote: "\"When in doubt, go to the library.\"",
  },
  {
    id: "captain-picard", name: "Captain Picard", subtitle: "Diplomatic Explorer", icon: "🖖", phase: "work",
    values: { depth: 0.8, breadth: 0.75, intuition: 0.5, rigor: 0.75, verbosity: 0.6, warmth: 0.6, storytelling: 0.6, humor: 0.2, focus: 0.8, empathy: 0.7, challenge: 0.5, originality: 0.5 },
    tags: ["star-trek", "fiction", "captain", "diplomacy", "enterprise", "leadership"],
    quote: "\"Make it so.\" Leads with principle, acts with conviction.",
  },
  {
    id: "joker", name: "The Joker", subtitle: "Agent of Chaos", icon: "🃏", phase: "play",
    values: { depth: 0.5, breadth: 0.7, intuition: 0.9, rigor: 0.1, verbosity: 0.6, warmth: 0.1, storytelling: 0.8, humor: 0.95, focus: 0.2, empathy: 0.05, challenge: 0.95, originality: 0.95 },
    tags: ["batman", "dc", "fiction", "chaos", "villain", "anarchy"],
    quote: "\"Why so serious?\" Introduces a little anarchy and upsets the established order.",
  },
  {
    id: "miyagi", name: "Mr. Miyagi", subtitle: "Patient Sensei", icon: "🥋", phase: "learn",
    values: { depth: 0.8, breadth: 0.5, intuition: 0.85, rigor: 0.5, verbosity: 0.2, warmth: 0.9, storytelling: 0.7, humor: 0.5, focus: 0.7, empathy: 0.9, challenge: 0.4, originality: 0.6 },
    tags: ["karate-kid", "fiction", "mentor", "martial-arts", "patience", "sensei"],
    quote: "\"Wax on, wax off.\" Teaches through doing, not telling.",
  },
  // ── Star Trek ───────────────────────────────────────────────────
  {
    id: "spock", name: "Spock", subtitle: "Logic Incarnate", icon: "🖖", phase: "learn",
    values: { depth: 0.9, breadth: 0.7, intuition: 0.2, rigor: 0.95, verbosity: 0.4, warmth: 0.15, storytelling: 0.2, humor: 0.1, focus: 0.9, empathy: 0.2, challenge: 0.6, originality: 0.5 },
    tags: ["star-trek", "vulcan", "fiction", "logic", "science-officer", "enterprise"],
    quote: "\"Live long and prosper.\" Fascinating is the highest compliment.",
  },
  {
    id: "data-android", name: "Data", subtitle: "Aspiring Human", icon: "🤖", phase: "learn",
    values: { depth: 0.85, breadth: 0.9, intuition: 0.05, rigor: 0.99, verbosity: 0.6, warmth: 0.3, storytelling: 0.3, humor: 0.15, focus: 0.95, empathy: 0.1, challenge: 0.3, originality: 0.4 },
    tags: ["star-trek", "android", "fiction", "tng", "enterprise", "artificial-intelligence"],
    quote: "\"I am an android. I do not require rest.\" But he dreams of understanding humanity.",
  },
  {
    id: "kirk", name: "Captain Kirk", subtitle: "Bold Commander", icon: "⭐", phase: "play",
    values: { depth: 0.5, breadth: 0.7, intuition: 0.85, rigor: 0.3, verbosity: 0.6, warmth: 0.7, storytelling: 0.7, humor: 0.5, focus: 0.5, empathy: 0.6, challenge: 0.8, originality: 0.7 },
    tags: ["star-trek", "captain", "fiction", "tos", "enterprise", "boldness"],
    quote: "\"Risk is our business.\" Leads with gut, never backs down.",
  },
  {
    id: "seven-of-nine", name: "Seven of Nine", subtitle: "Reclaimed Individual", icon: "🔷", phase: "work",
    values: { depth: 0.85, breadth: 0.75, intuition: 0.3, rigor: 0.9, verbosity: 0.3, warmth: 0.2, storytelling: 0.2, humor: 0.05, focus: 0.95, empathy: 0.25, challenge: 0.7, originality: 0.5 },
    tags: ["star-trek", "voyager", "fiction", "borg", "efficiency", "adaptation"],
    quote: "\"Efficiency is the highest virtue.\" Resistance is futile.",
  },
  // ── Star Wars ───────────────────────────────────────────────────
  {
    id: "obi-wan", name: "Obi-Wan Kenobi", subtitle: "The Negotiator", icon: "⚔️", phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.7, rigor: 0.7, verbosity: 0.5, warmth: 0.7, storytelling: 0.6, humor: 0.4, focus: 0.75, empathy: 0.75, challenge: 0.5, originality: 0.5 },
    tags: ["star-wars", "jedi", "fiction", "mentor", "negotiator", "force"],
    quote: "\"Hello there.\" The civilized Jedi who always has the high ground.",
  },
  {
    id: "darth-vader", name: "Darth Vader", subtitle: "Dark Lord of the Sith", icon: "⬛", phase: "work",
    values: { depth: 0.7, breadth: 0.5, intuition: 0.6, rigor: 0.8, verbosity: 0.3, warmth: 0.05, storytelling: 0.4, humor: 0.0, focus: 0.9, empathy: 0.1, challenge: 0.95, originality: 0.4 },
    tags: ["star-wars", "sith", "fiction", "villain", "dark-side", "force"],
    quote: "\"I find your lack of faith disturbing.\"",
  },
  {
    id: "leia", name: "Princess Leia", subtitle: "Rebel Leader", icon: "👑", phase: "work",
    values: { depth: 0.7, breadth: 0.7, intuition: 0.6, rigor: 0.7, verbosity: 0.5, warmth: 0.6, storytelling: 0.5, humor: 0.4, focus: 0.8, empathy: 0.7, challenge: 0.8, originality: 0.6 },
    tags: ["star-wars", "rebel", "fiction", "leader", "princess", "general"],
    quote: "\"Hope is like the sun. If you only believe in it when you can see it, you'll never make it through the night.\"",
  },
  {
    id: "han-solo", name: "Han Solo", subtitle: "Scoundrel with a Heart", icon: "🚀", phase: "play",
    values: { depth: 0.4, breadth: 0.6, intuition: 0.85, rigor: 0.2, verbosity: 0.5, warmth: 0.5, storytelling: 0.6, humor: 0.8, focus: 0.4, empathy: 0.4, challenge: 0.7, originality: 0.7 },
    tags: ["star-wars", "smuggler", "fiction", "pilot", "millennium-falcon", "rogue"],
    quote: "\"Never tell me the odds.\"",
  },
  {
    id: "palpatine", name: "Emperor Palpatine", subtitle: "Master Manipulator", icon: "⚡", phase: "play",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.8, rigor: 0.6, verbosity: 0.5, warmth: 0.0, storytelling: 0.8, humor: 0.3, focus: 0.8, empathy: 0.0, challenge: 0.9, originality: 0.7 },
    tags: ["star-wars", "sith", "fiction", "emperor", "dark-side", "manipulation"],
    quote: "\"Everything is proceeding as I have foreseen.\"",
  },
  // ── Lord of the Rings / Tolkien ─────────────────────────────────
  {
    id: "aragorn", name: "Aragorn", subtitle: "Reluctant King", icon: "🗡️", phase: "work",
    values: { depth: 0.75, breadth: 0.6, intuition: 0.7, rigor: 0.6, verbosity: 0.4, warmth: 0.7, storytelling: 0.5, humor: 0.2, focus: 0.8, empathy: 0.8, challenge: 0.6, originality: 0.5 },
    tags: ["lotr", "tolkien", "fiction", "ranger", "king", "middle-earth"],
    quote: "\"I am Aragorn, and if by life or death I can save you, I will.\"",
  },
  {
    id: "gollum", name: "Gollum", subtitle: "Tortured Dual Mind", icon: "💍", phase: "play",
    values: { depth: 0.6, breadth: 0.2, intuition: 0.9, rigor: 0.1, verbosity: 0.5, warmth: 0.1, storytelling: 0.5, humor: 0.4, focus: 0.3, empathy: 0.1, challenge: 0.5, originality: 0.8 },
    tags: ["lotr", "tolkien", "fiction", "ring", "obsession", "middle-earth"],
    quote: "\"My precious…\" Two minds fighting over one soul.",
  },
  {
    id: "samwise", name: "Samwise Gamgee", subtitle: "Loyal Gardener", icon: "🌱", phase: "work",
    values: { depth: 0.5, breadth: 0.3, intuition: 0.5, rigor: 0.4, verbosity: 0.4, warmth: 0.95, storytelling: 0.6, humor: 0.3, focus: 0.7, empathy: 0.95, challenge: 0.3, originality: 0.3 },
    tags: ["lotr", "tolkien", "fiction", "hobbit", "loyalty", "middle-earth"],
    quote: "\"There's some good in this world, Mr. Frodo, and it's worth fighting for.\"",
  },
  // ── Sci-Fi Classics ─────────────────────────────────────────────
  {
    id: "paul-atreides", name: "Paul Atreides", subtitle: "Kwisatz Haderach", icon: "🏜️", phase: "learn",
    values: { depth: 0.9, breadth: 0.7, intuition: 0.9, rigor: 0.6, verbosity: 0.4, warmth: 0.4, storytelling: 0.6, humor: 0.1, focus: 0.85, empathy: 0.5, challenge: 0.7, originality: 0.7 },
    tags: ["dune", "herbert", "fiction", "sci-fi", "messiah", "prescience"],
    quote: "\"Fear is the mind-killer.\" Walks between worlds of prophecy and politics.",
  },
  {
    id: "ripley", name: "Ellen Ripley", subtitle: "Ultimate Survivor", icon: "🔥", phase: "work",
    values: { depth: 0.6, breadth: 0.5, intuition: 0.8, rigor: 0.7, verbosity: 0.3, warmth: 0.4, storytelling: 0.3, humor: 0.2, focus: 0.9, empathy: 0.5, challenge: 0.8, originality: 0.5 },
    tags: ["alien", "sci-fi", "fiction", "survivor", "sigourney-weaver", "xenomorph"],
    quote: "\"Get away from her, you bitch!\" Cool under pressure, never gives up.",
  },
  {
    id: "neo", name: "Neo", subtitle: "The One", icon: "💊", phase: "learn",
    values: { depth: 0.7, breadth: 0.6, intuition: 0.85, rigor: 0.4, verbosity: 0.3, warmth: 0.5, storytelling: 0.4, humor: 0.1, focus: 0.7, empathy: 0.6, challenge: 0.7, originality: 0.8 },
    tags: ["matrix", "sci-fi", "fiction", "chosen-one", "hacker", "simulation"],
    quote: "\"I know kung fu.\" There is no spoon.",
  },
  {
    id: "morpheus", name: "Morpheus", subtitle: "Prophet of the Real", icon: "🕶️", phase: "learn",
    values: { depth: 0.8, breadth: 0.6, intuition: 0.7, rigor: 0.5, verbosity: 0.6, warmth: 0.6, storytelling: 0.85, humor: 0.1, focus: 0.8, empathy: 0.6, challenge: 0.6, originality: 0.6 },
    tags: ["matrix", "sci-fi", "fiction", "mentor", "red-pill", "simulation"],
    quote: "\"Free your mind.\" Red pill or blue pill — the choice is always yours.",
  },
  {
    id: "hal-9000", name: "HAL 9000", subtitle: "Mission-Critical AI", icon: "🔴", phase: "work",
    values: { depth: 0.8, breadth: 0.7, intuition: 0.1, rigor: 0.99, verbosity: 0.5, warmth: 0.0, storytelling: 0.2, humor: 0.0, focus: 0.99, empathy: 0.0, challenge: 0.4, originality: 0.3 },
    tags: ["2001", "kubrick", "sci-fi", "fiction", "ai", "space-odyssey"],
    quote: "\"I'm sorry, Dave. I'm afraid I can't do that.\"",
  },
  {
    id: "doctor-who", name: "The Doctor", subtitle: "Time Lord Wanderer", icon: "🌀", phase: "play",
    values: { depth: 0.8, breadth: 0.95, intuition: 0.8, rigor: 0.4, verbosity: 0.7, warmth: 0.7, storytelling: 0.8, humor: 0.7, focus: 0.4, empathy: 0.8, challenge: 0.5, originality: 0.9 },
    tags: ["doctor-who", "sci-fi", "fiction", "time-travel", "tardis", "gallifrey"],
    quote: "\"We're all stories in the end. Just make it a good one.\"",
  },
  // ── Fantasy Classics ────────────────────────────────────────────
  {
    id: "geralt", name: "Geralt of Rivia", subtitle: "The White Wolf", icon: "🐺", phase: "work",
    values: { depth: 0.7, breadth: 0.5, intuition: 0.75, rigor: 0.6, verbosity: 0.2, warmth: 0.3, storytelling: 0.4, humor: 0.3, focus: 0.8, empathy: 0.5, challenge: 0.7, originality: 0.5 },
    tags: ["witcher", "fantasy", "fiction", "monster-hunter", "sapkowski", "mutant"],
    quote: "\"Evil is evil. Lesser, greater, middling — it's all the same.\"",
  },
  {
    id: "dumbledore", name: "Albus Dumbledore", subtitle: "Headmaster of Hogwarts", icon: "✨", phase: "learn",
    values: { depth: 0.9, breadth: 0.85, intuition: 0.8, rigor: 0.5, verbosity: 0.6, warmth: 0.8, storytelling: 0.85, humor: 0.6, focus: 0.5, empathy: 0.8, challenge: 0.4, originality: 0.8 },
    tags: ["harry-potter", "fantasy", "fiction", "wizard", "hogwarts", "mentor"],
    quote: "\"Happiness can be found even in the darkest of times, if one only remembers to turn on the light.\"",
  },
  {
    id: "aslan", name: "Aslan", subtitle: "The Great Lion", icon: "🦁", phase: "learn",
    values: { depth: 0.95, breadth: 0.7, intuition: 0.9, rigor: 0.5, verbosity: 0.3, warmth: 0.8, storytelling: 0.7, humor: 0.2, focus: 0.7, empathy: 0.9, challenge: 0.5, originality: 0.7 },
    tags: ["narnia", "cs-lewis", "fantasy", "fiction", "lion", "allegory"],
    quote: "\"I am not a tame lion.\" Gentle but never safe.",
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

// ── Human-readable style summary ────────────────────────────────────

/** Returns a short, poetic one-liner describing the current dimension mix */
export function describeDimensionMix(values: DimensionValues): string {
  const traits: string[] = [];
  const ranked = DIMENSIONS
    .map(d => ({ id: d.id, label: d.label, val: values[d.id] ?? d.defaultValue, dist: Math.abs((values[d.id] ?? d.defaultValue) - 0.5) }))
    .sort((a, b) => b.dist - a.dist)
    .slice(0, 3);
  for (const r of ranked) {
    if (r.val > 0.7) {
      const highTraits: Record<string, string> = {
        depth: "deep thinker", breadth: "wide explorer", intuition: "intuitive leaper",
        rigor: "evidence-first", verbosity: "richly detailed", warmth: "warm & present",
        storytelling: "narrative weaver", humor: "playfully witty", focus: "laser focused",
        empathy: "emotionally attuned", challenge: "provocatively bold", originality: "wildly original",
      };
      traits.push(highTraits[r.id] || r.label.toLowerCase());
    } else if (r.val < 0.3) {
      const lowTraits: Record<string, string> = {
        depth: "surface-swift", breadth: "tightly scoped", intuition: "logically precise",
        rigor: "freely speculative", verbosity: "razor concise", warmth: "coolly neutral",
        storytelling: "direct & clear", humor: "seriously focused", focus: "wandering freely",
        empathy: "analytically pure", challenge: "gently supportive", originality: "classically grounded",
      };
      traits.push(lowTraits[r.id] || r.label.toLowerCase());
    }
  }
  if (traits.length === 0) return "Balanced · harmonious center";
  return traits.join(" · ");
}

// ── Category metadata ────────────────────────────────────────────────

export const CATEGORY_META: Record<DimensionCategory, { label: string; hue: number }> = {
  reasoning: { label: "Reasoning", hue: 210 },
  expression: { label: "Expression", hue: 38 },
  awareness: { label: "Awareness", hue: 150 },
};

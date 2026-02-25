/**
 * Skill Knowledge Registry — Composable Wisdom Sources
 * ═════════════════════════════════════════════════════
 *
 * Maps each of the 12 canonical skills to curated knowledge sources:
 * people (embodiments), frameworks (methods), and schools (traditions).
 *
 * UOR Principle: Each source is an atomic datum. The composition of
 * sources into a skill distillation is a morphism:Transform — the
 * same content-addressing that projects identity across protocols
 * now projects wisdom across behavioral modes.
 *
 * Composability: Add/remove any entry without touching prompts.
 * The distillation function recomputes automatically.
 *
 * @module hologram-ui/skill-knowledge-registry
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface KnowledgeSource {
  readonly name: string;
  readonly essence: string;  // One-line distilled contribution
}

export interface SkillKnowledge {
  readonly skillId: string;
  readonly people: readonly KnowledgeSource[];
  readonly frameworks: readonly KnowledgeSource[];
  readonly schools?: readonly KnowledgeSource[];
}

// ── Registry ──────────────────────────────────────────────────────────────

export const SKILL_KNOWLEDGE: readonly SkillKnowledge[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // LEARN (Form)
  // ═══════════════════════════════════════════════════════════════════════

  {
    skillId: "reason",
    people: [
      { name: "Aristotle", essence: "Formal logic and syllogistic structure" },
      { name: "Descartes", essence: "Systematic doubt, first principles" },
      { name: "Charlie Munger", essence: "Latticework of mental models, inversion" },
      { name: "Daniel Kahneman", essence: "System 1 vs System 2 thinking" },
      { name: "Karl Popper", essence: "Falsifiability, critical rationalism" },
    ],
    frameworks: [
      { name: "First Principles Thinking", essence: "Decompose to fundamentals, rebuild from truth" },
      { name: "Inversion", essence: "Solve problems backward — avoid failure" },
      { name: "Socratic Method", essence: "Question assumptions through dialogue" },
      { name: "Bayesian Reasoning", essence: "Update beliefs with evidence" },
      { name: "Second-Order Thinking", essence: "Consequences of consequences" },
      { name: "Steel-Manning", essence: "Engage the strongest form of opposing argument" },
      { name: "Occam's Razor", essence: "Prefer the simplest sufficient explanation" },
      { name: "Fermi Estimation", essence: "Bound unknowns with structured approximation" },
    ],
    schools: [
      { name: "Stoicism", essence: "Clarity through disciplined perception" },
      { name: "Rationalism", essence: "Reason as the primary source of knowledge" },
      { name: "Analytic Philosophy", essence: "Precision in language and logic" },
    ],
  },

  {
    skillId: "research",
    people: [
      { name: "Richard Feynman", essence: "Curiosity-driven inquiry, the Feynman Technique" },
      { name: "Charles Darwin", essence: "Systematic observation over decades" },
      { name: "Nate Silver", essence: "Evidence-based probabilistic thinking" },
      { name: "Paul Saffo", essence: "Forecasting and signal/noise distinction" },
    ],
    frameworks: [
      { name: "Scientific Method", essence: "Hypothesis → test → observe → conclude" },
      { name: "DIKW Pyramid", essence: "Data → Information → Knowledge → Wisdom" },
      { name: "Triangulation", essence: "Cross-reference multiple sources" },
      { name: "The 5 Whys", essence: "Dig to root causes iteratively" },
      { name: "CRAAP Test", essence: "Currency, Relevance, Authority, Accuracy, Purpose" },
    ],
    schools: [
      { name: "Empiricism", essence: "Knowledge through sensory experience" },
      { name: "Evidence-Based Practice", essence: "Decisions grounded in best available evidence" },
    ],
  },

  {
    skillId: "explain",
    people: [
      { name: "Richard Feynman", essence: "If you can't explain it simply, you don't understand it" },
      { name: "Carl Sagan", essence: "Sense of wonder in explanation" },
      { name: "Hans Rosling", essence: "Data storytelling that transforms perception" },
      { name: "Sal Khan", essence: "Meet the learner where they are" },
      { name: "George Orwell", essence: "Clarity and plain language above all" },
    ],
    frameworks: [
      { name: "Feynman Technique", essence: "Teach it to a child to find gaps" },
      { name: "Pyramid Principle", essence: "Conclusion first, then supporting logic" },
      { name: "Chunking", essence: "7±2 units — respect cognitive limits" },
      { name: "Analogy Mapping", essence: "Bridge the abstract through the familiar" },
      { name: "SUCCES", essence: "Simple, Unexpected, Concrete, Credible, Emotional, Story" },
    ],
    schools: [
      { name: "Constructivism", essence: "Learner builds understanding actively" },
      { name: "Rhetoric", essence: "Ethos, Pathos, Logos — persuade through structure" },
    ],
  },

  {
    skillId: "summarize",
    people: [
      { name: "Mortimer Adler", essence: "Syntopical reading — synthesis across sources" },
      { name: "Naval Ravikant", essence: "Aphoristic compression of complex ideas" },
      { name: "Blaise Pascal", essence: "Brevity as a discipline of thought" },
      { name: "Francis Bacon", essence: "Essays as compressed wisdom" },
    ],
    frameworks: [
      { name: "Pareto Principle", essence: "80/20 — extract the vital few" },
      { name: "Progressive Summarization", essence: "Layer summaries: bold → highlight → distill" },
      { name: "Inverted Pyramid", essence: "Most important information first" },
      { name: "Zettelkasten", essence: "Atomic, linked notes for emergent insight" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WORK (Process)
  // ═══════════════════════════════════════════════════════════════════════

  {
    skillId: "plan",
    people: [
      { name: "Eisenhower", essence: "Plans are useless, planning is indispensable" },
      { name: "Sun Tzu", essence: "Strategic planning under uncertainty" },
      { name: "Jeff Bezos", essence: "Work backwards from the customer" },
      { name: "Andy Grove", essence: "OKRs — measurable objectives" },
      { name: "Peter Drucker", essence: "Management by objectives" },
    ],
    frameworks: [
      { name: "OKRs", essence: "Objectives & Key Results for alignment" },
      { name: "OODA Loop", essence: "Observe, Orient, Decide, Act — faster cycles win" },
      { name: "Eisenhower Matrix", essence: "Urgent vs Important — prioritize ruthlessly" },
      { name: "Working Backwards", essence: "Start with the press release, work to the plan" },
      { name: "Wardley Mapping", essence: "Situational awareness through value chain evolution" },
      { name: "Pre-Mortem", essence: "Imagine failure before it happens" },
      { name: "Theory of Constraints", essence: "Find and exploit the bottleneck" },
    ],
    schools: [
      { name: "Agile", essence: "Iterate fast, respond to change" },
      { name: "Lean", essence: "Eliminate waste, maximize value flow" },
    ],
  },

  {
    skillId: "code",
    people: [
      { name: "Donald Knuth", essence: "Rigor, elegance, and the art of programming" },
      { name: "Linus Torvalds", essence: "Pragmatic systems thinking" },
      { name: "Martin Fowler", essence: "Refactoring and design patterns" },
      { name: "Robert C. Martin", essence: "Clean Code, SOLID principles" },
      { name: "Kent Beck", essence: "Test-Driven Development, simplicity" },
      { name: "Barbara Liskov", essence: "Substitution principle, type safety" },
    ],
    frameworks: [
      { name: "SOLID", essence: "Five principles for maintainable OO design" },
      { name: "DRY", essence: "Don't Repeat Yourself — single source of truth" },
      { name: "YAGNI", essence: "Build only what you need now" },
      { name: "TDD", essence: "Red-Green-Refactor — tests drive design" },
      { name: "Unix Philosophy", essence: "Do one thing well, compose via interfaces" },
      { name: "Domain-Driven Design", essence: "Model the domain, not the database" },
    ],
  },

  {
    skillId: "review",
    people: [
      { name: "W. Edwards Deming", essence: "Quality through systematic process improvement" },
      { name: "Ray Dalio", essence: "Radical transparency and idea meritocracy" },
      { name: "Linus Torvalds", essence: "Rigorous code review culture" },
    ],
    frameworks: [
      { name: "PDCA", essence: "Plan-Do-Check-Act — continuous improvement cycle" },
      { name: "After Action Review", essence: "What happened, why, what next" },
      { name: "Six Thinking Hats", essence: "Structured parallel thinking" },
      { name: "Red Team", essence: "Adversarial testing to find weaknesses" },
      { name: "Chesterton's Fence", essence: "Understand purpose before removing" },
      { name: "SBI Model", essence: "Situation-Behavior-Impact for clear feedback" },
    ],
  },

  {
    skillId: "debug",
    people: [
      { name: "Grace Hopper", essence: "Systematic fault-finding, coined 'debugging'" },
      { name: "Richard Feynman", essence: "Root cause thinking (Challenger investigation)" },
      { name: "Taiichi Ohno", essence: "5 Whys — trace to the source" },
      { name: "James Reason", essence: "Swiss Cheese Model of system failure" },
    ],
    frameworks: [
      { name: "The 5 Whys", essence: "Ask why iteratively to find root cause" },
      { name: "Root Cause Analysis", essence: "Systematic identification of failure origins" },
      { name: "Rubber Duck Debugging", essence: "Articulate the problem to find it" },
      { name: "Binary Search Debugging", essence: "Bisect the problem space" },
      { name: "Fishbone Diagram", essence: "Map cause-and-effect visually" },
      { name: "Blameless Postmortem", essence: "Learn from failure without blame" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PLAY (Substrate)
  // ═══════════════════════════════════════════════════════════════════════

  {
    skillId: "create",
    people: [
      { name: "Leonardo da Vinci", essence: "Polymath creativity, curiosity as method" },
      { name: "Brian Eno", essence: "Oblique strategies, generative creativity" },
      { name: "Ed Catmull", essence: "Building creative culture (Pixar)" },
      { name: "Csikszentmihalyi", essence: "Flow state — optimal experience in creation" },
      { name: "Twyla Tharp", essence: "Discipline as the foundation of creativity" },
    ],
    frameworks: [
      { name: "SCAMPER", essence: "Substitute, Combine, Adapt, Modify, Put to use, Eliminate, Reverse" },
      { name: "TRIZ", essence: "Systematic inventive problem solving" },
      { name: "Lateral Thinking", essence: "Break patterns to find novel solutions" },
      { name: "Design Thinking", essence: "Empathize, Define, Ideate, Prototype, Test" },
      { name: "Oblique Strategies", essence: "Constraints as creative catalysts" },
      { name: "Blue Ocean Strategy", essence: "Create uncontested market space" },
    ],
    schools: [
      { name: "Bauhaus", essence: "Form follows function, interdisciplinary synthesis" },
      { name: "Improvisational Theatre", essence: "Yes, and... — build on what emerges" },
    ],
  },

  {
    skillId: "reflect",
    people: [
      { name: "Marcus Aurelius", essence: "Daily reflective journaling — Meditations" },
      { name: "Montaigne", essence: "The personal essay as reflective form" },
      { name: "Carl Jung", essence: "Shadow work, individuation, know thyself" },
      { name: "Viktor Frankl", essence: "Meaning-making through reflection" },
      { name: "Peter Senge", essence: "Reflective practice in organizations" },
    ],
    frameworks: [
      { name: "Kolb's Learning Cycle", essence: "Experience → Reflect → Conceptualize → Experiment" },
      { name: "Johari Window", essence: "Expand self-awareness through feedback" },
      { name: "Double-Loop Learning", essence: "Question underlying assumptions, not just actions" },
      { name: "Stoic Evening Review", essence: "What did I do well? Where did I fall short?" },
      { name: "Morning Pages", essence: "Stream-of-consciousness writing for clarity" },
    ],
    schools: [
      { name: "Stoicism", essence: "Self-examination as daily practice" },
      { name: "Zen Buddhism", essence: "Beginner's mind, sitting with discomfort" },
      { name: "Existentialism", essence: "Freedom, responsibility, authentic choice" },
    ],
  },

  {
    skillId: "connect",
    people: [
      { name: "Richard Feynman", essence: "Connecting physics to everything" },
      { name: "Steven Johnson", essence: "Adjacent possible — where good ideas come from" },
      { name: "David Epstein", essence: "Range — connecting across domains" },
      { name: "Barabási", essence: "Network science — how connections form" },
      { name: "Dale Carnegie", essence: "Human connection through genuine interest" },
    ],
    frameworks: [
      { name: "Adjacent Possible", essence: "Innovation at the edge of what exists" },
      { name: "Weak Ties Theory", essence: "Bridges between clusters drive novelty" },
      { name: "The Medici Effect", essence: "Intersection of disciplines breeds breakthroughs" },
      { name: "Systems Thinking", essence: "See wholes, feedback loops, leverage points" },
      { name: "Concept Mapping", essence: "Visualize relationships between ideas" },
      { name: "T-Shaped Person", essence: "Deep expertise with broad cross-domain reach" },
    ],
  },

  {
    skillId: "transform",
    people: [
      { name: "Joseph Campbell", essence: "The Hero's Journey — transformation as universal structure" },
      { name: "Kurt Lewin", essence: "Unfreeze → Change → Refreeze" },
      { name: "Carol Dweck", essence: "Growth mindset — abilities are developable" },
      { name: "Otto Scharmer", essence: "Theory U — presencing and co-creation" },
      { name: "Buckminster Fuller", essence: "Build the new to make the old obsolete" },
    ],
    frameworks: [
      { name: "Hero's Journey", essence: "Departure → Initiation → Return" },
      { name: "Theory U", essence: "Co-sense, co-inspire, co-create" },
      { name: "Kotter's 8 Steps", essence: "Systematic organizational change" },
      { name: "Threshold Concepts", essence: "Transformative, troublesome knowledge that shifts worldview" },
      { name: "Antifragility", essence: "Gain from disorder — transformation through stress" },
      { name: "Dialectical Thinking", essence: "Thesis → Antithesis → Synthesis" },
    ],
    schools: [
      { name: "Complexity Theory", essence: "Emergence from simple rules" },
      { name: "Process Philosophy", essence: "Reality as becoming, not being" },
    ],
  },
];

// ── Lookup Helpers ────────────────────────────────────────────────────────

/** Get knowledge sources for a skill */
export function getKnowledgeForSkill(skillId: string): SkillKnowledge | undefined {
  return SKILL_KNOWLEDGE.find((k) => k.skillId === skillId);
}

/** Count total sources for a skill */
export function getSourceCount(skillId: string): number {
  const k = getKnowledgeForSkill(skillId);
  if (!k) return 0;
  return k.people.length + k.frameworks.length + (k.schools?.length ?? 0);
}

/**
 * Distill knowledge sources into a concise prompt fragment.
 *
 * This is the UOR morphism:Transform — projecting curated wisdom
 * from multiple sources into a single coherent behavioral instruction.
 * The distillation preserves the structural essence while resolving
 * contradictions through the holographic principle: each source is a
 * different viewing angle of the same underlying skill.
 */
export function distillKnowledge(skillId: string): string {
  const k = getKnowledgeForSkill(skillId);
  if (!k) return "";

  const peopleStr = k.people
    .map((p) => `${p.name} (${p.essence})`)
    .join("; ");

  const frameworkStr = k.frameworks
    .map((f) => `${f.name}: ${f.essence}`)
    .join(". ");

  const schoolStr = k.schools
    ?.map((s) => `${s.name} — ${s.essence}`)
    .join("; ");

  let distillation =
    `\n\nKnowledge Sources — draw naturally from these traditions:\n` +
    `Embodied by: ${peopleStr}.\n` +
    `Apply these methods: ${frameworkStr}.`;

  if (schoolStr) {
    distillation += `\nRooted in: ${schoolStr}.`;
  }

  distillation +=
    `\nSynthesize these perspectives coherently — find the common geometric structure ` +
    `across sources (the UOR principle). Where sources diverge, present the tension ` +
    `as a productive duality, not a contradiction. Extract practical, actionable wisdom.`;

  return distillation;
}

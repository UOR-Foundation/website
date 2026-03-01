/**
 * App Store Catalog — Triadic (Learn / Work / Play) app definitions.
 * Each app belongs to a phase and subcategory, with install status.
 */

export type TriadicPhase = "learn" | "work" | "play";

export interface StoreApp {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  phase: TriadicPhase;
  subcategory: string;
  installed: boolean;
  featured?: boolean;
  badge?: string; // "new" | "popular" | "hologram"
  rating?: number;  // 1-5
  users?: string;   // e.g. "12.4k"
  route?: string; // Route to navigate to
}

export interface SubcategoryDef {
  slug: string;
  label: string;
  phase: TriadicPhase;
  iconKey: string;
}

/* ── Subcategories ────────────────────────────────────────── */

export const subcategories: SubcategoryDef[] = [
  // Learn
  { slug: "courses",          label: "Courses & Tutorials",  phase: "learn", iconKey: "GraduationCap" },
  { slug: "reading",          label: "Reading & Research",    phase: "learn", iconKey: "BookOpen" },
  { slug: "languages",        label: "Languages",            phase: "learn", iconKey: "Languages" },
  { slug: "mathematics",      label: "Mathematics",          phase: "learn", iconKey: "Calculator" },
  { slug: "science",          label: "Science & Discovery",  phase: "learn", iconKey: "Microscope" },
  // Work
  { slug: "dev-tools",        label: "Dev Tools",            phase: "work", iconKey: "Code2" },
  { slug: "synthetic-research", label: "Synthetic Research", phase: "work", iconKey: "Beaker" },
  { slug: "productivity",     label: "Productivity",         phase: "work", iconKey: "Target" },
  { slug: "communication",    label: "Communication",        phase: "work", iconKey: "MessageSquare" },
  { slug: "analytics",        label: "Analytics & Data",     phase: "work", iconKey: "BarChart3" },
  // Play
  { slug: "music",            label: "Music",                phase: "play", iconKey: "Music" },
  { slug: "video",            label: "Video",                phase: "play", iconKey: "Film" },
  { slug: "games",            label: "Games",                phase: "play", iconKey: "Gamepad2" },
  { slug: "social",           label: "Social",               phase: "play", iconKey: "Users" },
  { slug: "wellness",         label: "Wellness & Mindfulness", phase: "play", iconKey: "Heart" },
];

/* ── App Catalog ──────────────────────────────────────────── */

export const appCatalog: StoreApp[] = [
  // ═══ LEARN ═══
  { id: "uor-academy",      name: "UOR Academy",          description: "Interactive courses on the Universal Object Reference framework",               iconKey: "GraduationCap", phase: "learn", subcategory: "courses",     installed: true,  featured: true, badge: "hologram", rating: 4.9, users: "8.2k" },
  { id: "math-lens",        name: "Math Lens",            description: "Algebraic structures and formal methods visualizer",                            iconKey: "Calculator",    phase: "learn", subcategory: "mathematics", installed: true,  badge: "popular", rating: 4.7, users: "5.1k" },
  { id: "arxiv-reader",     name: "arXiv Reader",         description: "Browse and annotate papers with semantic search",                               iconKey: "BookOpen",      phase: "learn", subcategory: "reading",     installed: false, rating: 4.5, users: "14.3k" },
  { id: "lingua-prime",     name: "Lingua Prime",         description: "AI-powered language learning with spaced repetition",                           iconKey: "Languages",     phase: "learn", subcategory: "languages",   installed: false, badge: "new", rating: 4.8, users: "3.7k" },
  { id: "quantum-primer",   name: "Quantum Primer",       description: "Learn quantum computing concepts through interactive simulations",              iconKey: "Atom",          phase: "learn", subcategory: "science",     installed: false, rating: 4.6, users: "2.9k" },
  { id: "proof-trainer",    name: "Proof Trainer",         description: "Practice mathematical proofs with step-by-step verification",                   iconKey: "ShieldCheck",   phase: "learn", subcategory: "mathematics", installed: false, rating: 4.4, users: "1.8k" },
  { id: "knowledge-graph",  name: "Knowledge Graph",      description: "Build and explore personal knowledge graphs from your reading",                 iconKey: "Network",       phase: "learn", subcategory: "reading",     installed: true, rating: 4.6, users: "6.5k" },
  { id: "science-lab",      name: "Science Lab",          description: "Virtual laboratory simulations for physics and chemistry",                       iconKey: "Microscope",    phase: "learn", subcategory: "science",     installed: false, badge: "new", rating: 4.3, users: "1.2k" },

  // ═══ WORK ═══
  { id: "hologram-terminal", name: "Hologram Terminal",   description: "Full-featured terminal with UOR-native shell commands",                         iconKey: "Terminal",      phase: "work", subcategory: "dev-tools",        installed: true,  featured: true, badge: "hologram", rating: 4.9, users: "11.7k" },
  { id: "code-forge",        name: "Code Forge",          description: "Collaborative code editor with real-time projection",                           iconKey: "Code2",         phase: "work", subcategory: "dev-tools",        installed: true,  badge: "popular", rating: 4.8, users: "9.4k" },
  { id: "synth-research",    name: "Synth Research",      description: "AI-assisted research synthesis across multiple papers and datasets",            iconKey: "Beaker",        phase: "work", subcategory: "synthetic-research", installed: true, featured: true, badge: "hologram", rating: 4.9, users: "7.2k" },
  { id: "focus-timer",       name: "Focus Timer",         description: "Pomodoro-style deep work sessions with ambient soundscapes",                    iconKey: "Timer",         phase: "work", subcategory: "productivity",     installed: true,  rating: 4.7, users: "15.3k" },
  { id: "data-studio",       name: "Data Studio",         description: "Visual analytics and dashboard builder",                                        iconKey: "BarChart3",     phase: "work", subcategory: "analytics",        installed: false, rating: 4.5, users: "4.8k" },
  { id: "api-inspector",     name: "API Inspector",       description: "Test and debug API endpoints with UOR certification",                           iconKey: "Search",        phase: "work", subcategory: "dev-tools",        installed: false, badge: "new", rating: 4.6, users: "3.1k" },
  { id: "messenger",         name: "Messenger",           description: "Encrypted team messaging with semantic context awareness",                       iconKey: "MessageSquare", phase: "work", subcategory: "communication",    installed: true,  rating: 4.4, users: "8.9k" },
  { id: "jupyter-notebook",  name: "Jupyter Notebook",    description: "Interactive computing notebooks for data science workflows",                     iconKey: "Notebook",      phase: "work", subcategory: "synthetic-research", installed: true, rating: 4.8, users: "6.1k" },
  { id: "git-lens",          name: "Git Lens",            description: "Advanced Git visualization and history explorer",                                iconKey: "GitBranch",     phase: "work", subcategory: "dev-tools",        installed: false, rating: 4.5, users: "5.3k" },
  { id: "kanban-flow",       name: "Kanban Flow",         description: "Visual project management with sovereign data ownership",                       iconKey: "Columns3",      phase: "work", subcategory: "productivity",     installed: false, rating: 4.3, users: "7.8k" },

  // ═══ PLAY ═══
  { id: "hologram-prime-music", name: "Hologram Prime — Music", description: "Stream and discover music with content-addressed audio",                  iconKey: "Music",         phase: "play", subcategory: "music", installed: true,  featured: true, badge: "hologram", rating: 4.9, users: "18.5k", route: "/hologram-prime" },
  { id: "hologram-prime-video", name: "Hologram Prime — Video", description: "Watch and share video content with sovereign streaming",                  iconKey: "Film",          phase: "play", subcategory: "video", installed: true,  badge: "hologram", rating: 4.8, users: "14.2k", route: "/hologram-prime" },
  { id: "hologram-prime-games", name: "Hologram Prime — Games", description: "Play browser-native games with verifiable scores",                        iconKey: "Gamepad2",      phase: "play", subcategory: "games", installed: true,  badge: "hologram", rating: 4.7, users: "9.8k", route: "/hologram-prime" },
  { id: "ambient-radio",       name: "Ambient Radio",          description: "Curated ambient stations for focus, relaxation, and creativity",           iconKey: "Radio",         phase: "play", subcategory: "music", installed: true,  badge: "popular", rating: 4.8, users: "12.1k", route: "/hologram-prime" },
  { id: "mindful-moments",     name: "Mindful Moments",        description: "Guided meditation and breathing exercises",                                iconKey: "Heart",         phase: "play", subcategory: "wellness", installed: false, rating: 4.6, users: "6.4k" },
  { id: "social-graph",        name: "Social Graph",           description: "Visualize and nurture your social connections",                             iconKey: "Users",         phase: "play", subcategory: "social",   installed: false, badge: "new", rating: 4.4, users: "3.9k" },
  { id: "pixel-forge",         name: "Pixel Forge",            description: "Create pixel art and share with the community",                             iconKey: "Palette",       phase: "play", subcategory: "games",    installed: false, rating: 4.5, users: "2.7k" },
  { id: "podcast-player",      name: "Podcast Player",         description: "Subscribe, listen, and auto-transcribe podcasts",                           iconKey: "Headphones",    phase: "play", subcategory: "music",    installed: false, rating: 4.3, users: "5.6k", route: "/hologram-prime" },
];

/* ── Phase metadata ──────────────────────────────────────── */

export const phaseConfig: Record<TriadicPhase, {
  label: string;
  description: string;
  gradient: string;
  accentHsl: string;
  iconKey: string;
}> = {
  learn: {
    label: "Learn",
    description: "Expand your knowledge and sharpen your mind",
    gradient: "linear-gradient(135deg, hsl(210, 60%, 50%), hsl(230, 55%, 45%))",
    accentHsl: "210 60% 50%",
    iconKey: "BookOpen",
  },
  work: {
    label: "Work",
    description: "Build, create, and ship with powerful tools",
    gradient: "linear-gradient(135deg, hsl(38, 55%, 50%), hsl(25, 60%, 45%))",
    accentHsl: "38 55% 50%",
    iconKey: "Briefcase",
  },
  play: {
    label: "Play",
    description: "Relax, explore, and enjoy curated experiences",
    gradient: "linear-gradient(135deg, hsl(280, 50%, 50%), hsl(310, 45%, 45%))",
    accentHsl: "280 50% 50%",
    iconKey: "Sparkles",
  },
};


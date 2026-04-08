/**
 * knowledge-lenses — Preset rendering lenses for the knowledge renderer.
 *
 * Each lens defines a different perspective through which content is synthesized.
 * The lens ID is sent to the edge function, which swaps the system prompt accordingly.
 */

export interface KnowledgeLens {
  id: string;
  label: string;
  /** Lucide icon name */
  icon: "BookOpen" | "Newspaper" | "Baby" | "GraduationCap" | "BookText";
  description: string;
}

export const KNOWLEDGE_LENSES: KnowledgeLens[] = [
  {
    id: "encyclopedia",
    label: "Encyclopedia",
    icon: "BookOpen",
    description: "Neutral, Wikipedia-style article with structured sections",
  },
  {
    id: "magazine",
    label: "Magazine",
    icon: "Newspaper",
    description: "Vivid feature article with dramatic flair and pull quotes",
  },
  {
    id: "explain-like-5",
    label: "Simple",
    icon: "Baby",
    description: "Explained for a curious 8-year-old — analogies and wonder",
  },
  {
    id: "expert",
    label: "Deep Dive",
    icon: "GraduationCap",
    description: "Graduate-level technical depth for domain experts",
  },
  {
    id: "storyteller",
    label: "Story",
    icon: "BookText",
    description: "Narrative arc — told as a compelling story with drama",
  },
];

export const DEFAULT_LENS = "encyclopedia";

export function getLens(id: string): KnowledgeLens {
  return KNOWLEDGE_LENSES.find((l) => l.id === id) ?? KNOWLEDGE_LENSES[0];
}

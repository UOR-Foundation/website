/**
 * tags — macOS Finder-style colored tag definitions and state management.
 * Tags are stored in-memory (ephemeral, like guest context).
 */

export interface FileTag {
  id: string;
  label: string;
  color: string; // HSL color string
}

/** Default tag palette, matching macOS Finder */
export const DEFAULT_TAGS: FileTag[] = [
  { id: "red",    label: "Red",    color: "hsl(0 72% 55%)" },
  { id: "orange", label: "Orange", color: "hsl(28 80% 55%)" },
  { id: "yellow", label: "Yellow", color: "hsl(48 85% 50%)" },
  { id: "green",  label: "Green",  color: "hsl(142 60% 45%)" },
  { id: "blue",   label: "Blue",   color: "hsl(210 75% 55%)" },
  { id: "purple", label: "Purple", color: "hsl(270 60% 58%)" },
  { id: "gray",   label: "Gray",   color: "hsl(0 0% 55%)" },
];

// Map of itemId → Set of tagIds
let tagMap: Record<string, Set<string>> = {};
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

export const tagStore = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  getTagsForItem(itemId: string): string[] {
    return tagMap[itemId] ? Array.from(tagMap[itemId]) : [];
  },

  getAllTaggedItems(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [itemId, tags] of Object.entries(tagMap)) {
      if (tags.size > 0) result[itemId] = Array.from(tags);
    }
    return result;
  },

  /** Get all item IDs that have a specific tag */
  getItemsWithTag(tagId: string): string[] {
    return Object.entries(tagMap)
      .filter(([, tags]) => tags.has(tagId))
      .map(([itemId]) => itemId);
  },

  toggleTag(itemId: string, tagId: string) {
    if (!tagMap[itemId]) tagMap[itemId] = new Set();
    if (tagMap[itemId].has(tagId)) {
      tagMap[itemId].delete(tagId);
      if (tagMap[itemId].size === 0) delete tagMap[itemId];
    } else {
      tagMap[itemId].add(tagId);
    }
    emit();
  },

  clearTagsForItem(itemId: string) {
    delete tagMap[itemId];
    emit();
  },

  /** Count items that have a given tag */
  countForTag(tagId: string): number {
    return Object.values(tagMap).filter((s) => s.has(tagId)).length;
  },
};

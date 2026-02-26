/**
 * Browser palette — shared design tokens for all browser modules.
 * Single source of truth for the glass aesthetic.
 */
export const P = {
  bg: "hsla(25, 8%, 6%, 0.97)",
  surface: "hsla(25, 8%, 12%, 0.75)",
  surfaceHover: "hsla(38, 12%, 90%, 0.08)",
  border: "hsla(38, 12%, 70%, 0.08)",
  borderFocus: "hsla(38, 30%, 55%, 0.25)",
  text: "hsl(38, 10%, 88%)",
  textMuted: "hsl(38, 8%, 50%)",
  gold: "hsl(38, 40%, 65%)",
  goldMuted: "hsl(38, 25%, 50%)",
  font: "'DM Sans', system-ui, sans-serif",
} as const;

export interface HistoryEntry {
  url: string;
  title: string;
  markdown: string;
  rawHtml: string;
  links: string[];
  visitedAt: number;
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function isUrl(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  if (/^[^\s]+\.[^\s]+$/.test(trimmed)) return true;
  return false;
}

export function formatUrl(raw: string): string {
  let formatted = raw.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }
  return formatted;
}

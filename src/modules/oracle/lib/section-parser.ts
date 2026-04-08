/**
 * section-parser — Splits streaming markdown into completed sections
 * for progressive "waterfall" rendering.
 */

export interface Section {
  key: string;
  heading: string;
  content: string;
}

export interface ParsedSections {
  /** Fully received sections (heading + body up to next heading) */
  complete: Section[];
  /** The in-progress section currently being streamed */
  partial: string;
  /** Content before the first heading */
  preamble: string;
}

/**
 * Parse accumulated markdown into sections split on ## boundaries.
 * Each completed section has a stable key for animation.
 */
export function parseSections(markdown: string): ParsedSections {
  if (!markdown.trim()) return { complete: [], partial: "", preamble: "" };

  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];
  let preambleLines: string[] = [];
  let inPreamble = true;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch) {
      if (inPreamble) {
        preambleLines = currentLines;
        inPreamble = false;
      } else if (currentHeading) {
        // Close previous section
        sections.push({
          key: `section-${sections.length}-${slugify(currentHeading)}`,
          heading: currentHeading,
          content: currentLines.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // The last section is always "partial" (still being streamed)
  const partial = currentHeading
    ? `## ${currentHeading}\n${currentLines.join("\n")}`
    : currentLines.join("\n");

  return {
    complete: sections,
    partial: inPreamble ? "" : partial,
    preamble: inPreamble ? currentLines.join("\n").trim() : preambleLines.join("\n").trim(),
  };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
}

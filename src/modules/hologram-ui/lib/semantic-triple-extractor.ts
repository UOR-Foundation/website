/**
 * Semantic Triple Extractor
 * ═════════════════════════
 *
 * Converts raw document text into ontological triples (subject-predicate-object)
 * that preserve the document's semantic structure, hierarchy, and meaning.
 *
 * Inspired by LEANN's principle: store the graph structure, not raw embeddings.
 * These triples feed directly into UGC2 compression, preserving ontology
 * while achieving 10-20× compression for Lumen AI context injection.
 *
 * @module hologram-ui/lib/semantic-triple-extractor
 */

import type { CompressibleTriple } from "@/modules/data-bank/lib/graph-compression";

// ── Document structure types ────────────────────────────────────────────────

interface DocumentSection {
  heading: string;
  level: number;
  content: string;
  index: number;
}

// ── Core extractor ──────────────────────────────────────────────────────────

/**
 * Extract semantic triples from document text.
 *
 * The extractor identifies:
 *  1. Document-level metadata (title, type, word count)
 *  2. Hierarchical sections (headings → subsections)
 *  3. Key claims/sentences as semantic propositions
 *  4. Named entities and relationships
 *  5. Numerical facts and dates
 *
 * Each triple maps to a UOR predicate from the static dictionary
 * where possible, maximizing UGC2 dictionary hit rate.
 */
export function extractSemanticTriples(
  text: string,
  filename: string,
): CompressibleTriple[] {
  const triples: CompressibleTriple[] = [];
  const docId = `doc:${filename}`;

  // 1. Document-level metadata
  triples.push({ subject: docId, predicate: "rdf:type", object: "schema:Document" });
  triples.push({ subject: docId, predicate: "schema:name", object: filename });

  const words = text.split(/\s+/).filter(Boolean);
  triples.push({ subject: docId, predicate: "delta:memCount", object: String(words.length) });

  // 2. Detect and extract sections
  const sections = extractSections(text);

  if (sections.length > 0) {
    triples.push({ subject: docId, predicate: "schema:description", object: `Structured document with ${sections.length} sections` });

    for (const section of sections) {
      const sectionId = `sec:${section.index}`;
      triples.push({ subject: sectionId, predicate: "rdf:type", object: "schema:Section" });
      triples.push({ subject: sectionId, predicate: "schema:name", object: section.heading });
      triples.push({ subject: docId, predicate: "uor:memberOf", object: sectionId });
      triples.push({ subject: sectionId, predicate: "delta:hScore", object: String(section.level) });

      // Extract key sentences from section content
      const sentences = extractKeySentences(section.content, 5);
      for (let j = 0; j < sentences.length; j++) {
        const claimId = `claim:${section.index}.${j}`;
        triples.push({ subject: claimId, predicate: "rdf:type", object: "schema:Claim" });
        triples.push({ subject: claimId, predicate: "schema:description", object: sentences[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: claimId });
      }
    }
  } else {
    // Flat document — extract key sentences directly
    triples.push({ subject: docId, predicate: "schema:description", object: "Unstructured document" });
    const sentences = extractKeySentences(text, 25);
    for (let i = 0; i < sentences.length; i++) {
      const claimId = `claim:${i}`;
      triples.push({ subject: claimId, predicate: "rdf:type", object: "schema:Claim" });
      triples.push({ subject: claimId, predicate: "schema:description", object: sentences[i] });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: claimId });
    }
  }

  // 3. Extract named entities and topics
  const topics = extractTopics(text);
  for (const topic of topics) {
    triples.push({ subject: docId, predicate: "uor:interestedIn", object: topic });
  }

  // 4. Extract numerical facts
  const facts = extractNumericalFacts(text);
  for (const fact of facts) {
    triples.push({ subject: docId, predicate: "uor:observes", object: fact });
  }

  // 5. Extract dates
  const dates = extractDates(text);
  for (const date of dates) {
    triples.push({ subject: docId, predicate: "uor:createdAt", object: date });
  }

  return triples;
}

// ── Section extraction ──────────────────────────────────────────────────────

function extractSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  // Match markdown-style headings, title-case lines, or ALL-CAPS lines
  const lines = text.split("\n");
  let currentHeading = "";
  let currentLevel = 0;
  let currentContent: string[] = [];
  let sectionIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentContent.push("");
      continue;
    }

    // Markdown heading
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    // ALL-CAPS heading (at least 3 words or standalone title)
    const capsMatch = !mdMatch && trimmed.length > 5 && trimmed.length < 100 &&
      trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed);
    // Title-case line (short, likely heading)
    const titleMatch = !mdMatch && !capsMatch && trimmed.length < 80 &&
      !trimmed.endsWith(".") && !trimmed.endsWith(",") &&
      /^[A-Z][a-zA-Z\s:–—-]{4,}$/.test(trimmed) &&
      trimmed.split(/\s+/).length <= 10;

    if (mdMatch || capsMatch || titleMatch) {
      // Flush previous section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentContent.join("\n").trim(),
          index: sectionIndex++,
        });
      }
      currentHeading = mdMatch ? mdMatch[2] : trimmed;
      currentLevel = mdMatch ? mdMatch[1].length : (capsMatch ? 1 : 2);
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  // Flush last section
  if (currentHeading && currentContent.join("").trim().length > 20) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentContent.join("\n").trim(),
      index: sectionIndex,
    });
  }

  return sections;
}

// ── Key sentence extraction ─────────────────────────────────────────────────

function extractKeySentences(text: string, maxCount: number): string[] {
  // Split into sentences
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500 && /[a-zA-Z]{3,}/.test(s));

  if (sentences.length <= maxCount) return sentences;

  // Score sentences by information density:
  // - longer sentences (more content)
  // - sentences with numbers (factual)
  // - sentences with proper nouns (entities)
  // - sentences at beginning of paragraphs
  const scored = sentences.map((s, i) => {
    let score = 0;
    score += Math.min(s.length / 100, 1.5); // length bonus
    if (/\d+/.test(s)) score += 1.2; // numerical content
    if (/[A-Z][a-z]+\s+[A-Z]/.test(s)) score += 0.8; // proper nouns
    if (i < 3) score += 0.5; // early sentences
    if (/however|therefore|because|although|furthermore|moreover/i.test(s)) score += 0.7; // discourse markers
    if (/define|means|refers to|is a|consists of/i.test(s)) score += 1.0; // definitions
    return { sentence: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Return in original order for coherence
  const topIndices = new Set(
    scored.slice(0, maxCount).map(s => sentences.indexOf(s.sentence))
  );
  return sentences.filter((_, i) => topIndices.has(i));
}

// ── Topic extraction ────────────────────────────────────────────────────────

function extractTopics(text: string): string[] {
  // Extract capitalized multi-word phrases (likely named entities/topics)
  const phraseMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) ?? [];
  const freq = new Map<string, number>();
  for (const p of phraseMatches) {
    if (p.length > 5 && p.length < 60) {
      freq.set(p, (freq.get(p) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([topic]) => topic);
}

// ── Numerical fact extraction ───────────────────────────────────────────────

function extractNumericalFacts(text: string): string[] {
  // Find sentences containing numbers with context
  const sentences = text.split(/(?<=[.!?])\s+/);
  const facts: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 15 || trimmed.length > 300) continue;
    // Must contain a number with surrounding context
    if (/\d+[%,.]?\d*\s*(?:percent|million|billion|thousand|times|×|x\b|hours?|days?|years?|bytes?|KB|MB|GB|TB)/i.test(trimmed)) {
      facts.push(trimmed);
    }
  }

  return facts.slice(0, 10);
}

// ── Date extraction ─────────────────────────────────────────────────────────

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  ];

  const dates = new Set<string>();
  for (const pattern of datePatterns) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) dates.add(m);
  }

  return Array.from(dates).slice(0, 8);
}

// ── Reconstruct semantic context from triples (for AI injection) ────────────

/**
 * Converts decompressed triples back into a structured semantic context
 * suitable for LLM system prompt injection.
 *
 * This is the inverse of extraction: triples → readable ontological summary
 * that preserves document structure, hierarchy, and key claims.
 */
export function triplesToSemanticContext(triples: CompressibleTriple[]): string {
  const lines: string[] = [];

  // Group triples by subject
  const bySubject = new Map<string, CompressibleTriple[]>();
  for (const t of triples) {
    const group = bySubject.get(t.subject) ?? [];
    group.push(t);
    bySubject.set(t.subject, group);
  }

  // Find the document node
  const docEntries = Array.from(bySubject.entries()).filter(([, ts]) =>
    ts.some(t => t.predicate === "rdf:type" && t.object === "schema:Document")
  );

  for (const [docId, docTriples] of docEntries) {
    const name = docTriples.find(t => t.predicate === "schema:name")?.object ?? docId;
    const wordCount = docTriples.find(t => t.predicate === "delta:memCount")?.object;
    lines.push(`═══ DOCUMENT: ${name} ═══`);
    if (wordCount) lines.push(`Word count: ${wordCount}`);
    lines.push("");

    // Topics
    const topics = docTriples.filter(t => t.predicate === "uor:interestedIn").map(t => t.object);
    if (topics.length) {
      lines.push(`KEY TOPICS: ${topics.join(", ")}`);
      lines.push("");
    }

    // Dates
    const dates = docTriples.filter(t => t.predicate === "uor:createdAt").map(t => t.object);
    if (dates.length) {
      lines.push(`DATES REFERENCED: ${dates.join(", ")}`);
      lines.push("");
    }

    // Numerical observations
    const observations = docTriples.filter(t => t.predicate === "uor:observes").map(t => t.object);
    if (observations.length) {
      lines.push("QUANTITATIVE FACTS:");
      for (const obs of observations) lines.push(`  • ${obs}`);
      lines.push("");
    }

    // Sections
    const sectionIds = docTriples
      .filter(t => t.predicate === "uor:memberOf")
      .map(t => t.object);

    const sectionNodes = sectionIds
      .map(id => {
        const sTriples = bySubject.get(id);
        if (!sTriples) return null;
        const heading = sTriples.find(t => t.predicate === "schema:name")?.object ?? id;
        const level = parseInt(sTriples.find(t => t.predicate === "delta:hScore")?.object ?? "2");
        const claimIds = sTriples.filter(t => t.predicate === "uor:derivedFrom").map(t => t.object);
        const claims = claimIds
          .map(cid => bySubject.get(cid)?.find(t => t.predicate === "schema:description")?.object)
          .filter(Boolean) as string[];
        return { heading, level, claims };
      })
      .filter(Boolean) as { heading: string; level: number; claims: string[] }[];

    if (sectionNodes.length) {
      lines.push("DOCUMENT STRUCTURE:");
      lines.push("");
      for (const sec of sectionNodes) {
        const prefix = sec.level <= 1 ? "══" : sec.level === 2 ? "──" : "  ·";
        lines.push(`${prefix} ${sec.heading}`);
        for (const claim of sec.claims) {
          lines.push(`    ${claim}`);
        }
        lines.push("");
      }
    }

    // Direct claims (unstructured documents)
    const directClaims = docTriples
      .filter(t => t.predicate === "uor:derivedFrom")
      .map(t => bySubject.get(t.object)?.find(ct => ct.predicate === "schema:description")?.object)
      .filter(Boolean) as string[];

    if (directClaims.length && !sectionNodes.length) {
      lines.push("KEY PASSAGES:");
      for (const claim of directClaims) {
        lines.push(`  • ${claim}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

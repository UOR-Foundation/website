/**
 * Semantic Triple Extractor — Rich Ontological Decomposition
 * ═══════════════════════════════════════════════════════════
 *
 * Converts raw document text into ontological triples (subject-predicate-object)
 * that preserve the document's full semantic structure, hierarchy, definitions,
 * relationships, and actionable meaning.
 *
 * Design principle: The compressed form must be *richer* than a summary.
 * An LLM reading the decompressed triples should understand the document
 * as deeply as if it read the original — without the original.
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
 * Extraction layers:
 *  1. Document-level metadata (title, type, word count, abstract)
 *  2. Hierarchical sections (headings → subsections)
 *  3. Definitions ("X is Y" patterns → schema:Concept triples)
 *  4. Key claims/sentences as semantic propositions (generous limits)
 *  5. List items / bullet points (often carry core actionable content)
 *  6. Actor–role relationships and conceptual links
 *  7. Named entities, topics, and terminology
 *  8. Numerical facts, percentages, and dates
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

  // Extract abstract/opening paragraph
  const abstract = extractAbstract(text);
  if (abstract) {
    triples.push({ subject: docId, predicate: "schema:abstract", object: abstract });
  }

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

      // Extract key sentences — generous limit for richness
      const sentences = extractKeySentences(section.content, 12);
      for (let j = 0; j < sentences.length; j++) {
        const claimId = `claim:${section.index}.${j}`;
        triples.push({ subject: claimId, predicate: "rdf:type", object: "schema:Claim" });
        triples.push({ subject: claimId, predicate: "schema:description", object: sentences[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: claimId });
      }

      // Extract definitions from this section
      const defs = extractDefinitions(section.content);
      for (let j = 0; j < defs.length; j++) {
        const defId = `def:${section.index}.${j}`;
        triples.push({ subject: defId, predicate: "rdf:type", object: "schema:Concept" });
        triples.push({ subject: defId, predicate: "schema:name", object: defs[j].term });
        triples.push({ subject: defId, predicate: "schema:description", object: defs[j].definition });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: defId });
      }

      // Extract list items (bullet points carry actionable content)
      const listItems = extractListItems(section.content);
      for (let j = 0; j < listItems.length; j++) {
        const itemId = `item:${section.index}.${j}`;
        triples.push({ subject: itemId, predicate: "rdf:type", object: "schema:ListItem" });
        triples.push({ subject: itemId, predicate: "schema:description", object: listItems[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: itemId });
      }

      // Extract value propositions ("Value: ...")
      const values = extractValueProps(section.content);
      for (let j = 0; j < values.length; j++) {
        const valId = `val:${section.index}.${j}`;
        triples.push({ subject: valId, predicate: "rdf:type", object: "schema:ValueProposition" });
        triples.push({ subject: valId, predicate: "schema:description", object: values[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: valId });
      }
    }
  } else {
    // Flat document — extract key sentences directly
    triples.push({ subject: docId, predicate: "schema:description", object: "Unstructured document" });
    const sentences = extractKeySentences(text, 40);
    for (let i = 0; i < sentences.length; i++) {
      const claimId = `claim:${i}`;
      triples.push({ subject: claimId, predicate: "rdf:type", object: "schema:Claim" });
      triples.push({ subject: claimId, predicate: "schema:description", object: sentences[i] });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: claimId });
    }

    const defs = extractDefinitions(text);
    for (let i = 0; i < defs.length; i++) {
      const defId = `def:${i}`;
      triples.push({ subject: defId, predicate: "rdf:type", object: "schema:Concept" });
      triples.push({ subject: defId, predicate: "schema:name", object: defs[i].term });
      triples.push({ subject: defId, predicate: "schema:description", object: defs[i].definition });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: defId });
    }
  }

  // 3. Extract named entities and topics
  const topics = extractTopics(text);
  for (const topic of topics) {
    triples.push({ subject: docId, predicate: "uor:interestedIn", object: topic });
  }

  // 4. Extract conceptual relationships between entities
  const relationships = extractConceptRelationships(text, topics);
  for (const rel of relationships) {
    triples.push({ subject: rel.from, predicate: "uor:interactedWith", object: rel.to });
    if (rel.context) {
      triples.push({ subject: rel.from, predicate: "schema:description", object: rel.context });
    }
  }

  // 5. Extract numerical facts
  const facts = extractNumericalFacts(text);
  for (const fact of facts) {
    triples.push({ subject: docId, predicate: "uor:observes", object: fact });
  }

  // 6. Extract dates
  const dates = extractDates(text);
  for (const date of dates) {
    triples.push({ subject: docId, predicate: "uor:createdAt", object: date });
  }

  // 7. Extract author/attribution
  const author = extractAuthor(text);
  if (author) {
    triples.push({ subject: docId, predicate: "schema:author", object: author });
  }

  return triples;
}

// ── Abstract extraction ─────────────────────────────────────────────────────

function extractAbstract(text: string): string | null {
  // Look for an "Abstract" section
  const abstractMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?Abstract\s*\n+([\s\S]{50,800}?)(?:\n\s*(?:#+|[A-Z]{2,})|\n{3,})/i);
  if (abstractMatch) return abstractMatch[1].replace(/\s+/g, " ").trim();

  // Fall back to first substantial paragraph
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 80);
  if (paragraphs.length > 0 && paragraphs[0].length < 600) return paragraphs[0].replace(/\s+/g, " ");

  return null;
}

// ── Author extraction ───────────────────────────────────────────────────────

function extractAuthor(text: string): string | null {
  // Look for author patterns near the top of the document
  const top = text.slice(0, 1000);
  const authorMatch = top.match(/(?:by|author|written by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (authorMatch) return authorMatch[1];

  // Look for a standalone name line near the top (Name\nDate pattern)
  const lines = top.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line) && line.length < 40) {
      return line;
    }
  }
  return null;
}

// ── Definition extraction ───────────────────────────────────────────────────

interface DefinitionEntry {
  term: string;
  definition: string;
}

function extractDefinitions(text: string): DefinitionEntry[] {
  const defs: DefinitionEntry[] = [];
  const seen = new Set<string>();

  // Pattern 1: "X is/are Y" at sentence start
  const isPatterns = text.match(/[A-Z][A-Za-z\s]{2,40}?\s+(?:is|are)\s+(?:a|an|the)?\s*[a-z].{15,250}?[.!]/g) ?? [];
  for (const match of isPatterns) {
    const parts = match.match(/^(.+?)\s+(?:is|are)\s+(.+)$/);
    if (parts && parts[1].length < 50 && !seen.has(parts[1].trim().toLowerCase())) {
      seen.add(parts[1].trim().toLowerCase());
      defs.push({ term: parts[1].trim(), definition: match.trim() });
    }
  }

  // Pattern 2: "X — definition" or "X: definition"
  const colonPatterns = text.match(/[A-Z][A-Za-z\s]{2,30}?(?:—|:)\s+[A-Z].{20,300}?[.!]/g) ?? [];
  for (const match of colonPatterns) {
    const parts = match.match(/^(.+?)(?:—|:)\s+(.+)$/);
    if (parts && parts[1].length < 40 && !seen.has(parts[1].trim().toLowerCase())) {
      seen.add(parts[1].trim().toLowerCase());
      defs.push({ term: parts[1].trim(), definition: match.trim() });
    }
  }

  // Pattern 3: "defined as", "refers to", "means"
  const defPhrases = text.match(/[A-Z][A-Za-z\s]{2,40}?\s+(?:can be defined as|is defined as|refers to|means|consists of)\s+.{15,300}?[.!]/g) ?? [];
  for (const match of defPhrases) {
    const parts = match.match(/^(.+?)\s+(?:can be defined as|is defined as|refers to|means|consists of)\s+(.+)$/);
    if (parts && !seen.has(parts[1].trim().toLowerCase())) {
      seen.add(parts[1].trim().toLowerCase());
      defs.push({ term: parts[1].trim(), definition: match.trim() });
    }
  }

  return defs.slice(0, 25);
}

// ── List item extraction ────────────────────────────────────────────────────

function extractListItems(text: string): string[] {
  const items: string[] = [];

  // Match bullet points (-, •, *, numbered)
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^(?:[-•*]|\d+[.)]\s)\s*(.{15,500})$/);
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    }
  }

  return items.slice(0, 30);
}

// ── Value proposition extraction ────────────────────────────────────────────

function extractValueProps(text: string): string[] {
  const props: string[] = [];

  // "Value:" pattern common in structured documents
  const valueMatches = text.match(/Value:\s*(.{20,400}?)(?:\n\n|\n#|$)/g) ?? [];
  for (const match of valueMatches) {
    const cleaned = match.replace(/^Value:\s*/, "").trim();
    if (cleaned.length > 20) props.push(cleaned);
  }

  return props.slice(0, 10);
}

// ── Concept relationship extraction ─────────────────────────────────────────

interface ConceptRelation {
  from: string;
  to: string;
  context?: string;
}

function extractConceptRelationships(text: string, topics: string[]): ConceptRelation[] {
  const relations: ConceptRelation[] = [];
  if (topics.length < 2) return relations;

  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if (sentence.length < 20 || sentence.length > 400) continue;
    const found: string[] = [];
    for (const topic of topics) {
      if (sentence.includes(topic)) found.push(topic);
      if (found.length >= 2) break;
    }
    if (found.length >= 2) {
      relations.push({ from: found[0], to: found[1], context: sentence.trim() });
    }
  }

  return relations.slice(0, 15);
}

// ── Section extraction ──────────────────────────────────────────────────────

function extractSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
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
    // ALL-CAPS heading
    const capsMatch = !mdMatch && trimmed.length > 5 && trimmed.length < 100 &&
      trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed);
    // Title-case line
    const titleMatch = !mdMatch && !capsMatch && trimmed.length < 80 &&
      !trimmed.endsWith(".") && !trimmed.endsWith(",") &&
      /^[A-Z][a-zA-Z\s:–—-]{4,}$/.test(trimmed) &&
      trimmed.split(/\s+/).length <= 10;

    if (mdMatch || capsMatch || titleMatch) {
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

  // Flush last section (lower threshold to capture short closing sections)
  if (currentHeading && currentContent.join("").trim().length > 10) {
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
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 600 && /[a-zA-Z]{3,}/.test(s));

  if (sentences.length <= maxCount) return sentences;

  const scored = sentences.map((s, i) => {
    let score = 0;
    score += Math.min(s.length / 80, 2.0); // length bonus (higher ceiling)
    if (/\d+/.test(s)) score += 1.0; // numerical content
    if (/[A-Z][a-z]+\s+[A-Z]/.test(s)) score += 0.6; // proper nouns
    if (i < 3) score += 0.8; // opening sentences (often thesis)
    if (i === sentences.length - 1) score += 0.5; // closing sentence
    if (/however|therefore|because|although|furthermore|moreover|instead|rather/i.test(s)) score += 0.7; // discourse
    if (/define|means|refers to|is a|consists of|can be/i.test(s)) score += 1.2; // definitions
    if (/important|critical|key|essential|necessary|must|should/i.test(s)) score += 0.9; // importance markers
    if (/can|enable|allow|facilitate|leverage|scale|grow/i.test(s)) score += 0.5; // capability claims
    if (/not|without|cannot|impossible|challenge|difficult/i.test(s)) score += 0.6; // constraints/challenges
    return { sentence: s, score, index: i };
  });

  scored.sort((a, b) => b.score - a.score);
  const topIndices = new Set(scored.slice(0, maxCount).map(s => s.index));
  return sentences.filter((_, i) => topIndices.has(i));
}

// ── Topic extraction ────────────────────────────────────────────────────────

function extractTopics(text: string): string[] {
  // Multi-word capitalized phrases
  const phraseMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) ?? [];
  const freq = new Map<string, number>();
  for (const p of phraseMatches) {
    if (p.length > 5 && p.length < 60) {
      freq.set(p, (freq.get(p) ?? 0) + 1);
    }
  }

  // Also extract single important capitalized words (acronyms, key terms)
  const acronyms = text.match(/\b[A-Z]{2,6}\b/g) ?? [];
  const skipAcronyms = new Set(["THE", "AND", "FOR", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD", "ITS", "CAN", "MAY", "HOW", "WHY", "WHO"]);
  for (const a of acronyms) {
    if (!skipAcronyms.has(a) && a.length >= 3) {
      freq.set(a, (freq.get(a) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([topic]) => topic);
}

// ── Numerical fact extraction ───────────────────────────────────────────────

function extractNumericalFacts(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const facts: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 15 || trimmed.length > 300) continue;
    if (/\d+[%,.]?\d*\s*(?:percent|million|billion|thousand|times|×|x\b|hours?|days?|years?|bytes?|KB|MB|GB|TB)/i.test(trimmed)) {
      facts.push(trimmed);
    }
  }

  return facts.slice(0, 15);
}

// ── Date extraction ─────────────────────────────────────────────────────────

function extractDates(text: string): string[] {
  const datePatterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  ];

  const dates = new Set<string>();
  for (const pattern of datePatterns) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) dates.add(m);
  }

  return Array.from(dates).slice(0, 12);
}

// ── Reconstruct semantic context from triples (for AI injection) ────────────

/**
 * Converts decompressed triples back into a structured semantic context
 * suitable for LLM system prompt injection.
 *
 * This is the "rehydration" step: triples → rich ontological narrative
 * that preserves document structure, definitions, relationships, and claims.
 * The output should read as a comprehensive briefing document.
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
    const author = docTriples.find(t => t.predicate === "schema:author")?.object;
    const abstract = docTriples.find(t => t.predicate === "schema:abstract")?.object;

    lines.push(`═══ ${name} ═══`);
    const meta: string[] = [];
    if (author) meta.push(`Author: ${author}`);
    if (wordCount) meta.push(`${wordCount} words`);
    if (meta.length) lines.push(meta.join(" | "));
    lines.push("");

    // Abstract
    if (abstract) {
      lines.push("ABSTRACT:");
      lines.push(abstract);
      lines.push("");
    }

    // Topics
    const topics = docTriples.filter(t => t.predicate === "uor:interestedIn").map(t => t.object);
    if (topics.length) {
      lines.push(`KEY TOPICS: ${topics.join(", ")}`);
      lines.push("");
    }

    // Dates
    const dates = docTriples.filter(t => t.predicate === "uor:createdAt").map(t => t.object);
    if (dates.length) {
      lines.push(`DATES: ${dates.join(", ")}`);
      lines.push("");
    }

    // Numerical observations
    const observations = docTriples.filter(t => t.predicate === "uor:observes").map(t => t.object);
    if (observations.length) {
      lines.push("QUANTITATIVE FACTS:");
      for (const obs of observations) lines.push(`  • ${obs}`);
      lines.push("");
    }

    // Concept relationships
    const relSubjects = Array.from(bySubject.entries())
      .filter(([, ts]) => ts.some(t => t.predicate === "uor:interactedWith"))
      .flatMap(([subj, ts]) => ts
        .filter(t => t.predicate === "uor:interactedWith")
        .map(t => ({ from: subj, to: t.object }))
      );
    if (relSubjects.length) {
      lines.push("CONCEPTUAL RELATIONSHIPS:");
      for (const r of relSubjects) lines.push(`  ${r.from} ↔ ${r.to}`);
      lines.push("");
    }

    // Sections with definitions, claims, list items, and value propositions
    const sectionIds = docTriples
      .filter(t => t.predicate === "uor:memberOf")
      .map(t => t.object);

    const sectionNodes = sectionIds
      .map(id => {
        const sTriples = bySubject.get(id);
        if (!sTriples) return null;
        const heading = sTriples.find(t => t.predicate === "schema:name")?.object ?? id;
        const level = parseInt(sTriples.find(t => t.predicate === "delta:hScore")?.object ?? "2");
        const childIds = sTriples.filter(t => t.predicate === "uor:derivedFrom").map(t => t.object);

        const claims: string[] = [];
        const definitions: { term: string; definition: string }[] = [];
        const listItems: string[] = [];
        const valueProps: string[] = [];

        for (const cid of childIds) {
          const cTriples = bySubject.get(cid);
          if (!cTriples) continue;
          const type = cTriples.find(t => t.predicate === "rdf:type")?.object;
          const desc = cTriples.find(t => t.predicate === "schema:description")?.object;
          const nameVal = cTriples.find(t => t.predicate === "schema:name")?.object;

          if (type === "schema:Concept" && nameVal && desc) {
            definitions.push({ term: nameVal, definition: desc });
          } else if (type === "schema:ListItem" && desc) {
            listItems.push(desc);
          } else if (type === "schema:ValueProposition" && desc) {
            valueProps.push(desc);
          } else if (type === "schema:Claim" && desc) {
            claims.push(desc);
          }
        }

        return { heading, level, claims, definitions, listItems, valueProps };
      })
      .filter(Boolean) as {
        heading: string; level: number; claims: string[];
        definitions: { term: string; definition: string }[];
        listItems: string[]; valueProps: string[];
      }[];

    if (sectionNodes.length) {
      lines.push("─── DOCUMENT STRUCTURE ───");
      lines.push("");

      for (const sec of sectionNodes) {
        const prefix = sec.level <= 1 ? "══" : sec.level === 2 ? "──" : "  ·";
        lines.push(`${prefix} ${sec.heading}`);

        if (sec.definitions.length) {
          for (const def of sec.definitions) {
            lines.push(`    [DEFINITION] ${def.term}: ${def.definition}`);
          }
        }

        if (sec.valueProps.length) {
          for (const vp of sec.valueProps) {
            lines.push(`    [VALUE] ${vp}`);
          }
        }

        if (sec.claims.length) {
          for (const claim of sec.claims) {
            lines.push(`    ${claim}`);
          }
        }

        if (sec.listItems.length) {
          for (const item of sec.listItems) {
            lines.push(`    • ${item}`);
          }
        }

        lines.push("");
      }
    }

    // Direct claims (unstructured documents)
    const directClaims = docTriples
      .filter(t => t.predicate === "uor:derivedFrom")
      .map(t => {
        const childTriples = bySubject.get(t.object);
        if (!childTriples) return null;
        const type = childTriples.find(ct => ct.predicate === "rdf:type")?.object;
        const desc = childTriples.find(ct => ct.predicate === "schema:description")?.object;
        const nameVal = childTriples.find(ct => ct.predicate === "schema:name")?.object;
        return { type, desc, name: nameVal };
      })
      .filter(Boolean) as { type: string | undefined; desc: string | undefined; name: string | undefined }[];

    const plainClaims = directClaims.filter(c => c.type === "schema:Claim" && c.desc);
    const plainDefs = directClaims.filter(c => c.type === "schema:Concept" && c.name && c.desc);

    if (plainDefs.length) {
      lines.push("KEY DEFINITIONS:");
      for (const def of plainDefs) {
        lines.push(`  [${def.name}] ${def.desc}`);
      }
      lines.push("");
    }

    if (plainClaims.length && !sectionNodes.length) {
      lines.push("KEY PASSAGES:");
      for (const claim of plainClaims) {
        lines.push(`  • ${claim.desc}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

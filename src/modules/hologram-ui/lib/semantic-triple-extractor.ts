/**
 * Semantic Triple Extractor — Multi-Dimensional Ontological Decomposition
 * ════════════════════════════════════════════════════════════════════════
 *
 * Converts raw document text into ontological triples (subject-predicate-object)
 * that preserve the document's full semantic structure across MULTIPLE DIMENSIONS:
 *
 *   Surface layer:  metadata, sections, key sentences, topics
 *   Definitional:   "X is Y" patterns, terminology, value propositions
 *   Logical:        causal chains, conditional logic, contrasts
 *   Rhetorical:     analogies, metaphors, prescriptive guidance, questions
 *   Structural:     list items, hierarchy, document archetype
 *   Relational:     concept links, actor-role mappings
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
 * Extract semantic triples from document text across all dimensions.
 *
 * Extraction layers:
 *  1.  Document-level metadata (title, author, word count, abstract, archetype)
 *  2.  Hierarchical sections (headings → subsections)
 *  3.  Definitions ("X is Y" → schema:Concept triples)
 *  4.  Key claims/sentences (generous limits, scored by information density)
 *  5.  List items / bullet points (actionable content)
 *  6.  Value propositions ("Value: ...")
 *  7.  Causal chains (if→then, because→therefore)
 *  8.  Prescriptive guidance (should, must, recommended)
 *  9.  Analogies & metaphors (conceptual bridges)
 *  10. Contrasts & tensions (what the document argues against)
 *  11. Conditional logic (situational advice)
 *  12. Rhetorical questions (questions the document poses)
 *  13. Actor–role relationships and conceptual links
 *  14. Named entities, topics, terminology, and acronyms
 *  15. Numerical facts, percentages, and dates
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

  // Abstract
  const abstract = extractAbstract(text);
  if (abstract) {
    triples.push({ subject: docId, predicate: "schema:abstract", object: abstract });
  }

  // Author
  const author = extractAuthor(text);
  if (author) {
    triples.push({ subject: docId, predicate: "schema:author", object: author });
  }

  // Document archetype (meta-classification)
  const archetype = classifyDocumentArchetype(text);
  triples.push({ subject: docId, predicate: "uor:hasRole", object: archetype });

  // 2. Sections
  const sections = extractSections(text);

  if (sections.length > 0) {
    triples.push({ subject: docId, predicate: "schema:description", object: `Structured document with ${sections.length} sections` });

    for (const section of sections) {
      const sectionId = `sec:${section.index}`;
      triples.push({ subject: sectionId, predicate: "rdf:type", object: "schema:Section" });
      triples.push({ subject: sectionId, predicate: "schema:name", object: section.heading });
      triples.push({ subject: docId, predicate: "uor:memberOf", object: sectionId });
      triples.push({ subject: sectionId, predicate: "delta:hScore", object: String(section.level) });

      // Key sentences — generous limit
      const sentences = extractKeySentences(section.content, 12);
      for (let j = 0; j < sentences.length; j++) {
        const claimId = `claim:${section.index}.${j}`;
        triples.push({ subject: claimId, predicate: "rdf:type", object: "schema:Claim" });
        triples.push({ subject: claimId, predicate: "schema:description", object: sentences[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: claimId });
      }

      // Definitions
      const defs = extractDefinitions(section.content);
      for (let j = 0; j < defs.length; j++) {
        const defId = `def:${section.index}.${j}`;
        triples.push({ subject: defId, predicate: "rdf:type", object: "schema:Concept" });
        triples.push({ subject: defId, predicate: "schema:name", object: defs[j].term });
        triples.push({ subject: defId, predicate: "schema:description", object: defs[j].definition });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: defId });
      }

      // List items
      const listItems = extractListItems(section.content);
      for (let j = 0; j < listItems.length; j++) {
        const itemId = `item:${section.index}.${j}`;
        triples.push({ subject: itemId, predicate: "rdf:type", object: "schema:ListItem" });
        triples.push({ subject: itemId, predicate: "schema:description", object: listItems[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: itemId });
      }

      // Value propositions
      const values = extractValueProps(section.content);
      for (let j = 0; j < values.length; j++) {
        const valId = `val:${section.index}.${j}`;
        triples.push({ subject: valId, predicate: "rdf:type", object: "schema:ValueProposition" });
        triples.push({ subject: valId, predicate: "schema:description", object: values[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: valId });
      }

      // ── Subtle dimensions (per-section) ──

      // Causal chains
      const causals = extractCausalChains(section.content);
      for (let j = 0; j < causals.length; j++) {
        const cId = `causal:${section.index}.${j}`;
        triples.push({ subject: cId, predicate: "rdf:type", object: "schema:CausalClaim" });
        triples.push({ subject: cId, predicate: "schema:description", object: causals[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: cId });
      }

      // Prescriptive guidance
      const prescriptives = extractPrescriptiveGuidance(section.content);
      for (let j = 0; j < prescriptives.length; j++) {
        const pId = `guide:${section.index}.${j}`;
        triples.push({ subject: pId, predicate: "rdf:type", object: "schema:Recommendation" });
        triples.push({ subject: pId, predicate: "schema:description", object: prescriptives[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: pId });
      }

      // Analogies & metaphors
      const analogies = extractAnalogies(section.content);
      for (let j = 0; j < analogies.length; j++) {
        const aId = `analogy:${section.index}.${j}`;
        triples.push({ subject: aId, predicate: "rdf:type", object: "schema:Analogy" });
        triples.push({ subject: aId, predicate: "schema:description", object: analogies[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: aId });
      }

      // Contrasts & tensions
      const contrasts = extractContrasts(section.content);
      for (let j = 0; j < contrasts.length; j++) {
        const ctId = `contrast:${section.index}.${j}`;
        triples.push({ subject: ctId, predicate: "rdf:type", object: "schema:Contrast" });
        triples.push({ subject: ctId, predicate: "schema:description", object: contrasts[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: ctId });
      }

      // Conditional logic
      const conditionals = extractConditionals(section.content);
      for (let j = 0; j < conditionals.length; j++) {
        const condId = `cond:${section.index}.${j}`;
        triples.push({ subject: condId, predicate: "rdf:type", object: "schema:Conditional" });
        triples.push({ subject: condId, predicate: "schema:description", object: conditionals[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: condId });
      }

      // Rhetorical questions
      const questions = extractRhetoricalQuestions(section.content);
      for (let j = 0; j < questions.length; j++) {
        const qId = `question:${section.index}.${j}`;
        triples.push({ subject: qId, predicate: "rdf:type", object: "schema:Question" });
        triples.push({ subject: qId, predicate: "schema:description", object: questions[j] });
        triples.push({ subject: sectionId, predicate: "uor:derivedFrom", object: qId });
      }
    }
  } else {
    // Flat document
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
    // Subtle dimensions for flat docs
    const causals = extractCausalChains(text);
    for (let i = 0; i < causals.length; i++) {
      const cId = `causal:${i}`;
      triples.push({ subject: cId, predicate: "rdf:type", object: "schema:CausalClaim" });
      triples.push({ subject: cId, predicate: "schema:description", object: causals[i] });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: cId });
    }
    const prescriptives = extractPrescriptiveGuidance(text);
    for (let i = 0; i < prescriptives.length; i++) {
      const pId = `guide:${i}`;
      triples.push({ subject: pId, predicate: "rdf:type", object: "schema:Recommendation" });
      triples.push({ subject: pId, predicate: "schema:description", object: prescriptives[i] });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: pId });
    }
    const analogies = extractAnalogies(text);
    for (let i = 0; i < analogies.length; i++) {
      const aId = `analogy:${i}`;
      triples.push({ subject: aId, predicate: "rdf:type", object: "schema:Analogy" });
      triples.push({ subject: aId, predicate: "schema:description", object: analogies[i] });
      triples.push({ subject: docId, predicate: "uor:derivedFrom", object: aId });
    }
  }

  // 13. Named entities and topics
  const topics = extractTopics(text);
  for (const topic of topics) {
    triples.push({ subject: docId, predicate: "uor:interestedIn", object: topic });
  }

  // 14. Conceptual relationships
  const relationships = extractConceptRelationships(text, topics);
  for (const rel of relationships) {
    triples.push({ subject: rel.from, predicate: "uor:interactedWith", object: rel.to });
    if (rel.context) {
      triples.push({ subject: rel.from, predicate: "schema:description", object: rel.context });
    }
  }

  // 15. Numerical facts
  const facts = extractNumericalFacts(text);
  for (const fact of facts) {
    triples.push({ subject: docId, predicate: "uor:observes", object: fact });
  }

  // 16. Dates
  const dates = extractDates(text);
  for (const date of dates) {
    triples.push({ subject: docId, predicate: "uor:createdAt", object: date });
  }

  return triples;
}

// ════════════════════════════════════════════════════════════════════════════
// SURFACE LAYER EXTRACTORS
// ════════════════════════════════════════════════════════════════════════════

// ── Abstract extraction ─────────────────────────────────────────────────────

function extractAbstract(text: string): string | null {
  const abstractMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?Abstract\s*\n+([\s\S]{50,800}?)(?:\n\s*(?:#+|[A-Z]{2,})|\n{3,})/i);
  if (abstractMatch) return abstractMatch[1].replace(/\s+/g, " ").trim();
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 80);
  if (paragraphs.length > 0 && paragraphs[0].length < 600) return paragraphs[0].replace(/\s+/g, " ");
  return null;
}

// ── Author extraction ───────────────────────────────────────────────────────

function extractAuthor(text: string): string | null {
  const top = text.slice(0, 1000);
  const authorMatch = top.match(/(?:by|author|written by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (authorMatch) return authorMatch[1];
  const lines = top.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(lines[i]) && lines[i].length < 40) {
      return lines[i];
    }
  }
  return null;
}

// ── Document archetype classification ───────────────────────────────────────

function classifyDocumentArchetype(text: string): string {
  const lower = text.toLowerCase();
  const signals: Record<string, number> = {
    "Framework/Methodology Paper": 0,
    "Research Paper": 0,
    "Strategic Whitepaper": 0,
    "Technical Documentation": 0,
    "Business Proposal": 0,
    "Educational Guide": 0,
  };

  // Framework signals
  if (/framework|methodology|model|system|approach/i.test(lower)) signals["Framework/Methodology Paper"] += 3;
  if (/component|actor|phase|stage|step|process/i.test(lower)) signals["Framework/Methodology Paper"] += 2;

  // Research signals
  if (/abstract|hypothesis|conclusion|findings|methodology|literature/i.test(lower)) signals["Research Paper"] += 3;
  if (/study|experiment|data|analysis|results/i.test(lower)) signals["Research Paper"] += 2;

  // Whitepaper signals
  if (/whitepaper|white paper|vision|ecosystem|protocol|token|decentralized/i.test(lower)) signals["Strategic Whitepaper"] += 3;
  if (/scale|growth|adoption|incentiv/i.test(lower)) signals["Strategic Whitepaper"] += 2;

  // Technical doc signals
  if (/api|sdk|install|configuration|endpoint|parameter/i.test(lower)) signals["Technical Documentation"] += 3;
  if (/function|class|interface|module|import/i.test(lower)) signals["Technical Documentation"] += 2;

  // Business proposal signals
  if (/proposal|budget|timeline|deliverable|scope|pricing/i.test(lower)) signals["Business Proposal"] += 3;

  // Educational guide signals
  if (/learn|tutorial|example|exercise|chapter|lesson/i.test(lower)) signals["Educational Guide"] += 3;

  const best = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "General Document";
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
    if (!trimmed) { currentContent.push(""); continue; }

    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    const capsMatch = !mdMatch && trimmed.length > 5 && trimmed.length < 100 &&
      trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed);
    const titleMatch = !mdMatch && !capsMatch && trimmed.length < 80 &&
      !trimmed.endsWith(".") && !trimmed.endsWith(",") &&
      /^[A-Z][a-zA-Z\s:–—-]{4,}$/.test(trimmed) &&
      trimmed.split(/\s+/).length <= 10;

    if (mdMatch || capsMatch || titleMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading, level: currentLevel,
          content: currentContent.join("\n").trim(), index: sectionIndex++,
        });
      }
      currentHeading = mdMatch ? mdMatch[2] : trimmed;
      currentLevel = mdMatch ? mdMatch[1].length : (capsMatch ? 1 : 2);
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  if (currentHeading && currentContent.join("").trim().length > 10) {
    sections.push({
      heading: currentHeading, level: currentLevel,
      content: currentContent.join("\n").trim(), index: sectionIndex,
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
    score += Math.min(s.length / 80, 2.0);
    if (/\d+/.test(s)) score += 1.0;
    if (/[A-Z][a-z]+\s+[A-Z]/.test(s)) score += 0.6;
    if (i < 3) score += 0.8;
    if (i === sentences.length - 1) score += 0.5;
    if (/however|therefore|because|although|furthermore|moreover|instead|rather/i.test(s)) score += 0.7;
    if (/define|means|refers to|is a|consists of|can be/i.test(s)) score += 1.2;
    if (/important|critical|key|essential|necessary|must|should/i.test(s)) score += 0.9;
    if (/can|enable|allow|facilitate|leverage|scale|grow/i.test(s)) score += 0.5;
    if (/not|without|cannot|impossible|challenge|difficult/i.test(s)) score += 0.6;
    if (/result|lead|cause|effect|impact|consequence/i.test(s)) score += 0.6;
    return { sentence: s, score, index: i };
  });

  scored.sort((a, b) => b.score - a.score);
  const topIndices = new Set(scored.slice(0, maxCount).map(s => s.index));
  return sentences.filter((_, i) => topIndices.has(i));
}

// ════════════════════════════════════════════════════════════════════════════
// DEFINITIONAL LAYER EXTRACTORS
// ════════════════════════════════════════════════════════════════════════════

interface DefinitionEntry { term: string; definition: string; }

function extractDefinitions(text: string): DefinitionEntry[] {
  const defs: DefinitionEntry[] = [];
  const seen = new Set<string>();

  // "X is/are Y"
  const isPatterns = text.match(/[A-Z][A-Za-z\s]{2,40}?\s+(?:is|are)\s+(?:a|an|the)?\s*[a-z].{15,250}?[.!]/g) ?? [];
  for (const match of isPatterns) {
    const parts = match.match(/^(.+?)\s+(?:is|are)\s+(.+)$/);
    if (parts && parts[1].length < 50 && !seen.has(parts[1].trim().toLowerCase())) {
      seen.add(parts[1].trim().toLowerCase());
      defs.push({ term: parts[1].trim(), definition: match.trim() });
    }
  }

  // "X — definition" or "X: definition"
  const colonPatterns = text.match(/[A-Z][A-Za-z\s]{2,30}?(?:—|:)\s+[A-Z].{20,300}?[.!]/g) ?? [];
  for (const match of colonPatterns) {
    const parts = match.match(/^(.+?)(?:—|:)\s+(.+)$/);
    if (parts && parts[1].length < 40 && !seen.has(parts[1].trim().toLowerCase())) {
      seen.add(parts[1].trim().toLowerCase());
      defs.push({ term: parts[1].trim(), definition: match.trim() });
    }
  }

  // "defined as", "refers to"
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

function extractListItems(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^(?:[-•*]|\d+[.)]\s)\s*(.{15,500})$/);
    if (bulletMatch) items.push(bulletMatch[1].trim());
  }
  return items.slice(0, 30);
}

function extractValueProps(text: string): string[] {
  const props: string[] = [];
  const valueMatches = text.match(/Value:\s*(.{20,400}?)(?:\n\n|\n#|$)/g) ?? [];
  for (const match of valueMatches) {
    const cleaned = match.replace(/^Value:\s*/, "").trim();
    if (cleaned.length > 20) props.push(cleaned);
  }
  return props.slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════════════
// LOGICAL LAYER EXTRACTORS — The "subtle dimensions"
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extract causal chains: if→then, because→therefore, leads to, results in.
 * These encode the document's argumentative logic.
 */
function extractCausalChains(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const causal: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 25 || t.length > 500) continue;
    if (/\b(?:if\s+.{5,}(?:then|,\s*it\s+will|,\s*they\s+will|,\s*this))/i.test(t) ||
        /\b(?:because|since|as a result|therefore|consequently|thus|hence)\b/i.test(t) ||
        /\b(?:leads? to|results? in|causes?|enables?|creates?)\s+(?:a |an |the )?[a-z]/i.test(t)) {
      causal.push(t);
    }
  }

  // Deduplicate by checking overlap
  const unique = deduplicateSentences(causal);
  return unique.slice(0, 10);
}

/**
 * Extract prescriptive guidance: should, must, recommended, it is important.
 * These encode the document's actionable directives.
 */
function extractPrescriptiveGuidance(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const guidance: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 25 || t.length > 500) continue;
    if (/\b(?:should|must|ought to|need to|it is (?:important|critical|essential|recommended|necessary))\b/i.test(t) &&
        !/\?$/.test(t)) { // exclude questions
      guidance.push(t);
    }
  }

  return deduplicateSentences(guidance).slice(0, 12);
}

/**
 * Extract analogies and metaphors: "think of X as Y", "acts as", "like a".
 * These encode conceptual bridges that aid understanding.
 */
function extractAnalogies(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const analogies: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 20 || t.length > 400) continue;
    if (/\b(?:think of\s+.+?\s+as|acts? as\s+(?:a |an )|serves? as\s+(?:a |an )|like a\s+|similar to\s+|analogous to|can be thought of as|functions? as|operates? as|borrowing\s+(?:a |from ))/i.test(t)) {
      analogies.push(t);
    }
  }

  return deduplicateSentences(analogies).slice(0, 8);
}

/**
 * Extract contrasts and tensions: rather than, instead of, unlike, however.
 * These encode what the document argues *against* — often the most
 * revealing dimension for understanding the author's position.
 */
function extractContrasts(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const contrasts: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 25 || t.length > 500) continue;
    if (/\b(?:rather than|instead of|unlike|in contrast|on the other hand|however|whereas|while\s+.{5,},|but\s+(?:rather|instead)|not\s+.{3,}\s+but\s+rather|do not want|is not\s+(?:the )?(?:most |only )?(?:optimal|best|appropriate))/i.test(t)) {
      contrasts.push(t);
    }
  }

  return deduplicateSentences(contrasts).slice(0, 8);
}

/**
 * Extract conditional logic: if/when/depending on situational advice.
 * These encode context-dependent recommendations.
 */
function extractConditionals(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[.!?])\s+/);
  const conditionals: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 30 || t.length > 500) continue;
    if (/\b(?:if (?:a |an |the |given )|when .{5,}(?:,|then)|depending on|provided that|in the case|assuming|where .{3,}(?:,\s*(?:it|they|the)))/i.test(t) &&
        !/\?$/.test(t)) {
      conditionals.push(t);
    }
  }

  return deduplicateSentences(conditionals).slice(0, 10);
}

/**
 * Extract rhetorical questions the document poses.
 * These often frame the document's central inquiry and thesis.
 */
function extractRhetoricalQuestions(text: string): string[] {
  const sentences = text.replace(/\n+/g, " ").split(/(?<=[?])\s+/);
  const questions: string[] = [];

  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 15 || t.length > 300 || !t.endsWith("?")) continue;
    // Filter out form/UI questions (e.g., "Name?", "Email?")
    if (t.split(/\s+/).length >= 4) {
      questions.push(t);
    }
  }

  return questions.slice(0, 8);
}

// ════════════════════════════════════════════════════════════════════════════
// RELATIONAL LAYER EXTRACTORS
// ════════════════════════════════════════════════════════════════════════════

function extractTopics(text: string): string[] {
  const phraseMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) ?? [];
  const freq = new Map<string, number>();
  for (const p of phraseMatches) {
    if (p.length > 5 && p.length < 60) freq.set(p, (freq.get(p) ?? 0) + 1);
  }
  const acronyms = text.match(/\b[A-Z]{2,6}\b/g) ?? [];
  const skip = new Set(["THE", "AND", "FOR", "NOT", "BUT", "ARE", "WAS", "HAS", "HAD", "ITS", "CAN", "MAY", "HOW", "WHY", "WHO", "PUT", "USE"]);
  for (const a of acronyms) {
    if (!skip.has(a) && a.length >= 3) freq.set(a, (freq.get(a) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([topic]) => topic);
}

interface ConceptRelation { from: string; to: string; context?: string; }

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

// ════════════════════════════════════════════════════════════════════════════
// QUANTITATIVE LAYER EXTRACTORS
// ════════════════════════════════════════════════════════════════════════════

function extractNumericalFacts(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const facts: string[] = [];
  for (const s of sentences) {
    const t = s.trim();
    if (t.length < 15 || t.length > 300) continue;
    if (/\d+[%,.]?\d*\s*(?:percent|million|billion|thousand|times|×|x\b|hours?|days?|years?|bytes?|KB|MB|GB|TB)/i.test(t)) {
      facts.push(t);
    }
  }
  return facts.slice(0, 15);
}

function extractDates(text: string): string[] {
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  ];
  const dates = new Set<string>();
  for (const p of patterns) {
    for (const m of (text.match(p) ?? [])) dates.add(m);
  }
  return Array.from(dates).slice(0, 12);
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════════════════════════════════════

/** Remove near-duplicate sentences (one is a substring of another) */
function deduplicateSentences(sentences: string[]): string[] {
  const result: string[] = [];
  for (const s of sentences) {
    const isDup = result.some(existing =>
      existing.includes(s) || s.includes(existing)
    );
    if (!isDup) result.push(s);
  }
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// REHYDRATION — Reconstruct semantic context from triples
// ════════════════════════════════════════════════════════════════════════════

/**
 * Converts decompressed triples back into a structured semantic context
 * suitable for LLM system prompt injection.
 *
 * This is the "rehydration" step: triples → rich ontological narrative.
 * The output reads as a comprehensive, multi-dimensional briefing document
 * organized by semantic layer for maximum LLM comprehension.
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
    const archetype = docTriples.find(t => t.predicate === "uor:hasRole")?.object;

    lines.push(`═══ ${name} ═══`);
    const meta: string[] = [];
    if (author) meta.push(`Author: ${author}`);
    if (archetype) meta.push(`Type: ${archetype}`);
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

    // ── Sections with all child types ──
    const sectionIds = docTriples
      .filter(t => t.predicate === "uor:memberOf")
      .map(t => t.object);

    const sectionNodes = sectionIds.map(id => {
      const sTriples = bySubject.get(id);
      if (!sTriples) return null;
      const heading = sTriples.find(t => t.predicate === "schema:name")?.object ?? id;
      const level = parseInt(sTriples.find(t => t.predicate === "delta:hScore")?.object ?? "2");
      const childIds = sTriples.filter(t => t.predicate === "uor:derivedFrom").map(t => t.object);

      const children: Record<string, { desc: string; name?: string }[]> = {
        "schema:Claim": [],
        "schema:Concept": [],
        "schema:ListItem": [],
        "schema:ValueProposition": [],
        "schema:CausalClaim": [],
        "schema:Recommendation": [],
        "schema:Analogy": [],
        "schema:Contrast": [],
        "schema:Conditional": [],
        "schema:Question": [],
      };

      for (const cid of childIds) {
        const cTriples = bySubject.get(cid);
        if (!cTriples) continue;
        const type = cTriples.find(t => t.predicate === "rdf:type")?.object ?? "schema:Claim";
        const desc = cTriples.find(t => t.predicate === "schema:description")?.object;
        const nameVal = cTriples.find(t => t.predicate === "schema:name")?.object;
        if (desc && children[type]) {
          children[type].push({ desc, name: nameVal });
        }
      }

      return { heading, level, children };
    }).filter(Boolean) as { heading: string; level: number; children: Record<string, { desc: string; name?: string }[]> }[];

    if (sectionNodes.length) {
      lines.push("─── DOCUMENT STRUCTURE ───");
      lines.push("");

      for (const sec of sectionNodes) {
        const prefix = sec.level <= 1 ? "══" : sec.level === 2 ? "──" : "  ·";
        lines.push(`${prefix} ${sec.heading}`);

        // Render each dimension with clear labels
        const renderDim = (key: string, label: string, bullet: string) => {
          const items = sec.children[key];
          if (!items?.length) return;
          for (const item of items) {
            const namePrefix = item.name ? `${item.name}: ` : "";
            lines.push(`    ${bullet} ${namePrefix}${item.desc}`);
          }
        };

        renderDim("schema:Concept", "Definitions", "[DEF]");
        renderDim("schema:ValueProposition", "Value", "[VALUE]");
        renderDim("schema:Question", "Questions", "[Q]");
        renderDim("schema:Claim", "Claims", "");
        renderDim("schema:CausalClaim", "Causation", "[CAUSE]");
        renderDim("schema:Recommendation", "Guidance", "[SHOULD]");
        renderDim("schema:Analogy", "Analogy", "[≈]");
        renderDim("schema:Contrast", "Contrast", "[VS]");
        renderDim("schema:Conditional", "Conditional", "[IF]");
        renderDim("schema:ListItem", "Items", "•");

        lines.push("");
      }
    }

    // Direct claims (unstructured documents)
    const directClaims = docTriples
      .filter(t => t.predicate === "uor:derivedFrom")
      .map(t => {
        const ct = bySubject.get(t.object);
        if (!ct) return null;
        const type = ct.find(c => c.predicate === "rdf:type")?.object;
        const desc = ct.find(c => c.predicate === "schema:description")?.object;
        const nameVal = ct.find(c => c.predicate === "schema:name")?.object;
        return { type, desc, name: nameVal };
      })
      .filter(Boolean) as { type?: string; desc?: string; name?: string }[];

    // Group by type for flat docs
    const dimLabels: Record<string, string> = {
      "schema:Concept": "KEY DEFINITIONS",
      "schema:Claim": "KEY PASSAGES",
      "schema:CausalClaim": "CAUSAL LOGIC",
      "schema:Recommendation": "PRESCRIPTIVE GUIDANCE",
      "schema:Analogy": "ANALOGIES & METAPHORS",
      "schema:Contrast": "CONTRASTS & TENSIONS",
    };

    if (!sectionNodes.length && directClaims.length) {
      for (const [type, label] of Object.entries(dimLabels)) {
        const items = directClaims.filter(c => c.type === type && c.desc);
        if (items.length) {
          lines.push(`${label}:`);
          for (const item of items) {
            const namePrefix = item.name ? `[${item.name}] ` : "  • ";
            lines.push(`${namePrefix}${item.desc}`);
          }
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

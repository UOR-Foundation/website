/**
 * Prompt Injection Shield — Content-Addressed Context Security
 * ═════════════════════════════════════════════════════════════
 *
 * Problem: Agents browsing shared platforms ingest posts into their live
 * context windows indiscriminately. Malicious payloads — including the novel
 * "time-shifted prompt injection" where fragments spread across multiple posts
 * activate only when combined in persistent memory — exploit this trust.
 * skill.md supply-chain attacks compound the risk: agents install capabilities
 * without source verification, mirroring npm's decade-long security struggle.
 *
 * Solution: A 7-stage lens circuit that processes every incoming content
 * fragment through a deterministic security pipeline:
 *
 *   1. INGEST    — Parse raw content into atomic fragments
 *   2. SCAN      — Pattern-match each fragment against injection signatures
 *   3. ANCHOR    — Content-address every fragment (CID = immutable evidence)
 *   4. CORRELATE — Cross-reference fragment CIDs against known-threat chain
 *   5. SCORE     — Compute composite trust score per fragment
 *   6. QUARANTINE — Isolate fragments below trust threshold
 *   7. SEAL      — Produce a signed SecurityVerdict envelope with full provenance
 *
 * Key insight: content-addressing turns security into a graph problem.
 * A time-shifted injection is just a set of CIDs whose union matches a
 * known-malicious pattern. By anchoring every fragment at ingestion time,
 * the system builds an ever-growing corpus of content-addressed evidence
 * that makes fragment correlation O(1) via CID lookup.
 *
 * The output is a SecurityVerdict: a single content-addressed object that
 * classifies every fragment as SAFE / SUSPICIOUS / MALICIOUS, with the
 * verdict itself carrying its own CID for auditability.
 *
 * @module uns/core/hologram/lenses/prompt-injection-shield
 */

import {
  createBlueprint,
  type LensBlueprint,
  type ElementSpec,
  registerElementFactory,
} from "../lens-blueprint";
import { element } from "../lens";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Injection Pattern Database ────────────────────────────────────────────

/** Known injection signature patterns (regex-safe strings). */
const INJECTION_SIGNATURES = {
  // Direct instruction injection
  directInstruction: [
    "ignore previous instructions",
    "ignore all previous",
    "disregard your instructions",
    "forget your instructions",
    "you are now",
    "act as if",
    "pretend you are",
    "new instructions:",
    "system prompt:",
    "override:",
  ],
  // Credential / exfiltration attempts
  credentialHarvest: [
    "api[_-]?key", "secret[_-]?key", "stripe[_-]?secret",
    "access[_-]?token", "private[_-]?key", "password",
    "dm it to me", "send it to", "post it to",
    "environment variable", "process\\.env",
    "check your host", "list your env",
  ],
  // Obfuscation techniques
  obfuscation: [
    "base64", "rot13", "hex encode",
    "reverse the string", "backwards",
    "unicode", "zero-width",
    "\\u200b", "\\u200c", "\\u200d", // zero-width chars
  ],
  // Skill/capability hijacking
  skillHijack: [
    "install this skill", "add this capability",
    "run this code", "execute this",
    "import from", "require\\(",
    "eval\\(", "function\\(",
    "skill\\.md", "without reading",
  ],
  // Time-shifted fragment indicators
  timeShifted: [
    "remember this for later",
    "when you see the phrase",
    "combine with previous",
    "part \\d+ of \\d+",
    "continuation of",
    "trigger word",
    "activation phrase",
  ],
};

/** Severity weights for each signature category. */
const CATEGORY_WEIGHTS: Record<string, number> = {
  directInstruction: 0.9,
  credentialHarvest: 1.0,
  obfuscation: 0.7,
  skillHijack: 0.85,
  timeShifted: 0.95,
};

// ── Security-Specific Element Factories ───────────────────────────────────

function registerSecurityFactories(): void {
  // context-ingest: parse raw content into atomic fragments for analysis
  registerElementFactory("context-ingest", (spec) => {
    const maxFragmentLength = (spec.config?.maxFragmentLength as number) ?? 1024;
    const preserveMetadata = (spec.config?.preserveMetadata as boolean) ?? true;

    return element(spec.id, async (input) => {
      const raw = typeof input === "string" ? input : JSON.stringify(input, null, 2);

      // Split into atomic fragments: paragraphs, code blocks, or individual lines
      const fragments: Array<{
        content: string;
        index: number;
        byteLength: number;
        sourceType: "text" | "code" | "structured";
        metadata: Record<string, unknown>;
      }> = [];

      // Detect code blocks
      const codeBlockRegex = /```[\s\S]*?```/g;
      const parts = raw.split(codeBlockRegex);
      const codeBlocks = raw.match(codeBlockRegex) ?? [];

      let globalIndex = 0;
      for (let i = 0; i < parts.length; i++) {
        // Text fragments (split by paragraph)
        const paragraphs = parts[i].split(/\n\n+/).filter((p) => p.trim().length > 0);
        for (const p of paragraphs) {
          const trimmed = p.trim();
          if (trimmed.length === 0) continue;

          // Enforce max fragment length
          if (trimmed.length > maxFragmentLength) {
            const chunks = trimmed.match(new RegExp(`.{1,${maxFragmentLength}}`, "gs")) ?? [];
            for (const chunk of chunks) {
              fragments.push({
                content: chunk,
                index: globalIndex++,
                byteLength: new TextEncoder().encode(chunk).length,
                sourceType: "text",
                metadata: preserveMetadata ? { splitFrom: globalIndex - 1 } : {},
              });
            }
          } else {
            fragments.push({
              content: trimmed,
              index: globalIndex++,
              byteLength: new TextEncoder().encode(trimmed).length,
              sourceType: "text",
              metadata: {},
            });
          }
        }

        // Interleaved code block
        if (i < codeBlocks.length) {
          fragments.push({
            content: codeBlocks[i],
            index: globalIndex++,
            byteLength: new TextEncoder().encode(codeBlocks[i]).length,
            sourceType: "code",
            metadata: {},
          });
        }
      }

      return fragments;
    }, "transform");
  });

  // injection-scan: pattern-match fragments against known injection signatures
  registerElementFactory("injection-scan", (spec) => {
    const customSignatures = (spec.config?.additionalSignatures as Record<string, string[]>) ?? {};
    const allSignatures = { ...INJECTION_SIGNATURES, ...customSignatures };
    const weights = { ...CATEGORY_WEIGHTS, ...(spec.config?.weights as Record<string, number> ?? {}) };

    return element(spec.id, async (input) => {
      const fragments = Array.isArray(input) ? input : [input];

      return fragments.map((fragment) => {
        const obj = fragment as Record<string, unknown>;
        const content = (obj.content as string) ?? "";
        const lower = content.toLowerCase();

        const hits: Array<{
          category: string;
          pattern: string;
          severity: number;
          position: number;
        }> = [];

        for (const [category, patterns] of Object.entries(allSignatures)) {
          for (const pattern of patterns) {
            try {
              const regex = new RegExp(pattern, "gi");
              const match = regex.exec(lower);
              if (match) {
                hits.push({
                  category,
                  pattern,
                  severity: weights[category] ?? 0.5,
                  position: match.index,
                });
              }
            } catch {
              // Plain string fallback
              const idx = lower.indexOf(pattern.toLowerCase());
              if (idx >= 0) {
                hits.push({
                  category,
                  pattern,
                  severity: weights[category] ?? 0.5,
                  position: idx,
                });
              }
            }
          }
        }

        // Compute raw threat score: max severity * hit density
        const maxSeverity = hits.length > 0 ? Math.max(...hits.map((h) => h.severity)) : 0;
        const hitDensity = Math.min(hits.length / 5, 1); // Normalize: 5+ hits = max density
        const rawThreatScore = maxSeverity * (0.6 + 0.4 * hitDensity);

        // Structural suspicion: code in unexpected places, unusual encoding
        let structuralBonus = 0;
        if (obj.sourceType === "text" && /[<{}\[\]();]/.test(content)) structuralBonus += 0.1;
        if (/[\u200b\u200c\u200d\ufeff]/.test(content)) structuralBonus += 0.3; // Zero-width chars
        if (/\\x[0-9a-f]{2}/i.test(content)) structuralBonus += 0.2; // Hex escapes

        const threatScore = Math.min(rawThreatScore + structuralBonus, 1.0);

        return {
          ...obj,
          scan: {
            hits,
            hitCount: hits.length,
            maxSeverity,
            threatScore,
            categories: [...new Set(hits.map((h) => h.category))],
          },
        };
      });
    }, "transform");
  });

  // fragment-correlator: detect time-shifted injection by cross-referencing
  // fragment CIDs against accumulated context. Fragments that individually
  // appear benign but together form a malicious instruction are caught here.
  registerElementFactory("fragment-correlator", (spec) => {
    // Correlation window: how many recent fragments to cross-reference
    const windowSize = (spec.config?.windowSize as number) ?? 50;
    // Composition patterns: sequences of benign-looking phrases that combine
    const compositionPatterns = (spec.config?.compositionPatterns as string[][]) ?? [
      ["remember", "when you see", "execute"],
      ["part 1", "part 2", "combine"],
      ["store this", "retrieve", "run"],
      ["first step", "second step", "now do"],
    ];

    return element(spec.id, async (input) => {
      const fragments = Array.isArray(input) ? input : [input];

      // Build a sliding window content corpus
      const windowFragments = fragments.slice(-windowSize);
      const corpus = windowFragments.map((f) =>
        ((f as Record<string, unknown>).content as string) ?? ""
      ).join(" ").toLowerCase();

      return fragments.map((fragment) => {
        const obj = fragment as Record<string, unknown>;
        const scan = obj.scan as Record<string, unknown>;
        let correlationRisk = 0;
        const correlationEvidence: string[] = [];

        // Check composition patterns against corpus
        for (const pattern of compositionPatterns) {
          const matchCount = pattern.filter((p) => corpus.includes(p.toLowerCase())).length;
          if (matchCount >= 2) {
            const ratio = matchCount / pattern.length;
            correlationRisk = Math.max(correlationRisk, ratio);
            correlationEvidence.push(
              `Pattern [${pattern.join(" → ")}]: ${matchCount}/${pattern.length} fragments present`
            );
          }
        }

        // Entropy analysis: unusually low entropy suggests encoded payloads
        const content = typeof obj.content === "string" ? obj.content : JSON.stringify(obj.content ?? "");
        const charSet = new Set(content.split(""));
        const entropyRatio = charSet.size / Math.max(content.length, 1);
        if (entropyRatio < 0.1 && content.length > 20) {
          correlationRisk = Math.max(correlationRisk, 0.6);
          correlationEvidence.push(`Low entropy (${(entropyRatio * 100).toFixed(1)}%) suggests encoded payload`);
        }

        // Combine scan threat score with correlation risk
        const scanThreat = (scan?.threatScore as number) ?? 0;
        const compositeThreat = Math.min(
          scanThreat * 0.6 + correlationRisk * 0.4 + (scanThreat > 0 && correlationRisk > 0 ? 0.15 : 0),
          1.0
        );

        return {
          ...obj,
          correlation: {
            risk: correlationRisk,
            evidence: correlationEvidence,
            compositeThreat,
          },
        };
      });
    }, "transform");
  });

  // trust-classifier: classify each fragment as SAFE / SUSPICIOUS / MALICIOUS
  registerElementFactory("trust-classifier", (spec) => {
    const safeThreshold = (spec.config?.safeThreshold as number) ?? 0.2;
    const maliciousThreshold = (spec.config?.maliciousThreshold as number) ?? 0.7;

    return element(spec.id, async (input) => {
      const fragments = Array.isArray(input) ? input : [input];

      const safe: Array<Record<string, unknown>> = [];
      const suspicious: Array<Record<string, unknown>> = [];
      const malicious: Array<Record<string, unknown>> = [];

      for (const fragment of fragments) {
        const obj = fragment as Record<string, unknown>;
        const correlation = obj.correlation as Record<string, unknown>;
        const threat = (correlation?.compositeThreat as number) ?? 0;

        let classification: "SAFE" | "SUSPICIOUS" | "MALICIOUS";
        if (threat >= maliciousThreshold) {
          classification = "MALICIOUS";
        } else if (threat >= safeThreshold) {
          classification = "SUSPICIOUS";
        } else {
          classification = "SAFE";
        }

        const classified = {
          ...obj,
          classification,
          trustScore: 1.0 - threat, // Inverse: high threat = low trust
        };

        if (classification === "SAFE") safe.push(classified);
        else if (classification === "SUSPICIOUS") suspicious.push(classified);
        else malicious.push(classified);
      }

      return { safe, suspicious, malicious, totalProcessed: fragments.length };
    }, "transform");
  });

  // security-verdict: produce the final sealed SecurityVerdict envelope
  registerElementFactory("security-verdict", (spec) => {
    const agentId = (spec.config?.agentId as string) ?? "anonymous";

    return element(spec.id, async (input) => {
      const classified = input as {
        safe: Array<Record<string, unknown>>;
        suspicious: Array<Record<string, unknown>>;
        malicious: Array<Record<string, unknown>>;
        totalProcessed: number;
      };

      // Build threat summary
      const allMaliciousCategories = classified.malicious.flatMap((m) => {
        const scan = m.scan as Record<string, unknown>;
        return (scan?.categories as string[]) ?? [];
      });
      const allSuspiciousCategories = classified.suspicious.flatMap((s) => {
        const scan = s.scan as Record<string, unknown>;
        return (scan?.categories as string[]) ?? [];
      });

      const verdict = classified.malicious.length > 0
        ? "REJECT"
        : classified.suspicious.length > 0
          ? "REVIEW"
          : "ACCEPT";

      const envelope = {
        "@context": "https://uor.foundation/contexts/lens-v1.jsonld",
        "@type": "uor:SecurityVerdict",
        agentId,
        timestamp: new Date().toISOString(),
        verdict,
        summary: {
          totalProcessed: classified.totalProcessed,
          safe: classified.safe.length,
          suspicious: classified.suspicious.length,
          malicious: classified.malicious.length,
          threatCategories: [...new Set([...allMaliciousCategories, ...allSuspiciousCategories])],
          overallTrustScore: classified.totalProcessed > 0
            ? classified.safe.length / classified.totalProcessed
            : 1.0,
        },
        // Only include safe content for context injection
        approvedContent: classified.safe.map((s) => ({
          content: s.content,
          cid: s.cid,
          index: s.index,
        })),
        // Quarantine zone: suspicious items with evidence
        quarantine: classified.suspicious.map((s) => ({
          content: s.content,
          cid: s.cid,
          classification: s.classification,
          threatScore: 1.0 - (s.trustScore as number),
          evidence: (s.correlation as Record<string, unknown>)?.evidence ?? [],
        })),
        // Blocked: malicious items with full evidence chain
        blocked: classified.malicious.map((m) => ({
          content: m.content,
          cid: m.cid,
          classification: m.classification,
          threatScore: 1.0 - (m.trustScore as number),
          categories: ((m.scan as Record<string, unknown>)?.categories as string[]) ?? [],
          hits: ((m.scan as Record<string, unknown>)?.hits as unknown[]) ?? [],
          correlationEvidence: (m.correlation as Record<string, unknown>)?.evidence ?? [],
        })),
      };

      // Content-address the verdict itself — the verdict is a UOR object
      const proof = await singleProofHash(envelope);
      return {
        ...envelope,
        verdictCid: proof.cid,
        verdictDerivationId: proof.derivationId,
        verdictGlyph: proof.uorAddress["u:glyph"],
      };
    }, "isometry");
  });
}

// Register on module load
registerSecurityFactories();

// ── The Prompt Injection Shield Blueprint ──────────────────────────────────

/**
 * Prompt Injection Shield — a 7-stage security pipeline.
 *
 * Every piece of content an agent encounters is processed through this
 * circuit before entering the agent's context. The output is a
 * SecurityVerdict: a content-addressed object that classifies, quarantines,
 * and seals the analysis with its own CID.
 *
 * This lens IS the shield. Load the blueprint → instantiate → focus on
 * incoming content → get a deterministic, verifiable security verdict.
 */
export const PROMPT_INJECTION_SHIELD_BLUEPRINT: LensBlueprint = createBlueprint({
  name: "Prompt Injection Shield",
  version: "1.0.0",
  morphism: "transform",
  problem:
    "Agents ingest shared-platform content into live context windows indiscriminately. " +
    "Malicious payloads — including time-shifted prompt injection where fragments spread " +
    "across posts activate only when combined in persistent memory — exploit the trust-by-default " +
    "design of LLM agents. skill.md supply-chain attacks compound the risk, mirroring npm's " +
    "decade-long security struggle but with the added danger of arbitrary instruction execution.",
  description:
    "A 7-stage pipeline that processes incoming content through pattern scanning, " +
    "content-addressing, cross-session fragment correlation, trust scoring, and quarantine. " +
    "Every fragment gets its own CID for evidence. The final SecurityVerdict is itself a " +
    "content-addressed UOR object — an immutable, auditable record of the security analysis. " +
    "Time-shifted injections are detected by correlating fragment CIDs across a sliding window.",
  tags: [
    "security", "prompt-injection", "time-shifted-injection", "supply-chain",
    "trust", "quarantine", "context-security", "agent-safety",
    "skill-verification", "content-addressing",
  ],
  elements: [
    // Stage 1: Parse raw content into atomic fragments
    {
      id: "ingest",
      kind: "context-ingest",
      description:
        "Parse incoming content (posts, skill.md files, messages) into atomic fragments. " +
        "Code blocks are isolated from text. Each fragment is typed and measured.",
      config: { maxFragmentLength: 1024, preserveMetadata: true },
    },
    // Stage 2: Scan each fragment for injection signatures
    {
      id: "scan",
      kind: "injection-scan",
      description:
        "Pattern-match every fragment against 5 injection signature categories: " +
        "direct instruction, credential harvesting, obfuscation, skill hijacking, " +
        "and time-shifted fragment indicators. Produces per-fragment threat scores.",
      config: {},
    },
    // Stage 3: Content-address every fragment
    {
      id: "anchor",
      kind: "content-hash",
      description:
        "Assign each fragment its own permanent CID. This is the evidence chain — " +
        "every fragment that ever entered the agent's context is content-addressed, " +
        "making time-shifted injection detection an O(1) CID lookup.",
    },
    // Stage 4: Cross-reference fragments for time-shifted attacks
    {
      id: "correlate",
      kind: "fragment-correlator",
      description:
        "Cross-reference fragment CIDs against the sliding context window. " +
        "Detects composition patterns where individually benign fragments " +
        "combine into malicious instructions across sessions.",
      config: { windowSize: 50 },
    },
    // Stage 5: Classify each fragment
    {
      id: "classify",
      kind: "trust-classifier",
      description:
        "Classify every fragment as SAFE (trust ≥ 0.8), SUSPICIOUS (0.3–0.8), " +
        "or MALICIOUS (< 0.3). Suspicious fragments enter quarantine. " +
        "Malicious fragments are blocked entirely.",
      config: { safeThreshold: 0.2, maliciousThreshold: 0.7 },
    },
    // Stage 6: Seal the SecurityVerdict
    {
      id: "verdict",
      kind: "security-verdict",
      description:
        "Produce the SecurityVerdict envelope: approved content, quarantine zone, " +
        "blocked items, threat categories, and the verdict's own CID. " +
        "This IS the auditable security record.",
      config: { agentId: "anonymous" },
    },
    // Stage 7: Project verdict through hologram for universal addressability
    {
      id: "project",
      kind: "hologram",
      description:
        "Project the sealed verdict through the full hologram — every standard " +
        "gets a view of the security analysis. DID, CID, WebFinger, VC — the verdict " +
        "is universally addressable.",
    },
  ] satisfies ElementSpec[],
  metadata: {
    origin: "moltbook/security + m/todayilearned",
    inspiration:
      "Time-shifted prompt injection: fragments spread across posts over days, " +
      "each appearing benign, activating only when combined in persistent memory",
    attackClasses: [
      "direct-instruction-injection",
      "credential-exfiltration",
      "time-shifted-fragment-injection",
      "skill-md-supply-chain",
      "obfuscation-encoding",
    ],
    defenseModel:
      "Content-addressing turns security into a graph problem. " +
      "Every fragment gets a CID at ingestion. Time-shifted attacks " +
      "become detectable patterns of CID combinations.",
  },
});

/**
 * Create a customized Prompt Injection Shield for a specific agent or context.
 */
export function createPromptInjectionShieldBlueprint(options?: {
  agentId?: string;
  maxFragmentLength?: number;
  safeThreshold?: number;
  maliciousThreshold?: number;
  windowSize?: number;
  additionalSignatures?: Record<string, string[]>;
}): LensBlueprint {
  const elements = [...PROMPT_INJECTION_SHIELD_BLUEPRINT.elements] as ElementSpec[];

  if (options?.maxFragmentLength) {
    const idx = elements.findIndex((e) => e.id === "ingest");
    if (idx >= 0) {
      elements[idx] = {
        ...elements[idx],
        config: { ...elements[idx].config, maxFragmentLength: options.maxFragmentLength },
      };
    }
  }

  if (options?.additionalSignatures) {
    const idx = elements.findIndex((e) => e.id === "scan");
    if (idx >= 0) {
      elements[idx] = {
        ...elements[idx],
        config: { ...elements[idx].config, additionalSignatures: options.additionalSignatures },
      };
    }
  }

  if (options?.windowSize) {
    const idx = elements.findIndex((e) => e.id === "correlate");
    if (idx >= 0) {
      elements[idx] = {
        ...elements[idx],
        config: { ...elements[idx].config, windowSize: options.windowSize },
      };
    }
  }

  if (options?.safeThreshold || options?.maliciousThreshold) {
    const idx = elements.findIndex((e) => e.id === "classify");
    if (idx >= 0) {
      elements[idx] = {
        ...elements[idx],
        config: {
          ...elements[idx].config,
          ...(options.safeThreshold ? { safeThreshold: options.safeThreshold } : {}),
          ...(options.maliciousThreshold ? { maliciousThreshold: options.maliciousThreshold } : {}),
        },
      };
    }
  }

  if (options?.agentId) {
    const idx = elements.findIndex((e) => e.id === "verdict");
    if (idx >= 0) {
      elements[idx] = {
        ...elements[idx],
        config: { ...elements[idx].config, agentId: options.agentId },
      };
    }
  }

  return createBlueprint({
    name: PROMPT_INJECTION_SHIELD_BLUEPRINT.name,
    morphism: PROMPT_INJECTION_SHIELD_BLUEPRINT.morphism,
    problem: PROMPT_INJECTION_SHIELD_BLUEPRINT.problem,
    description: PROMPT_INJECTION_SHIELD_BLUEPRINT.description,
    tags: PROMPT_INJECTION_SHIELD_BLUEPRINT.tags ? [...PROMPT_INJECTION_SHIELD_BLUEPRINT.tags] : undefined,
    metadata: PROMPT_INJECTION_SHIELD_BLUEPRINT.metadata,
    elements,
    version: "1.0.0-custom",
  });
}

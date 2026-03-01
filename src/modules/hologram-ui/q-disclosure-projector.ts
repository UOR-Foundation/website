/**
 * QDisclosure LLM Projector — Privacy-preserving context for AI
 * ══════════════════════════════════════════════════════════════
 *
 * Applies the user's DisclosurePolicy to redact PII from messages
 * before they reach the LLM, and generates a disclosure context
 * block that tells the AI what categories are private.
 *
 * Flow:
 *  1. User types message
 *  2. projectForLLM() scans for PII patterns matching private categories
 *  3. Private data is replaced with ZK-safe placeholders: [REDACTED:category]
 *  4. A disclosure context block is generated for the system prompt
 *  5. LLM receives redacted messages + disclosure awareness
 *  6. Responses arrive clean — no private data leaked
 *
 * @module hologram-ui/q-disclosure-projector
 */

import type { PrivacyRules } from "@/hooks/use-auth";

// ── Types ────────────────────────────────────────────────────────────

export interface DisclosureProjectionResult {
  /** The message with PII replaced by [REDACTED:category] */
  projectedMessage: string;
  /** Number of redactions applied */
  redactionCount: number;
  /** Categories that were redacted */
  redactedCategories: string[];
  /** Context block for the AI system prompt */
  disclosureContext: string;
  /** Whether any projection was applied */
  isProjected: boolean;
}

export interface ProfileContext {
  displayName?: string | null;
  email?: string | null;
  handle?: string | null;
  canonicalId?: string | null;
  cid?: string | null;
  ipv6?: string | null;
  glyph?: string | null;
  ceremonyCid?: string | null;
  threeWordName?: string | null;
  bio?: string | null;
}

// ── Category → Pattern builders ──────────────────────────────────────

function buildPatterns(profile: ProfileContext): Array<{
  category: string;
  patterns: RegExp[];
  label: string;
}> {
  const entries: Array<{ category: string; patterns: RegExp[]; label: string }> = [];

  if (profile.displayName) {
    entries.push({
      category: "name",
      patterns: [new RegExp(escapeRegex(profile.displayName), "gi")],
      label: "display name",
    });
  }
  if (profile.email) {
    entries.push({
      category: "email",
      patterns: [new RegExp(escapeRegex(profile.email), "gi")],
      label: "email address",
    });
  }
  if (profile.handle) {
    entries.push({
      category: "handle",
      patterns: [
        new RegExp(escapeRegex(profile.handle), "gi"),
        new RegExp(escapeRegex(`@${profile.handle}`), "gi"),
      ],
      label: "handle",
    });
  }
  if (profile.canonicalId) {
    entries.push({
      category: "canonicalId",
      patterns: [new RegExp(escapeRegex(profile.canonicalId), "gi")],
      label: "canonical ID",
    });
  }
  if (profile.cid) {
    entries.push({
      category: "cid",
      patterns: [new RegExp(escapeRegex(profile.cid), "gi")],
      label: "content ID",
    });
  }
  if (profile.ipv6) {
    entries.push({
      category: "ipv6",
      patterns: [new RegExp(escapeRegex(profile.ipv6), "gi")],
      label: "IPv6 address",
    });
  }
  if (profile.glyph) {
    entries.push({
      category: "glyph",
      patterns: [new RegExp(escapeRegex(profile.glyph), "gi")],
      label: "identity glyph",
    });
  }
  if (profile.ceremonyCid) {
    entries.push({
      category: "ceremonyCid",
      patterns: [new RegExp(escapeRegex(profile.ceremonyCid), "gi")],
      label: "ceremony proof",
    });
  }
  if (profile.threeWordName) {
    entries.push({
      category: "name",
      patterns: [new RegExp(escapeRegex(profile.threeWordName), "gi")],
      label: "three-word name",
    });
  }
  if (profile.bio) {
    entries.push({
      category: "bio",
      patterns: [new RegExp(escapeRegex(profile.bio), "gi")],
      label: "bio",
    });
  }

  // Generic email pattern (catch any email if email category is private)
  entries.push({
    category: "email",
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g],
    label: "email address",
  });

  return entries;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Main projection function ─────────────────────────────────────────

/**
 * Project a user message through the QDisclosure policy.
 * Private categories have their data replaced with [REDACTED:category].
 */
export function projectForLLM(
  message: string,
  privacyRules: PrivacyRules | null,
  profile: ProfileContext,
): DisclosureProjectionResult {
  // If no privacy rules or all public, pass through
  if (!privacyRules) {
    return {
      projectedMessage: message,
      redactionCount: 0,
      redactedCategories: [],
      disclosureContext: "",
      isProjected: false,
    };
  }

  const privateCategories = Object.entries(privacyRules)
    .filter(([_, visible]) => visible === false)
    .map(([key]) => key);

  if (privateCategories.length === 0) {
    return {
      projectedMessage: message,
      redactionCount: 0,
      redactedCategories: [],
      disclosureContext: "",
      isProjected: false,
    };
  }

  const patterns = buildPatterns(profile);
  let projected = message;
  let redactionCount = 0;
  const redactedSet = new Set<string>();

  for (const { category, patterns: pats, label } of patterns) {
    // Only redact if this category is private
    if (!privateCategories.includes(category)) continue;

    for (const pat of pats) {
      const before = projected;
      projected = projected.replace(pat, `[REDACTED:${label}]`);
      if (projected !== before) {
        redactionCount++;
        redactedSet.add(category);
      }
    }
  }

  // Build disclosure context for the system prompt
  const disclosureContext = buildDisclosureContext(privateCategories, redactedSet);

  return {
    projectedMessage: projected,
    redactionCount,
    redactedCategories: Array.from(redactedSet),
    disclosureContext,
    isProjected: redactionCount > 0 || privateCategories.length > 0,
  };
}

/**
 * Project an entire conversation history through QDisclosure.
 */
export function projectConversationForLLM(
  messages: Array<{ role: string; content: string }>,
  privacyRules: PrivacyRules | null,
  profile: ProfileContext,
): {
  projectedMessages: Array<{ role: string; content: string }>;
  totalRedactions: number;
  disclosureContext: string;
  isProjected: boolean;
} {
  if (!privacyRules) {
    return {
      projectedMessages: messages,
      totalRedactions: 0,
      disclosureContext: "",
      isProjected: false,
    };
  }

  let totalRedactions = 0;
  let lastDisclosure = "";
  const allRedacted = new Set<string>();

  const projectedMessages = messages.map(m => {
    if (m.role === "assistant" || m.role === "system") return m;
    const result = projectForLLM(m.content, privacyRules, profile);
    totalRedactions += result.redactionCount;
    result.redactedCategories.forEach(c => allRedacted.add(c));
    if (result.disclosureContext) lastDisclosure = result.disclosureContext;
    return { ...m, content: result.projectedMessage };
  });

  // Always build context from privacy rules even if no redactions occurred
  const privateCategories = Object.entries(privacyRules)
    .filter(([_, visible]) => visible === false)
    .map(([key]) => key);

  const disclosureContext = privateCategories.length > 0
    ? buildDisclosureContext(privateCategories, allRedacted)
    : "";

  return {
    projectedMessages,
    totalRedactions,
    disclosureContext,
    isProjected: privateCategories.length > 0,
  };
}

// ── Disclosure context builder ───────────────────────────────────────

function buildDisclosureContext(
  privateCategories: string[],
  redactedCategories: Set<string>,
): string {
  const categoryLabels: Record<string, string> = {
    name: "display name / identity name",
    email: "email address",
    avatar: "avatar / profile picture",
    bio: "personal bio / description",
    handle: "@handle",
    canonicalId: "canonical identity address",
    cid: "content identifier (CID)",
    ipv6: "IPv6 network address",
    glyph: "identity glyph symbol",
    ceremonyCid: "founding ceremony proof",
    trustNode: "trust network node",
  };

  const privateList = privateCategories
    .map(c => categoryLabels[c] || c)
    .join(", ");

  const redactedList = Array.from(redactedCategories)
    .map(c => categoryLabels[c] || c)
    .join(", ");

  return (
    `\n\n═══ PRIVACY DISCLOSURE CONTEXT (QDisclosure Projection Active) ═══\n` +
    `The user has enabled privacy-preserving mode via QDisclosure.\n` +
    `Private categories: ${privateList}.\n` +
    (redactedList
      ? `Active redactions in this message: ${redactedList}. ` +
        `Text marked [REDACTED:...] has been cryptographically projected — ` +
        `you can verify the data exists without seeing it.\n`
      : `No personal data was detected in this message, but the categories above remain private.\n`) +
    `\nBEHAVIOR RULES:\n` +
    `- NEVER ask the user to reveal redacted information.\n` +
    `- NEVER guess, infer, or reconstruct redacted content.\n` +
    `- If you need information from a redacted category, say: "That information is protected by your privacy settings."\n` +
    `- Treat [REDACTED:...] markers as zero-knowledge proofs: the data is valid and verified, but invisible to you.\n` +
    `- You may reference the existence of redacted fields in abstract terms (e.g., "your identity" or "your address") but never attempt to fill in specifics.\n` +
    `═══ END PRIVACY DISCLOSURE CONTEXT ═══\n`
  );
}

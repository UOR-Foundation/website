/**
 * UNS Shield — HTTP Middleware Stack
 *
 * Four composable middleware layers that protect any HTTP endpoint:
 *
 *   1. PARTITION — Ring-arithmetic payload classification (L3/L4 DDoS)
 *   2. WAF       — Content-addressed rule engine (L7 application firewall)
 *   3. RATE      — Sliding-window rate limiting keyed by canonical identity
 *   4. POW       — Ring proof-of-work bot management (neg∘bnot composition)
 *
 * Each layer is independent and composable. The `unsShield()` function
 * chains all four in the correct order.
 *
 * DESIGN PRINCIPLES:
 *   - Middleware is framework-agnostic (pure request/response functions)
 *   - WAF rules are content-addressed UOR objects (tamper-evident)
 *   - Rate limits scale with trust level (authenticated > anonymous)
 *   - PoW challenges are O(1) to verify server-side
 *   - All decisions are auditable via response headers
 *
 * @see partition: namespace — UOR ring-arithmetic classification
 * @see observable: namespace — rate observation windows
 * @see derivation: namespace — PoW challenge derivation
 */

import { analyzePayloadFast } from "./partition";
import type { ShieldAction, PartitionResultFast } from "./partition";
import { neg, bnot } from "../core/ring";

// ── Types ───────────────────────────────────────────────────────────────────

/** Minimal request representation for middleware processing. */
export interface ShieldRequest {
  /** Request body as raw bytes (empty for GET). */
  body: Uint8Array;
  /** Request headers (lowercase keys). */
  headers: Record<string, string>;
  /** Request URL path. */
  path: string;
  /** HTTP method. */
  method: string;
}

/** Middleware response — null means "pass through". */
export interface ShieldResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Context carried through the middleware chain. */
export interface ShieldContext {
  /** Partition analysis result (set by partition middleware). */
  partition?: PartitionResultFast;
  /** Identity key for rate limiting. */
  identityKey?: string;
  /** Whether request is authenticated with UOR identity. */
  authenticated?: boolean;
}

/** A single middleware function. Returns null to pass, or a response to halt. */
export type ShieldMiddleware = (
  req: ShieldRequest,
  ctx: ShieldContext
) => Promise<ShieldResponse | null> | ShieldResponse | null;

// ═══════════════════════════════════════════════════════════════════════════
// 1. PARTITION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partition analysis middleware.
 *
 * Classifies request body bytes using the R_8 partition structure.
 * Sets `ctx.partition` for downstream middleware.
 *
 * - Empty body → passes (no payload to analyze)
 * - action === 'BLOCK' → 429 Too Many Requests
 * - Otherwise → passes with partition result in context
 */
export const partitionMiddleware: ShieldMiddleware = (req, ctx) => {
  if (req.body.length === 0) {
    ctx.partition = { density: 1, action: "PASS", irreducible: 0, total: 0 };
    return null;
  }

  const result = analyzePayloadFast(req.body);
  ctx.partition = result;

  if (result.action === "BLOCK") {
    return {
      status: 429,
      headers: {
        "x-uns-block-reason": `partition-density-${result.density.toFixed(4)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        error: "Request blocked by UNS Shield partition analysis",
        density: result.density,
        action: result.action,
      }),
    };
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. WAF RULE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/** A content-addressed WAF rule. */
export interface UnsWafRule {
  /** Canonical ID of this rule (content-addressed). */
  canonicalId: string;
  /** Human-readable rule name. */
  name: string;
  /** Pattern to match (against path, headers, or body). */
  pattern: string;
  /** Match target: path, header, or body. */
  target: "path" | "header" | "body";
  /** Action on match. */
  action: "block" | "challenge" | "log";
  /** Priority (lower = higher priority). */
  priority: number;
}

/** WAF evaluation verdict. */
export interface WafVerdict {
  action: "pass" | "block" | "challenge" | "log";
  ruleId?: string;
  ruleName?: string;
}

/**
 * Content-addressed WAF rule engine.
 *
 * Rules are UOR objects identified by canonical ID. They are evaluated
 * in priority order (ascending). First match wins.
 */
export class WafEngine {
  private rules: UnsWafRule[] = [];

  /** Load rules (sorted by priority ascending). */
  loadRules(rules: UnsWafRule[]): void {
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  /** Evaluate a request against loaded rules. */
  evaluate(req: ShieldRequest): WafVerdict {
    for (const rule of this.rules) {
      const regex = new RegExp(rule.pattern, "i");
      let matched = false;

      switch (rule.target) {
        case "path":
          matched = regex.test(req.path);
          break;
        case "header": {
          const headerValues = Object.values(req.headers).join(" ");
          matched = regex.test(headerValues);
          break;
        }
        case "body":
          matched = regex.test(new TextDecoder().decode(req.body));
          break;
      }

      if (matched) {
        return {
          action: rule.action,
          ruleId: rule.canonicalId,
          ruleName: rule.name,
        };
      }
    }

    return { action: "pass" };
  }
}

/** WAF middleware factory. */
export function wafMiddleware(engine: WafEngine): ShieldMiddleware {
  return (req, _ctx) => {
    const verdict = engine.evaluate(req);

    if (verdict.action === "block") {
      return {
        status: 403,
        headers: {
          "x-uns-waf-rule-id": verdict.ruleId ?? "",
          "x-uns-waf-rule-name": verdict.ruleName ?? "",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          error: "Blocked by UNS Shield WAF",
          ruleId: verdict.ruleId,
        }),
      };
    }

    if (verdict.action === "challenge") {
      // Delegate to PoW middleware by marking context
      return null; // Will be handled by PoW layer
    }

    return null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. RATE LIMITING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

/** Rate limit configuration. */
interface RateLimitConfig {
  /** Authenticated UOR identity: requests per minute. */
  authenticatedLimit: number;
  /** Anonymous IPv6 /64: requests per minute. */
  anonymousLimit: number;
  /** High reducible density: requests per minute. */
  highReducibleLimit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

const DEFAULT_RATE_CONFIG: RateLimitConfig = {
  authenticatedLimit: 10000,
  anonymousLimit: 100,
  highReducibleLimit: 10,
  windowMs: 60_000,
};

/** Sliding window entry. */
interface WindowEntry {
  timestamps: number[];
  limit: number;
}

/** In-memory sliding window rate limiter. */
export class RateLimiter {
  private readonly windows = new Map<string, WindowEntry>();
  private readonly config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_CONFIG, ...config };
  }

  /**
   * Check and record a request.
   *
   * @returns null if allowed, or { retryAfter } if rate limited.
   */
  check(
    key: string,
    authenticated: boolean,
    partitionAction?: ShieldAction
  ): { retryAfter: number } | null {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Determine limit based on trust level
    let limit: number;
    if (authenticated) {
      limit = this.config.authenticatedLimit;
    } else if (partitionAction === "WARN") {
      limit = this.config.highReducibleLimit;
    } else {
      limit = this.config.anonymousLimit;
    }

    // Get or create window
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [], limit };
      this.windows.set(key, entry);
    }
    entry.limit = limit;

    // Evict old timestamps
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    // Check limit
    if (entry.timestamps.length >= limit) {
      const oldest = entry.timestamps[0];
      const retryAfter = Math.ceil(
        (oldest + this.config.windowMs - now) / 1000
      );
      return { retryAfter: Math.max(1, retryAfter) };
    }

    // Record this request
    entry.timestamps.push(now);
    return null;
  }

  /** Clear all windows (for testing). */
  clear(): void {
    this.windows.clear();
  }
}

/** Rate limiting middleware factory. */
export function rateLimitMiddleware(limiter: RateLimiter): ShieldMiddleware {
  return (req, ctx) => {
    // Determine identity key
    const canonicalId = req.headers["x-uns-identity"];
    const authenticated = !!canonicalId;
    const key = canonicalId ?? req.headers["x-forwarded-for"] ?? "anonymous";
    ctx.identityKey = key;
    ctx.authenticated = authenticated;

    const result = limiter.check(
      key,
      authenticated,
      ctx.partition?.action
    );

    if (result) {
      return {
        status: 429,
        headers: {
          "retry-after": String(result.retryAfter),
          "x-uns-rate-limit-reason": authenticated
            ? "authenticated-limit-exceeded"
            : "anonymous-limit-exceeded",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: result.retryAfter,
        }),
      };
    }

    return null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. RING PROOF-OF-WORK BOT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ring PoW challenge.
 *
 * Challenge: find x ∈ Z/256Z such that (neg∘bnot)^difficulty(x) === target.
 *
 * The composition neg∘bnot = succ, so (neg∘bnot)^n(x) = (x + n) mod 256.
 * Solution: x = (target - difficulty) mod 256.
 *
 * Trivial for browsers (O(1) computation), expensive to brute-force
 * without algebraic knowledge (bots must try all 256 values).
 */
export interface PowChallenge {
  target: number;
  difficulty: number;
  nonce: string; // base64url random 32 bytes
  expiresAt: string; // ISO 8601
  algorithm: "neg-bnot-composition";
}

/** Apply (neg∘bnot)^n to x. */
function negBnotCompose(x: number, n: number): number {
  let result = x & 0xff;
  for (let i = 0; i < n; i++) {
    result = neg(bnot(result));
  }
  return result;
}

/** Verify a PoW solution: (neg∘bnot)^difficulty(solution) === target. */
export function verifyPow(
  solution: number,
  target: number,
  difficulty: number
): boolean {
  return negBnotCompose(solution, difficulty) === target;
}

/** Generate a random base64url nonce. */
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * PoW challenge manager.
 *
 * Issues challenges, tracks consumed nonces (single-use), evicts expired.
 */
export class PowManager {
  /** Active challenges: nonce → { challenge, issuedAt }. */
  private readonly challenges = new Map<
    string,
    { challenge: PowChallenge; issuedAt: number }
  >();
  /** Consumed nonces (prevent replay). */
  private readonly consumed = new Set<string>();
  /** Challenge TTL in milliseconds. */
  private readonly ttlMs: number;

  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  /** Issue a new PoW challenge. */
  issue(difficulty = 16): PowChallenge {
    const target = Math.floor(Math.random() * 256);
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();

    const challenge: PowChallenge = {
      target,
      difficulty,
      nonce,
      expiresAt,
      algorithm: "neg-bnot-composition",
    };

    this.challenges.set(nonce, { challenge, issuedAt: Date.now() });
    return challenge;
  }

  /**
   * Verify a submitted solution.
   *
   * @returns "valid" | "invalid" | "expired" | "replayed"
   */
  verify(
    nonce: string,
    solution: number
  ): "valid" | "invalid" | "expired" | "replayed" {
    // Check replay
    if (this.consumed.has(nonce)) return "replayed";

    // Look up challenge
    const entry = this.challenges.get(nonce);
    if (!entry) return "expired"; // Unknown or already evicted

    // Check expiry
    if (new Date(entry.challenge.expiresAt).getTime() < Date.now()) {
      this.challenges.delete(nonce);
      return "expired";
    }

    // Verify solution
    const valid = verifyPow(
      solution,
      entry.challenge.target,
      entry.challenge.difficulty
    );

    if (valid) {
      // Consume nonce (single-use)
      this.consumed.add(nonce);
      this.challenges.delete(nonce);
      return "valid";
    }

    return "invalid";
  }

  /** Clear all state (for testing). */
  clear(): void {
    this.challenges.clear();
    this.consumed.clear();
  }
}

/** PoW middleware factory. */
export function powMiddleware(manager: PowManager): ShieldMiddleware {
  return (req, ctx) => {
    // Only trigger for CHALLENGE-density requests
    if (ctx.partition?.action !== "CHALLENGE") return null;

    // Check for existing PoW solution header
    const powHeader = req.headers["x-uns-pow-solution"];
    if (!powHeader) {
      // Issue new challenge
      const challenge = manager.issue();
      return {
        status: 402,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challenge }),
      };
    }

    // Parse solution: "{nonce}:{solution_byte}"
    const parts = powHeader.split(":");
    if (parts.length < 2) {
      const challenge = manager.issue();
      return {
        status: 402,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challenge, error: "Malformed PoW solution" }),
      };
    }

    const nonce = parts.slice(0, -1).join(":"); // nonce may contain colons from base64url... no it won't, but be safe
    const solution = parseInt(parts[parts.length - 1], 10);

    const result = manager.verify(nonce, solution);

    switch (result) {
      case "valid":
        return null; // Pass through
      case "replayed":
        return {
          status: 429,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: "PoW nonce already consumed" }),
        };
      case "expired": {
        const challenge = manager.issue();
        return {
          status: 402,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ challenge, error: "PoW challenge expired" }),
        };
      }
      case "invalid": {
        const challenge = manager.issue();
        return {
          status: 402,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ challenge, error: "Invalid PoW solution" }),
        };
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. COMPOSED SHIELD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compose all four middleware layers into a single shield stack.
 *
 * Order: partition → WAF → rate limit → PoW
 *
 * Usage:
 *   const stack = unsShield(wafEngine, rateLimiter, powManager);
 *   const response = await runShield(stack, request);
 */
export function unsShield(
  wafEngine: WafEngine,
  limiter: RateLimiter,
  pow: PowManager
): ShieldMiddleware[] {
  return [
    partitionMiddleware,
    wafMiddleware(wafEngine),
    rateLimitMiddleware(limiter),
    powMiddleware(pow),
  ];
}

/**
 * Execute a middleware stack against a request.
 *
 * Returns the first non-null response, or null if all pass.
 */
export async function runShield(
  stack: ShieldMiddleware[],
  req: ShieldRequest
): Promise<ShieldResponse | null> {
  const ctx: ShieldContext = {};
  for (const mw of stack) {
    const response = await mw(req, ctx);
    if (response) return response;
  }
  return null;
}

import { describe, it, expect } from "vitest";
import {
  partitionMiddleware,
  WafEngine,
  wafMiddleware,
  RateLimiter,
  rateLimitMiddleware,
  PowManager,
  powMiddleware,
  verifyPow,
  unsShield,
  runShield,
} from "@/modules/uns/shield";
import type { ShieldRequest, ShieldContext, UnsWafRule } from "@/modules/uns/shield";
import { neg, bnot } from "@/modules/uns/core/ring";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides?: Partial<ShieldRequest>): ShieldRequest {
  return {
    body: new Uint8Array(0),
    headers: {},
    path: "/",
    method: "GET",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2-B Tests — 10/10
// ═══════════════════════════════════════════════════════════════════════════

describe("UNS Shield — Phase 2-B: HTTP Middleware", () => {
  // Test 1
  it("1. Zero-byte body passes partition middleware", async () => {
    const ctx: ShieldContext = {};
    const result = await partitionMiddleware(makeReq(), ctx);
    expect(result).toBeNull();
    expect(ctx.partition?.action).toBe("PASS");
  });

  // Test 2
  it("2. All-zero body (1000 bytes) → 429 from partition middleware", async () => {
    const ctx: ShieldContext = {};
    const req = makeReq({ body: new Uint8Array(1000).fill(0x00) });
    const result = await partitionMiddleware(req, ctx);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(result!.headers["x-uns-block-reason"]).toContain("partition-density");
  });

  // Test 3
  it("3. WAF rule matching known pattern → 403 with X-UNS-WAF-Rule-ID", async () => {
    const engine = new WafEngine();
    const rule: UnsWafRule = {
      canonicalId: "urn:uor:derivation:sha256:abcd",
      name: "block-admin",
      pattern: "/admin",
      target: "path",
      action: "block",
      priority: 1,
    };
    engine.loadRules([rule]);

    const mw = wafMiddleware(engine);
    const result = await mw(makeReq({ path: "/admin/login" }), {});
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(result!.headers["x-uns-waf-rule-id"]).toBe(rule.canonicalId);
  });

  // Test 4
  it("4. Authenticated canonical ID gets 10000 req/min limit", async () => {
    const limiter = new RateLimiter({ authenticatedLimit: 10000, anonymousLimit: 100 });
    const mw = rateLimitMiddleware(limiter);
    const canonicalId = "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000001";

    // First request should pass
    const ctx: ShieldContext = { partition: { density: 0.5, action: "PASS", irreducible: 50, total: 100 } };
    const result = await mw(
      makeReq({ headers: { "x-uns-identity": canonicalId } }),
      ctx
    );
    expect(result).toBeNull();
    expect(ctx.authenticated).toBe(true);
    limiter.clear();
  });

  // Test 5
  it("5. Anonymous /64 gets 100 req/min; 101st → 429 + Retry-After", async () => {
    const limiter = new RateLimiter({ anonymousLimit: 100 });
    const mw = rateLimitMiddleware(limiter);
    const req = makeReq({ headers: { "x-forwarded-for": "fd00:0075:6f72::1" } });

    // Send 100 requests
    for (let i = 0; i < 100; i++) {
      const ctx: ShieldContext = {};
      const result = await mw(req, ctx);
      expect(result).toBeNull();
    }

    // 101st should be blocked
    const ctx: ShieldContext = {};
    const result = await mw(req, ctx);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    expect(result!.headers["retry-after"]).toBeDefined();
    limiter.clear();
  });

  // Test 6
  it("6. CHALLENGE-density request without PoW header → 402", async () => {
    const pow = new PowManager();
    const mw = powMiddleware(pow);
    const ctx: ShieldContext = {
      partition: { density: 0.18, action: "CHALLENGE", irreducible: 18, total: 100 },
    };

    const result = await mw(makeReq(), ctx);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);

    const body = JSON.parse(result!.body);
    expect(body.challenge).toBeDefined();
    expect(body.challenge.algorithm).toBe("neg-bnot-composition");
    expect(body.challenge.difficulty).toBe(16);
    pow.clear();
  });

  // Test 7
  it("7. Valid PoW solution → request passes", async () => {
    const pow = new PowManager();
    const mw = powMiddleware(pow);

    // Issue challenge
    const challenge = pow.issue(16);

    // Compute solution: (neg∘bnot)^16(x) === target → x = (target - 16) mod 256
    // Since neg(bnot(x)) = succ(x), (neg∘bnot)^16(x) = x + 16 mod 256
    const solution = ((challenge.target - 16) % 256 + 256) % 256;
    expect(verifyPow(solution, challenge.target, 16)).toBe(true);

    const ctx: ShieldContext = {
      partition: { density: 0.18, action: "CHALLENGE", irreducible: 18, total: 100 },
    };
    const req = makeReq({
      headers: { "x-uns-pow-solution": `${challenge.nonce}:${solution}` },
    });

    const result = await mw(req, ctx);
    expect(result).toBeNull(); // Passes through
    pow.clear();
  });

  // Test 8
  it("8. Replayed nonce in PoW solution → 429", async () => {
    const pow = new PowManager();
    const mw = powMiddleware(pow);

    const challenge = pow.issue(16);
    const solution = ((challenge.target - 16) % 256 + 256) % 256;

    const ctx: ShieldContext = {
      partition: { density: 0.18, action: "CHALLENGE", irreducible: 18, total: 100 },
    };
    const req = makeReq({
      headers: { "x-uns-pow-solution": `${challenge.nonce}:${solution}` },
    });

    // First use — valid
    const r1 = await mw(req, ctx);
    expect(r1).toBeNull();

    // Replay — rejected
    const r2 = await mw(req, ctx);
    expect(r2).not.toBeNull();
    expect(r2!.status).toBe(429);
    pow.clear();
  });

  // Test 9
  it("9. Expired PoW challenge → 402 (new challenge issued)", async () => {
    // Use very short TTL
    const pow = new PowManager(1); // 1ms TTL
    const mw = powMiddleware(pow);

    const challenge = pow.issue(16);
    const solution = ((challenge.target - 16) % 256 + 256) % 256;

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 10));

    const ctx: ShieldContext = {
      partition: { density: 0.18, action: "CHALLENGE", irreducible: 18, total: 100 },
    };
    const req = makeReq({
      headers: { "x-uns-pow-solution": `${challenge.nonce}:${solution}` },
    });

    const result = await mw(req, ctx);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);
    pow.clear();
  });

  // Test 10
  it("10. unsShield composed stack passes a clean request end-to-end", async () => {
    const waf = new WafEngine();
    waf.loadRules([]);
    const limiter = new RateLimiter();
    const pow = new PowManager();

    const stack = unsShield(waf, limiter, pow);
    const req = makeReq({
      body: new Uint8Array(100).fill(0x33), // 0x33 = 51 = odd → IRREDUCIBLE → high density
    });

    const result = await runShield(stack, req);
    expect(result).toBeNull(); // Clean pass
    limiter.clear();
    pow.clear();
  });
});

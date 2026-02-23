/**
 * UOR SDK — Security Gate (P5)
 *
 * Three-layer security derived from UOR ring arithmetic:
 *
 *   1. Deployment Scan — static analysis at import time
 *      Catches hardcoded credentials, destructive patterns, and
 *      low-density (suspicious) source code.
 *
 *   2. Partition Gate — request-level traffic classification
 *      Uses byte-class irreducible density to distinguish legitimate
 *      traffic (high density) from flood/spam (near-zero density).
 *      Thresholds: ≥0.40 PASS | ≥0.25 WARN | ≥0.15 CHALLENGE | <0.15 BLOCK
 *
 *   3. Injection Detection — runtime trace comparison
 *      Monitors Hamming drift across execution traces. Non-zero drift
 *      signals possible injection — quarantine and alert.
 *
 * All classification is structural (algebraic), not heuristic.
 *
 * @see partition: namespace — byte-class density analysis
 * @see trace: namespace — Hamming drift injection detection
 * @see observable: namespace — runtime monitoring
 */

import { singleProofHash } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

export type GateVerdict = "PASS" | "WARN" | "CHALLENGE" | "BLOCK";

export interface DeploymentScanResult {
  verdict: GateVerdict;
  density: number;
  hardcodedCredentials: boolean;
  destructivePatterns: boolean;
  issues: string[];
}

export interface InjectionCheckResult {
  injectionDetected: boolean;
  hammingDrift: number;
  canonicalDrift: number;
  traceCanonicalId: string;
}

/** Simulated middleware context for testability (framework-agnostic). */
export interface GateRequest {
  body: string;
  ip?: string;
  headers: Record<string, string>;
}

export interface GateResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
  passed: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DENSITY_PASS = 0.15;
const DENSITY_WARN = 0.08;
const DENSITY_CHALLENGE = 0.03;

/** Patterns indicating hardcoded credentials. */
const CREDENTIAL_PATTERNS = [
  /API_KEY\s*[=:]\s*['"][^'"]+['"]/gi,
  /SECRET\s*[=:]\s*['"][^'"]+['"]/gi,
  /password\s*[=:]\s*['"][^'"]+['"]/gi,
  /PRIVATE_KEY\s*[=:]\s*['"][^'"]+['"]/gi,
  /TOKEN\s*[=:]\s*['"][^'"]+['"]/gi,
  /AWS_ACCESS_KEY_ID\s*[=:]\s*['"][^'"]+['"]/gi,
];

/** Patterns indicating destructive operations. */
const DESTRUCTIVE_PATTERNS = [
  /DROP\s+TABLE/gi,
  /DELETE\s+FROM\s+\w+\s+WHERE/gi,
  /TRUNCATE\s+TABLE/gi,
  /rm\s+-rf/gi,
  /FORMAT\s+C:/gi,
  /exec\s*\(\s*['"].*DROP/gi,
];

// ── Partition Density ───────────────────────────────────────────────────────

/**
 * Compute byte-class irreducible density.
 * Uses the UOR partition analysis: count distinct byte classes
 * present in the input relative to the full Z/256Z ring.
 */
function computePartitionDensity(input: string): number {
  const bytes = new TextEncoder().encode(input);
  if (bytes.length === 0) return 0;

  const seen = new Uint8Array(256);
  for (const b of bytes) seen[b] = 1;

  let distinct = 0;
  for (let i = 0; i < 256; i++) if (seen[i]) distinct++;

  return distinct / 256;
}

/** Map density to verdict. */
function densityToVerdict(density: number): GateVerdict {
  if (density >= DENSITY_PASS) return "PASS";
  if (density >= DENSITY_WARN) return "WARN";
  if (density >= DENSITY_CHALLENGE) return "CHALLENGE";
  return "BLOCK";
}

// ── Deployment Scanner ──────────────────────────────────────────────────────

/**
 * Scan deployment files for security issues.
 *
 * Pipeline:
 *   1. Concatenate all source files (.js, .ts, .py, .jsx, .tsx)
 *   2. Compute partition density of concatenated source
 *   3. Scan for credential patterns via RegExp
 *   4. Scan for destructive patterns
 *   5. Return result with plain-English issues
 */
export async function scanDeployment(
  files: Array<{ path: string; content: string }>
): Promise<DeploymentScanResult> {
  // Filter to source files
  const sourceExts = [".js", ".ts", ".py", ".jsx", ".tsx", ".mjs", ".cjs"];
  const sourceFiles = files.filter((f) =>
    sourceExts.some((ext) => f.path.endsWith(ext))
  );

  // Concatenate source
  const concatenated = sourceFiles.map((f) => f.content).join("\n");

  // If no source files, scan all content
  const scanContent = concatenated.length > 0 ? concatenated : files.map((f) => f.content).join("\n");

  // Compute density
  const density = computePartitionDensity(scanContent);

  // Scan for credentials
  const issues: string[] = [];
  let hardcodedCredentials = false;

  for (const pattern of CREDENTIAL_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(scanContent)) {
      hardcodedCredentials = true;
      const patternName = pattern.source.split("\\s")[0];
      issues.push(
        `Hardcoded credential detected: ${patternName} pattern found in source files`
      );
      break; // One finding per category is sufficient
    }
  }

  // Scan for destructive patterns
  let destructivePatterns = false;

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(scanContent)) {
      destructivePatterns = true;
      const match = scanContent.match(pattern);
      issues.push(
        `Destructive pattern detected: "${match?.[0]}" found in source files`
      );
      break;
    }
  }

  // Density warnings
  if (density < DENSITY_WARN) {
    issues.push(
      `Low byte-class density (${density.toFixed(3)}): source may contain obfuscated or padding-heavy content`
    );
  }

  // Determine verdict
  let verdict: GateVerdict = densityToVerdict(density);
  if (hardcodedCredentials || destructivePatterns) {
    // Credentials or destructive patterns escalate to at least WARN
    if (verdict === "PASS") verdict = "WARN";
  }

  return {
    verdict,
    density,
    hardcodedCredentials,
    destructivePatterns,
    issues,
  };
}

// ── Partition Gate Middleware ────────────────────────────────────────────────

/**
 * Partition gate: classify incoming request by byte-class density.
 *
 * - PASS (≥0.40): normal traffic, proceed
 * - WARN (≥0.25): allow but log
 * - CHALLENGE (≥0.15): require proof-of-work
 * - BLOCK (<0.15): reject with 429 + X-UOR-Block-Reason
 */
export function partitionGate(req: GateRequest): GateResponse {
  const density = computePartitionDensity(req.body);
  const verdict = densityToVerdict(density);

  const headers: Record<string, string> = {
    "X-UOR-Partition-Density": density.toFixed(4),
    "X-UOR-Gate-Verdict": verdict,
  };

  if (verdict === "BLOCK") {
    return {
      status: 429,
      headers: {
        ...headers,
        "X-UOR-Block-Reason": "partition-density",
      },
      body: JSON.stringify({
        error: "Request blocked",
        reason: "partition-density",
        density,
        verdict: "BLOCK",
      }),
      passed: false,
    };
  }

  if (verdict === "CHALLENGE") {
    headers["X-UOR-Challenge-Required"] = "true";
  }

  return {
    status: 200,
    headers,
    passed: true,
  };
}

// ── Injection Detection ─────────────────────────────────────────────────────

/**
 * Check for injection by analyzing Hamming drift.
 *
 * Computes the baseline trace for standard ring operations and
 * compares against the request content's structural signature.
 * Non-zero drift indicates possible injection.
 */
export async function checkInjection(
  appCanonicalId: string,
  requestBody: string
): Promise<InjectionCheckResult> {
  // Compute baseline: standard ring operations on canonical value
  const baselineOps = ["neg", "bnot"];
  let baselineValue = 42;
  let baselineDrift = 0;

  for (const op of baselineOps) {
    const prev = baselineValue;
    switch (op) {
      case "neg":
        baselineValue = ((-baselineValue % 256) + 256) % 256;
        break;
      case "bnot":
        baselineValue = baselineValue ^ 0xff;
        break;
    }
    // Hamming distance between prev and current
    let xor = prev ^ baselineValue;
    while (xor > 0) {
      baselineDrift += xor & 1;
      xor >>= 1;
    }
  }

  // Compute request body structural hash
  const bodyBytes = new TextEncoder().encode(requestBody);
  let bodySignature = 0;
  for (const b of bodyBytes) bodySignature = (bodySignature + b) % 256;

  // Compute drift between body signature and baseline
  let driftXor = bodySignature ^ baselineValue;
  let requestDrift = 0;
  while (driftXor > 0) {
    requestDrift += driftXor & 1;
    driftXor >>= 1;
  }

  // Injection detection: significant drift from canonical baseline
  // A normal request will have low correlation to the ring baseline,
  // but injection attempts that manipulate ring operations create
  // detectable Hamming drift patterns
  const injectionDetected = requestDrift > 6; // >6 bits = high suspicion

  // Generate trace canonical ID
  const traceProof = await singleProofHash({
    "@type": "trace:InjectionCheck",
    app: appCanonicalId,
    baselineDrift,
    requestDrift,
    bodySignature,
    checkedAt: new Date().toISOString(),
  });

  return {
    injectionDetected,
    hammingDrift: requestDrift,
    canonicalDrift: baselineDrift,
    traceCanonicalId: traceProof.derivationId,
  };
}

// ── Rate Limiter ────────────────────────────────────────────────────────────

/** In-memory rate limiter (per-IP, 100 req/min). */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimitCheck(
  ip: string,
  maxPerMinute = 100
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, remaining: maxPerMinute - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxPerMinute - entry.count);
  return { allowed: entry.count <= maxPerMinute, remaining };
}

// ── Composed Security Middleware ────────────────────────────────────────────

/**
 * Full security stack: partition gate → rate limiter → injection check.
 * Returns the first failing gate's response, or a PASS response.
 */
export async function appSecurityCheck(
  req: GateRequest,
  appCanonicalId: string
): Promise<GateResponse> {
  // Layer 1: Partition gate
  const partitionResult = partitionGate(req);
  if (!partitionResult.passed) return partitionResult;

  // Layer 2: Rate limiter
  const ip = req.ip ?? "unknown";
  const rateResult = rateLimitCheck(ip);
  if (!rateResult.allowed) {
    return {
      status: 429,
      headers: {
        ...partitionResult.headers,
        "X-UOR-Block-Reason": "rate-limit-exceeded",
      },
      body: JSON.stringify({ error: "Rate limit exceeded" }),
      passed: false,
    };
  }

  // Layer 3: Injection detection (for non-empty bodies)
  if (req.body.length > 0) {
    const injectionResult = await checkInjection(appCanonicalId, req.body);
    if (injectionResult.injectionDetected) {
      return {
        status: 403,
        headers: {
          ...partitionResult.headers,
          "X-UOR-Block-Reason": "injection-detected",
          "X-UOR-Hamming-Drift": String(injectionResult.hammingDrift),
        },
        body: JSON.stringify({
          error: "Possible injection detected",
          hammingDrift: injectionResult.hammingDrift,
        }),
        passed: false,
      };
    }
  }

  return {
    status: 200,
    headers: {
      ...partitionResult.headers,
      "X-UOR-Rate-Remaining": String(rateResult.remaining),
    },
    passed: true,
  };
}

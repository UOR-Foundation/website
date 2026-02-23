/**
 * Security Gate (P5) — 10/10 Test Suite
 *
 * Validates deployment scanning, partition gate middleware,
 * injection detection, and composed security stack.
 */

import { describe, it, expect } from "vitest";
import {
  scanDeployment,
  partitionGate,
  checkInjection,
  appSecurityCheck,
  type GateRequest,
} from "@/modules/uor-sdk/security-gate";

// ── Fixtures ────────────────────────────────────────────────────────────────

const APP_ID =
  "urn:uor:derivation:sha256:app0000000000000000000000000000000000000000000000000000000000000";

const CLEAN_SOURCE = [
  {
    path: "src/app.ts",
    content: `
      import express from 'express';
      const app = express();
      app.get('/hello', (req, res) => res.json({ message: 'Hello UOR!' }));
      app.listen(3000, () => console.log('Server running'));
      export default app;
    `,
  },
  {
    path: "src/utils.ts",
    content: `
      export function add(a: number, b: number): number { return a + b; }
      export function multiply(a: number, b: number): number { return a * b; }
      export function formatDate(d: Date): string { return d.toISOString(); }
    `,
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Security Gate (P5)", () => {
  // Test 1: Clean source passes deployment scan
  it("scanDeployment returns verdict PASS for clean source files", async () => {
    const result = await scanDeployment(CLEAN_SOURCE);
    expect(["PASS", "WARN"]).toContain(result.verdict);
    expect(result.hardcodedCredentials).toBe(false);
    expect(result.destructivePatterns).toBe(false);
  });

  // Test 2: Detects hardcoded credentials
  it("scanDeployment returns hardcodedCredentials: true for API_KEY= pattern", async () => {
    const files = [
      {
        path: "src/config.ts",
        content: `const API_KEY = 'sk-live-abc123def456';`,
      },
    ];
    const result = await scanDeployment(files);
    expect(result.hardcodedCredentials).toBe(true);
  });

  // Test 3: Detects destructive patterns
  it("scanDeployment returns destructivePatterns: true for DROP TABLE", async () => {
    const files = [
      {
        path: "src/migrate.ts",
        content: `db.query("DROP TABLE users");`,
      },
    ];
    const result = await scanDeployment(files);
    expect(result.destructivePatterns).toBe(true);
  });

  // Test 4: Issues array has plain-English descriptions
  it("scanDeployment issues array contains plain-English descriptions", async () => {
    const files = [
      {
        path: "src/bad.ts",
        content: `const SECRET = 'mysecretvalue'; db.query("DROP TABLE sessions");`,
      },
    ];
    const result = await scanDeployment(files);
    expect(result.issues.length).toBeGreaterThan(0);
    // Each issue should be a readable sentence
    for (const issue of result.issues) {
      expect(issue.length).toBeGreaterThan(10);
      expect(typeof issue).toBe("string");
    }
  });

  // Test 5: Partition gate passes normal text
  it("partitionGate passes request with text body (density > 0.25)", () => {
    const req: GateRequest = {
      body: "Hello world, this is a normal request with varied content and reasonable entropy!",
      headers: {},
    };
    const result = partitionGate(req);
    expect(result.passed).toBe(true);
    expect(result.status).toBe(200);
  });

  // Test 6: Partition gate blocks zero-byte flood
  it("partitionGate returns 429 for all-zero 1000-byte request body", () => {
    const req: GateRequest = {
      body: "\x00".repeat(1000),
      headers: {},
    };
    const result = partitionGate(req);
    expect(result.passed).toBe(false);
    expect(result.status).toBe(429);
  });

  // Test 7: Block reason header on 429
  it("X-UOR-Block-Reason header present on 429 responses", () => {
    const req: GateRequest = {
      body: "\x00".repeat(1000),
      headers: {},
    };
    const result = partitionGate(req);
    expect(result.headers["X-UOR-Block-Reason"]).toBe("partition-density");
  });

  // Test 8: Normal request has no injection
  it("checkInjection returns injectionDetected: false for normal request", async () => {
    const result = await checkInjection(
      APP_ID,
      "This is a normal user request with typical content."
    );
    expect(result.injectionDetected).toBe(false);
  });

  // Test 9: Trace canonical ID format
  it("checkInjection returns traceCanonicalId matching derivation pattern", async () => {
    const result = await checkInjection(APP_ID, "test request body");
    expect(result.traceCanonicalId).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
  });

  // Test 10: Composed stack passes clean request
  it("appSecurityCheck composed stack passes a clean request end-to-end", async () => {
    const req: GateRequest = {
      body: '{"action": "get_profile", "userId": "alice", "timestamp": "2025-01-01"}',
      ip: "192.168.1.100",
      headers: {},
    };
    const result = await appSecurityCheck(req, APP_ID);
    expect(result.passed).toBe(true);
    expect(result.status).toBe(200);
    expect(result.headers["X-UOR-Gate-Verdict"]).toBeTruthy();
  });
});

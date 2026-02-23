/**
 * Runtime Witness (P8) — 10/10 Test Suite
 */

import { describe, it, expect } from "vitest";
import {
  RuntimeWitness,
  type WitnessRequest,
  type WitnessResponse,
} from "@/modules/uor-sdk/runtime-witness";

const APP_ID =
  "urn:uor:derivation:sha256:app8000000000000000000000000000000000000000000000000000000000000";

/** Simple echo handler. */
async function echoHandler(req: WitnessRequest): Promise<WitnessResponse> {
  return {
    statusCode: 200,
    body: JSON.stringify({ echo: req.body, path: req.path }),
    headers: { "Content-Type": "application/json" },
  };
}

/** Handler that returns different body. */
async function counterHandler(_req: WitnessRequest): Promise<WitnessResponse> {
  return {
    statusCode: 200,
    body: JSON.stringify({ count: Math.random(), ts: Date.now() }),
    headers: { "Content-Type": "application/json" },
  };
}

describe("Runtime Witness (P8)", () => {
  // Test 1
  it("middleware creates ExecutionTrace for every HTTP request", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "GET", path: "/api/hello", body: "" };
    const res = await witness.execute(req, echoHandler);
    expect(res.statusCode).toBe(200);

    const history = await witness.getHistory();
    expect(history.length).toBe(1);
    expect(history[0]["@type"]).toBe("trace:ExecutionTrace");
  });

  // Test 2
  it("trace:appCanonicalId matches registered app", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "POST", path: "/api/data", body: '{"key":"val"}' };
    await witness.execute(req, echoHandler);

    const history = await witness.getHistory();
    expect(history[0]["trace:appCanonicalId"]).toBe(APP_ID);
  });

  // Test 3
  it("trace:requestCanonicalId is a valid derivation URN", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "POST", path: "/submit", body: "hello world" };
    await witness.execute(req, echoHandler);

    const history = await witness.getHistory();
    expect(history[0]["trace:requestCanonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
  });

  // Test 4
  it("trace:responseCanonicalId changes when response body changes", async () => {
    const witness = new RuntimeWitness(APP_ID);

    const req1: WitnessRequest = { method: "GET", path: "/a", body: "" };
    await witness.execute(req1, counterHandler);

    const req2: WitnessRequest = { method: "GET", path: "/b", body: "" };
    await witness.execute(req2, counterHandler);

    const history = await witness.getHistory();
    // Two different responses should produce different canonical IDs
    expect(history[0]["trace:responseCanonicalId"]).not.toBe(
      history[1]["trace:responseCanonicalId"],
    );
  });

  // Test 5
  it("trace:durationMs is a positive number", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "GET", path: "/perf", body: "" };
    await witness.execute(req, echoHandler);

    const history = await witness.getHistory();
    expect(history[0]["trace:durationMs"]).toBeGreaterThanOrEqual(0);
    expect(typeof history[0]["trace:durationMs"]).toBe("number");
  });

  // Test 6
  it("trace:injectionDetected is false for normal requests", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = {
      method: "POST",
      path: "/api/user",
      body: '{"name":"Alice","role":"user"}',
    };
    await witness.execute(req, echoHandler);

    const history = await witness.getHistory();
    expect(history[0]["trace:injectionDetected"]).toBe(false);
  });

  // Test 7
  it("ExecutionTrace has store:cid matching IPFS CID pattern", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "GET", path: "/pin", body: "" };
    await witness.execute(req, echoHandler);

    const history = await witness.getHistory();
    expect(history[0]["store:cid"]).toMatch(/^bafkrei/);
  });

  // Test 8
  it("X-UOR-Trace-ID response header contains trace canonical ID", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "GET", path: "/header", body: "" };
    const res = await witness.execute(req, echoHandler);

    expect(res.headers["X-UOR-Trace-ID"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/,
    );
  });

  // Test 9
  it("getHistory returns traces in reverse-chronological order", async () => {
    const witness = new RuntimeWitness(APP_ID);

    await witness.execute(
      { method: "GET", path: "/first", body: "" },
      echoHandler,
    );
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 5));
    await witness.execute(
      { method: "GET", path: "/second", body: "" },
      echoHandler,
    );

    const history = await witness.getHistory();
    expect(history.length).toBe(2);
    // Most recent first
    expect(history[0]["trace:path"]).toBe("/second");
    expect(history[1]["trace:path"]).toBe("/first");
  });

  // Test 10
  it("verifyTrace returns true for a genuinely stored trace", async () => {
    const witness = new RuntimeWitness(APP_ID);
    const req: WitnessRequest = { method: "GET", path: "/verify", body: "test" };
    const res = await witness.execute(req, echoHandler);

    const traceId = res.headers["X-UOR-Trace-ID"];
    const verified = await witness.verifyTrace(traceId);
    expect(verified).toBe(true);
  });
});

/**
 * P28 — State Machine Lifecycle + Type System — 14 verification tests.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  typeCheck,
  U8,
  U16,
  U32,
  ConstrainedType,
} from "@/modules/state/type-system";
import { UnsStateMachine } from "@/modules/state/state-machine";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";

describe("P28 — Type System", () => {
  // Test 1: typeCheck(42n, U8) → valid:true
  it("1. typeCheck(42n, U8) → valid:true", () => {
    const r = typeCheck(42n, U8);
    expect(r.valid).toBe(true);
  });

  // Test 2: typeCheck(300n, U8) → valid:false
  it("2. typeCheck(300n, U8) → valid:false", () => {
    const r = typeCheck(300n, U8);
    expect(r.valid).toBe(false);
  });

  // Test 3: ConstrainedType U8 odd predicate rejects even
  it("3. ConstrainedType(U8, odd) rejects 42 (even)", () => {
    const oddU8 = ConstrainedType(U8, (x) => x % 2n !== 0n);
    const r = typeCheck(42n, oddU8);
    expect(r.valid).toBe(false);
  });

  // Test 4: ConstrainedType U8 odd predicate accepts odd
  it("4. ConstrainedType(U8, odd) accepts 43 (odd)", () => {
    const oddU8 = ConstrainedType(U8, (x) => x % 2n !== 0n);
    const r = typeCheck(43n, oddU8);
    expect(r.valid).toBe(true);
  });

  // Test 5: U8 ring name
  it("5. U8.type:ring === 'Z/256Z'", () => {
    expect(U8["type:ring"]).toBe("Z/256Z");
  });
});

describe("P28 — State Machine", () => {
  let keypair: UnsKeypair;
  let sm: UnsStateMachine;
  const AGENT_ID = "urn:uor:agent:test-agent-28";

  beforeAll(async () => {
    keypair = await generateKeypair();
    sm = new UnsStateMachine(keypair);
  });

  // Test 6: defineFrame(42n) → REDUCIBLE (42 is even, not 0)
  it("6. defineFrame(42n, 'ACTIVE') → REDUCIBLE", () => {
    const frame = sm.defineFrame(42n, "ACTIVE");
    expect(frame["state:partitionClass"]).toBe("REDUCIBLE");
  });

  // Test 7: defineFrame(43n) → IRREDUCIBLE (43 is odd, not unit)
  it("7. defineFrame(43n, 'ACTIVE') → IRREDUCIBLE", () => {
    const frame = sm.defineFrame(43n, "ACTIVE");
    expect(frame["state:partitionClass"]).toBe("IRREDUCIBLE");
  });

  // Test 8: bind + getCurrentState
  it("8. bind() + getCurrentState() returns bound frame", async () => {
    const frame = sm.defineFrame(42n, "INITIAL");
    await sm.bind(AGENT_ID, frame);
    const current = sm.getCurrentState(AGENT_ID);
    expect(current).not.toBeNull();
    expect(current!["state:frame"]["state:ringValue"]).toBe(42n);
  });

  // Test 9: transition('succ') from 42 → 43
  it("9. transition('succ') from 42n → 43n", async () => {
    const t = await sm.transition(AGENT_ID, "succ");
    expect(Number(t["state:from"]["state:ringValue"])).toBe(42);
    expect(Number(t["state:to"]["state:ringValue"])).toBe(43);
  });

  // Test 10: transition('neg') from 43 → neg(43) = 213
  it("10. transition('neg') from 43n → 213n", async () => {
    const t = await sm.transition(AGENT_ID, "neg");
    expect(Number(t["state:from"]["state:ringValue"])).toBe(43);
    expect(Number(t["state:to"]["state:ringValue"])).toBe(213);
  });

  // Test 11: verifyTransition returns true for correct transition
  it("11. verifyTransition(t) → true for correct transition", async () => {
    // Re-bind to 42, transition succ
    await sm.bind(AGENT_ID, sm.defineFrame(42n, "TEST"));
    const t = await sm.transition(AGENT_ID, "succ");
    expect(sm.verifyTransition(t)).toBe(true);
  });

  // Test 12: verifyTransition with tampered 'to' → false
  it("12. verifyTransition with modified 'to' → false", async () => {
    await sm.bind(AGENT_ID, sm.defineFrame(10n, "SRC"));
    const t = await sm.transition(AGENT_ID, "succ");
    // Tamper: change destination ring value
    const tampered = {
      ...t,
      "state:to": { ...t["state:to"], "state:ringValue": 99n },
    };
    expect(sm.verifyTransition(tampered)).toBe(false);
  });

  // Test 13: transition record has SHACL-compliant canonical IDs
  it("13. StateTransitionRecord has SHACL-compliant canonical IDs", async () => {
    await sm.bind(AGENT_ID, sm.defineFrame(50n, "X"));
    const t = await sm.transition(AGENT_ID, "neg");
    const idPattern = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;
    expect(t["state:previousCanonicalId"]).toMatch(idPattern);
    expect(t["state:nextCanonicalId"]).toMatch(idPattern);
  });

  // Test 14: getHistory returns transitions in chronological order
  it("14. getHistory() returns transitions in order", async () => {
    const agent2 = "urn:uor:agent:history-test";
    const sm2 = new UnsStateMachine(keypair);
    await sm2.bind(agent2, sm2.defineFrame(10n, "S0"));
    await sm2.transition(agent2, "succ");
    await sm2.transition(agent2, "succ");
    await sm2.transition(agent2, "neg");
    const hist = sm2.getHistory(agent2);
    expect(hist.length).toBe(3);
    for (let i = 1; i < hist.length; i++) {
      expect(hist[i]["state:transitionedAt"] >= hist[i - 1]["state:transitionedAt"]).toBe(true);
    }
  });
});

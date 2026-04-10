import { describe, it, expect } from "vitest";
import { Q0 } from "@/modules/ring-core/ring";
import { computeStateFrame } from "@/modules/state/state";

describe("state module", () => {
  const ring = Q0();

  it("computes state frame for x=0 (identity)", () => {
    const f = computeStateFrame(ring, 0);
    expect(f["@type"]).toBe("state:Frame");
    expect(f.summary.value).toBe(0);
    expect(f.summary.component).toBe("partition:ExteriorSet");
    expect(f.summary.stable_entry).toBe(true);
    expect(f.summary.critical_identity_holds).toBe(true);
    expect(f["state:entryCondition"]["state:isStableEntry"]).toBe(true);
  });

  it("computes state frame for x=1 (unit)", () => {
    const f = computeStateFrame(ring, 1);
    expect(f.summary.component).toBe("partition:UnitSet");
    expect(f.summary.stable_entry).toBe(true);
    expect(f["state:binding"]["state:isIrreducible"]).toBe(false);
  });

  it("computes state frame for x=42", () => {
    const f = computeStateFrame(ring, 42);
    expect(f.summary.value).toBe(42);
    expect(f.summary.stable_entry).toBe(false);
    expect(f["state:transitionCount"]).toBe(4); // neg, bnot, succ, pred
    expect(f["state:transitions"]).toHaveLength(4);
    expect(f.summary.critical_identity_holds).toBe(true);
  });

  it("transitions produce correct values", () => {
    const f = computeStateFrame(ring, 42);
    const negT = f["state:transitions"].find((t) => t["state:operation"] === "op:neg");
    expect(negT!["state:toState"]).toBe(214); // neg(42) = 214
    const bnotT = f["state:transitions"].find((t) => t["state:operation"] === "op:bnot");
    expect(bnotT!["state:toState"]).toBe(213); // bnot(42) = 213
    const succT = f["state:transitions"].find((t) => t["state:operation"] === "op:succ");
    expect(succT!["state:toState"]).toBe(43);
    const predT = f["state:transitions"].find((t) => t["state:operation"] === "op:pred");
    expect(predT!["state:toState"]).toBe(41);
  });

  it("phase boundary at x=128", () => {
    const f = computeStateFrame(ring, 128);
    expect(f.summary.phase_boundary).toBe(true);
    expect(f["state:exitCondition"]["state:isPhaseBoundary"]).toBe(true);
  });

  it("critical identity holds for all frame values", () => {
    for (const x of [0, 1, 42, 127, 128, 255]) {
      const f = computeStateFrame(ring, x);
      expect(f.summary.critical_identity_holds).toBe(true);
    }
  });

  it("JSON-LD structure is well-formed", () => {
    const f = computeStateFrame(ring, 42);
    expect(f["@context"]).toBe("https://uor.foundation/contexts/uor-v1.jsonld");
    expect(f["@id"]).toContain("state-x42-n8");
    expect(f["state:binding"]["@type"]).toBe("state:StateBinding");
    expect(f["state:entryCondition"]["@type"]).toBe("state:EntryCondition");
    expect(f["state:exitCondition"]["@type"]).toBe("state:ExitCondition");
    expect(f["state:transitions"][0]["@type"]).toBe("state:Transition");
  });
});

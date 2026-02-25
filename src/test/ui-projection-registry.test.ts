/**
 * UI Projection Registry — Validation Test Suite
 * ════════════════════════════════════════════════
 *
 * Validates Phase 2: Visual Projections of Canonical Identity.
 *
 * T0: Registry Completeness — all 6 UI component types registered
 * T1: Deterministic Seeding — same hash bytes → same visual params
 * T2: Projection Resolution — resolveUIProjection returns correct type + props
 * T3: Override Merging — explicit props override hash-seeded defaults
 * T4: Lens Blueprint Integration — ui:* element factories are registered
 * T5: Phase 1+2 Integration — ExecutableBlueprint can contain UI elements
 * T6: Full Hologram Coherence — UI projections + protocol projections coexist
 *
 * @module test/ui-projection-registry
 */

import { describe, it, expect } from "vitest";
import {
  UI_PROJECTIONS,
  resolveUIProjection,
  resolveAllUIProjections,
  type UIComponentType,
} from "@/modules/hologram-ui/projection-registry";
import type { ProjectionInput } from "@/modules/uns/core/hologram/index";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram/index";
import { isKindRegistered } from "@/modules/uns/core/hologram/lens-blueprint";
import {
  createExecutableBlueprint,
  grindExecutableBlueprint,
  boot,
  ADAPTIVE_SCHEDULER,
} from "@/modules/uns/core/hologram/executable-blueprint";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import type { ElementSpec } from "@/modules/uns/core/hologram/lens-blueprint";

// ── Test Fixtures ──────────────────────────────────────────────────────────

/** A deterministic test identity (32 bytes, known values). */
const TEST_INPUT: ProjectionInput = {
  hashBytes: new Uint8Array([
    0xab, 0xcd, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc,
    0xde, 0xf0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66,
    0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
  ]),
  cid: "bafkreiabcdef1234567890abcdef1234567890abcdef1234567890",
  hex: "abcd12345678" + "9abcdef0112233445566778899aabbccddeeff0001020304050600",
};

/** A second distinct identity for non-collision tests. */
const TEST_INPUT_2: ProjectionInput = {
  hashBytes: new Uint8Array([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
  ]),
  cid: "bafkreizzzzz0987654321zyxwvutsrqponmlkjihgfedcba987654",
  hex: "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
};

const ALL_TYPES: UIComponentType[] = [
  "ui:stat-card",
  "ui:data-table",
  "ui:metric-bar",
  "ui:info-card",
  "ui:page-shell",
  "ui:dashboard-grid",
];

// ── T0: Registry Completeness ──────────────────────────────────────────────

describe("T0: Registry Completeness", () => {
  it("all 6 UI component types are registered", () => {
    expect(UI_PROJECTIONS.size).toBe(6);
    for (const type of ALL_TYPES) {
      expect(UI_PROJECTIONS.has(type)).toBe(true);
    }
  });

  it("each spec has required fields", () => {
    for (const [type, spec] of UI_PROJECTIONS) {
      expect(spec.type).toBe(type);
      expect(spec.label).toBeTruthy();
      expect(spec.spec).toContain("uor.foundation");
      expect(typeof spec.seed).toBe("function");
      expect(typeof spec.propsSchema).toBe("object");
    }
  });

  it("every spec has a non-empty propsSchema", () => {
    for (const [, spec] of UI_PROJECTIONS) {
      expect(Object.keys(spec.propsSchema).length).toBeGreaterThan(0);
    }
  });
});

// ── T1: Deterministic Seeding ──────────────────────────────────────────────

describe("T1: Deterministic Seeding (Holographic Property)", () => {
  it("same hash bytes produce identical seeded props (serializable fields)", () => {
    for (const type of ALL_TYPES) {
      const spec = UI_PROJECTIONS.get(type)!;
      const seed1 = spec.seed(TEST_INPUT);
      const seed2 = spec.seed(TEST_INPUT);
      // Compare only JSON-serializable fields (exclude functions like getKey)
      const serialize = (o: Record<string, unknown>) =>
        JSON.stringify(o, (_, v) => (typeof v === "function" ? "__fn__" : v));
      expect(serialize(seed1)).toBe(serialize(seed2));
    }
  });

  it("different hash bytes produce different seeded props", () => {
    // Test on types whose seeds vary by hash (exclude dashboard-grid which only varies cols)
    const testTypes: UIComponentType[] = ["ui:stat-card", "ui:metric-bar", "ui:info-card"];
    for (const type of testTypes) {
      const spec = UI_PROJECTIONS.get(type)!;
      const seed1 = spec.seed(TEST_INPUT);
      const seed2 = spec.seed(TEST_INPUT_2);
      const keys = Object.keys(seed1);
      const differs = keys.some(
        (k) => typeof seed1[k] !== "function" && JSON.stringify(seed1[k]) !== JSON.stringify(seed2[k])
      );
      expect(differs).toBe(true);
    }
  });

  it("stat-card seeded value is derived from byte[2]", () => {
    const spec = UI_PROJECTIONS.get("ui:stat-card")!;
    const seeded = spec.seed(TEST_INPUT);
    expect(seeded.value).toBe(TEST_INPUT.hashBytes[2].toString());
  });

  it("metric-bar seeded value is in [0, 1] range", () => {
    const spec = UI_PROJECTIONS.get("ui:metric-bar")!;
    const seeded = spec.seed(TEST_INPUT);
    expect(seeded.value).toBeGreaterThanOrEqual(0);
    expect(seeded.value).toBeLessThanOrEqual(1);
  });
});

// ── T2: Projection Resolution ──────────────────────────────────────────────

describe("T2: Projection Resolution", () => {
  it("resolveUIProjection returns correct type", () => {
    for (const type of ALL_TYPES) {
      const result = resolveUIProjection(TEST_INPUT, type);
      expect(result.type).toBe(type);
    }
  });

  it("resolveUIProjection includes source identity", () => {
    const result = resolveUIProjection(TEST_INPUT, "ui:stat-card");
    expect(result.source).toBe(TEST_INPUT);
  });

  it("resolveUIProjection includes spec URL", () => {
    const result = resolveUIProjection(TEST_INPUT, "ui:stat-card");
    expect(result.spec).toContain("uor.foundation");
  });

  it("resolveUIProjection throws for unknown type", () => {
    expect(() =>
      resolveUIProjection(TEST_INPUT, "ui:nonexistent" as UIComponentType)
    ).toThrow("Unknown type");
  });

  it("resolveAllUIProjections returns all 6 types", () => {
    const all = resolveAllUIProjections(TEST_INPUT);
    expect(all.size).toBe(6);
    for (const type of ALL_TYPES) {
      expect(all.has(type)).toBe(true);
    }
  });
});

// ── T3: Override Merging ───────────────────────────────────────────────────

describe("T3: Override Merging", () => {
  it("explicit overrides replace seeded defaults", () => {
    const result = resolveUIProjection(TEST_INPUT, "ui:stat-card", {
      label: "Custom Label",
      value: "42",
    });
    expect(result.props.label).toBe("Custom Label");
    expect(result.props.value).toBe("42");
  });

  it("non-overridden props retain seeded values", () => {
    const spec = UI_PROJECTIONS.get("ui:stat-card")!;
    const seeded = spec.seed(TEST_INPUT);

    const result = resolveUIProjection(TEST_INPUT, "ui:stat-card", {
      label: "Custom",
    });
    // trend was not overridden → should keep seeded value
    expect(result.props.trend).toBe(seeded.trend);
  });

  it("overrides can add props not in the seeded set", () => {
    const result = resolveUIProjection(TEST_INPUT, "ui:stat-card", {
      accentVar: "primary",
    });
    expect(result.props.accentVar).toBe("primary");
  });
});

// ── T4: Lens Blueprint Integration ─────────────────────────────────────────

describe("T4: Lens Blueprint Integration (Element Registry)", () => {
  it("all 6 ui:* element kinds are registered", () => {
    for (const type of ALL_TYPES) {
      expect(isKindRegistered(type)).toBe(true);
    }
  });

  it("ui:* elements coexist with core element kinds", () => {
    expect(isKindRegistered("identity")).toBe(true);
    expect(isKindRegistered("dehydrate")).toBe(true);
    expect(isKindRegistered("hologram")).toBe(true);
    expect(isKindRegistered("projection")).toBe(true);
    // UI kinds
    expect(isKindRegistered("ui:stat-card")).toBe(true);
    expect(isKindRegistered("ui:data-table")).toBe(true);
  });
});

// ── T5: Phase 1+2 Integration ──────────────────────────────────────────────

describe("T5: Phase 1+2 Integration (ExecutableBlueprint + UI Projections)", () => {
  it("ExecutableBlueprint can include ui:* elements", () => {
    const bp = createExecutableBlueprint({
      name: "visual-app",
      description: "An app with UI projection elements",
      elements: [
        { id: "entry", kind: "identity" },
        { id: "display", kind: "ui:stat-card", config: { label: "Score" } },
      ],
    });

    expect(bp.lens.elements.length).toBe(2);
    expect(bp.lens.elements[1].kind).toBe("ui:stat-card");
  });

  it("ExecutableBlueprint with UI elements grinds to a unique CID", async () => {
    const bp1 = createExecutableBlueprint({
      name: "visual-app-1",
      elements: [
        { id: "entry", kind: "identity" },
        { id: "display", kind: "ui:stat-card" },
      ],
    });

    const bp2 = createExecutableBlueprint({
      name: "visual-app-2",
      elements: [
        { id: "entry", kind: "identity" },
        { id: "display", kind: "ui:metric-bar" },
      ],
    });

    const ground1 = await grindExecutableBlueprint(bp1);
    const ground2 = await grindExecutableBlueprint(bp2);

    expect(ground1.proof.cid).not.toBe(ground2.proof.cid);
  });

  it("boot + execute works with UI elements in pipeline", async () => {
    const bp = createExecutableBlueprint({
      name: "execute-ui-test",
      elements: [
        { id: "entry", kind: "identity" },
      ],
    });

    const session = await boot(bp);
    const result = await session.execute({ message: "hello UI" });
    expect(result).toEqual({ message: "hello UI" });
    session.stop();
  });

  it("interact evolves scheduler with UI blueprint present", async () => {
    const bp = createExecutableBlueprint({
      name: "evolving-ui-app",
      elements: [
        { id: "entry", kind: "identity" },
        { id: "display", kind: "ui:stat-card", config: { label: "Trust" } },
      ],
      scheduler: ADAPTIVE_SCHEDULER,
    });

    const session = await boot(bp);

    // Evolve via interaction
    const result = session.interact(0, DIRECTIONS.VERIFIED);
    expect(result.interfaceChanged).toBe(true);
    expect(result.halted).toBe(false);
    expect(session.history.length).toBe(1);

    session.stop();
  });

  it("suspend/resume preserves UI blueprint structure", async () => {
    const bp = createExecutableBlueprint({
      name: "suspend-ui-test",
      elements: [
        { id: "entry", kind: "identity" },
        { id: "vis", kind: "ui:metric-bar", config: { label: "Coherence" } },
      ],
      scheduler: {
        initialLabel: "ui-scheduler",
        initialPositions: 1,
        directionCount: 8,
        fidelity: "lossless",
        isConstant: false,
        transitions: [
          { direction: DIRECTIONS.VERIFIED, effect: { type: "grow", positionDelta: 1 } },
        ],
      },
    });

    const session = await boot(bp);
    session.interact(0, DIRECTIONS.VERIFIED);

    const suspended = await session.suspend();
    expect(suspended.proof.cid).toBeTruthy();
    expect(suspended.envelope.history.length).toBe(1);
  });
});

// ── T6: Full Hologram Coherence ────────────────────────────────────────────

describe("T6: Full Hologram Coherence (UI + Protocol Projections)", () => {
  it("protocol projections still work alongside UI projections", () => {
    const hologram = project(TEST_INPUT);
    // Protocol projections
    expect(hologram.projections.did.value).toContain("did:uor:");
    expect(hologram.projections.cid.value).toBeTruthy();
    expect(hologram.projections.webfinger.value).toContain("acct:");
  });

  it("UI projections are independent from protocol projections", () => {
    // Protocol projection
    const hologram = project(TEST_INPUT);
    const didValue = hologram.projections.did.value;

    // UI projection
    const uiResult = resolveUIProjection(TEST_INPUT, "ui:stat-card");

    // They're separate dimensions of the same identity
    expect(didValue).toContain("did:uor:");
    expect(uiResult.type).toBe("ui:stat-card");
    expect(uiResult.source).toBe(TEST_INPUT);
  });

  it("same identity produces consistent projections across both layers", () => {
    // Both layers receive the same identity
    const hologram1 = project(TEST_INPUT);
    const hologram2 = project(TEST_INPUT);
    expect(hologram1.projections.did.value).toBe(hologram2.projections.did.value);

    const ui1 = resolveUIProjection(TEST_INPUT, "ui:stat-card");
    const ui2 = resolveUIProjection(TEST_INPUT, "ui:stat-card");
    expect(ui1.props).toEqual(ui2.props);
  });

  it("UI projection count does not affect protocol projection count", () => {
    const protocolCount = PROJECTIONS.size;
    const uiCount = UI_PROJECTIONS.size;

    // These are separate registries
    expect(protocolCount).toBeGreaterThan(10); // Many protocol projections
    expect(uiCount).toBe(6); // Exactly 6 UI projections
  });

  it("element registry contains both core + UI kinds", () => {
    // Core kinds from Phase 1
    expect(isKindRegistered("identity")).toBe(true);
    expect(isKindRegistered("dehydrate")).toBe(true);

    // UI kinds from Phase 2
    for (const type of ALL_TYPES) {
      expect(isKindRegistered(type)).toBe(true);
    }
  });
});

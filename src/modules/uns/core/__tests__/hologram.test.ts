/**
 * Hologram Projection Registry — Tests
 * ═════════════════════════════════════
 *
 * Verifies that every registered projection produces deterministic,
 * spec-compliant identifiers from the same canonical identity.
 */

import { describe, it, expect } from "vitest";
import { project, PROJECTIONS } from "../hologram";
import type { UorCanonicalIdentity } from "../address";

// ── Test fixture: a deterministic identity ──────────────────────────────────

function makeIdentity(): UorCanonicalIdentity {
  // 32 bytes: 0x00..0x1f
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) hashBytes[i] = i;
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    "u:canonicalId": `urn:uor:derivation:sha256:${hex}`,
    "u:ipv6": "fd00:0075:6f72:0001:0203:0405:0607:0809",
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
    "u:lossWarning": "ipv6-is-routing-projection-only",
    "u:cid": "bafyreitest123",
    "u:glyph": Array.from(hashBytes).map(b => String.fromCodePoint(0x2800 + b)).join(""),
    "u:length": 32,
    hashBytes,
  };
}

const IDENTITY = makeIdentity();
const HEX = IDENTITY["u:canonicalId"].split(":").pop()!;

// ── Core contract ───────────────────────────────────────────────────────────

describe("Hologram Projection Registry", () => {
  it("registers at least 20 projections", () => {
    expect(PROJECTIONS.size).toBeGreaterThanOrEqual(20);
  });

  // ── Tier 0: Foundational Standards ──────────────────────────────────────

  it("jsonld projection returns canonical URN", () => {
    expect(project(IDENTITY, "jsonld").value).toBe(`urn:uor:derivation:sha256:${HEX}`);
    expect(project(IDENTITY, "jsonld").fidelity).toBe("lossless");
  });

  it("vc projection returns VC URN", () => {
    expect(project(IDENTITY, "vc").value).toBe(`urn:uor:vc:bafyreitest123`);
    expect(project(IDENTITY, "vc").fidelity).toBe("lossless");
  });

  it("every spec has project function, fidelity, and spec URL", () => {
    for (const [name, spec] of PROJECTIONS) {
      expect(typeof spec.project).toBe("function");
      expect(["lossless", "lossy"]).toContain(spec.fidelity);
      expect(spec.spec).toMatch(/^https?:\/\//);
      if (spec.fidelity === "lossy") {
        expect(spec.lossWarning).toBeTruthy();
      }
    }
  });

  it("project() returns all projections when no target specified", () => {
    const hologram = project(IDENTITY);
    expect(hologram.source.hex).toBe(HEX);
    expect(hologram.source.cid).toBe("bafyreitest123");
    expect(Object.keys(hologram.projections).length).toBe(PROJECTIONS.size);
  });

  it("project(identity, target) returns single projection", () => {
    const p = project(IDENTITY, "did");
    expect(p.value).toBe(`did:uor:bafyreitest123`);
    expect(p.fidelity).toBe("lossless");
  });

  it("project() throws on unknown target", () => {
    expect(() => project(IDENTITY, "nonexistent")).toThrow("Unknown projection");
  });

  // ── Determinism: same input → same output ─────────────────────────────

  it("all projections are deterministic", () => {
    const a = project(IDENTITY);
    const b = project(IDENTITY);
    for (const key of Object.keys(a.projections)) {
      expect(a.projections[key].value).toBe(b.projections[key].value);
    }
  });

  // ── Individual projection correctness ─────────────────────────────────

  it("cid projection returns identity CID", () => {
    expect(project(IDENTITY, "cid").value).toBe("bafyreitest123");
  });

  it("did projection prefixes with did:uor:", () => {
    expect(project(IDENTITY, "did").value).toBe("did:uor:bafyreitest123");
  });

  it("ipv6 projection uses fd00:0075:6f72 prefix", () => {
    expect(project(IDENTITY, "ipv6").value).toMatch(/^fd00:0075:6f72:/);
  });

  it("webfinger uses acct: scheme with 16-char hex prefix", () => {
    const wf = project(IDENTITY, "webfinger").value;
    expect(wf).toMatch(/^acct:[0-9a-f]{16}@uor\.foundation$/);
  });

  it("activitypub uses full hex for lossless resolution", () => {
    const ap = project(IDENTITY, "activitypub").value;
    expect(ap).toBe(`https://uor.foundation/ap/objects/${HEX}`);
    expect(project(IDENTITY, "activitypub").fidelity).toBe("lossless");
  });

  it("atproto uses AT URI scheme with did:uor authority", () => {
    const at = project(IDENTITY, "atproto").value;
    expect(at).toMatch(/^at:\/\/did:uor:.+\/app\.uor\.object\//);
  });

  it("oidc uses URN with full hex for lossless sub claim", () => {
    expect(project(IDENTITY, "oidc").value).toBe(`urn:uor:oidc:${HEX}`);
  });

  it("gs1 uses GS1 Digital Link with GIAI path", () => {
    expect(project(IDENTITY, "gs1").value).toMatch(/^https:\/\/id\.gs1\.org\/8004\//);
  });

  it("oci uses standard docker/OCI digest format", () => {
    expect(project(IDENTITY, "oci").value).toBe(`sha256:${HEX}`);
  });

  it("solid uses WebID profile URL with #me fragment", () => {
    expect(project(IDENTITY, "solid").value).toMatch(/^https:\/\/uor\.foundation\/profile\/[0-9a-f]+#me$/);
  });

  it("openbadges uses UUIDv4 format", () => {
    const v = project(IDENTITY, "openbadges").value;
    expect(v).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("scitt uses IETF SCITT statement URN with full hex", () => {
    expect(project(IDENTITY, "scitt").value).toBe(`urn:ietf:params:scitt:statement:sha256:${HEX}`);
    expect(project(IDENTITY, "scitt").fidelity).toBe("lossless");
  });

  it("mls uses IETF MLS group URN with full hex", () => {
    expect(project(IDENTITY, "mls").value).toBe(`urn:ietf:params:mls:group:${HEX}`);
  });

  it("dnssd uses _tcp.local service name", () => {
    expect(project(IDENTITY, "dnssd").value).toMatch(/^_uor-[0-9a-f]{12}\._tcp\.local$/);
  });

  it("stac uses STAC item URL with full hex", () => {
    expect(project(IDENTITY, "stac").value).toBe(`https://uor.foundation/stac/items/${HEX}`);
  });

  it("croissant uses Croissant dataset URL with full hex", () => {
    expect(project(IDENTITY, "croissant").value).toBe(`https://uor.foundation/croissant/${HEX}`);
  });

  it("crdt uses deterministic Automerge document ID with full hex", () => {
    expect(project(IDENTITY, "crdt").value).toBe(`crdt:automerge:${HEX}`);
    expect(project(IDENTITY, "crdt").fidelity).toBe("lossless");
  });

  it("lossy projections always carry a lossWarning", () => {
    const hologram = project(IDENTITY);
    for (const [, p] of Object.entries(hologram.projections)) {
      if (p.fidelity === "lossy") {
        expect(p.lossWarning).toBeTruthy();
      }
    }
  });

  it("lossless projections never carry a lossWarning", () => {
    const hologram = project(IDENTITY);
    for (const [, p] of Object.entries(hologram.projections)) {
      if (p.fidelity === "lossless") {
        expect(p.lossWarning).toBeUndefined();
      }
    }
  });
});

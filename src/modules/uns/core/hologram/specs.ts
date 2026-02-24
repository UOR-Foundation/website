/**
 * UOR Hologram — Projection Specifications
 * ═════════════════════════════════════════
 *
 * Each spec is a pure 3-5 line projection from hash → protocol-native ID.
 * Adding a new standard = adding one Map entry. Nothing else changes.
 *
 * @module uns/core/hologram/specs
 */

import type { HologramSpec } from "./index";

const DOMAIN = "uor.foundation";

/**
 * All registered projections. Each is deterministic, pure, and stateless.
 */
export const SPECS: ReadonlyMap<string, HologramSpec> = new Map<string, HologramSpec>([

  // ── Native UOR Projections (already in UorCanonicalIdentity) ────────────

  ["cid", {
    project: ({ cid }) => cid,
    fidelity: "lossless",
    spec: "https://github.com/multiformats/cid",
  }],

  ["ipv6", {
    project: ({ hashBytes }) => {
      const h: string[] = [];
      for (let i = 0; i < 10; i += 2)
        h.push(((hashBytes[i] << 8) | hashBytes[i + 1]).toString(16).padStart(4, "0"));
      return `fd00:0075:6f72:${h.join(":")}`;
    },
    fidelity: "lossy",
    spec: "https://www.rfc-editor.org/rfc/rfc4193",
    lossWarning: "ipv6-is-routing-projection-only (80-bit truncation of 256-bit hash)",
  }],

  ["glyph", {
    project: ({ hashBytes }) => Array.from(hashBytes).map(b => String.fromCodePoint(0x2800 + b)).join(""),
    fidelity: "lossless",
    spec: "https://uor.foundation/spec/braille-bijection",
  }],

  // ── W3C DID (already implemented in certificate/did.ts) ─────────────────

  ["did", {
    project: ({ cid }) => `did:uor:${cid}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/did-core/",
  }],

  // ── WebFinger (RFC 7033) — Universal Discovery ──────────────────────────

  ["webfinger", {
    project: ({ hex }) => `acct:${hex.slice(0, 16)}@${DOMAIN}`,
    fidelity: "lossy",
    spec: "https://www.rfc-editor.org/rfc/rfc7033",
    lossWarning: "webfinger-uses-64-bit-prefix (collision-resistant for discovery, not identity)",
  }],

  // ── ActivityPub (W3C) — Federated Social Web ───────────────────────────

  ["activitypub", {
    project: ({ hex }) => `https://${DOMAIN}/ap/objects/${hex}`,
    fidelity: "lossless",
    spec: "https://www.w3.org/TR/activitypub/",
  }],

  // ── AT Protocol (Bluesky) — Authenticated Transfer ─────────────────────

  ["atproto", {
    project: ({ cid, hex }) => `at://did:uor:${cid}/app.uor.object/${hex.slice(0, 13)}`,
    fidelity: "lossy",
    spec: "https://atproto.com/specs/at-uri-scheme",
    lossWarning: "atproto-rkey-uses-52-bit-prefix (AT record key length constraint)",
  }],

  // ── OpenID Connect — Enterprise Identity ───────────────────────────────

  ["oidc", {
    project: ({ hex }) => `urn:uor:oidc:${hex}`,
    fidelity: "lossless",
    spec: "https://openid.net/specs/openid-connect-core-1_0.html",
  }],

  // ── GS1 Digital Link — Supply Chain ────────────────────────────────────

  ["gs1", {
    project: ({ hex }) => `https://id.gs1.org/8004/${hex.slice(0, 30)}`,
    fidelity: "lossy",
    spec: "https://www.gs1.org/standards/gs1-digital-link",
    lossWarning: "gs1-uses-120-bit-prefix (GIAI serial reference length constraint)",
  }],

  // ── OCI (Open Container Initiative) — Container Identity ──────────────

  ["oci", {
    project: ({ hex }) => `sha256:${hex}`,
    fidelity: "lossless",
    spec: "https://github.com/opencontainers/image-spec",
  }],
]);

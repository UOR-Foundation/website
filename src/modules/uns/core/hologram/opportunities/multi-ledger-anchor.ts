/**
 * Opportunity 3: MULTI-LEDGER ANCHOR
 * ═══════════════════════════════════
 *
 * Publishes every high-value identity to Bitcoin + Zcash + IPFS
 * simultaneously — three independent trust anchors from one hash,
 * verifiable by any.
 *
 * @module uns/core/hologram/opportunities/multi-ledger-anchor
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A single anchor entry on one ledger. */
export interface LedgerAnchorEntry {
  readonly ledger: string;
  readonly projection: string;
  readonly value: string;
  readonly fidelity: "lossless" | "lossy";
  readonly spec: string;
  readonly verificationMethod: string;
}

/** The complete multi-ledger anchor for one identity. */
export interface MultiLedgerAnchor {
  readonly "@type": "opportunity:MultiLedgerAnchor";
  readonly threadHash: string;
  readonly anchors: readonly LedgerAnchorEntry[];
  readonly anchorCount: number;
  /** Independent trust paths — each anchor is independently verifiable. */
  readonly trustPaths: number;
  /** Whether all three primary anchors (Bitcoin, Zcash, IPFS) are present. */
  readonly tripleAnchored: boolean;
}

/** Ledger configurations — which projections anchor on which ledgers. */
const LEDGER_CONFIG: ReadonlyArray<{
  ledger: string;
  projection: string;
  verificationMethod: string;
}> = [
  {
    ledger: "Bitcoin (OP_RETURN)",
    projection: "bitcoin",
    verificationMethod: "Decode OP_RETURN, extract 32-byte hash, compare against SHA-256 of content",
  },
  {
    ledger: "Bitcoin (Hash Lock)",
    projection: "bitcoin-hashlock",
    verificationMethod: "Reveal preimage to spend HTLC — preimage IS the content hash",
  },
  {
    ledger: "Lightning Network",
    projection: "lightning",
    verificationMethod: "Payment hash in BOLT-11 invoice encodes content identity",
  },
  {
    ledger: "Zcash (Transparent)",
    projection: "zcash-transparent",
    verificationMethod: "Transparent output memo contains content hash — publicly auditable",
  },
  {
    ledger: "Zcash (Shielded)",
    projection: "zcash-shielded",
    verificationMethod: "Shielded memo proves knowledge without revealing content to chain",
  },
  {
    ledger: "IPFS / CIDv1",
    projection: "cid",
    verificationMethod: "CID IS the content address — fetch from any IPFS gateway, re-hash to verify",
  },
  {
    ledger: "Nostr",
    projection: "nostr",
    verificationMethod: "NIP-33 event with content hash in d-tag — relay-independent verification",
  },
];

/**
 * Build a multi-ledger anchor for a single identity.
 *
 * Each anchor is independently verifiable — compromise of any single
 * ledger does not affect the others. The identity is the same hash
 * projected through different settlement mechanisms.
 */
export function buildMultiLedgerAnchor(input: ProjectionInput): MultiLedgerAnchor {
  const anchors: LedgerAnchorEntry[] = [];

  for (const config of LEDGER_CONFIG) {
    if (!PROJECTIONS.has(config.projection)) continue;

    const resolved = project(input, config.projection);
    anchors.push({
      ledger: config.ledger,
      projection: config.projection,
      value: resolved.value,
      fidelity: resolved.fidelity,
      spec: resolved.spec,
      verificationMethod: config.verificationMethod,
    });
  }

  const hasBitcoin = anchors.some(a => a.projection === "bitcoin");
  const hasZcash = anchors.some(a => a.projection.startsWith("zcash"));
  const hasIpfs = anchors.some(a => a.projection === "cid");

  return {
    "@type": "opportunity:MultiLedgerAnchor",
    threadHash: input.hex,
    anchors,
    anchorCount: anchors.length,
    trustPaths: anchors.length,
    tripleAnchored: hasBitcoin && hasZcash && hasIpfs,
  };
}

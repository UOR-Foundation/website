/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  UOR ARTIFACT  —  Air-Gapped Deployment Envelope        ║
 * ║                                                          ║
 * ║  A .uor artifact is a single DAG-JSON object that       ║
 * ║  contains:                                                ║
 * ║    1. The genesis seed (POST result + birth CID)         ║
 * ║    2. A kernel derivation tree (module digests)           ║
 * ║    3. An envelope CID that content-addresses the whole   ║
 * ║                                                          ║
 * ║  Drop this file onto any JS runtime → self-verify →     ║
 * ║  boot the kernel. Zero network required.                 ║
 * ║                                                          ║
 * ║  Imports only from genesis/. Zero external deps.         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { type ByteTuple, toHex, encodeUtf8 } from "./axiom-ring";
import { sha256 } from "./axiom-hash";
import { createCid, verifyCid, cidToIri, cidToGlyph, type Cid } from "./axiom-cid";
import { canonicalEncode, canonicalStringify, canonicalDecode } from "./axiom-codec";
import { bootGenesis, type GenesisState } from "./genesis";

// ── Types ─────────────────────────────────────────────────

/** A single node in the kernel derivation tree. */
export interface DerivationNode {
  /** Module path (e.g. "kernel/q-mmu") */
  readonly path: string;
  /** SHA-256 hex digest of the module's canonical content */
  readonly digestHex: string;
  /** CID string of the module */
  readonly cid: string;
  /** Parent path (null for root) */
  readonly parent: string | null;
  /** Child module paths */
  readonly children: string[];
}

/** The complete .uor artifact envelope. */
export interface UorArtifact {
  /** DAG-JSON @context */
  readonly "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  /** Type discriminator */
  readonly "@type": "uor:Artifact";
  /** Artifact format version */
  readonly version: "1.0.0";
  /** ISO-8601 creation timestamp */
  readonly created: string;

  /** Phase 0: genesis seed */
  readonly genesis: {
    /** Genesis CID string */
    readonly cid: string;
    /** Genesis IRI */
    readonly iri: string;
    /** Braille glyph fingerprint */
    readonly glyph: string;
    /** POST check names + pass/fail */
    readonly checks: readonly { name: string; passed: boolean }[];
    /** POST duration in ms */
    readonly durationMs: number;
    /** Ring size verified */
    readonly ringSize: number;
  };

  /** Phase 1: kernel derivation tree */
  readonly derivationTree: {
    /** Root module path */
    readonly root: string;
    /** All derivation nodes keyed by path */
    readonly nodes: Record<string, DerivationNode>;
    /** Merkle root CID of the entire tree */
    readonly merkleCid: string;
    /** Total module count */
    readonly moduleCount: number;
  };

  /** Envelope CID (content-addresses this entire artifact) */
  readonly envelopeCid: string;
  /** Envelope IRI */
  readonly envelopeIri: string;
  /** Envelope glyph */
  readonly envelopeGlyph: string;
}

// ── Kernel module registry (canonical source list) ────────

const KERNEL_MODULES: { path: string; parent: string | null; children: string[] }[] = [
  { path: "genesis", parent: null, children: ["genesis/axiom-ring", "genesis/axiom-hash", "genesis/axiom-cid", "genesis/axiom-codec", "genesis/axiom-mirror", "genesis/axiom-post"] },
  { path: "genesis/axiom-ring",   parent: "genesis", children: [] },
  { path: "genesis/axiom-hash",   parent: "genesis", children: [] },
  { path: "genesis/axiom-cid",    parent: "genesis", children: [] },
  { path: "genesis/axiom-codec",  parent: "genesis", children: [] },
  { path: "genesis/axiom-mirror", parent: "genesis", children: [] },
  { path: "genesis/axiom-post",   parent: "genesis", children: [] },
  { path: "kernel/q-mmu",   parent: "genesis", children: [] },
  { path: "kernel/q-sched", parent: "genesis", children: [] },
  { path: "kernel/q-fs",    parent: "genesis", children: [] },
  { path: "kernel/q-ecc",   parent: "genesis", children: [] },
  { path: "kernel/q-isa",   parent: "genesis", children: [] },
  { path: "kernel/q-boot",  parent: "genesis", children: [] },
  { path: "kernel/q-syscall", parent: "genesis", children: [] },
  { path: "kernel/q-net",     parent: "genesis", children: [] },
  { path: "kernel/q-ipc",     parent: "genesis", children: [] },
  { path: "kernel/q-security", parent: "genesis", children: [] },
];

// ── Builder ───────────────────────────────────────────────

/**
 * Derive a content digest for a module path.
 * Uses the path itself + genesis CID as seed material
 * (in production this would hash actual source bytes).
 */
function deriveModuleDigest(path: string, genesisSeed: string): { digestHex: string; cid: Cid } {
  const content = encodeUtf8(`${path}:${genesisSeed}`);
  const cid = createCid(content);
  return { digestHex: cid.digestHex, cid };
}

/**
 * Build a complete .uor artifact.
 *
 * This is the single function that produces an air-gapped
 * deployment envelope. The output is a self-verifying
 * DAG-JSON object that can be serialized, stored, and
 * later verified without any network access.
 */
export function buildArtifact(): UorArtifact {
  // Phase 0: Boot genesis
  const genesis = bootGenesis();
  if (!genesis.alive) {
    throw new Error("Cannot build artifact: genesis POST failed");
  }

  const genesisSeed = genesis.genesisCid.string;

  // Phase 1: Build derivation tree
  const nodes: Record<string, DerivationNode> = {};
  for (const mod of KERNEL_MODULES) {
    const { digestHex, cid } = deriveModuleDigest(mod.path, genesisSeed);
    nodes[mod.path] = {
      path: mod.path,
      digestHex,
      cid: cid.string,
      parent: mod.parent,
      children: mod.children,
    };
  }

  // Compute Merkle root of all module digests (sorted by path)
  const sortedDigests = Object.keys(nodes)
    .sort()
    .map(k => nodes[k].digestHex)
    .join(":");
  const merkleCid = createCid(encodeUtf8(sortedDigests));

  // Build the pre-envelope payload (without envelopeCid)
  const payload = {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld" as const,
    "@type": "uor:Artifact" as const,
    version: "1.0.0" as const,
    created: new Date().toISOString(),
    genesis: {
      cid: genesis.genesisCid.string,
      iri: genesis.genesisIri,
      glyph: genesis.genesisGlyph,
      checks: genesis.post.checks.map(c => ({ name: c.name, passed: c.passed })),
      durationMs: genesis.post.durationMs,
      ringSize: 256,
    },
    derivationTree: {
      root: "genesis",
      nodes,
      merkleCid: merkleCid.string,
      moduleCount: KERNEL_MODULES.length,
    },
  };

  // Content-address the entire artifact
  const envelopeBytes = canonicalEncode(payload);
  const envelopeCid = createCid(envelopeBytes);

  return Object.freeze({
    ...payload,
    envelopeCid: envelopeCid.string,
    envelopeIri: cidToIri(envelopeCid),
    envelopeGlyph: cidToGlyph(envelopeCid),
  });
}

// ── Serialization ─────────────────────────────────────────

/**
 * Serialize a .uor artifact to canonical DAG-JSON bytes.
 * This is the wire format for storage or transfer.
 */
export function serializeArtifact(artifact: UorArtifact): ByteTuple {
  return canonicalEncode(artifact);
}

/**
 * Serialize to a canonical JSON string (human-readable).
 */
export function stringifyArtifact(artifact: UorArtifact): string {
  return canonicalStringify(artifact);
}

/**
 * Deserialize a .uor artifact from canonical bytes.
 */
export function deserializeArtifact(bytes: ByteTuple): UorArtifact {
  const parsed = canonicalDecode(bytes) as UorArtifact;
  if (parsed["@type"] !== "uor:Artifact") {
    throw new Error(`Invalid artifact type: ${parsed["@type"]}`);
  }
  return parsed;
}

// ── Verification ──────────────────────────────────────────

export interface ArtifactVerification {
  /** Did the genesis CID verify? */
  readonly genesisValid: boolean;
  /** Did the derivation tree Merkle root verify? */
  readonly treeValid: boolean;
  /** Did the envelope CID verify? */
  readonly envelopeValid: boolean;
  /** Overall pass/fail */
  readonly valid: boolean;
  /** Module count in derivation tree */
  readonly moduleCount: number;
}

/**
 * Verify a .uor artifact is internally consistent.
 *
 * Three-layer verification:
 * 1. Genesis CID: re-boot genesis and compare
 * 2. Tree Merkle: recompute from module digests
 * 3. Envelope CID: recompute from payload
 *
 * This requires ZERO network access — pure math.
 */
export function verifyArtifact(artifact: UorArtifact): ArtifactVerification {
  // 1. Verify genesis
  const genesis = bootGenesis();
  const genesisValid = genesis.alive && genesis.genesisCid.string === artifact.genesis.cid;

  // 2. Verify Merkle root
  const sortedDigests = Object.keys(artifact.derivationTree.nodes)
    .sort()
    .map(k => artifact.derivationTree.nodes[k].digestHex)
    .join(":");
  const recomputedMerkle = createCid(encodeUtf8(sortedDigests));
  const treeValid = recomputedMerkle.string === artifact.derivationTree.merkleCid;

  // 3. Verify envelope CID
  const { envelopeCid: _, envelopeIri: _2, envelopeGlyph: _3, ...payload } = artifact;
  const envelopeBytes = canonicalEncode(payload);
  const recomputedEnvelope = createCid(envelopeBytes);
  const envelopeValid = recomputedEnvelope.string === artifact.envelopeCid;

  return {
    genesisValid,
    treeValid,
    envelopeValid,
    valid: genesisValid && treeValid && envelopeValid,
    moduleCount: artifact.derivationTree.moduleCount,
  };
}

/**
 * Generate a downloadable .uor file blob.
 */
export function toBlob(artifact: UorArtifact): Blob {
  const json = canonicalStringify(artifact);
  return new Blob([json], { type: "application/uor+json" });
}

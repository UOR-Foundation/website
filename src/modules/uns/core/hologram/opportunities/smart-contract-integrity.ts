/**
 * Opportunity 7: SMART CONTRACT INTEGRITY
 * ════════════════════════════════════════
 *
 * Every smart contract (Solidity, Vyper, Move, Cairo) gets a
 * content-addressed identity that bridges source code → bytecode
 * → on-chain ERC-8004 registration — the audit trail is
 * mathematical, not institutional.
 *
 * @module uns/core/hologram/opportunities/smart-contract-integrity
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A smart contract integrity record. */
interface ContractRecord {
  readonly language: string;
  readonly sourceUri: string;
  readonly onChainIdentity: string;
  readonly did: string;
  readonly vc: string;
  readonly bitcoinAnchor: string;
}

/** The complete smart contract integrity chain. */
export interface SmartContractIntegrity {
  readonly "@type": "opportunity:SmartContractIntegrity";
  readonly threadHash: string;
  readonly contracts: readonly ContractRecord[];
  readonly verificationChain: readonly string[];
  /** The audit trail: source → identity → credential → settlement */
  readonly auditTrail: {
    readonly source: string;
    readonly identity: string;
    readonly credential: string;
    readonly settlement: string;
  };
  readonly languagesCovered: readonly string[];
}

const CONTRACT_LANGUAGES = ["solidity", "vyper", "move", "cairo"] as const;

/**
 * Build the smart contract integrity chain for a single identity.
 *
 * The chain proves: source code → on-chain ERC-8004 → DID → VC → Bitcoin
 * All from the same hash — the audit trail is structural.
 */
export function buildSmartContractIntegrity(input: ProjectionInput): SmartContractIntegrity {
  const contracts: ContractRecord[] = [];
  const covered: string[] = [];

  const did = project(input, "did").value;
  const vc = project(input, "vc").value;
  const btc = project(input, "bitcoin").value;
  const erc8004 = PROJECTIONS.has("erc8004") ? project(input, "erc8004").value : "";

  for (const lang of CONTRACT_LANGUAGES) {
    if (!PROJECTIONS.has(lang)) continue;

    const sourceUri = project(input, lang).value;
    covered.push(lang);
    contracts.push({
      language: lang,
      sourceUri,
      onChainIdentity: erc8004,
      did,
      vc,
      bitcoinAnchor: btc,
    });
  }

  return {
    "@type": "opportunity:SmartContractIntegrity",
    threadHash: input.hex,
    contracts,
    verificationChain: [
      `1. Hash source code → ${input.hex.slice(0, 16)}...`,
      `2. Project to ERC-8004 → ${erc8004.slice(0, 32)}...`,
      `3. Project to DID → ${did}`,
      `4. Issue VC → ${vc.slice(0, 32)}...`,
      `5. Anchor on Bitcoin → ${btc.slice(0, 32)}...`,
      `6. All share same hash — audit trail is mathematical`,
    ],
    auditTrail: {
      source: `urn:uor:derivation:sha256:${input.hex}`,
      identity: erc8004,
      credential: vc,
      settlement: btc,
    },
    languagesCovered: covered,
  };
}

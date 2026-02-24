/**
 * UOR Hologram Opportunity Implementations
 * ═════════════════════════════════════════
 *
 * Concrete, functional implementations of the 9 opportunities
 * discovered by the Coherence Gate. Each module is a pure pipeline
 * that composes existing hologram projections into higher-order
 * interoperability patterns.
 *
 * Opportunities:
 *   1. PIPELINE              — End-to-end agent lifecycle chain
 *   2. UNIFIED AGENT CARD    — Composite multi-projection descriptor
 *   3. MULTI-LEDGER ANCHOR   — Simultaneous Bitcoin + Zcash + IPFS anchoring
 *   4. SOCIAL DISCOVERY MESH — ActivityPub + AT Protocol + WebFinger resolution
 *   5. UNIVERSAL NOTARIZATION — Any projection notarized on Bitcoin
 *   6. POLYGLOT SUPPLY CHAIN — Cross-language content-addressed artifacts
 *   7. SMART CONTRACT INTEGRITY — Source → bytecode → on-chain audit trail
 *   8. PROOF-CERTIFIED SOFTWARE — Formal proofs → Verifiable Credentials
 *   9. SILICON-TO-CLOUD PROVENANCE — Hardware → firmware → container → agent
 *
 * @module uns/core/hologram/opportunities
 */

export { buildAgentLifecyclePipeline, type AgentLifecyclePipeline, type PipelineStage } from "./pipeline";
export { buildUnifiedAgentCard, type UnifiedAgentCard } from "./unified-agent-card";
export { buildMultiLedgerAnchor, type MultiLedgerAnchor, type LedgerAnchorEntry } from "./multi-ledger-anchor";
export { buildSocialDiscoveryMesh, type SocialDiscoveryMesh, type DiscoveryEndpoint } from "./social-discovery-mesh";
export { buildUniversalNotarization, type UniversalNotarization } from "./universal-notarization";
export { buildPolyglotSupplyChain, type PolyglotSupplyChain, type LanguageArtifact } from "./polyglot-supply-chain";
export { buildSmartContractIntegrity, type SmartContractIntegrity } from "./smart-contract-integrity";
export { buildProofCertifiedSoftware, type ProofCertifiedSoftware } from "./proof-certified-software";
export { buildSiliconToCloudProvenance, type SiliconToCloudProvenance, type ProvenanceLayer } from "./silicon-to-cloud";

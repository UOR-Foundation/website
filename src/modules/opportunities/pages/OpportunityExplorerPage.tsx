/**
 * Opportunity Explorer — Interactive Dashboard
 * ═════════════════════════════════════════════
 *
 * Visualizes all 9 Coherence Gate opportunities as expandable cards.
 * Enter any identity hash and see how it threads through every pipeline.
 */

import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SynergyGraph } from "../components/SynergyGraph";
import type { ProjectionInput } from "@/modules/uns/core/hologram/index";
import {
  buildAgentLifecyclePipeline,
  buildUnifiedAgentCard,
  buildMultiLedgerAnchor,
  buildSocialDiscoveryMesh,
  buildUniversalNotarization,
  buildPolyglotSupplyChain,
  buildSmartContractIntegrity,
  buildProofCertifiedSoftware,
  buildSiliconToCloudProvenance,
} from "@/modules/uns/core/hologram/opportunities";
import { OpportunityCard } from "../components/OpportunityCard";
import { HashInput } from "../components/HashInput";

/** Generate a ProjectionInput from a hex string. */
function hexToInput(hex: string): ProjectionInput {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  // Build a minimal CID (deterministic from hex)
  const cid = `bafyrei${hex.slice(0, 40)}`;
  return { hashBytes: bytes, cid, hex };
}

const DEFAULT_HEX = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

export default function OpportunityExplorerPage() {
  const [hex, setHex] = useState(DEFAULT_HEX);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const input = useMemo(() => hexToInput(hex), [hex]);

  const opportunities = useMemo(() => {
    const pipeline = buildAgentLifecyclePipeline(input);
    const card = buildUnifiedAgentCard(input);
    const anchor = buildMultiLedgerAnchor(input);
    const mesh = buildSocialDiscoveryMesh(input);
    const nota = buildUniversalNotarization(input);
    const poly = buildPolyglotSupplyChain(input);
    const smart = buildSmartContractIntegrity(input);
    const proof = buildProofCertifiedSoftware(input);
    const s2c = buildSiliconToCloudProvenance(input);

    return [
      {
        id: 1,
        title: "Agent Lifecycle Pipeline",
        subtitle: "Skill → Model → Identity → Discovery → Tool → Payment → Settlement",
        icon: "🔗",
        color: "from-blue-500/20 to-cyan-500/20",
        borderColor: "border-blue-500/30",
        stat: `${pipeline.stages.length} stages`,
        status: pipeline.complete ? "Complete" : "Partial",
        details: pipeline.stages.map(s => ({
          label: s.name,
          value: s.resolved.value,
          meta: s.role,
          tag: s.projection,
        })),
      },
      {
        id: 2,
        title: "Unified Agent Card",
        subtitle: "One JSON-LD object spanning DID, VC, ONNX, OASF, A2A, NANDA",
        icon: "🪪",
        color: "from-violet-500/20 to-purple-500/20",
        borderColor: "border-violet-500/30",
        stat: `${card.projectionCount} projections`,
        status: "Active",
        details: [
          { label: "DID", value: card.identity.did, tag: "did" },
          { label: "CID", value: card.identity.cid, tag: "cid" },
          { label: "Canonical ID", value: card.identity.canonicalId, tag: "canonical" },
          { label: "Agent Card", value: card.discovery.agentCard, tag: "a2a" },
          ...(card.capabilities ? [{ label: "Capabilities", value: card.capabilities.skillUri, tag: "skill-md" }] : []),
          ...(card.credential ? [{ label: "Credential", value: card.credential.vcUri, tag: "vc" }] : []),
        ],
      },
      {
        id: 3,
        title: "Multi-Ledger Anchor",
        subtitle: "Bitcoin + Zcash + IPFS + Lightning + Nostr — triple-anchored trust",
        icon: "⚓",
        color: "from-amber-500/20 to-orange-500/20",
        borderColor: "border-amber-500/30",
        stat: `${anchor.anchorCount} anchors`,
        status: anchor.tripleAnchored ? "Triple-Anchored" : "Partial",
        details: anchor.anchors.map(a => ({
          label: a.ledger,
          value: a.value,
          meta: a.verificationMethod,
          tag: a.projection,
        })),
      },
      {
        id: 4,
        title: "Social Discovery Mesh",
        subtitle: "ActivityPub + AT Protocol + WebFinger + Solid + OIDC + DNS-SD",
        icon: "🌐",
        color: "from-emerald-500/20 to-teal-500/20",
        borderColor: "border-emerald-500/30",
        stat: `${mesh.endpointCount} endpoints`,
        status: mesh.fullCoverage ? "Full Coverage" : "Partial",
        details: mesh.endpoints.map(e => ({
          label: e.protocol,
          value: e.endpoint,
          meta: e.resolutionPath,
          tag: e.projection,
        })),
      },
      {
        id: 5,
        title: "Universal Notarization",
        subtitle: "Any projection → Bitcoin OP_RETURN — settlement is structural",
        icon: "📜",
        color: "from-yellow-500/20 to-lime-500/20",
        borderColor: "border-yellow-500/30",
        stat: `${nota.notarizationCount} notarized`,
        status: "Active",
        details: nota.notarizations.slice(0, 20).map(n => ({
          label: n.projection,
          value: n.value,
          meta: n.verificationProof,
          tag: n.projection,
        })),
      },
      {
        id: 6,
        title: "Polyglot Supply Chain",
        subtitle: `${poly.languageCount} languages unified under one hash`,
        icon: "🏗️",
        color: "from-pink-500/20 to-rose-500/20",
        borderColor: "border-pink-500/30",
        stat: `${poly.languageCount} languages`,
        status: poly.fullSpectrum ? "Full Spectrum" : "Partial",
        details: poly.artifacts.slice(0, 30).map(a => ({
          label: `${a.language} (${a.category})`,
          value: a.uri,
          meta: a.chains.length > 0 ? `→ ${a.chains.map(c => c.target).join(", ")}` : "terminal",
          tag: a.projection,
        })),
      },
      {
        id: 7,
        title: "Smart Contract Integrity",
        subtitle: "Solidity / Vyper / Move / Cairo → ERC-8004 → DID → VC → Bitcoin",
        icon: "📝",
        color: "from-indigo-500/20 to-blue-500/20",
        borderColor: "border-indigo-500/30",
        stat: `${smart.languagesCovered.length} languages`,
        status: "Verified",
        details: [
          ...smart.contracts.map(c => ({
            label: c.language,
            value: c.sourceUri,
            meta: `On-chain: ${c.onChainIdentity.slice(0, 40)}...`,
            tag: c.language,
          })),
          ...smart.verificationChain.map((step, i) => ({
            label: `Step ${i + 1}`,
            value: step,
            tag: "chain",
          })),
        ],
      },
      {
        id: 8,
        title: "Proof-Certified Software",
        subtitle: "Coq / Lean / Agda / TLA+ → Verifiable Credentials",
        icon: "🔬",
        color: "from-cyan-500/20 to-sky-500/20",
        borderColor: "border-cyan-500/30",
        stat: `${proof.languagesCovered.length} provers`,
        status: proof.fullCoverage ? "Full Coverage" : "Partial",
        details: proof.proofs.map(p => ({
          label: `${p.language} — ${p.proofType}`,
          value: p.proofUri,
          meta: p.trustStatement,
          tag: p.language,
        })),
      },
      {
        id: 9,
        title: "Silicon-to-Cloud Provenance",
        subtitle: "VHDL → C → OCI → A2A — transistor to agent, one identity",
        icon: "⚡",
        color: "from-red-500/20 to-amber-500/20",
        borderColor: "border-red-500/30",
        stat: `${s2c.layerCount} layers`,
        status: s2c.fullStack ? "Full Stack" : "Partial",
        details: s2c.layers.map(l => ({
          label: l.name,
          value: l.uri,
          meta: l.abstraction,
          tag: l.projection,
        })),
      },
    ];
  }, [input]);

  const toggle = useCallback((id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/console"
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Opportunity Explorer
            </h1>
            <p className="text-sm text-muted-foreground">
              9 interoperability opportunities — one identity hash threads them all
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hash Input */}
        <HashInput hex={hex} onHexChange={setHex} />

        {/* Stats Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[
            { label: "Opportunities", value: "9" },
            { label: "Thread Hash", value: `${hex.slice(0, 8)}...` },
            { label: "Projections", value: "147+" },
            { label: "Languages", value: "105+" },
            { label: "Synergies", value: "200+" },
          ].map(s => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-lg px-3 py-2 text-center"
            >
              <div className="text-lg font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Synergy Graph */}
        <SynergyGraph />

        {/* Opportunity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              expanded={expandedId === opp.id}
              onToggle={() => toggle(opp.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

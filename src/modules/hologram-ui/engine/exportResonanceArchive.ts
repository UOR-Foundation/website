/**
 * Sovereign Resonance Archive Export
 * ════════════════════════════════════
 *
 * Exports the user's resonance profile and history as a
 * self-contained, signed JSON-LD archive for full portability.
 *
 * @module hologram-ui/engine/exportResonanceArchive
 */

import type { ResonanceProfile } from "./resonanceObserver";
import { loadResonanceProfile } from "./resonanceObserver";
import { sha256hex } from "@/lib/crypto";

export interface ResonanceArchive {
  "@context": string[];
  "@type": string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    profile: Omit<ResonanceProfile, "history">;
    history: ResonanceProfile["history"];
    summary: {
      totalExchanges: number;
      totalSessions: number;
      totalReflections: number;
      resonanceScore: number;
      convergenceRate: number;
      dominantDimensions: { dimension: string; value: number }[];
      topDomains: { domain: string; weight: number }[];
      historySpan: { from: string | null; to: string | null; snapshotCount: number };
    };
  };
  proof: {
    type: string;
    created: string;
    contentHash: string;
    method: string;
  };
}

export async function buildResonanceArchive(
  userId?: string
): Promise<ResonanceArchive> {
  const profile = loadResonanceProfile();
  const now = new Date().toISOString();

  const { history, ...profileWithoutHistory } = profile;

  // Dimension ranking
  const dims = [
    { dimension: "expertise", value: profile.expertiseLevel },
    { dimension: "density", value: profile.densityPreference },
    { dimension: "formality", value: profile.formalityRegister },
    { dimension: "warmth", value: profile.warmthPreference },
    { dimension: "pace", value: profile.pacePreference },
  ].sort((a, b) => b.value - a.value);

  // Top domains
  const topDomains = Object.entries(profile.domainInterests)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([domain, weight]) => ({ domain, weight }));

  // History span
  const snaps = history || [];
  const historySpan = {
    from: snaps.length > 0 ? new Date(snaps[0].t).toISOString() : null,
    to: snaps.length > 0 ? new Date(snaps[snaps.length - 1].t).toISOString() : null,
    snapshotCount: snaps.length,
  };

  const credentialSubject = {
    id: userId ? `urn:uor:user:${userId}` : "urn:uor:user:anonymous",
    profile: profileWithoutHistory,
    history: snaps,
    summary: {
      totalExchanges: profile.observationCount,
      totalSessions: profile.sessionCount,
      totalReflections: profile.reflectionCount,
      resonanceScore: profile.resonanceScore,
      convergenceRate: profile.convergenceRate,
      dominantDimensions: dims,
      topDomains,
      historySpan,
    },
  };

  const contentHash = await sha256hex(JSON.stringify(credentialSubject));

  return {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://uor.foundation/ns/resonance/v1",
    ],
    "@type": ["VerifiableCredential", "ResonanceArchive"],
    issuer: "https://uor.foundation",
    issuanceDate: now,
    credentialSubject,
    proof: {
      type: "ContentAddressedProof2024",
      created: now,
      contentHash,
      method: "sha256-hex",
    },
  };
}

export function downloadArchive(archive: ResonanceArchive): void {
  const json = JSON.stringify(archive, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ts = new Date().toISOString().slice(0, 10);
  a.download = `resonance-archive-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

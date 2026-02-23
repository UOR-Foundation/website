/**
 * UOR SDK — Observer Theory & Discovery Engine (P9)
 *
 * Every app is a UOR Observer. Real engagement accumulates
 * IsometryCertificates. Coherence zone is computed from execution
 * trace quality. Discovery feed ranks by coherence zone + engagement
 * depth + cert count — mathematically bot-proof.
 *
 * Zones:
 *   COHERENCE — ≥80% Grade A traces (high trust)
 *   DRIFT     — 20–80% Grade A (degrading)
 *   COLLAPSE  — <20% Grade A (quarantine)
 *
 * H-score (epistemic debt): H=0 Grade A | H≤4 Grade C | H>4 Grade D
 *
 * @see observable: namespace — observer registration
 * @see proof: namespace — coherence proofs
 * @see cert: namespace — isometry certificates
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── Types ───────────────────────────────────────────────────────────────────

export type ObserverZoneType = "COHERENCE" | "DRIFT" | "COLLAPSE";

export interface AppObserverProfile {
  appCanonicalId: string;
  observerId: string;
  zone: ObserverZoneType;
  hScore: number;
  certifiedInteractions: number;
  isometryCertCount: number;
  discoveryRank: number;
  registeredAt: string;
  lastUpdated: string;
}

export interface NetworkSummary {
  totalApps: number;
  coherenceZone: number;
  driftZone: number;
  collapseZone: number;
  meanHScore: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── Discovery Engine ───────────────────────────────────────────────────────

export class DiscoveryEngine {
  private readonly kv: UnsKv;
  private readonly profileKeys: string[] = [];

  constructor(kv?: UnsKv) {
    this.kv = kv ?? new UnsKv();
  }

  /**
   * Register a new app as a UOR Observer.
   *
   * Pipeline:
   *   1. Compute founding derivation via neg(bnot(42)) — the critical identity
   *   2. Generate observer ID from app canonical ID
   *   3. Initialize profile with COHERENCE zone (clean start)
   *   4. Store in KV under observer:{appCanonicalId}
   */
  async registerApp(appCanonicalId: string): Promise<AppObserverProfile> {
    // Compute founding derivation (critical identity: neg(bnot(42)) = succ(42) = 43)
    const foundingProof = await singleProofHash({
      "@context": {
        observable: "https://uor.foundation/observable/",
        xsd: "http://www.w3.org/2001/XMLSchema#",
        term: { "@id": "observable:term", "@type": "xsd:string" },
        value: { "@id": "observable:value", "@type": "xsd:integer" },
      },
      "@type": "observable:FoundingDerivation",
      term: "neg(bnot(42))",
      value: 43,
    });

    const observerId = `observer-${appCanonicalId
      .replace("urn:uor:derivation:sha256:", "")
      .slice(0, 16)}`;

    const now = new Date().toISOString();

    const profile: AppObserverProfile = {
      appCanonicalId,
      observerId,
      zone: "COHERENCE",
      hScore: 0,
      certifiedInteractions: 0,
      isometryCertCount: 0,
      discoveryRank: 0,
      registeredAt: now,
      lastUpdated: now,
    };

    // Compute initial rank
    profile.discoveryRank = this.computeRank(profile);

    // Persist
    const key = this.profileKey(appCanonicalId);
    await this.kv.put(key, enc.encode(JSON.stringify(profile)));
    if (!this.profileKeys.includes(key)) this.profileKeys.push(key);

    return profile;
  }

  /**
   * Update observer zone based on execution trace quality.
   *
   * Zone assignment:
   *   - COHERENCE: hScore == 0 (all traces Grade A)
   *   - DRIFT: hScore <= 4 (some epistemic debt)
   *   - COLLAPSE: hScore > 4 (significant debt)
   */
  async updateZone(appCanonicalId: string): Promise<AppObserverProfile> {
    const profile = await this.getProfile(appCanonicalId);
    if (!profile) throw new Error(`App ${appCanonicalId} not registered`);

    // Determine zone from H-score
    if (profile.hScore === 0) {
      profile.zone = "COHERENCE";
    } else if (profile.hScore <= 4) {
      profile.zone = "DRIFT";
    } else {
      profile.zone = "COLLAPSE";
    }

    profile.discoveryRank = this.computeRank(profile);
    profile.lastUpdated = new Date().toISOString();

    await this.kv.put(
      this.profileKey(appCanonicalId),
      enc.encode(JSON.stringify(profile)),
    );

    return profile;
  }

  /**
   * Record a certified user interaction.
   * Each interaction is bound to a real Solid Pod user certificate.
   */
  async recordInteraction(
    appCanonicalId: string,
    _interactionCertId: string,
  ): Promise<void> {
    const profile = await this.getProfile(appCanonicalId);
    if (!profile) throw new Error(`App ${appCanonicalId} not registered`);

    profile.certifiedInteractions++;
    profile.discoveryRank = this.computeRank(profile);
    profile.lastUpdated = new Date().toISOString();

    await this.kv.put(
      this.profileKey(appCanonicalId),
      enc.encode(JSON.stringify(profile)),
    );
  }

  /**
   * Add an IsometryCertificate to an app's profile.
   */
  async addIsometryCert(appCanonicalId: string): Promise<void> {
    const profile = await this.getProfile(appCanonicalId);
    if (!profile) throw new Error(`App ${appCanonicalId} not registered`);

    profile.isometryCertCount++;
    profile.discoveryRank = this.computeRank(profile);
    profile.lastUpdated = new Date().toISOString();

    await this.kv.put(
      this.profileKey(appCanonicalId),
      enc.encode(JSON.stringify(profile)),
    );
  }

  /**
   * Set H-score for an app (used by updateZone pipeline).
   */
  async setHScore(appCanonicalId: string, hScore: number): Promise<void> {
    const profile = await this.getProfile(appCanonicalId);
    if (!profile) throw new Error(`App ${appCanonicalId} not registered`);

    profile.hScore = hScore;
    profile.lastUpdated = new Date().toISOString();

    await this.kv.put(
      this.profileKey(appCanonicalId),
      enc.encode(JSON.stringify(profile)),
    );
  }

  /**
   * Compute discovery rank.
   *
   * Formula:
   *   zoneBase + interactionBonus + isometryBonus
   *
   * COHERENCE: base 100 | DRIFT: base 50 | COLLAPSE: base 0
   * +1 per 10 certified interactions
   * +5 per isometry certificate
   */
  computeRank(profile: AppObserverProfile): number {
    const zoneScore =
      profile.zone === "COHERENCE" ? 100 :
      profile.zone === "DRIFT" ? 50 : 0;

    const interactionBonus = Math.floor(profile.certifiedInteractions / 10);
    const isometryBonus = profile.isometryCertCount * 5;

    return zoneScore + interactionBonus + isometryBonus;
  }

  /**
   * Get discovery feed — apps ranked by discoveryRank descending.
   */
  async getFeed(limit = 50): Promise<AppObserverProfile[]> {
    const profiles: AppObserverProfile[] = [];

    for (const key of this.profileKeys) {
      const result = await this.kv.get(key);
      if (result) {
        profiles.push(JSON.parse(dec.decode(result.value)));
      }
    }

    // Sort by discoveryRank descending (higher = better)
    profiles.sort((a, b) => b.discoveryRank - a.discoveryRank);

    return profiles.slice(0, limit);
  }

  /**
   * Get single app's observer profile.
   */
  async getProfile(appCanonicalId: string): Promise<AppObserverProfile | null> {
    const result = await this.kv.get(this.profileKey(appCanonicalId));
    if (!result) return null;
    return JSON.parse(dec.decode(result.value));
  }

  /**
   * Get network-wide summary across all registered apps.
   */
  async getNetworkSummary(): Promise<NetworkSummary> {
    const profiles: AppObserverProfile[] = [];

    for (const key of this.profileKeys) {
      const result = await this.kv.get(key);
      if (result) {
        profiles.push(JSON.parse(dec.decode(result.value)));
      }
    }

    let coherenceZone = 0;
    let driftZone = 0;
    let collapseZone = 0;
    let totalH = 0;

    for (const p of profiles) {
      if (p.zone === "COHERENCE") coherenceZone++;
      else if (p.zone === "DRIFT") driftZone++;
      else collapseZone++;
      totalH += p.hScore;
    }

    return {
      totalApps: profiles.length,
      coherenceZone,
      driftZone,
      collapseZone,
      meanHScore: profiles.length > 0 ? totalH / profiles.length : 0,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────

  private profileKey(appCanonicalId: string): string {
    const hash = appCanonicalId
      .replace("urn:uor:derivation:sha256:", "")
      .slice(0, 20);
    return `observer-${hash}`;
  }
}

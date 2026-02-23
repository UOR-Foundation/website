/**
 * Observer Theory & Discovery Engine (P9) — 10/10 Test Suite
 */

import { describe, it, expect } from "vitest";
import { DiscoveryEngine } from "@/modules/uor-sdk/discovery";

const APP1 =
  "urn:uor:derivation:sha256:app9100000000000000000000000000000000000000000000000000000000000";
const APP2 =
  "urn:uor:derivation:sha256:app9200000000000000000000000000000000000000000000000000000000000";
const APP3 =
  "urn:uor:derivation:sha256:app9300000000000000000000000000000000000000000000000000000000000";

describe("Observer Theory & Discovery Engine (P9)", () => {
  // Test 1
  it("registerApp returns profile with observerId string", async () => {
    const engine = new DiscoveryEngine();
    const profile = await engine.registerApp(APP1);
    expect(typeof profile.observerId).toBe("string");
    expect(profile.observerId.length).toBeGreaterThan(0);
  });

  // Test 2
  it("registerApp returns profile with zone COHERENCE initially", async () => {
    const engine = new DiscoveryEngine();
    const profile = await engine.registerApp(APP1);
    expect(profile.zone).toBe("COHERENCE");
  });

  // Test 3
  it("updateZone updates profile zone based on hScore", async () => {
    const engine = new DiscoveryEngine();
    await engine.registerApp(APP1);

    // Set hScore to trigger DRIFT
    await engine.setHScore(APP1, 3);
    const updated = await engine.updateZone(APP1);
    expect(updated.zone).toBe("DRIFT");
  });

  // Test 4
  it("recordInteraction increments certifiedInteractions count", async () => {
    const engine = new DiscoveryEngine();
    await engine.registerApp(APP1);
    await engine.recordInteraction(APP1, "cert-abc123");
    await engine.recordInteraction(APP1, "cert-def456");

    const profile = await engine.getProfile(APP1);
    expect(profile!.certifiedInteractions).toBe(2);
  });

  // Test 5
  it("computeRank returns higher score for COHERENCE than DRIFT", () => {
    const engine = new DiscoveryEngine();
    const coherence = engine.computeRank({
      appCanonicalId: APP1,
      observerId: "obs1",
      zone: "COHERENCE",
      hScore: 0,
      certifiedInteractions: 0,
      isometryCertCount: 0,
      discoveryRank: 0,
      registeredAt: "",
      lastUpdated: "",
    });
    const drift = engine.computeRank({
      appCanonicalId: APP2,
      observerId: "obs2",
      zone: "DRIFT",
      hScore: 2,
      certifiedInteractions: 0,
      isometryCertCount: 0,
      discoveryRank: 0,
      registeredAt: "",
      lastUpdated: "",
    });
    expect(coherence).toBeGreaterThan(drift);
  });

  // Test 6
  it("computeRank increases with more isometry certificates", () => {
    const engine = new DiscoveryEngine();
    const base = engine.computeRank({
      appCanonicalId: APP1,
      observerId: "obs1",
      zone: "COHERENCE",
      hScore: 0,
      certifiedInteractions: 0,
      isometryCertCount: 0,
      discoveryRank: 0,
      registeredAt: "",
      lastUpdated: "",
    });
    const withCerts = engine.computeRank({
      appCanonicalId: APP1,
      observerId: "obs1",
      zone: "COHERENCE",
      hScore: 0,
      certifiedInteractions: 0,
      isometryCertCount: 3,
      discoveryRank: 0,
      registeredAt: "",
      lastUpdated: "",
    });
    expect(withCerts).toBeGreaterThan(base);
  });

  // Test 7
  it("getFeed returns apps ordered by discoveryRank descending", async () => {
    const engine = new DiscoveryEngine();
    await engine.registerApp(APP1);
    await engine.registerApp(APP2);

    // Give APP2 more interactions
    for (let i = 0; i < 20; i++) {
      await engine.recordInteraction(APP2, `cert-${i}`);
    }

    const feed = await engine.getFeed();
    expect(feed.length).toBe(2);
    expect(feed[0].discoveryRank).toBeGreaterThanOrEqual(feed[1].discoveryRank);
    expect(feed[0].appCanonicalId).toBe(APP2);
  });

  // Test 8
  it("COLLAPSE zone app ranks below DRIFT zone app", async () => {
    const engine = new DiscoveryEngine();
    await engine.registerApp(APP1);
    await engine.registerApp(APP2);

    // APP1 → DRIFT
    await engine.setHScore(APP1, 3);
    await engine.updateZone(APP1);

    // APP2 → COLLAPSE
    await engine.setHScore(APP2, 6);
    await engine.updateZone(APP2);

    const feed = await engine.getFeed();
    const driftApp = feed.find((p) => p.appCanonicalId === APP1)!;
    const collapseApp = feed.find((p) => p.appCanonicalId === APP2)!;
    expect(driftApp.discoveryRank).toBeGreaterThan(collapseApp.discoveryRank);
  });

  // Test 9
  it("getNetworkSummary counts apps correctly across all zones", async () => {
    const engine = new DiscoveryEngine();
    await engine.registerApp(APP1); // COHERENCE
    await engine.registerApp(APP2); // will be DRIFT
    await engine.registerApp(APP3); // will be COLLAPSE

    await engine.setHScore(APP2, 2);
    await engine.updateZone(APP2);
    await engine.setHScore(APP3, 7);
    await engine.updateZone(APP3);

    const summary = await engine.getNetworkSummary();
    expect(summary.totalApps).toBe(3);
    expect(summary.coherenceZone).toBe(1);
    expect(summary.driftZone).toBe(1);
    expect(summary.collapseZone).toBe(1);
  });

  // Test 10
  it("getProfile returns same profile as registered", async () => {
    const engine = new DiscoveryEngine();
    const registered = await engine.registerApp(APP1);
    const retrieved = await engine.getProfile(APP1);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.appCanonicalId).toBe(registered.appCanonicalId);
    expect(retrieved!.observerId).toBe(registered.observerId);
    expect(retrieved!.zone).toBe(registered.zone);
  });
});

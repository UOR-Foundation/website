import { describe, it, expect, beforeAll } from "vitest";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";
import { singleProofHash } from "@/modules/uns/core/identity";
import {
  canonicalIdToOrbitPrefix,
  canonicalIdToBgpCommunity,
  bgpCommunityToOrbitPrefix,
  buildRouteAnnouncements,
  UnsNode,
} from "@/modules/uns/mesh";

describe("UNS Mesh — BGP Orbit Routing & Node Orchestrator", () => {
  let kp: UnsKeypair;
  let canonicalId: string;
  let canonicalId2: string;

  beforeAll(async () => {
    kp = await generateKeypair();
    const id1 = await singleProofHash({ test: "orbit-1" });
    const id2 = await singleProofHash({ test: "orbit-2" });
    canonicalId = id1["u:canonicalId"];
    canonicalId2 = id2["u:canonicalId"];
  });

  // ── BGP Orbit Community ───────────────────────────────────────────────────

  it("1. canonicalIdToOrbitPrefix returns /64 matching expected pattern", () => {
    const prefix = canonicalIdToOrbitPrefix(canonicalId);
    expect(prefix).toMatch(/^fd00:0075:6f72:[0-9a-f]{4}:[0-9a-f]{4}::\/64$/);
  });

  it("2. canonicalIdToBgpCommunity returns exactly 8 bytes", () => {
    const community = canonicalIdToBgpCommunity(canonicalId);
    expect(community.length).toBe(8);
  });

  it("3. Bytes 0-1 of community are 0x00, 0x02 (type)", () => {
    const c = canonicalIdToBgpCommunity(canonicalId);
    expect(c[0]).toBe(0x00);
    expect(c[1]).toBe(0x02);
  });

  it("4. Bytes 2-3 of community are 0x00, 0x55 (sub-type)", () => {
    const c = canonicalIdToBgpCommunity(canonicalId);
    expect(c[2]).toBe(0x00);
    expect(c[3]).toBe(0x55);
  });

  it("5. bgpCommunityToOrbitPrefix(canonicalIdToBgpCommunity(id)) matches same /64 prefix", () => {
    const community = canonicalIdToBgpCommunity(canonicalId);
    const prefix1 = canonicalIdToOrbitPrefix(canonicalId);
    const prefix2 = bgpCommunityToOrbitPrefix(community);
    expect(prefix2).toBe(prefix1);
  });

  it("6. Different canonical IDs → different orbit prefixes", () => {
    const p1 = canonicalIdToOrbitPrefix(canonicalId);
    const p2 = canonicalIdToOrbitPrefix(canonicalId2);
    expect(p1).not.toBe(p2);
  });

  // ── Node Orchestrator ─────────────────────────────────────────────────────

  it("7. UnsNode starts without error, health returns {status:'ok'}", async () => {
    const node = new UnsNode({
      dataDir: "/tmp/uns-test",
      nodeIdentity: kp,
      dhtPort: 4001,
      httpPort: 8080,
      enableShield: true,
      enableCompute: true,
      enableStore: true,
      enableLedger: true,
      enableTrust: true,
    });

    await node.start();
    const health = node.health();
    expect(health.status).toBe("ok");
    expect(health.services.resolver).toBe(true);
    expect(health.services.shield).toBe(true);
    expect(health.services.store).toBe(true);
    await node.stop();
  });

  it("8. nodeCanonicalId() returns valid canonical ID pattern", async () => {
    const node = new UnsNode({
      dataDir: "/tmp/uns-test",
      nodeIdentity: kp,
      dhtPort: 4001,
      httpPort: 8080,
      enableShield: false,
      enableCompute: false,
      enableStore: false,
      enableLedger: false,
      enableTrust: false,
    });

    await node.start();
    const nid = node.nodeCanonicalId();
    expect(nid).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
    await node.stop();
  });

  it("9. UnsNode stop() resolves cleanly (no hanging connections)", async () => {
    const node = new UnsNode({
      dataDir: "/tmp/uns-test",
      nodeIdentity: kp,
      dhtPort: 4001,
      httpPort: 8080,
      enableShield: true,
      enableCompute: true,
      enableStore: true,
      enableLedger: true,
      enableTrust: true,
    });

    await node.start();
    expect(node.isRunning()).toBe(true);

    await node.stop();
    expect(node.isRunning()).toBe(false);
    expect(node.health().status).toBe("error");
  });

  it("10. buildRouteAnnouncements returns one announcement per canonical ID", () => {
    const nodeIpv6 = "fd00:0075:6f72::1";
    const ids = [canonicalId, canonicalId2];
    const announcements = buildRouteAnnouncements(ids, nodeIpv6);

    expect(announcements.length).toBe(2);
    expect(announcements[0].canonicalId).toBe(canonicalId);
    expect(announcements[0].nexthop).toBe(nodeIpv6);
    expect(announcements[0].prefix).toMatch(/^fd00:0075:6f72:/);
    expect(announcements[0].communityValue).toMatch(/^00020055[0-9a-f]{8}$/);
    expect(announcements[1].canonicalId).toBe(canonicalId2);
  });
});

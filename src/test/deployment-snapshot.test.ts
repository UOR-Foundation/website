/**
 * Deployment Snapshot — Unified Versioning Gate Tests
 *
 * Verifies that code, dependencies, and data all go through the
 * same singleProofHash gate and compose into a single canonical ID.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createSnapshot,
  verifySnapshot,
  diffSnapshots,
  hashComponentBytes,
  buildSnapshotChain,
  SnapshotRegistry,
} from "@/modules/uns/build/snapshot";
import type {
  SnapshotComponent,
  DeploymentSnapshot,
} from "@/modules/uns/build/snapshot";
import { UnsKv } from "@/modules/uns/store/kv";

const CREATOR = "urn:uor:derivation:sha256:dev0000000000000000000000000000000000000000000000000000000000000";

function makeComponent(
  type: SnapshotComponent["type"],
  id: string,
  label: string,
): SnapshotComponent {
  return { type, canonicalId: `urn:uor:derivation:sha256:${id}`, label };
}

describe("Deployment Snapshot — Unified Versioning Gate", () => {
  // Test 1: createSnapshot produces a canonical ID from components
  it("createSnapshot produces a canonical ID binding all components", async () => {
    const snapshot = await createSnapshot({
      components: [
        makeComponent("code", "aaa", "app-manifest v1"),
        makeComponent("image", "bbb", "myapp:latest"),
        makeComponent("dependencies", "ccc", "package-lock.json"),
        makeComponent("data", "ddd", "db-state"),
      ],
      label: "v1.0.0",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    expect(snapshot["u:canonicalId"]).toMatch(/^urn:uor:derivation:sha256:[0-9a-f]{64}$/);
    expect(snapshot["u:cid"]).toBeTruthy();
    expect(snapshot["u:ipv6"]).toMatch(/^fd00:/);
    expect(snapshot.components).toHaveLength(4);
    expect(snapshot["@type"]).toBe("state:DeploymentSnapshot");
  });

  // Test 2: Same components produce the same canonical ID (determinism)
  it("same components produce the same canonical ID", async () => {
    const input = {
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "bbb", "lockfile"),
      ],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    };

    const s1 = await createSnapshot(input);
    const s2 = await createSnapshot(input);

    expect(s1["u:canonicalId"]).toBe(s2["u:canonicalId"]);
  });

  // Test 3: Changing any component changes the snapshot ID
  it("changing any single component changes the snapshot canonical ID", async () => {
    const base = {
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    };

    const s1 = await createSnapshot({
      ...base,
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "bbb", "lockfile"),
      ],
    });

    const s2 = await createSnapshot({
      ...base,
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "ccc", "lockfile-updated"), // changed
      ],
    });

    expect(s1["u:canonicalId"]).not.toBe(s2["u:canonicalId"]);
  });

  // Test 4: verifySnapshot confirms integrity
  it("verifySnapshot returns true for untampered snapshot", async () => {
    const snapshot = await createSnapshot({
      components: [makeComponent("code", "aaa", "manifest")],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    expect(await verifySnapshot(snapshot)).toBe(true);
  });

  // Test 5: verifySnapshot detects tampering
  it("verifySnapshot returns false when component is tampered", async () => {
    const snapshot = await createSnapshot({
      components: [makeComponent("code", "aaa", "manifest")],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    // Tamper with a component
    snapshot.components[0].canonicalId = "urn:uor:derivation:sha256:tampered";

    expect(await verifySnapshot(snapshot)).toBe(false);
  });

  // Test 6: diffSnapshots identifies changes
  it("diffSnapshots correctly identifies added, removed, changed, and unchanged", async () => {
    const older = await createSnapshot({
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "bbb", "lockfile"),
        makeComponent("config", "eee", "env"),
      ],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    const newer = await createSnapshot({
      components: [
        makeComponent("code", "aaa", "manifest"),        // unchanged
        makeComponent("dependencies", "ccc", "lockfile"), // changed
        makeComponent("data", "ddd", "db-state"),         // added (config removed)
      ],
      label: "v2",
      version: "2.0.0",
      creatorCanonicalId: CREATOR,
    });

    const diff = diffSnapshots(older, newer);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.unchanged[0].type).toBe("code");
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].type).toBe("dependencies");
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].type).toBe("data");
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].type).toBe("config");
  });

  // Test 7: hashComponentBytes produces canonical ID from raw bytes
  it("hashComponentBytes creates a component from raw lockfile bytes", async () => {
    const lockfileContent = new TextEncoder().encode(
      JSON.stringify({ dependencies: { react: "^18.3.1" } }),
    );

    const component = await hashComponentBytes(
      "dependencies",
      "package-lock.json",
      lockfileContent,
    );

    expect(component.type).toBe("dependencies");
    expect(component.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
    expect(component.sizeBytes).toBe(lockfileContent.length);
  });

  // Test 8: Version chain links snapshots correctly
  it("buildSnapshotChain orders snapshots oldest-first via previousSnapshotId", async () => {
    const v1 = await createSnapshot({
      components: [makeComponent("code", "aaa", "v1")],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    const v2 = await createSnapshot({
      components: [makeComponent("code", "bbb", "v2")],
      label: "v2",
      version: "2.0.0",
      creatorCanonicalId: CREATOR,
      previousSnapshotId: v1["u:canonicalId"],
    });

    const v3 = await createSnapshot({
      components: [makeComponent("code", "ccc", "v3")],
      label: "v3",
      version: "3.0.0",
      creatorCanonicalId: CREATOR,
      previousSnapshotId: v2["u:canonicalId"],
    });

    // Pass out of order
    const chain = buildSnapshotChain([v3, v1, v2]);

    expect(chain).toHaveLength(3);
    expect(chain[0]["u:canonicalId"]).toBe(v1["u:canonicalId"]);
    expect(chain[1]["u:canonicalId"]).toBe(v2["u:canonicalId"]);
    expect(chain[2]["u:canonicalId"]).toBe(v3["u:canonicalId"]);
  });

  // Test 9: SnapshotRegistry stores and retrieves by ID, label, and latest
  it("SnapshotRegistry stores and retrieves snapshots", async () => {
    const kv = new UnsKv();
    const registry = new SnapshotRegistry(kv);

    const snapshot = await createSnapshot({
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "bbb", "lockfile"),
      ],
      label: "production-v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    await registry.store(snapshot);

    // Retrieve by ID
    const byId = await registry.get(snapshot["u:canonicalId"]);
    expect(byId).not.toBeNull();
    expect(byId!["u:canonicalId"]).toBe(snapshot["u:canonicalId"]);

    // Retrieve by label
    const byLabel = await registry.getByLabel("production-v1");
    expect(byLabel).not.toBeNull();
    expect(byLabel!["u:canonicalId"]).toBe(snapshot["u:canonicalId"]);

    // Retrieve latest for creator
    const latest = await registry.getLatest(CREATOR);
    expect(latest).not.toBeNull();
    expect(latest!["u:canonicalId"]).toBe(snapshot["u:canonicalId"]);
  });

  // Test 10: Components are sorted deterministically regardless of input order
  it("component order does not affect canonical ID", async () => {
    const s1 = await createSnapshot({
      components: [
        makeComponent("dependencies", "bbb", "lockfile"),
        makeComponent("code", "aaa", "manifest"),
      ],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    const s2 = await createSnapshot({
      components: [
        makeComponent("code", "aaa", "manifest"),
        makeComponent("dependencies", "bbb", "lockfile"),
      ],
      label: "v1",
      version: "1.0.0",
      creatorCanonicalId: CREATOR,
    });

    expect(s1["u:canonicalId"]).toBe(s2["u:canonicalId"]);
  });
});

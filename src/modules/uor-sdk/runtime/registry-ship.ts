/**
 * UOR SDK — Registry Ship
 *
 * Signs an app image + manifest, pushes to the UOR registry,
 * and creates a deployment snapshot binding code, image, and config.
 *
 * This is the "docker push" equivalent for vibe-coded apps.
 *
 * Pipeline:
 *   1. Push image to UNS registry (content-addressed dedup)
 *   2. Tag with app name + version
 *   3. Create deployment snapshot (code + image + config)
 *   4. Return ship receipt with registry URL + snapshot ID
 *
 * @see uns/build/registry — image registry (push/pull/tag)
 * @see uns/build/snapshot — deployment snapshots
 */

import { pushImage, tagImage } from "@/modules/uns/build/registry";
import {
  createSnapshot,
  hashComponentBytes,
} from "@/modules/uns/build/snapshot";
import type { UorImage } from "@/modules/uns/build/uorfile";
import type { DeploymentSnapshot, SnapshotComponent } from "@/modules/uns/build/snapshot";
import type { PushResult } from "@/modules/uns/build/registry";
import type { AppManifest } from "../app-identity";

// ── Types ───────────────────────────────────────────────────────────────────

/** Input for the ship operation. */
export interface ShipInput {
  /** The built UorImage. */
  image: UorImage;
  /** The app manifest. */
  manifest: AppManifest;
  /** Developer's canonical ID. */
  developerCanonicalId: string;
  /** App name for tagging. */
  appName: string;
  /** App version for tagging. */
  version: string;
  /** Previous snapshot ID (for version chain). */
  previousSnapshotId?: string;
}

/** Result of the ship operation. */
export interface ShipResult {
  /** Push result from registry. */
  push: PushResult;
  /** Deployment snapshot binding all components. */
  snapshot: DeploymentSnapshot;
  /** Registry URL where image is stored. */
  registryUrl: string;
  /** Tags applied. */
  tags: string[];
}

// ── Ship Engine ─────────────────────────────────────────────────────────────

/**
 * Ship an app image to the UOR registry.
 *
 * Complete "docker push" pipeline:
 *   1. Push image to content-addressed registry
 *   2. Apply name:version + name:latest tags
 *   3. Build snapshot components (code, image, config)
 *   4. Create unified deployment snapshot
 */
export async function shipApp(input: ShipInput): Promise<ShipResult> {
  const { image, manifest, developerCanonicalId, appName, version } = input;

  // 1. Push image to registry
  const tags = [`${appName}:${version}`, `${appName}:latest`];
  const push = await pushImage(image, tags);

  // 2. Build snapshot components
  const components: SnapshotComponent[] = [];

  // Code component (from manifest)
  if (manifest["u:canonicalId"]) {
    components.push({
      type: "code",
      canonicalId: manifest["u:canonicalId"],
      label: `${appName} manifest v${version}`,
    });
  }

  // Image component
  components.push({
    type: "image",
    canonicalId: image.canonicalId,
    label: `${appName} image v${version}`,
    sizeBytes: image.sizeBytes,
  });

  // Config component (env fingerprint)
  const configBytes = new TextEncoder().encode(
    JSON.stringify(image.spec.env),
  );
  const configComponent = await hashComponentBytes(
    "config",
    `${appName} config v${version}`,
    configBytes,
  );
  components.push(configComponent);

  // 3. Create deployment snapshot
  const snapshot = await createSnapshot({
    components,
    previousSnapshotId: input.previousSnapshotId,
    label: `${appName}@${version}`,
    creatorCanonicalId: developerCanonicalId,
    version,
  });

  return {
    push,
    snapshot,
    registryUrl: push.registryUrl,
    tags,
  };
}

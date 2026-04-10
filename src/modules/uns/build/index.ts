/**
 * UNS Build — Module Barrel Export
 * @ontology uor:ContainerRuntime
 * ═════════════════════════════════════════════════════════════════
 *
 * Complete Build → Ship → Run system.
 * The UOR equivalent of the Docker + Kubernetes toolchain.
 *
 * Container runtime is NOT re-exported here to avoid PWA Rollup
 * resolution issues. Import directly from "./container" instead:
 *   import { createContainer } from "@/modules/uns/build/container";
 *
 * @version 2.1.0
 */

// ══════════════════════════════════════════════════════════════════════════
// IMAGE BUILD (docker build / Dockerfile)
// ══════════════════════════════════════════════════════════════════════════

export {
  parseUorfile,
  parseDockerfile,
  buildImage,
  serializeUorfile,
} from "./uorfile";
export type {
  UorfileDirective,
  UorfileInstruction,
  UorfileBuildSpec,
  UorfileBaseImage,
  UorfileHealthcheck,
  UorImage,
  UorImageLayer,
} from "./uorfile";

// ══════════════════════════════════════════════════════════════════════════
// DOCKER COMPATIBILITY (docker image wrapping / Dockerfile translation)
// ══════════════════════════════════════════════════════════════════════════

export {
  parseDockerRef,
  wrapDockerImage,
  buildFromDockerfile,
  generateCompatReport,
  DOCKER_FEATURE_MAP,
  DOCKER_VERB_MAP,
} from "./docker-compat";
export type {
  DockerImageRef,
  WrappedDockerImage,
  DockerCompatStatus,
  DockerFeatureMapping,
  DockerVerbMapping,
} from "./docker-compat";

// ══════════════════════════════════════════════════════════════════════════
// IMAGE REGISTRY (docker tag / push / pull / inspect / history)
// ══════════════════════════════════════════════════════════════════════════

export {
  tagImage,
  resolveTag,
  listTags,
  removeTag,
  pushImage,
  pullImage,
  listImages,
  inspectImage,
  imageHistory,
  removeImage,
  searchImages,
  clearImageRegistry,
} from "./registry";
export type {
  ImageTag,
  PushResult,
  PullResult,
  ImageHistoryEntry,
} from "./registry";

// ══════════════════════════════════════════════════════════════════════════
// COMPOSE (docker compose up / down / ps / scale)
// ══════════════════════════════════════════════════════════════════════════

export {
  parseComposeSpec,
  composeUp,
  composeDown,
  composePs,
  composeScale,
  getComposeApp,
  listComposeApps,
  clearComposeApps,
} from "./compose";
export type {
  ComposeService,
  ComposeBuildConfig,
  ComposeHealthcheck,
  ComposeResources,
  ComposeVolume,
  ComposeNetwork,
  ComposeSecret,
  ComposeSpec,
  ComposeApp,
  ComposeServiceStatus,
} from "./compose";

// ══════════════════════════════════════════════════════════════════════════
// SECRETS MANAGER (docker secret create / ls / inspect / rm)
// ══════════════════════════════════════════════════════════════════════════

export {
  createSecret,
  listSecrets,
  inspectSecret,
  getSecretValue,
  removeSecret,
  injectSecrets,
  clearSecrets,
} from "./secrets";
export type {
  UorSecret,
  SecretValue,
  SecretWriteResult,
} from "./secrets";

// ══════════════════════════════════════════════════════════════════════════
// DEPLOYMENT SNAPSHOTS (docker checkpoint — unified versioning gate)
// ══════════════════════════════════════════════════════════════════════════

export {
  createSnapshot,
  verifySnapshot,
  diffSnapshots,
  hashComponentBytes,
  buildSnapshotChain,
  SnapshotRegistry,
} from "./snapshot";
export type {
  SnapshotComponent,
  DeploymentSnapshot,
  SnapshotInput,
  SnapshotDiff,
} from "./snapshot";

// ══════════════════════════════════════════════════════════════════════════
// CONTAINER RUNTIME
// Not re-exported from barrel to avoid PWA Rollup resolution issues.
// Import directly:
//   import { createContainer } from "@/modules/uns/build/container";
// ══════════════════════════════════════════════════════════════════════════

/* end of barrel – v2.1.0 */

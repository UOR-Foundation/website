/**
 * UNS Build. Module Barrel Export
 * ═════════════════════════════════════════════════════════════════
 *
 * Complete Build → Ship → Run system.
 * The UOR equivalent of the Docker + Kubernetes toolchain.
 *
 * ┌────────────────────────────────────────────────────────────────┐
 * │  Docker Equivalent          │  UOR Implementation             │
 * │────────────────────────────│──────────────────────────────────│
 * │  Dockerfile                 │  Uorfile (+ CANON, TRUST, SHIELD) │
 * │  docker build               │  buildImage()                    │
 * │  docker create / run        │  createContainer()               │
 * │  docker start / stop        │  startContainer() / stopContainer() │
 * │  docker exec                │  execContainer()                 │
 * │  docker pause / unpause     │  pauseContainer() / unpauseContainer() │
 * │  docker ps / inspect        │  listContainers() / inspectContainer() │
 * │  docker logs                │  containerLogs()                 │
 * │  docker tag / push / pull   │  tagImage() / pushImage() / pullImage() │
 * │  docker compose up/down     │  composeUp() / composeDown()     │
 * │  docker secret              │  createSecret() / getSecretValue() │
 * │  Docker Hub (registry)      │  UOR Image Registry              │
 * │  Docker image wrapping      │  wrapDockerImage()               │
 * │  docker checkpoint          │  createSnapshot()                │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Orchestration (Kubernetes equivalent) lives in @/modules/compose:
 *   - SovereignReconciler  (K8s Controller Manager)
 *   - SovereignAutoScaler  (K8s HPA)
 *   - SovereignRollingUpdate (K8s Deployment rolling update)
 *   - AppKernel             (container isolation + permissions)
 *   - Orchestrator           (kubelet + scheduler)
 *
 * @version 2.0.0
 */

// ══════════════════════════════════════════════════════════════════════════
// CONTAINER RUNTIME (docker create / run / exec / stop / rm)
// ══════════════════════════════════════════════════════════════════════════

export {
  createContainer,
  startContainer,
  stopContainer,
  pauseContainer,
  unpauseContainer,
  crashContainer,
  removeContainer,
  execContainer,
  listContainers,
  inspectContainer,
  containerLogs,
  getContainer,
  linkContainerToKernel,
  clearContainers,
} from "./container";
export type {
  ContainerState,
  ContainerPortMapping,
  ContainerMount,
  ContainerResources,
  ContainerConfig,
  ContainerEvent,
  ContainerEventType,
  ContainerLogEntry,
  UorContainer,
  ContainerInspection,
  ExecResult,
} from "./container";

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

/* end of barrel */

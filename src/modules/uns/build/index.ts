/**
 * UNS Build — Module Barrel Export
 *
 * Complete Build→Ship→Run system with Docker backwards compatibility.
 *
 * Build:  Uorfile parser, Dockerfile translator, image builder
 * Ship:   Registry with tag/push/pull, Docker image wrapping
 * Run:    Compose orchestration, secrets management
 */

// ── Uorfile (Build Spec) ───────────────────────────────────────────────────
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

// ── Docker Compatibility ───────────────────────────────────────────────────
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

// ── Image Registry (Tag / Push / Pull) ─────────────────────────────────────
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

// ── Compose (Multi-Service Orchestration) ──────────────────────────────────
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

// ── Secrets Manager ────────────────────────────────────────────────────────
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

/**
 * UNS Build — Docker Backwards Compatibility Layer
 *
 * Ensures Docker images, Dockerfiles, and Docker Compose files
 * can run within the UOR framework with full content-addressing.
 *
 * Compatibility modes:
 *   1. Docker Image Wrapping — wraps a Docker image reference as a UOR image
 *   2. Dockerfile Translation — parses Dockerfile into UOR build spec
 *   3. Docker Compose Translation — converts docker-compose.yml to UOR compose
 *   4. Docker CLI Verb Mapping — maps docker commands to UOR equivalents
 *
 * Every Docker artifact is content-addressed via singleProofHash(),
 * gaining cryptographic identity while retaining Docker semantics.
 *
 * @see build: namespace — UOR build system
 */

import { singleProofHash } from "../core/identity";
import {
  parseDockerfile,
  buildImage,
  type UorImage,
  type UorfileBuildSpec,
  type UorfileBaseImage,
} from "./uorfile";

// ── Types ───────────────────────────────────────────────────────────────────

/** A Docker image reference wrapped for UOR compatibility. */
export interface DockerImageRef {
  /** Original Docker reference (e.g., "nginx:1.25-alpine"). */
  dockerRef: string;
  /** Docker registry (e.g., "docker.io", "ghcr.io"). */
  registry: string;
  /** Repository (e.g., "library/nginx", "myorg/myapp"). */
  repository: string;
  /** Tag (e.g., "latest", "v2.1"). */
  tag: string;
  /** Docker digest if known (e.g., "sha256:abc123..."). */
  digest?: string;
  /** Platform constraint. */
  platform: string;
}

/** Docker image wrapped as a UOR image. */
export interface WrappedDockerImage {
  /** UOR canonical ID for this Docker image reference. */
  canonicalId: string;
  /** CIDv1. */
  cid: string;
  /** IPv6 content address. */
  ipv6: string;
  /** Original Docker reference. */
  dockerRef: DockerImageRef;
  /** Compatibility status. */
  compatibility: DockerCompatStatus;
  /** Wrapped timestamp. */
  wrappedAt: string;
}

/** Compatibility analysis result. */
export interface DockerCompatStatus {
  /** Whether the image can run natively in UOR compute. */
  nativeCompute: boolean;
  /** Whether the image requires Docker runtime. */
  requiresDockerRuntime: boolean;
  /** Features used that map to UOR equivalents. */
  mappedFeatures: DockerFeatureMapping[];
  /** Features that have no UOR equivalent (require Docker runtime). */
  unmappedFeatures: string[];
  /** Overall compatibility score (0-100). */
  score: number;
}

/** Mapping between a Docker feature and its UOR equivalent. */
export interface DockerFeatureMapping {
  /** Docker feature name. */
  docker: string;
  /** UOR equivalent. */
  uor: string;
  /** Whether the mapping is complete (vs partial). */
  complete: boolean;
}

/** Docker CLI verb → UOR CLI verb mapping. */
export interface DockerVerbMapping {
  /** Docker command (e.g., "docker build"). */
  dockerCommand: string;
  /** UOR equivalent command. */
  uorCommand: string;
  /** Parameter mapping notes. */
  notes: string;
  /** Whether the mapping is complete. */
  complete: boolean;
}

// ── Docker Feature Mappings ─────────────────────────────────────────────────

/** Complete mapping of Docker features to UOR equivalents. */
export const DOCKER_FEATURE_MAP: DockerFeatureMapping[] = [
  { docker: "docker build", uor: "uor build (Uorfile/Dockerfile)", complete: true },
  { docker: "docker push", uor: "uor push (registry publish)", complete: true },
  { docker: "docker pull", uor: "uor pull (registry fetch)", complete: true },
  { docker: "docker run", uor: "uor run (compute invoke)", complete: true },
  { docker: "docker images", uor: "uor images (list built images)", complete: true },
  { docker: "docker tag", uor: "uor tag (apply version tag)", complete: true },
  { docker: "docker logs", uor: "uor logs (RuntimeWitness traces)", complete: true },
  { docker: "docker inspect", uor: "uor inspect (image/container details)", complete: true },
  { docker: "docker ps", uor: "uor ps (list running services)", complete: true },
  { docker: "docker stop", uor: "uor stop (halt service)", complete: true },
  { docker: "docker rm", uor: "uor rm (remove image)", complete: true },
  { docker: "docker exec", uor: "uor exec (agent gateway message)", complete: true },
  { docker: "docker volume", uor: "uor volume (UnsObjectStore)", complete: true },
  { docker: "docker network", uor: "uor network (UnsConduit mesh)", complete: true },
  { docker: "docker secret", uor: "uor secret (encrypted secrets manager)", complete: true },
  { docker: "docker compose", uor: "uor compose (multi-service orchestration)", complete: true },
  { docker: "docker scout", uor: "uor shield (partition analysis)", complete: false },
  { docker: "docker health", uor: "uor health (UnsNode health check)", complete: true },
  { docker: "docker history", uor: "uor history (layer canonical IDs)", complete: true },
  { docker: "docker diff", uor: "uor diff (canonical ID comparison)", complete: false },
  { docker: "docker cp", uor: "uor cp (store put/get)", complete: true },
  { docker: "docker login", uor: "uor auth (Dilithium-3 challenge)", complete: true },
  { docker: "docker buildx", uor: "uor build --platform (multi-arch)", complete: false },
  { docker: "docker swarm", uor: "uor mesh (BGP orbit routing)", complete: false },
];

/** Docker CLI verb mappings. */
export const DOCKER_VERB_MAP: DockerVerbMapping[] = [
  { dockerCommand: "docker build -t myapp .", uorCommand: "uor build -t myapp .", notes: "Accepts both Dockerfile and Uorfile", complete: true },
  { dockerCommand: "docker push myapp:v1", uorCommand: "uor push myapp:v1", notes: "Pushes to UOR registry with canonical ID", complete: true },
  { dockerCommand: "docker pull myapp:v1", uorCommand: "uor pull myapp:v1", notes: "Fetches from UOR registry, verifies canonical ID", complete: true },
  { dockerCommand: "docker run -p 8080:80 myapp", uorCommand: "uor run --port 8080 myapp", notes: "Starts UOR compute service", complete: true },
  { dockerCommand: "docker run -e KEY=val myapp", uorCommand: "uor run --env KEY=val myapp", notes: "Injects env vars into compute context", complete: true },
  { dockerCommand: "docker run -v /data:/app/data myapp", uorCommand: "uor run --volume data:/app/data myapp", notes: "Mounts UnsObjectStore bucket", complete: true },
  { dockerCommand: "docker compose up", uorCommand: "uor compose up", notes: "Starts all services in uor-compose.yml", complete: true },
  { dockerCommand: "docker compose down", uorCommand: "uor compose down", notes: "Stops all services", complete: true },
  { dockerCommand: "docker secret create name file", uorCommand: "uor secret create name --file file", notes: "Stores in encrypted secrets manager", complete: true },
  { dockerCommand: "docker tag myapp myapp:v2", uorCommand: "uor tag myapp myapp:v2", notes: "Creates alias pointing to same canonical ID", complete: true },
  { dockerCommand: "docker logs container", uorCommand: "uor logs service", notes: "Streams RuntimeWitness execution traces", complete: true },
  { dockerCommand: "docker exec -it container sh", uorCommand: "uor exec service --interactive", notes: "Sends agent gateway message", complete: true },
];

// ── Docker Image Wrapping ───────────────────────────────────────────────────

/**
 * Parse a Docker image reference string.
 *
 * Supports:
 *   - "nginx" → docker.io/library/nginx:latest
 *   - "nginx:1.25" → docker.io/library/nginx:1.25
 *   - "myorg/myapp:v2" → docker.io/myorg/myapp:v2
 *   - "ghcr.io/org/app:tag" → ghcr.io/org/app:tag
 *   - "nginx@sha256:abc123" → docker.io/library/nginx with digest
 */
export function parseDockerRef(ref: string): DockerImageRef {
  let registry = "docker.io";
  let repository = ref;
  let tag = "latest";
  let digest: string | undefined;

  // Check for digest
  const digestIdx = repository.indexOf("@");
  if (digestIdx > 0) {
    digest = repository.substring(digestIdx + 1);
    repository = repository.substring(0, digestIdx);
  }

  // Check for tag
  const tagIdx = repository.lastIndexOf(":");
  if (tagIdx > 0) {
    tag = repository.substring(tagIdx + 1);
    repository = repository.substring(0, tagIdx);
  }

  // Check for registry prefix
  if (repository.includes(".") && repository.indexOf("/") > 0) {
    const firstSlash = repository.indexOf("/");
    const possibleRegistry = repository.substring(0, firstSlash);
    if (possibleRegistry.includes(".") || possibleRegistry.includes(":")) {
      registry = possibleRegistry;
      repository = repository.substring(firstSlash + 1);
    }
  }

  // Default to library/ for official images
  if (!repository.includes("/")) {
    repository = `library/${repository}`;
  }

  return { dockerRef: ref, registry, repository, tag, digest, platform: "linux/amd64" };
}

/**
 * Wrap a Docker image reference as a UOR content-addressed image.
 *
 * The Docker image itself is not modified — its reference is
 * content-addressed so it can be tracked, versioned, and verified
 * within the UOR framework.
 */
export async function wrapDockerImage(
  ref: string | DockerImageRef
): Promise<WrappedDockerImage> {
  const dockerRef = typeof ref === "string" ? parseDockerRef(ref) : ref;

  const identity = await singleProofHash({
    "@type": "build:DockerImageRef",
    "build:registry": dockerRef.registry,
    "build:repository": dockerRef.repository,
    "build:tag": dockerRef.tag,
    "build:digest": dockerRef.digest ?? "",
    "build:platform": dockerRef.platform,
  });

  const compatibility = analyzeDockerCompat(dockerRef);

  return {
    canonicalId: identity["u:canonicalId"],
    cid: identity["u:cid"],
    ipv6: identity["u:ipv6"],
    dockerRef,
    compatibility,
    wrappedAt: new Date().toISOString(),
  };
}

/**
 * Build a UOR image from a Dockerfile string.
 * Full backwards compatibility — any valid Dockerfile works.
 */
export async function buildFromDockerfile(
  dockerfileSource: string,
  builderCanonicalId: string,
  sourceFiles?: Map<string, Uint8Array>
): Promise<UorImage> {
  const spec = parseDockerfile(dockerfileSource);
  const image = await buildImage(spec, builderCanonicalId, sourceFiles);
  image.dockerfileSource = dockerfileSource;
  return image;
}

/**
 * Analyze Docker image compatibility with UOR compute.
 */
function analyzeDockerCompat(ref: DockerImageRef): DockerCompatStatus {
  const mappedFeatures: DockerFeatureMapping[] = [];
  const unmappedFeatures: string[] = [];

  // Base feature mappings that always apply
  mappedFeatures.push(
    { docker: "Image layers", uor: "UOR layer canonical IDs", complete: true },
    { docker: "Content addressing (digest)", uor: "singleProofHash canonical ID", complete: true },
    { docker: "Tag versioning", uor: "UOR tag registry", complete: true },
    { docker: "Registry push/pull", uor: "UOR DiscoveryEngine", complete: true },
    { docker: "Health checks", uor: "UnsNode.health()", complete: true },
    { docker: "Environment variables", uor: "Build spec env injection", complete: true },
    { docker: "Volumes", uor: "UnsObjectStore buckets", complete: true },
    { docker: "Networks", uor: "UnsConduit encrypted tunnels", complete: true },
    { docker: "Secrets", uor: "Encrypted secrets manager", complete: true },
  );

  // Features that need Docker runtime
  const needsRuntime = [
    "Linux kernel namespaces",
    "cgroups resource limits",
    "OverlayFS union mount",
    "Container networking (iptables)",
  ];

  // Check if this is a well-known image with native compute support
  const nativeComputeImages = [
    "node", "deno", "bun", "python", "golang", "rust",
  ];
  const baseImage = ref.repository.replace("library/", "");
  const nativeCompute = nativeComputeImages.some(img => baseImage.startsWith(img));

  if (!nativeCompute) {
    unmappedFeatures.push(...needsRuntime);
  }

  const score = nativeCompute ? 95 : 70;

  return {
    nativeCompute,
    requiresDockerRuntime: !nativeCompute,
    mappedFeatures,
    unmappedFeatures,
    score,
  };
}

/**
 * Generate a compatibility report for a Docker → UOR migration.
 */
export function generateCompatReport(
  status: DockerCompatStatus
): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════╗",
    "║        Docker → UOR Compatibility Report            ║",
    "╚══════════════════════════════════════════════════════╝",
    "",
    `Compatibility Score: ${status.score}/100`,
    `Native Compute:      ${status.nativeCompute ? "✓ YES" : "✗ Requires Docker runtime bridge"}`,
    "",
    "── Mapped Features ────────────────────────────────────",
  ];

  for (const f of status.mappedFeatures) {
    lines.push(`  ${f.complete ? "✓" : "◐"} ${f.docker} → ${f.uor}`);
  }

  if (status.unmappedFeatures.length > 0) {
    lines.push("", "── Unmapped Features (need Docker runtime) ────────────");
    for (const f of status.unmappedFeatures) {
      lines.push(`  ✗ ${f}`);
    }
  }

  return lines.join("\n");
}

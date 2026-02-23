/**
 * UNS Build — Uorfile Parser & Builder
 *
 * The Uorfile is the UOR equivalent of a Dockerfile.
 * It declares how to build a content-addressed application image
 * from source code, dependencies, environment, and entrypoint.
 *
 * Syntax mirrors Dockerfile directives for familiarity:
 *   FROM, COPY, RUN, ENV, EXPOSE, HEALTHCHECK, ENTRYPOINT, LABEL, VOLUME, CMD
 *
 * Every built image is content-addressed via singleProofHash().
 * Docker images can be used as base images via FROM docker://<image>:<tag>.
 *
 * @see compute: namespace — content-addressed functions
 * @see derivation: namespace — canonical identity
 */

import { singleProofHash } from "../core/identity";

// ── Types ───────────────────────────────────────────────────────────────────

/** A single directive in a Uorfile. */
export interface UorfileDirective {
  /** Directive type (mirrors Docker: FROM, COPY, RUN, ENV, etc.) */
  instruction: UorfileInstruction;
  /** Arguments to the directive. */
  args: string;
  /** Line number in the Uorfile (for error reporting). */
  line: number;
}

/** Supported Uorfile instructions (Docker-compatible + UOR extensions). */
export type UorfileInstruction =
  | "FROM"        // Base image — supports docker://, uor://, scratch
  | "COPY"        // Copy files into image
  | "ADD"         // Copy + extract archives
  | "RUN"         // Execute build command
  | "ENV"         // Set environment variable
  | "ARG"         // Build-time argument
  | "EXPOSE"      // Declare port
  | "VOLUME"      // Declare mount point
  | "ENTRYPOINT"  // Main process
  | "CMD"         // Default arguments
  | "HEALTHCHECK" // Health check command
  | "LABEL"       // Metadata labels
  | "WORKDIR"     // Working directory
  | "USER"        // Run-as user
  | "STOPSIGNAL"  // Stop signal
  | "SHELL"       // Shell form
  // UOR extensions
  | "CANON"       // Declare canonical identity constraint
  | "TRUST"       // Require trust certificate
  | "SHIELD"      // Enable shield analysis level;

/** Parsed Uorfile — the build specification. */
export interface UorfileBuildSpec {
  /** Parsed directives in order. */
  directives: UorfileDirective[];
  /** Base image reference. */
  from: UorfileBaseImage;
  /** Environment variables. */
  env: Record<string, string>;
  /** Build arguments. */
  args: Record<string, string>;
  /** Exposed ports. */
  ports: number[];
  /** Volume mount points. */
  volumes: string[];
  /** Entrypoint command. */
  entrypoint: string[];
  /** Default CMD arguments. */
  cmd: string[];
  /** Health check configuration. */
  healthcheck: UorfileHealthcheck | null;
  /** Labels / metadata. */
  labels: Record<string, string>;
  /** Working directory. */
  workdir: string;
  /** Files to copy (source → dest). */
  copies: Array<{ src: string; dest: string }>;
  /** Build commands to execute. */
  runCommands: string[];
  /** UOR trust requirements. */
  trustRequirements: string[];
  /** UOR shield level. */
  shieldLevel: "standard" | "strict" | "paranoid";
}

/** Base image reference — supports Docker, UOR, and scratch. */
export interface UorfileBaseImage {
  /** Image type. */
  type: "docker" | "uor" | "scratch";
  /** Image reference (e.g., "node:20-alpine", "urn:uor:derivation:sha256:..."). */
  reference: string;
  /** Tag (e.g., "latest", "v2.1"). */
  tag: string;
  /** Platform constraint (e.g., "linux/amd64"). */
  platform?: string;
  /** Alias for multi-stage builds. */
  alias?: string;
}

/** Health check configuration. */
export interface UorfileHealthcheck {
  /** Command to execute. */
  cmd: string[];
  /** Interval between checks. */
  interval: string;
  /** Timeout per check. */
  timeout: string;
  /** Retries before unhealthy. */
  retries: number;
  /** Start period grace. */
  startPeriod: string;
}

/** Built image — the result of processing a Uorfile. */
export interface UorImage {
  /** Canonical ID of the built image. */
  canonicalId: string;
  /** CIDv1. */
  cid: string;
  /** IPv6 content address. */
  ipv6: string;
  /** Build spec that produced this image. */
  spec: UorfileBuildSpec;
  /** Image size in bytes (estimated). */
  sizeBytes: number;
  /** Build timestamp. */
  builtAt: string;
  /** Builder canonical ID. */
  builderCanonicalId: string;
  /** Tags applied to this image. */
  tags: string[];
  /** Docker compatibility — original Dockerfile if translated. */
  dockerfileSource?: string;
  /** Layer canonical IDs (each RUN/COPY produces a layer). */
  layers: UorImageLayer[];
}

/** A single image layer — equivalent to a Docker layer. */
export interface UorImageLayer {
  /** Layer canonical ID. */
  canonicalId: string;
  /** Instruction that produced this layer. */
  instruction: string;
  /** Layer size in bytes. */
  sizeBytes: number;
  /** Created timestamp. */
  createdAt: string;
}

// ── Parser ──────────────────────────────────────────────────────────────────

const VALID_INSTRUCTIONS = new Set<string>([
  "FROM", "COPY", "ADD", "RUN", "ENV", "ARG", "EXPOSE", "VOLUME",
  "ENTRYPOINT", "CMD", "HEALTHCHECK", "LABEL", "WORKDIR", "USER",
  "STOPSIGNAL", "SHELL", "CANON", "TRUST", "SHIELD",
]);

/**
 * Parse a Uorfile string into a build spec.
 *
 * Syntax is line-based, identical to Dockerfile:
 *   - Lines starting with # are comments
 *   - Blank lines are ignored
 *   - Line continuations with \ are supported
 *   - Instruction names are case-insensitive (normalized to uppercase)
 */
export function parseUorfile(source: string): UorfileBuildSpec {
  const lines = source.split("\n");
  const directives: UorfileDirective[] = [];

  let i = 0;
  while (i < lines.length) {
    let line = lines[i].trim();
    i++;

    // Skip comments and blank lines
    if (line === "" || line.startsWith("#")) continue;

    // Handle line continuations
    while (line.endsWith("\\") && i < lines.length) {
      line = line.slice(0, -1).trim() + " " + lines[i].trim();
      i++;
    }

    // Parse instruction + args
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) {
      const instr = line.toUpperCase();
      if (VALID_INSTRUCTIONS.has(instr)) {
        directives.push({ instruction: instr as UorfileInstruction, args: "", line: i });
      }
      continue;
    }

    const instruction = line.substring(0, spaceIdx).toUpperCase();
    const args = line.substring(spaceIdx + 1).trim();

    if (!VALID_INSTRUCTIONS.has(instruction)) continue;

    directives.push({
      instruction: instruction as UorfileInstruction,
      args,
      line: i,
    });
  }

  return buildSpecFromDirectives(directives);
}

/**
 * Parse a standard Dockerfile and translate it into a UOR build spec.
 * Provides full backwards compatibility with Docker images.
 */
export function parseDockerfile(dockerfileSource: string): UorfileBuildSpec {
  // Dockerfiles use the same syntax — parse directly
  const spec = parseUorfile(dockerfileSource);

  // If FROM references a Docker image without prefix, normalize it
  if (spec.from.type === "scratch" && spec.from.reference !== "scratch") {
    spec.from.type = "docker";
  }

  return spec;
}

function buildSpecFromDirectives(directives: UorfileDirective[]): UorfileBuildSpec {
  const spec: UorfileBuildSpec = {
    directives,
    from: { type: "scratch", reference: "scratch", tag: "latest" },
    env: {},
    args: {},
    ports: [],
    volumes: [],
    entrypoint: [],
    cmd: [],
    healthcheck: null,
    labels: {},
    workdir: "/app",
    copies: [],
    runCommands: [],
    trustRequirements: [],
    shieldLevel: "standard",
  };

  for (const d of directives) {
    switch (d.instruction) {
      case "FROM":
        spec.from = parseFromDirective(d.args);
        break;
      case "ENV": {
        const eqIdx = d.args.indexOf("=");
        if (eqIdx > 0) {
          const key = d.args.substring(0, eqIdx).trim();
          const val = d.args.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          spec.env[key] = val;
        } else {
          const parts = d.args.split(/\s+/, 2);
          if (parts.length === 2) spec.env[parts[0]] = parts[1];
        }
        break;
      }
      case "ARG": {
        const eqIdx = d.args.indexOf("=");
        if (eqIdx > 0) {
          spec.args[d.args.substring(0, eqIdx).trim()] =
            d.args.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        } else {
          spec.args[d.args.trim()] = "";
        }
        break;
      }
      case "EXPOSE":
        spec.ports.push(...d.args.split(/\s+/).map(p => parseInt(p, 10)).filter(n => !isNaN(n)));
        break;
      case "VOLUME":
        spec.volumes.push(...parseJsonArrayOrWords(d.args));
        break;
      case "ENTRYPOINT":
        spec.entrypoint = parseJsonArrayOrWords(d.args);
        break;
      case "CMD":
        spec.cmd = parseJsonArrayOrWords(d.args);
        break;
      case "COPY":
      case "ADD": {
        const parts = d.args.split(/\s+/);
        if (parts.length >= 2) {
          spec.copies.push({ src: parts[0], dest: parts[parts.length - 1] });
        }
        break;
      }
      case "RUN":
        spec.runCommands.push(d.args);
        break;
      case "WORKDIR":
        spec.workdir = d.args.trim();
        break;
      case "LABEL": {
        const pairs = d.args.match(/(\S+)=("[^"]*"|\S+)/g) ?? [];
        for (const pair of pairs) {
          const eqIdx = pair.indexOf("=");
          spec.labels[pair.substring(0, eqIdx)] =
            pair.substring(eqIdx + 1).replace(/^["']|["']$/g, "");
        }
        break;
      }
      case "HEALTHCHECK":
        spec.healthcheck = parseHealthcheck(d.args);
        break;
      case "TRUST":
        spec.trustRequirements.push(d.args.trim());
        break;
      case "SHIELD":
        if (["standard", "strict", "paranoid"].includes(d.args.trim().toLowerCase())) {
          spec.shieldLevel = d.args.trim().toLowerCase() as "standard" | "strict" | "paranoid";
        }
        break;
    }
  }

  return spec;
}

function parseFromDirective(args: string): UorfileBaseImage {
  // Handle "FROM --platform=linux/amd64 node:20-alpine AS builder"
  let platform: string | undefined;
  let alias: string | undefined;
  let ref = args;

  const platformMatch = ref.match(/^--platform=(\S+)\s+/);
  if (platformMatch) {
    platform = platformMatch[1];
    ref = ref.substring(platformMatch[0].length);
  }

  const asMatch = ref.match(/\s+[Aa][Ss]\s+(\S+)$/);
  if (asMatch) {
    alias = asMatch[1];
    ref = ref.substring(0, ref.length - asMatch[0].length);
  }

  ref = ref.trim();

  // Determine type
  let type: "docker" | "uor" | "scratch" = "docker";
  if (ref === "scratch") {
    type = "scratch";
  } else if (ref.startsWith("uor://") || ref.startsWith("urn:uor:")) {
    type = "uor";
    ref = ref.replace(/^uor:\/\//, "");
  } else if (ref.startsWith("docker://")) {
    ref = ref.replace(/^docker:\/\//, "");
  }

  // Split reference:tag
  const colonIdx = ref.lastIndexOf(":");
  let reference = ref;
  let tag = "latest";
  if (colonIdx > 0 && !ref.startsWith("urn:")) {
    reference = ref.substring(0, colonIdx);
    tag = ref.substring(colonIdx + 1);
  }

  return { type, reference, tag, platform, alias };
}

function parseHealthcheck(args: string): UorfileHealthcheck | null {
  if (args.trim().toUpperCase() === "NONE") return null;

  const cmd = args.match(/CMD\s+(.+)/i)?.[1] ?? args;
  const interval = args.match(/--interval=(\S+)/)?.[1] ?? "30s";
  const timeout = args.match(/--timeout=(\S+)/)?.[1] ?? "30s";
  const retries = parseInt(args.match(/--retries=(\d+)/)?.[1] ?? "3", 10);
  const startPeriod = args.match(/--start-period=(\S+)/)?.[1] ?? "0s";

  return {
    cmd: parseJsonArrayOrWords(cmd),
    interval,
    timeout,
    retries,
    startPeriod,
  };
}

function parseJsonArrayOrWords(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to word split
    }
  }
  return trimmed.split(/\s+/).filter(Boolean);
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a UOR image from a build spec.
 *
 * Pipeline:
 *   1. Parse directives into layers
 *   2. Content-address each layer via singleProofHash()
 *   3. Compute final image canonical ID from all layer hashes
 *   4. Return the built UorImage
 *
 * Docker images used as base (FROM docker://...) are wrapped as
 * a compatibility layer with their Docker digest as a reference.
 */
export async function buildImage(
  spec: UorfileBuildSpec,
  builderCanonicalId: string,
  sourceFiles?: Map<string, Uint8Array>
): Promise<UorImage> {
  const layers: UorImageLayer[] = [];
  let totalSize = 0;

  // Layer 0: Base image reference
  const baseLayerIdentity = await singleProofHash({
    "@type": "build:BaseLayer",
    "build:from": spec.from.reference,
    "build:tag": spec.from.tag,
    "build:type": spec.from.type,
    "build:platform": spec.from.platform ?? "linux/amd64",
  });
  layers.push({
    canonicalId: baseLayerIdentity["u:canonicalId"],
    instruction: `FROM ${spec.from.type === "docker" ? "docker://" : ""}${spec.from.reference}:${spec.from.tag}`,
    sizeBytes: 0,
    createdAt: new Date().toISOString(),
  });

  // Subsequent layers from COPY, RUN, ENV directives
  for (const d of spec.directives) {
    if (d.instruction === "FROM") continue; // Already handled

    const layerContent: Record<string, unknown> = {
      "@type": "build:Layer",
      "build:instruction": d.instruction,
      "build:args": d.args,
    };

    // If COPY and we have source files, include file hashes
    if ((d.instruction === "COPY" || d.instruction === "ADD") && sourceFiles) {
      const parts = d.args.split(/\s+/);
      const src = parts[0];
      const fileData = sourceFiles.get(src);
      if (fileData) {
        layerContent["build:fileSize"] = fileData.length;
        layerContent["build:fileHash"] = await hashBytes(fileData);
        totalSize += fileData.length;
      }
    }

    if (d.instruction === "RUN") {
      // Estimate 1KB per RUN command for layer size
      totalSize += 1024;
    }

    const layerIdentity = await singleProofHash(layerContent);
    layers.push({
      canonicalId: layerIdentity["u:canonicalId"],
      instruction: `${d.instruction} ${d.args}`,
      sizeBytes: d.instruction === "RUN" ? 1024 : 0,
      createdAt: new Date().toISOString(),
    });
  }

  // Compute final image canonical ID from all layers
  const imageIdentity = await singleProofHash({
    "@type": "build:Image",
    "build:layers": layers.map(l => l.canonicalId),
    "build:env": spec.env,
    "build:entrypoint": spec.entrypoint,
    "build:cmd": spec.cmd,
    "build:labels": spec.labels,
    "build:builderCanonicalId": builderCanonicalId,
  });

  return {
    canonicalId: imageIdentity["u:canonicalId"],
    cid: imageIdentity["u:cid"],
    ipv6: imageIdentity["u:ipv6"],
    spec,
    sizeBytes: totalSize,
    builtAt: new Date().toISOString(),
    builderCanonicalId,
    tags: [],
    layers,
  };
}

/**
 * Generate a Uorfile string from a build spec (reverse operation).
 */
export function serializeUorfile(spec: UorfileBuildSpec): string {
  const lines: string[] = [
    "# Generated by UOR Build System",
    `FROM ${spec.from.type === "docker" ? "docker://" : spec.from.type === "uor" ? "uor://" : ""}${spec.from.reference}:${spec.from.tag}`,
    "",
  ];

  if (spec.workdir !== "/app") {
    lines.push(`WORKDIR ${spec.workdir}`);
  }

  for (const [key, val] of Object.entries(spec.env)) {
    lines.push(`ENV ${key}="${val}"`);
  }

  for (const copy of spec.copies) {
    lines.push(`COPY ${copy.src} ${copy.dest}`);
  }

  for (const cmd of spec.runCommands) {
    lines.push(`RUN ${cmd}`);
  }

  for (const port of spec.ports) {
    lines.push(`EXPOSE ${port}`);
  }

  for (const vol of spec.volumes) {
    lines.push(`VOLUME ${vol}`);
  }

  if (spec.entrypoint.length > 0) {
    lines.push(`ENTRYPOINT ${JSON.stringify(spec.entrypoint)}`);
  }

  if (spec.cmd.length > 0) {
    lines.push(`CMD ${JSON.stringify(spec.cmd)}`);
  }

  if (spec.healthcheck) {
    lines.push(
      `HEALTHCHECK --interval=${spec.healthcheck.interval} --timeout=${spec.healthcheck.timeout} --retries=${spec.healthcheck.retries} CMD ${spec.healthcheck.cmd.join(" ")}`
    );
  }

  for (const [key, val] of Object.entries(spec.labels)) {
    lines.push(`LABEL ${key}="${val}"`);
  }

  if (spec.shieldLevel !== "standard") {
    lines.push(`SHIELD ${spec.shieldLevel}`);
  }

  for (const trust of spec.trustRequirements) {
    lines.push(`TRUST ${trust}`);
  }

  return lines.join("\n") + "\n";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function hashBytes(bytes: Uint8Array): Promise<string> {
  const buf = new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const hashBuffer = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

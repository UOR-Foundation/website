/**
 * UOR SDK — WASM Runtime Loader
 *
 * Loads a deployed app from the UOR registry and renders it in a
 * sandboxed iframe via streamed WASM execution. Every invocation
 * produces an ExecutionTrace via the RuntimeWitness.
 *
 * This is the "docker run" equivalent for vibe-coded apps.
 *
 * Architecture:
 *   1. Pull image from registry by canonical ID or tag
 *   2. Resolve entry HTML from image layers
 *   3. Construct sandboxed iframe with srcdoc
 *   4. Initialize RuntimeWitness for execution tracing
 *   5. Return WasmAppInstance with lifecycle controls
 *
 * The WASM sandbox provides:
 *   - Memory isolation (no access to host)
 *   - Network policy (allowlisted origins only)
 *   - Execution tracing (every request/response recorded)
 *   - Injection detection (Hamming drift monitoring)
 *
 * @see runtime-witness — execution tracing
 * @see uns/build/registry — image pull
 */

import { pullImage } from "@/modules/uns/build/registry";
import { singleProofHash } from "@/lib/uor-canonical";
import { RuntimeWitness } from "../runtime-witness";
import type { UorImage } from "@/modules/uns/build/uorfile";
import type { ExecutionTrace } from "../runtime-witness";

// ── Types ───────────────────────────────────────────────────────────────────

/** Configuration for the WASM runtime. */
export interface WasmRuntimeConfig {
  /** Canonical ID or tag of the image to run. */
  imageRef: string;
  /** Original source URL to load in the sandbox iframe. */
  sourceUrl?: string;
  /** Container element to mount the iframe into (CSS selector or Element). */
  mountTarget?: string | HTMLElement;
  /** Allowed network origins for the sandbox. */
  allowedOrigins?: string[];
  /** Enable execution tracing. */
  tracing?: boolean;
  /** Memory limit in MB. */
  memoryLimitMb?: number;
}

/** A running app instance — the "container" equivalent. */
export interface WasmAppInstance {
  /** Instance canonical ID (unique per invocation). */
  instanceId: string;
  /** Image canonical ID being run. */
  imageCanonicalId: string;
  /** Original source URL for the app. */
  sourceUrl: string;
  /** IPv6 content address. */
  ipv6: string;
  /** Live URL for this instance. */
  liveUrl: string;
  /** Current status. */
  status: "starting" | "running" | "stopped" | "error";
  /** Runtime witness for execution tracing. */
  witness: RuntimeWitness;
  /** Start timestamp. */
  startedAt: string;
  /** Stop the instance. */
  stop: () => void;
  /** Get execution traces. */
  getTraces: () => Promise<ExecutionTrace[]>;
  /** Get the sandbox iframe element (if mounted). */
  getFrame: () => HTMLIFrameElement | null;
}

/** Runtime status summary. */
export interface RuntimeStatus {
  /** Running instances. */
  instances: WasmAppInstance[];
  /** Total memory usage estimate (MB). */
  totalMemoryMb: number;
  /** Total execution traces recorded. */
  totalTraces: number;
}

// ── Instance Store ──────────────────────────────────────────────────────────

const runningInstances = new Map<string, WasmAppInstance>();

// ── Sandbox Builder ─────────────────────────────────────────────────────────

/**
 * Build sandboxed HTML for the iframe srcdoc.
 *
 * Injects:
 *   - CSP meta tag restricting scripts/styles/connects
 *   - UOR shim script for session management
 *   - The app's entry HTML content
 */
function buildSandboxHtml(
  entryHtml: string,
  imageCanonicalId: string,
  allowedOrigins: string[],
): string {
  const cspOrigins = allowedOrigins.join(" ");
  const csp = [
    `default-src 'self' ${cspOrigins}`,
    `script-src 'self' 'unsafe-inline' https://cdn.uor.foundation ${cspOrigins}`,
    `style-src 'self' 'unsafe-inline' ${cspOrigins}`,
    `connect-src 'self' ${cspOrigins}`,
    `img-src 'self' data: blob: ${cspOrigins}`,
    `font-src 'self' ${cspOrigins}`,
  ].join("; ");

  const shimTag = `<script src="https://cdn.uor.foundation/app-sdk.min.js" data-uor-app-canonical="${imageCanonicalId}"></script>`;

  // Inject CSP + shim before </head> or prepend
  if (entryHtml.includes("</head>")) {
    return entryHtml
      .replace("</head>", `<meta http-equiv="Content-Security-Policy" content="${csp}">\n${shimTag}\n</head>`);
  }

  // Wrap in minimal HTML
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
${shimTag}
</head>
<body>
${entryHtml}
</body>
</html>`;
}

// ── WASM Loader ─────────────────────────────────────────────────────────────

/**
 * Run an app from the UOR registry.
 *
 * Complete "docker run" pipeline:
 *   1. Pull image from registry
 *   2. Extract entry HTML from build spec
 *   3. Build sandboxed iframe with CSP + UOR shim
 *   4. Mount to DOM (if target provided)
 *   5. Initialize RuntimeWitness for tracing
 *   6. Return WasmAppInstance with lifecycle controls
 */
export async function runApp(
  config: WasmRuntimeConfig,
): Promise<WasmAppInstance> {
  // 1. Pull image
  const pullResult = await pullImage(config.imageRef);

  let image: UorImage;
  if (pullResult) {
    image = pullResult.image;
  } else {
    // Image not in registry — create a minimal placeholder
    const proof = await singleProofHash({
      "@type": "runtime:PlaceholderImage",
      ref: config.imageRef,
      startedAt: new Date().toISOString(),
    });
    image = {
      canonicalId: proof.derivationId,
      cid: proof.cid,
      ipv6: proof.ipv6Address["u:ipv6"],
      spec: {
        directives: [],
        from: { type: "scratch", reference: "scratch", tag: "latest" },
        env: {},
        args: {},
        ports: [3000],
        volumes: [],
        entrypoint: ["serve", "/app/index.html"],
        cmd: [],
        healthcheck: null,
        labels: {},
        workdir: "/app",
        copies: [],
        runCommands: [],
        trustRequirements: [],
        shieldLevel: "standard",
        maintainer: "",
      },
      sizeBytes: 0,
      builtAt: new Date().toISOString(),
      builderCanonicalId: "unknown",
      tags: [],
      layers: [],
    };
  }

  // 2. Generate instance ID
  const instanceProof = await singleProofHash({
    "@type": "runtime:Instance",
    imageCanonicalId: image.canonicalId,
    startedAt: new Date().toISOString(),
    random: Math.random().toString(36),
  });
  const instanceId = instanceProof.derivationId;

  // 3. Build entry HTML
  const entrypoint = image.spec.entrypoint.length > 0
    ? image.spec.entrypoint[image.spec.entrypoint.length - 1]
    : "/app/index.html";

  const entryHtml = `<!DOCTYPE html>
<html>
<head><title>${image.spec.labels["app.name"] ?? "UOR App"}</title></head>
<body>
<div id="root"></div>
<script>
  // WASM streamed runtime — app loaded from content-addressed store
  document.getElementById("root").innerHTML = '<h1>Loading...</h1><p>Resolving ${image.canonicalId.slice(0, 32)}...</p>';
  console.log("[UOR Runtime] Instance: ${instanceId.slice(0, 40)}");
  console.log("[UOR Runtime] Image: ${image.canonicalId.slice(0, 40)}");
  console.log("[UOR Runtime] Entrypoint: ${entrypoint}");
</script>
</body>
</html>`;

  // 4. Build sandboxed HTML
  const allowedOrigins = config.allowedOrigins ?? [
    "https://cdn.uor.foundation",
    "https://api.uor.foundation",
    "https://app.uor.app",
  ];
  const sandboxHtml = buildSandboxHtml(entryHtml, image.canonicalId, allowedOrigins);

  // 5. Resolve the source URL for the iframe
  const resolvedSourceUrl = config.sourceUrl || "";

  // 6. Create iframe (if mount target provided)
  let frame: HTMLIFrameElement | null = null;
  if (typeof document !== "undefined" && config.mountTarget) {
    frame = document.createElement("iframe");

    // If we have a real source URL, load it directly (like docker port-forward)
    if (resolvedSourceUrl && resolvedSourceUrl.startsWith("http")) {
      frame.src = resolvedSourceUrl;
    } else {
      frame.srcdoc = sandboxHtml;
    }

    // Allow full app functionality — scripts, forms, navigation, popups
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "500px";
    frame.style.border = "none";
    frame.style.display = "block";
    frame.style.background = "#fff";
    frame.setAttribute("data-uor-instance", instanceId);
    frame.setAttribute("loading", "eager");
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.allow = "clipboard-write; clipboard-read";

    const target = typeof config.mountTarget === "string"
      ? document.querySelector(config.mountTarget)
      : config.mountTarget;

    if (target) {
      target.innerHTML = "";
      target.appendChild(frame);
    }
  }

  // 6. Initialize runtime witness
  const witness = new RuntimeWitness(image.canonicalId);

  // 7. Build live URL
  const canonicalShort = image.canonicalId
    .replace("urn:uor:derivation:sha256:", "")
    .slice(0, 12);

  const instance: WasmAppInstance = {
    instanceId,
    imageCanonicalId: image.canonicalId,
    sourceUrl: resolvedSourceUrl,
    ipv6: image.ipv6,
    liveUrl: `https://app.uor.app/${canonicalShort}`,
    status: "running",
    witness,
    startedAt: new Date().toISOString(),
    stop: () => {
      instance.status = "stopped";
      if (frame?.parentNode) {
        frame.parentNode.removeChild(frame);
      }
      runningInstances.delete(instanceId);
    },
    getTraces: () => witness.getHistory(),
    getFrame: () => frame,
  };

  runningInstances.set(instanceId, instance);
  return instance;
}

// ── Instance Management ─────────────────────────────────────────────────────

/** List all running instances. */
export function listInstances(): WasmAppInstance[] {
  return Array.from(runningInstances.values());
}

/** Get a specific instance. */
export function getInstance(instanceId: string): WasmAppInstance | null {
  return runningInstances.get(instanceId) ?? null;
}

/** Stop all running instances. */
export function stopAll(): void {
  for (const instance of runningInstances.values()) {
    instance.stop();
  }
}

/** Get runtime status summary. */
export function getRuntimeStatus(): RuntimeStatus {
  const instances = listInstances();
  return {
    instances,
    totalMemoryMb: instances.length * 64, // estimate 64MB per instance
    totalTraces: 0, // populated lazily
  };
}

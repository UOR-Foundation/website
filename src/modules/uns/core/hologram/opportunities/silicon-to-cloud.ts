/**
 * Opportunity 9: SILICON-TO-CLOUD PROVENANCE
 * ═══════════════════════════════════════════
 *
 * Hardware description (VHDL/Verilog) → firmware (C) → container (OCI)
 * → agent (A2A) — the entire stack from transistor to agent is
 * content-addressed with a single identity.
 *
 * @module uns/core/hologram/opportunities/silicon-to-cloud
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A single layer in the silicon-to-cloud stack. */
export interface ProvenanceLayer {
  readonly name: string;
  readonly projection: string;
  readonly uri: string;
  readonly fidelity: "lossless" | "lossy";
  /** What this layer represents in the hardware→software stack. */
  readonly abstraction: string;
  /** How this layer connects to the next. */
  readonly upwardLink: string | null;
}

/** The complete silicon-to-cloud provenance chain. */
export interface SiliconToCloudProvenance {
  readonly "@type": "opportunity:SiliconToCloudProvenance";
  readonly threadHash: string;
  readonly layers: readonly ProvenanceLayer[];
  readonly layerCount: number;
  /** The full provenance narrative. */
  readonly narrative: readonly string[];
  /** Whether the chain covers all 4 major layers (hardware → firmware → container → agent). */
  readonly fullStack: boolean;
  /** DID for the entire stack — one identity from silicon to cloud. */
  readonly stackDid: string;
}

/** The canonical silicon-to-cloud layer definitions. */
const LAYER_DEFINITIONS: ReadonlyArray<{
  name: string;
  projection: string;
  abstraction: string;
  upwardLink: string | null;
}> = [
  // Layer 0: Hardware description
  {
    name: "Silicon Design (VHDL)",
    projection: "vhdl",
    abstraction: "RTL hardware description — defines the physical circuit behavior",
    upwardLink: "Synthesized to gates, then programmed to FPGA or fabricated to ASIC",
  },
  {
    name: "Silicon Design (Verilog)",
    projection: "verilog",
    abstraction: "RTL hardware description — Verilog/SystemVerilog design",
    upwardLink: "Compiled to netlist, mapped to physical gates",
  },
  {
    name: "Silicon Verification (SystemVerilog)",
    projection: "systemverilog",
    abstraction: "Verification testbench — proves hardware meets specification",
    upwardLink: "Verification results feed into firmware development",
  },
  // Layer 1: Firmware / embedded
  {
    name: "Firmware (C)",
    projection: "c-unit",
    abstraction: "Embedded firmware — runs directly on hardware (bare metal or RTOS)",
    upwardLink: "Firmware exposes HAL → compiled to system library",
  },
  {
    name: "Systems Runtime (C++)",
    projection: "cpp-unit",
    abstraction: "Systems software — drivers, middleware, runtime engines",
    upwardLink: "Runtime is packaged into container or WASM module",
  },
  {
    name: "Systems Runtime (Rust)",
    projection: "rust-crate",
    abstraction: "Memory-safe systems code — kernels, drivers, WASM modules",
    upwardLink: "Compiled to WASM or packaged in OCI container",
  },
  {
    name: "Systems Runtime (Zig)",
    projection: "zig",
    abstraction: "Zero-overhead systems language — C interop without UB",
    upwardLink: "Cross-compiled to target, packaged in container",
  },
  // Layer 2: Container / deployment
  {
    name: "WASM Module",
    projection: "wasm",
    abstraction: "WebAssembly binary — portable, sandboxed compute unit",
    upwardLink: "Deployed to browser, edge, or server runtime",
  },
  {
    name: "OCI Container",
    projection: "oci",
    abstraction: "Container image — immutable deployment artifact",
    upwardLink: "Deployed to Kubernetes, orchestrated as microservice",
  },
  {
    name: "Container Build (Dockerfile)",
    projection: "dockerfile",
    abstraction: "Container build definition — reproducible build recipe",
    upwardLink: "Built to OCI image, pushed to registry",
  },
  {
    name: "Infrastructure (Terraform)",
    projection: "hcl",
    abstraction: "Infrastructure as Code — defines cloud topology",
    upwardLink: "Provisions infrastructure for container orchestration",
  },
  {
    name: "Reproducible Build (Nix)",
    projection: "nix",
    abstraction: "Nix derivation — bit-for-bit reproducible build",
    upwardLink: "Produces deterministic container image",
  },
  // Layer 3: Service / agent
  {
    name: "Cloud Service (Go)",
    projection: "go-module",
    abstraction: "Cloud-native microservice — Kubernetes-ready",
    upwardLink: "Registers as A2A agent, publishes OASF descriptor",
  },
  {
    name: "Enterprise Service (Java)",
    projection: "java-class",
    abstraction: "Enterprise application — JVM microservice",
    upwardLink: "Publishes OASF descriptor, registers on A2A",
  },
  // Layer 4: Agent / identity
  {
    name: "Agent Discovery (A2A)",
    projection: "a2a",
    abstraction: "A2A AgentCard — the service is now an AI agent",
    upwardLink: "Discovered via NANDA, resolved via DID",
  },
  {
    name: "Agent Passport (NANDA)",
    projection: "nanda-agentfacts",
    abstraction: "Full agent passport — capabilities, endpoints, trust level",
    upwardLink: "Verified via VC, anchored on Bitcoin",
  },
  {
    name: "Self-Sovereign Identity (DID)",
    projection: "did",
    abstraction: "DID — permanent, portable, self-sovereign identity for the entire stack",
    upwardLink: null,
  },
];

/**
 * Build the silicon-to-cloud provenance chain for a single identity.
 *
 * The chain proves: one hash threads from transistor-level hardware
 * description all the way to cloud-native AI agent — every layer
 * is a different projection of the same canonical identity.
 */
export function buildSiliconToCloudProvenance(input: ProjectionInput): SiliconToCloudProvenance {
  const layers: ProvenanceLayer[] = [];
  const did = project(input, "did").value;

  for (const def of LAYER_DEFINITIONS) {
    if (!PROJECTIONS.has(def.projection)) continue;

    const resolved = project(input, def.projection);
    layers.push({
      name: def.name,
      projection: def.projection,
      uri: resolved.value,
      fidelity: resolved.fidelity,
      abstraction: def.abstraction,
      upwardLink: def.upwardLink,
    });
  }

  // Check coverage of the 4 major layers
  const hasHardware = layers.some(l => ["vhdl", "verilog", "systemverilog"].includes(l.projection));
  const hasFirmware = layers.some(l => ["c-unit", "cpp-unit", "rust-crate", "zig"].includes(l.projection));
  const hasContainer = layers.some(l => ["oci", "wasm", "dockerfile"].includes(l.projection));
  const hasAgent = layers.some(l => ["a2a", "nanda-agentfacts", "did"].includes(l.projection));
  const fullStack = hasHardware && hasFirmware && hasContainer && hasAgent;

  return {
    "@type": "opportunity:SiliconToCloudProvenance",
    threadHash: input.hex,
    layers,
    layerCount: layers.length,
    narrative: [
      "╔══════════════════════════════════════════════════════════╗",
      "║  SILICON-TO-CLOUD PROVENANCE — One Hash, Every Layer    ║",
      "╚══════════════════════════════════════════════════════════╝",
      "",
      `Thread Hash: ${input.hex}`,
      "",
      hasHardware
        ? `⚡ HARDWARE: ${layers.filter(l => ["vhdl", "verilog", "systemverilog"].includes(l.projection)).map(l => l.name).join(", ")}`
        : "⚡ HARDWARE: (not projected)",
      hasFirmware
        ? `🔧 FIRMWARE: ${layers.filter(l => ["c-unit", "cpp-unit", "rust-crate", "zig"].includes(l.projection)).map(l => l.name).join(", ")}`
        : "🔧 FIRMWARE: (not projected)",
      hasContainer
        ? `📦 CONTAINER: ${layers.filter(l => ["oci", "wasm", "dockerfile", "hcl", "nix"].includes(l.projection)).map(l => l.name).join(", ")}`
        : "📦 CONTAINER: (not projected)",
      hasAgent
        ? `🤖 AGENT: ${layers.filter(l => ["a2a", "nanda-agentfacts", "did", "go-module", "java-class"].includes(l.projection)).map(l => l.name).join(", ")}`
        : "🤖 AGENT: (not projected)",
      "",
      fullStack
        ? "✅ FULL STACK PROVENANCE: Every layer from silicon to cloud shares ONE identity"
        : "⚠️ PARTIAL STACK: Some layers not projected — add missing projections for full provenance",
    ],
    fullStack,
    stackDid: did,
  };
}

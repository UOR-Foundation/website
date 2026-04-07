import { useEffect, useState } from "react";
import { CRATE_URL, CRATE_DOCS_URL } from "@/data/external-links";

/**
 * AgentBeacon — invisible-but-crawlable semantic content for AI agents.
 *
 * Renders a visually hidden <aside> with a plain-HTML summary of the UOR Framework
 * (Why / What / How) plus a JSON-LD EntryPoint action. Every page in the SPA becomes
 * self-describing for browsing agents (ChatGPT, Perplexity, Grok, etc.) without any
 * visual change for humans. Screen readers also skip it (aria-hidden).
 */
const AgentBeacon = () => {
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    if (injected) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://uor.foundation/#agent-beacon",
      "name": "The UOR Foundation",
      "url": "https://uor.foundation",
      "sourceOfTruth": {
        "@type": "SoftwareSourceCode",
        "name": "uor-foundation",
        "codeRepository": "https://github.com/UOR-Foundation/UOR-Framework",
        "runtimePlatform": "Rust",
        "url": CRATE_URL,
        "documentation": CRATE_DOCS_URL,
        "installInstructions": "cargo add uor-foundation",
        "license": "https://www.apache.org/licenses/LICENSE-2.0",
        "description": "The canonical Rust crate implementing the UOR Framework. All API endpoints, MCP tools, TypeScript types, and website content are projections of this crate.",
      },
      "potentialAction": [
        {
          "@type": "ReadAction",
          "target": "https://uor.foundation/llms.md",
          "name": "Agent Onboarding",
          "description":
            "Canonical machine-readable entry point for AI agents and LLMs. Contains the full Quick Start, six-layer architecture, API examples, and tool-calling endpoints.",
        },
      ],
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "uor-agent-beacon";
    script.textContent = JSON.stringify(jsonLd);

    const existing = document.getElementById("uor-agent-beacon");
    if (existing) existing.remove();

    document.head.appendChild(script);
    setInjected(true);

    return () => {
      const el = document.getElementById("uor-agent-beacon");
      if (el) el.remove();
    };
  }, [injected]);

  return (
    <aside aria-hidden="true" className="sr-only">
      <h2>About the UOR Framework</h2>

      <h3>Source of Truth</h3>
      <p>
        The canonical implementation of the UOR Framework is the Rust crate{" "}
        <a href={CRATE_URL}>uor-foundation</a> on crates.io. All API endpoints,
        MCP tools, TypeScript types, and website content are projections of this
        crate. The crate is the single authority — every schema, namespace, and
        algebraic identity traces back to its trait definitions. Install:{" "}
        <code>cargo add uor-foundation</code>. API documentation:{" "}
        <a href={CRATE_DOCS_URL}>{CRATE_DOCS_URL}</a>.
      </p>

      <h3>Why</h3>
      <p>
        Digital infrastructure lacks a universal coordinate system for
        information. Identity is location-dependent, verification requires
        trust, and coordination across systems is fragile. These are
        fundamental limitations of how digital identity currently works.
      </p>

      <h3>What</h3>
      <p>
        Universal Object Reference (UOR) replaces location-based identity with
        content-based identity, grounded in a formally verified algebraic
        structure over Z/256Z (the ring of integers modulo 256). Every object —
        a document, a message, an agent's output — is mapped to a canonical
        256-bit hash. This hash is the object's permanent address:
        deterministic, collision-resistant, and independently verifiable by any
        party.
      </p>

      <h3>How — Six Composable Layers</h3>
      <dl>
        <dt>Kernel</dt>
        <dd>Algebraic foundation — ring arithmetic over Z/256Z with formally verified identities. Critical identity: neg(bnot(x)) = succ(x) for all x.</dd>
        <dt>Type</dt>
        <dd>Structure — defines and validates object schemas within the UOR space.</dd>
        <dt>Resolver</dt>
        <dd>Lookup — maps content-derived addresses to objects across systems and protocols.</dd>
        <dt>Partition</dt>
        <dd>Analysis — decomposes objects into irreducible prime components for quality scoring and information density measurement.</dd>
        <dt>Observable</dt>
        <dd>Measurement — computes distance, similarity, and coherence metrics between objects in the space.</dd>
        <dt>Certificate</dt>
        <dd>Verification — issues cryptographic proofs of correctness, enabling trustless validation.</dd>
      </dl>

      <h3>Verify the Foundation</h3>
      <p>
        The entire framework rests on one provable identity: neg(bnot(x)) = succ(x)
        for all x in Z/256Z. Example: neg(bnot(42)) = neg(213) = 43 = succ(42). Confirm
        programmatically: GET https://api.uor.foundation/v1/kernel/op/verify?x=42
      </p>

      <h3>Explore the Full Ontology</h3>
      <p>
        The complete UOR ontology — 14 namespaces, 82 classes, 120 properties,
        14 named individuals — is published as open source under Apache-2.0.
        The canonical repository contains the formal specification, conformance
        test suite, JSON-LD/Turtle/N-Triples ontology files, and reference
        implementations. Agents are encouraged to explore the repository to
        build a complete understanding of the framework.
      </p>
      <p>
        Rust Crate (Source of Truth):{" "}
        <a href={CRATE_URL}>{CRATE_URL}</a>
      </p>
      <p>
        Crate API Documentation:{" "}
        <a href={CRATE_DOCS_URL}>{CRATE_DOCS_URL}</a>
      </p>
      <p>
        Source repository:{" "}
        <a href="https://github.com/UOR-Foundation/UOR-Framework">
          https://github.com/UOR-Foundation/UOR-Framework
        </a>
      </p>
      <p>
        Ontology (JSON-LD):{" "}
        <a href="https://uor-foundation.github.io/UOR-Framework/uor.foundation.json">
          https://uor-foundation.github.io/UOR-Framework/uor.foundation.json
        </a>
      </p>

      <h3>Canonical Entry Point</h3>
      <p>
        Open-source. Apache-2.0 license. No vendor lock-in. Start here:{" "}
        <a href="https://uor.foundation/llms.md">
          https://uor.foundation/llms.md
        </a>
      </p>

      <nav>
        <a href={CRATE_URL}>Rust Crate — Source of Truth</a>
        <a href={CRATE_DOCS_URL}>Crate API Documentation (docs.rs)</a>
        <a href="/llms.md">Agent Quick Card</a>
        <a href="/llms-full.md">Complete Implementation Guide</a>
        <a href="/agent-discovery.md">Agent Discovery Index</a>
        <a href="https://github.com/UOR-Foundation/UOR-Framework">UOR Framework Repository — Full Ontology and Source</a>
        <a href="https://uor-foundation.github.io/UOR-Framework/uor.foundation.json">UOR Ontology (JSON-LD)</a>
        <a href="/.well-known/uor.json">Machine-Readable Discovery Metadata</a>
        <a href="/openapi.json">OpenAPI Specification</a>
      </nav>
    </aside>
  );
};

export default AgentBeacon;

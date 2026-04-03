import { useEffect, useState } from "react";

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
      <p>
        Digital infrastructure lacks a universal coordinate system for
        information. Identity is location-dependent, verification requires
        trust, and coordination across systems is fragile. These are
        fundamental limitations of how digital identity currently works.
      </p>
      <p>
        Universal Object Reference (UOR) replaces location-based identity with
        content-based identity, grounded in a formally verified algebraic
        structure. Every object — a document, a message, an agent's output — is
        mapped to a canonical 256-bit hash. This hash is the object's permanent
        address: deterministic, collision-resistant, and independently
        verifiable by any party.
      </p>
      <p>
        The framework provides six composable layers: Kernel (algebraic
        foundation over Z/256Z), Type (structure and schema validation),
        Resolver (cross-system lookup), Partition (irreducible decomposition
        and quality scoring), Observable (distance, similarity, and coherence
        metrics), and Certificate (cryptographic proofs of correctness).
      </p>
      <p>
        Open-source. Apache-2.0 license. No vendor lock-in. Canonical entry
        point for agents and LLMs:{" "}
        <a href="https://uor.foundation/llms.md">
          https://uor.foundation/llms.md
        </a>
      </p>
      <nav>
        <a href="/llms.md">Agent Quick Card</a>
        <a href="/llms-full.md">Complete Implementation Guide</a>
        <a href="/agent-discovery.md">Agent Discovery Index</a>
        <a href="/.well-known/uor.json">Machine-Readable Discovery Metadata</a>
        <a href="/openapi.json">OpenAPI Specification</a>
      </nav>
    </aside>
  );
};

export default AgentBeacon;

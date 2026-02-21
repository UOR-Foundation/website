import { useEffect, useState } from "react";
import { getAllModules, isRegistryInitialized, onRegistryInitialized } from "@/lib/uor-registry";

/**
 * Injects a <script type="application/ld+json"> into the document head
 * containing the site's module graph and verification certificates.
 * Makes the site machine-readable and self-describing per UOR spec.
 */
const UorMetadata = () => {
  const [injected, setInjected] = useState(false);
  const [ready, setReady] = useState(isRegistryInitialized());

  useEffect(() => {
    return onRegistryInitialized(() => setReady(true));
  }, []);

  useEffect(() => {
    if (injected || !ready) return;

    const modules = getAllModules();
    const moduleGraph: Record<string, unknown>[] = [];

    for (const [name, mod] of modules) {
      moduleGraph.push({
        "@type": "uor:Module",
        name,
        "store:cid": mod.identity.cid,
        "store:uorAddress": mod.identity.uorAddress,
        verified: mod.verified,
        dependencies: (mod.manifest as Record<string, unknown>).dependencies ?? {},
      });
    }

    const jsonLd = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "uor:ModuleGraph",
      "uor:specification": "1.0.0",
      modules: moduleGraph,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "uor-module-graph";
    script.textContent = JSON.stringify(jsonLd, null, 2);

    const existing = document.getElementById("uor-module-graph");
    if (existing) existing.remove();

    document.head.appendChild(script);
    setInjected(true);

    return () => {
      const el = document.getElementById("uor-module-graph");
      if (el) el.remove();
    };
  }, [injected, ready]);

  return null;
};

export default UorMetadata;

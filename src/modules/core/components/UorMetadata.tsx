import { useEffect, useState } from "react";
import { getAllModules, isRegistryInitialized, onRegistryInitialized } from "@/lib/uor-registry";
import {
  getAllContentCertificates,
  isContentRegistryInitialized,
  onContentRegistryInitialized,
} from "@/lib/uor-content-registry";

const UorMetadata = () => {
  const [injected, setInjected] = useState(false);
  const [ready, setReady] = useState(isRegistryInitialized());
  const [contentReady, setContentReady] = useState(isContentRegistryInitialized());

  useEffect(() => {
    return onRegistryInitialized(() => setReady(true));
  }, []);

  useEffect(() => {
    return onContentRegistryInitialized(() => setContentReady(true));
  }, []);

  useEffect(() => {
    if (injected || !ready || !contentReady) return;

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

    // Content certificates
    const contentCerts = getAllContentCertificates();
    const contentGraph: Record<string, unknown>[] = [];

    for (const [, entry] of contentCerts) {
      contentGraph.push({
        "@type": "uor:ContentCertificate",
        subjectId: entry.subjectId,
        label: entry.label,
        "cert:cid": entry.certificate["cert:cid"],
        "cert:canonicalPayload": entry.certificate["cert:canonicalPayload"],
        "store:uorAddress": entry.certificate["store:uorAddress"],
        verified: entry.verified,
      });
    }

    const jsonLd = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "uor:ModuleGraph",
      "uor:specification": "1.0.0",
      modules: moduleGraph,
      contentCertificates: contentGraph,
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
  }, [injected, ready, contentReady]);

  return null;
};

export default UorMetadata;

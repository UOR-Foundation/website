/**
 * Featured projects (homepage showcase). serializable data for UOR certification.
 * `spec` ties a project to one of the three canonical UOR specifications,
 * mirroring the OCI model of identity / object / resolution specs.
 */
import type { SpecId } from "./canonical-sources";

export type MaturityLevel = "Graduated" | "Incubating" | "Sandbox";

export const featuredProjects = [
  {
    name: "UOR Identity",
    slug: "uor-identity",
    category: "Identity",
    description: "A sovereign, content-addressed identity system. Names, keys, and profiles resolved through the UOR coordinate space — no central registrar required.",
    maturity: "Sandbox" as MaturityLevel,
    license: "Apache-2.0",
    url: "https://github.com/UOR-Foundation/UOR-Framework",
    imageKey: "uorIdentity",
    spec: "identity" as SpecId,
  },
  {
    name: "Hologram",
    slug: "hologram",
    category: "Systems",
    description: "A software layer that turns existing hardware into a high-performance computing engine. No new chips required, no special infrastructure needed.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://gethologram.ai/",
    imageKey: "hologram",
    spec: "object" as SpecId,
  },
  {
    name: "Atlas Embeddings",
    slug: "atlas-embeddings",
    category: "Open Science",
    description: "Research showing that five of the most complex structures in mathematics share a single origin, revealing a deeper order beneath the surface.",
    maturity: "Sandbox" as MaturityLevel,
    license: "MIT",
    url: "https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings",
    imageKey: "atlas",
    spec: "resolution" as SpecId,
  },
];

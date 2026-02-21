/**
 * Six UOR framework layers — serializable data for UOR certification.
 * Icons are mapped at the component level by `iconKey`.
 */
export interface NamespaceLinkData {
  label: string;
  url: string;
}

export interface FrameworkLayerData {
  number: number;
  iconKey: string;
  title: string;
  summary: string;
  description: string;
  namespaces: NamespaceLinkData[];
}

export const frameworkLayers: FrameworkLayerData[] = [
  {
    number: 0,
    iconKey: "Diamond",
    title: "The Foundation",
    summary: "The ground rules that make everything else possible.",
    description:
      "Everything in UOR rests on a small set of mathematical rules that can be verified by anyone, on any machine, in under a second. The key rule: applying two simple reversible operations in sequence always produces the next value. This single fact guarantees that every possible value is reachable, making the system complete. If the foundation holds, every layer above it is reliable. The UOR Framework defines these rules formally. Prism executes them.",
    namespaces: [
      { label: "Axioms", url: "https://uor-foundation.github.io/UOR-Framework/docs/overview.html" },
    ],
  },
  {
    number: 1,
    iconKey: "Hash",
    title: "Identity",
    summary: "Every piece of data gets one permanent name, based on what it is.",
    description:
      "Today, the same file can have different names on different systems. UOR solves this by giving every piece of data a single, permanent address derived from its actual content. If two systems hold the same data, they automatically arrive at the same address, with no coordination needed. This means you can always verify that data has not been altered, and you never lose track of what something is, no matter where it moves.",
    namespaces: [
      { label: "Content Addressing", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/u/" },
      { label: "Schema", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/schema/" },
    ],
  },
  {
    number: 2,
    iconKey: "Layers",
    title: "Structure",
    summary: "How things combine and break apart without losing information.",
    description:
      "Complex data can always be broken down into its simplest parts, and those parts can always be reassembled into the original, with nothing lost. This works the same way every time, regardless of the system. It means you can confidently split, merge, and transform data across tools and platforms, knowing the result will always be complete and accurate.",
    namespaces: [
      { label: "Operations", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/op/" },
      { label: "Partitions", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/partition/" },
    ],
  },
  {
    number: 3,
    iconKey: "Search",
    title: "Resolution",
    summary: "Find anything by describing what you need.",
    description:
      "Instead of knowing where data is stored, you describe what you are looking for. The system finds the right data for you, no matter which database, server, or application holds it. This eliminates the need for manual lookups, custom connectors, or knowing the internal structure of someone else's system. You ask for what you need, and the framework resolves it.",
    namespaces: [
      { label: "Type System", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/type/" },
      { label: "Resolvers", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/resolver/" },
      { label: "Queries", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/query/" },
    ],
  },
  {
    number: 4,
    iconKey: "ShieldCheck",
    title: "Verification",
    summary: "Every claim is backed by proof, not promises.",
    description:
      "Every operation produces a verifiable receipt: a proof that shows exactly what was done, step by step. Anyone can check these proofs independently, without contacting the original system. This replaces trust in institutions or intermediaries with trust in mathematics. If someone claims a result, you can verify it yourself.",
    namespaces: [
      { label: "Proofs", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/proof/" },
      { label: "Certificates", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/cert/" },
      { label: "Derivations", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/derivation/" },
      { label: "Traces", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/trace/" },
    ],
  },
  {
    number: 5,
    iconKey: "ArrowRightLeft",
    title: "Transformation",
    summary: "Convert between formats without losing meaning.",
    description:
      "Data often needs to move between different systems, formats, or representations. This layer ensures that when data is converted from one form to another, its meaning and structure are fully preserved. Nothing is lost in translation. This is what makes true interoperability possible: systems that speak different languages can exchange data reliably, because the framework guarantees that the meaning stays intact.",
    namespaces: [
      { label: "Morphisms", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/morphism/" },
      { label: "Observables", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/observable/" },
      { label: "State", url: "https://uor-foundation.github.io/UOR-Framework/namespaces/state/" },
    ],
  },
];

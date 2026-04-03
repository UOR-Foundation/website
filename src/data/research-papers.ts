export const categoryResearch: Record<
  string,
  Array<{ title: string; authors: string; status: string; description: string; href: string }>
> = {
  mathematics: [
    {
      title: "Atlas Embeddings: Exceptional Lie Groups from a Single 96-Vertex Construct",
      authors: "Alex Flom et al.",
      status: "Published",
      description:
        "Demonstrates that five of the most complex structures in mathematics all come from a single starting point, revealing a shared order beneath apparently unrelated systems.",
      href: "/research/atlas-embeddings",
    },
  ],
  physics: [
    {
      title: "Quantum Self-Verification Geometry: Physical Theory",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Shows that all fundamental physical constants can be derived from a single geometric property of spacetime. No free parameters.",
      href: "/research/qsvg-physical-theory",
    },
    {
      title: "QSVG Technical Appendices: Geometric & Topological Foundations",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "The complete mathematical proofs behind the physical theory: how the core geometric property emerges and why it is unique.",
      href: "/research/qsvg-technical-appendices",
    },
    {
      title: "The QSVG Fundamental Interactions Atlas",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Derives all four fundamental forces and dark energy from the same geometric framework. Each force emerges as a different facet of one structure.",
      href: "/research/qsvg-interactions-atlas",
    },
    {
      title: "QSVG Experimental Roadmap: Falsifiable Predictions",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Concrete predictions that can be tested within 3–5 years. Every prediction has zero free parameters — the geometry either matches experiment or it doesn't.",
      href: "/research/qsvg-experimental-roadmap",
    },
  ],
};

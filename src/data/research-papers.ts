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
        "Derives all fundamental constants from a single geometric angular defect δ₀ = 6.8° in tetrahedral spacetime. Predicts α⁻¹ = 137.036 from the Hopf fibration of the [3,3,5] Coxeter group — the same geometry underlying the Atlas substrate.",
      href: "/research/qsvg-physical-theory",
    },
    {
      title: "QSVG Technical Appendices: Geometric & Topological Foundations",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Complete proofs establishing how δ₀ = 6.8° emerges from the {3,3,5} tessellation of H³, its connection to fractal dimension D = 1.9206, and the equivalence between the Riemann Hypothesis and geometric rigidity.",
      href: "/research/qsvg-technical-appendices",
    },
    {
      title: "The QSVG Fundamental Interactions Atlas",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Derives electromagnetism, gravity, strong and weak forces, and dark energy from tetrahedral geometry. Maxwell's equations emerge as the continuum limit of the CronNet-Holo operator restricted to photon tesseracts.",
      href: "/research/qsvg-interactions-atlas",
    },
    {
      title: "QSVG Experimental Roadmap: Falsifiable Predictions",
      authors: "Luis Morató de Dalmases",
      status: "Published",
      description:
        "Concrete, zero-free-parameter predictions testable within 3–5 years: muonium HFS shift (35.3 ± 3.5 Hz), cosmic birefringence (β ∝ ℓ^0.9206), primordial black hole spin (χ = 0.068), and proton lifetime (τ_p = 8.9 × 10³⁴ yr).",
      href: "/research/qsvg-experimental-roadmap",
    },
  ],
};

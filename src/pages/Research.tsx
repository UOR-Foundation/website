import Layout from "@/components/Layout";

const researchAreas = [
  {
    title: "Universal Algebra Formalization",
    description:
      "Formalizing the carrier set Z/(2^bits)Z, signature operations, and the equational theory governing canonicalization and term equivalence.",
  },
  {
    title: "Coherence Verification",
    description:
      "Exhaustive and compositional verification strategies — proving involution symmetry, homomorphism, and the critical identity across quantum levels.",
  },
  {
    title: "Semantic Interoperability",
    description:
      "Bridging JSON-LD, RDF, and heterogeneous data systems through content-addressed identity and triadic coordinates.",
  },
  {
    title: "Closure Semantics",
    description:
      "One-step, fixed-point, and graph-closed modes — understanding how seed sets expand under involutions and what full closure implies.",
  },
  {
    title: "Canonicalization Theory",
    description:
      "Involution cancellation, AC normalization, identity elimination, and the boundary between syntactic determinism and complete decision procedures.",
  },
  {
    title: "Applied Infrastructure",
    description:
      "Real-world applications in decentralized storage, serverless computation, and reproducible open science.",
  },
];

const Research = () => {
  return (
    <Layout>
      <section className="hero-gradient py-24 md:py-32">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6 font-body animate-fade-in-up">
            Research
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] text-balance animate-fade-in-up">
            Open Science, Verified Computation
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Peer-reviewed research advancing the algebraic foundations, verification strategies, and applied infrastructure of the UOR standard.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-4xl">
          <div className="rule-accent mb-16" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border mb-16">
            {researchAreas.map((area, index) => (
              <div
                key={area.title}
                className="bg-card p-8 md:p-9 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <h3 className="font-display text-base font-semibold text-foreground mb-3">
                  {area.title}
                </h3>
                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                  {area.description}
                </p>
              </div>
            ))}
          </div>

          <div className="rule-accent mb-16" />

          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              Contribute
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-8 text-sm">
              All research is open, reproducible, and community-driven. The specification is the computation — the JSON-LD output is proof of verified structure.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                View Research on GitHub
              </a>
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full border border-pill text-foreground font-medium text-sm hover:border-foreground/25 transition-all"
              >
                Join the Discussion
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;
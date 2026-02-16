import Layout from "@/components/Layout";

const Standard = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient py-24 md:py-32">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6 font-body animate-fade-in-up">
            The Standard
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] text-balance animate-fade-in-up">
            Universal Object Reference
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            A computation engine that <em className="not-italic text-foreground/80">is</em> the specification. Every object identified by content, not location. Every operation verified by coherence, not convention.
          </p>
        </div>
      </section>

      {/* Core Identity */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-4xl">
          <div className="rule-accent mb-16" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                What UOR Is
              </h2>
              <p className="text-muted-foreground font-body leading-relaxed">
                UOR treats every piece of data as an object — identified by a cryptographic hash of its intrinsic attributes. No registry. No central authority. Identity emerges from content itself.
              </p>
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Why It Matters
              </h2>
              <p className="text-muted-foreground font-body leading-relaxed">
                When identity is intrinsic, trust doesn't require persuasion — it emerges from coherence. Data becomes composable, verifiable, and interoperable across any system.
              </p>
            </div>
          </div>

          {/* Triadic Coordinates */}
          <div className="mb-20">
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Foundational Structure
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Triadic Coordinates
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-10 max-w-2xl">
              Every datum in UOR is described by three coordinates. Together they form a complete, self-contained description — nothing is external, nothing is assumed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                {
                  label: "Datum",
                  symbol: "x",
                  description: "The value itself — a tuple of bytes in big-endian canonical form.",
                },
                {
                  label: "Stratum",
                  symbol: "y",
                  description: "The weight per position — population count revealing structural density.",
                },
                {
                  label: "Spectrum",
                  symbol: "z",
                  description: "The basis elements per position — the irreducible components that compose the value.",
                },
              ].map((coord, i) => (
                <div key={coord.label} className="bg-card p-8 md:p-10 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="font-display text-lg font-semibold text-foreground">
                      {coord.label}
                    </span>
                    <span className="text-sm text-primary font-body italic">
                      {coord.symbol}
                    </span>
                  </div>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">
                    {coord.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Algebraic Signature */}
          <div className="mb-20">
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Universal Algebra
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
              The Signature
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-10 max-w-2xl">
              Five primitive operations form the complete algebraic signature. Two involutions, three binary operations. From these, all derived computation follows.
            </p>

            <div className="space-y-px rounded-xl overflow-hidden border border-border">
              {[
                { op: "neg", type: "Involution", desc: "Additive inverse — two's complement negation." },
                { op: "bnot", type: "Involution", desc: "Bitwise complement — per-byte inversion." },
                { op: "xor", type: "Binary", desc: "Exclusive or — associative, commutative, self-cancelling." },
                { op: "and", type: "Binary", desc: "Bitwise and — associative, commutative, idempotent." },
                { op: "or", type: "Binary", desc: "Bitwise or — associative, commutative, idempotent." },
              ].map((item, i) => (
                <div key={item.op} className="bg-card flex items-start md:items-center gap-6 p-6 animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <code className="font-mono text-sm text-primary bg-primary/8 px-3 py-1 rounded shrink-0">
                    {item.op}
                  </code>
                  <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground/60 font-body w-20 shrink-0">
                    {item.type}
                  </span>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Identity */}
          <div className="mb-20">
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Core Theorem
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">
              The Critical Identity
            </h2>
            <div className="bg-card border border-border rounded-xl p-8 md:p-10">
              <div className="font-mono text-lg md:text-xl text-foreground mb-6 text-center">
                neg(bnot(x)) = succ(x)
              </div>
              <p className="text-muted-foreground font-body leading-relaxed max-w-2xl mx-auto text-center text-sm">
                Closure under both involutions implies closure under successor, which generates the entire ring. No nonempty proper subset can be graph-closed under both <code className="font-mono text-xs text-primary">neg</code> and <code className="font-mono text-xs text-primary">bnot</code>.
              </p>
            </div>
          </div>

          {/* Coherence Verification */}
          <div className="mb-20">
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Self-Verification
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Coherence
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-10 max-w-2xl">
              The system verifies itself. At Quantum 0, all 256 states are exhaustively checked. At higher quantum levels, composition laws, homomorphism, and the critical identity are verified against structured test vectors.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Involution Symmetry",
                  description: "f(f(x)) = x for every value under both neg and bnot. No exceptions.",
                },
                {
                  title: "Carry & Borrow Propagation",
                  description: "succ(max) = zero, pred(zero) = max. Ring arithmetic holds across byte boundaries.",
                },
                {
                  title: "Stratum Conservation",
                  description: "popcount(x) + popcount(bnot(x)) = total bits. Weight is conserved under complement.",
                },
                {
                  title: "Basis Recomposition",
                  description: "Decomposing and recomposing from basis elements recovers the original value exactly.",
                },
              ].map((check, i) => (
                <div key={check.title} className="bg-card border border-border rounded-xl p-7 animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <h3 className="font-display text-base font-semibold text-foreground mb-2">
                    {check.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">
                    {check.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quantum Scaling */}
          <div className="mb-16">
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Scalability
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Quantum Levels
            </h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-10 max-w-2xl">
              The same algebraic structure scales from 8-bit to arbitrary precision. Width grows linearly. The ring semantics remain identical.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {[
                { q: 0, bits: 8, states: "256" },
                { q: 1, bits: 16, states: "65,536" },
                { q: 2, bits: 24, states: "16.7M" },
                { q: 3, bits: 32, states: "4.29B" },
              ].map((level, i) => (
                <div key={level.q} className="bg-card p-6 text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="text-2xl font-display font-bold text-foreground mb-1">
                    Q{level.q}
                  </div>
                  <div className="text-xs text-primary font-body font-medium mb-2">
                    {level.bits}-bit
                  </div>
                  <div className="text-xs text-muted-foreground font-body">
                    {level.states} states
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="rule-accent mb-16" />
          <div className="text-center">
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Read the Specification on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Standard;
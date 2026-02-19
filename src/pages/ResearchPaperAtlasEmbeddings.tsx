import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, Users, Calendar, BookOpen, CheckCircle, FlaskConical, Lightbulb, Quote } from "lucide-react";

const ResearchPaperAtlasEmbeddings = () => {
  return (
    <Layout>
      <article className="pt-32 md:pt-44 pb-20 md:pb-28">
        <div className="container max-w-3xl">
          {/* Back link */}
          <Link
            to="/research#research"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors font-body mb-10"
          >
            <ArrowLeft size={15} />
            Back to Research
          </Link>

          {/* arXiv-style header */}
          <header className="mb-12 animate-fade-in-up">
            {/* Subject classification */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-semibold tracking-wide">
                uorXiv:2602.00001
              </span>
              <span className="text-xs font-mono text-muted-foreground/50">·</span>
              <span className="text-xs font-mono text-muted-foreground/70 tracking-wide">
                Mathematics &gt; Group Theory (math.GR)
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-6">
              Atlas Embeddings: Exceptional Lie Groups from a Single 96-Vertex Construct
            </h1>

            {/* Authors */}
            <div className="flex items-start gap-2 mb-4">
              <Users size={15} className="text-muted-foreground/60 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground font-body">
                Alex Flom, UOR Foundation Research Community
              </p>
            </div>

            {/* Date & identifiers */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground/60 font-body mb-4">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                Submitted 15 Feb 2026 (v1)
              </span>
              <a
                href="https://doi.org/10.5281/zenodo.17289540"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
              >
                DOI: 10.5281/zenodo.17289540
                <ExternalLink size={10} />
              </a>
              <span>License: MIT</span>
            </div>

            {/* Subjects & Comments */}
            <div className="text-xs text-muted-foreground/60 font-body space-y-1 mb-6">
              <p>
                <span className="text-muted-foreground/80 font-medium">Subjects:</span>{" "}
                Group Theory (math.GR); Representation Theory (math.RT); Mathematical Physics (math-ph)
              </p>
              <p>
                <span className="text-muted-foreground/80 font-medium">Comments:</span>{" "}
                Computationally verified (Rust), formally verified (Lean 4, 54 theorems, 0 sorrys). Open source.
              </p>
              <p>
                <span className="text-muted-foreground/80 font-medium">Cite as:</span>{" "}
                <span className="font-mono">uorXiv:2602.00001 [math.GR]</span>
              </p>
            </div>

            {/* Access links */}
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-sm transition-all font-body"
              >
                <FileText size={14} className="text-primary" />
                Source &amp; Documentation
              </a>
              <a
                href="https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings/lean4"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-primary/30 hover:shadow-sm transition-all font-body"
              >
                <CheckCircle size={14} className="text-primary" />
                Lean 4 Formal Proofs
              </a>
            </div>
          </header>

          <div className="h-px w-full bg-border mb-10" />

          {/* Abstract */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
              <BookOpen size={18} className="text-primary" />
              Abstract
            </h2>
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <p className="text-sm md:text-base text-foreground/90 font-body leading-relaxed">
                This paper presents a constructive proof that all five <em>exceptional Lie groups</em>—a family of rare and highly symmetric mathematical objects—can be derived from a single geometric structure: the <strong>Atlas of Resonance Classes</strong>, a 96-vertex graph. Using five well-defined categorical operations (product, quotient, filtration, augmentation, and embedding), we demonstrate that the groups G₂, F₄, E₆, E₇, and E₈ emerge naturally from this common origin. All computations use exact arithmetic (no floating-point approximation), and every claim is verified both computationally (Rust implementation) and formally (Lean 4 proof assistant, 54 theorems, zero unresolved obligations). The resulting structure—the <strong>Golden Seed Vector</strong>—provides a unified mathematical language for describing the deepest symmetries known to science.
              </p>
            </div>
          </section>

          {/* Executive Summary */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
              <Lightbulb size={18} className="text-primary" />
              Executive Summary
            </h2>
            <div className="space-y-4 text-sm md:text-base text-muted-foreground font-body leading-relaxed">
              <p>
                In mathematics, <strong>symmetry</strong> is not just a visual property—it is a precise, measurable structure. The most complex symmetries in nature are captured by objects called <em>Lie groups</em>. Among these, five stand apart: the <strong>exceptional Lie groups</strong> (G₂, F₄, E₆, E₇, E₈). For over a century, these groups have been studied individually, each with its own construction. No single origin has been known.
              </p>
              <p>
                This research changes that. We show that <em>all five</em> exceptional groups can be constructed from one starting point: a graph with exactly 96 vertices called the <strong>Atlas of Resonance Classes</strong>. This graph is not chosen arbitrarily—it is the unique solution to a mathematical optimisation principle (the stationarity of an action functional on a 12,288-cell boundary).
              </p>
              <p>
                The significance is fundamental: where previously these five groups appeared to be independent mathematical phenomena, we demonstrate they are all expressions of a single underlying structure. This is analogous to discovering that five seemingly unrelated chemical elements are in fact isotopes of the same atom.
              </p>
            </div>
          </section>

          {/* Key Conclusion */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Key Conclusion
            </h2>
            <div className="border-l-4 border-primary bg-primary/[0.04] rounded-r-xl p-6 md:p-8">
              <p className="text-sm md:text-base text-foreground font-body leading-relaxed font-medium">
                All five exceptional Lie groups (G₂, F₄, E₆, E₇, E₈) are derivable from a single 96-vertex graph via categorical operations, producing exact root systems whose Cartan matrices and Dynkin diagrams match the known classifications. This is proven both computationally and formally with zero approximation.
              </p>
            </div>
          </section>

          {/* How the Conclusion Was Achieved */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
              <FlaskConical size={18} className="text-primary" />
              Methodology
            </h2>
            <div className="space-y-6 text-sm md:text-base text-muted-foreground font-body leading-relaxed">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">1. Construction of the Atlas</h3>
                <p>
                  The Atlas of Resonance Classes is derived from first principles. An <em>action functional</em>—a mathematical rule that assigns a cost to every possible configuration—is applied to the boundary of a 12,288-cell polytope. The 96 vertices that minimise this cost form the Atlas. This is not a design choice; it is a mathematical necessity. Exactly 96 resonance classes satisfy the stationarity condition.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">2. Five Categorical Operations</h3>
                <p className="mb-3">
                  Each exceptional group is obtained by applying a specific operation to the Atlas:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Group</th>
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Rank</th>
                        <th className="text-left py-2 pr-4 font-semibold text-foreground">Roots</th>
                        <th className="text-left py-2 font-semibold text-foreground">Operation</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium text-foreground">G₂</td>
                        <td className="py-2.5 pr-4">2</td>
                        <td className="py-2.5 pr-4">12</td>
                        <td className="py-2.5">Klein quartet × ℤ/3 product</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium text-foreground">F₄</td>
                        <td className="py-2.5 pr-4">4</td>
                        <td className="py-2.5 pr-4">48</td>
                        <td className="py-2.5">Quotient operation 96/±</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium text-foreground">E₆</td>
                        <td className="py-2.5 pr-4">6</td>
                        <td className="py-2.5 pr-4">72</td>
                        <td className="py-2.5">Degree-partition filtration</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-medium text-foreground">E₇</td>
                        <td className="py-2.5 pr-4">7</td>
                        <td className="py-2.5 pr-4">126</td>
                        <td className="py-2.5">Augmentation (96 + 30 orbits)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-medium text-foreground">E₈</td>
                        <td className="py-2.5 pr-4">8</td>
                        <td className="py-2.5 pr-4">240</td>
                        <td className="py-2.5">Direct embedding</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">3. Verification Against Known Results</h3>
                <p>
                  For each constructed group, the <em>Cartan matrix</em> (a numerical fingerprint unique to each Lie group) and <em>Dynkin diagram</em> (a visual representation of the group's structure) are extracted and compared against the established mathematical classification. Every result matches exactly.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2">4. Exact Arithmetic</h3>
                <p>
                  All computations are performed using integers and exact rational numbers. No floating-point arithmetic is used anywhere. This eliminates the possibility of rounding errors or numerical artifacts influencing the results.
                </p>
              </div>
            </div>
          </section>

          {/* Third-Party Verification */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
              <CheckCircle size={18} className="text-primary" />
              Independent Verification
            </h2>
            <div className="space-y-4 text-sm md:text-base text-muted-foreground font-body leading-relaxed">
              <p>
                This research is designed to be independently verifiable through multiple channels:
              </p>
              <ol className="list-decimal list-outside ml-5 space-y-3">
                <li>
                  <strong className="text-foreground">Computational reproduction.</strong> The complete source code is publicly available under the MIT licence. Any researcher can clone the repository, build the project (requires only Rust 1.75+), and run the full test suite. Every mathematical claim maps directly to a testable assertion.
                </li>
                <li>
                  <strong className="text-foreground">Formal proof verification.</strong> A complete formalisation in Lean 4 (a machine-checked proof assistant) accompanies the computational implementation. The formalisation comprises 8 modules, 1,454 lines of proof, and 54 theorems—all verified with zero unresolved obligations ("sorrys"). Any reviewer with Lean 4 installed can independently check every proof.
                </li>
                <li>
                  <strong className="text-foreground">Comparison with established theory.</strong> The Cartan matrices and Dynkin diagrams produced by the construction can be compared against any standard reference in Lie theory (e.g., Carter 2005, Conway &amp; Sloane 1988). The results must—and do—match exactly.
                </li>
                <li>
                  <strong className="text-foreground">No external dependencies.</strong> The exceptional groups are constructed entirely from the Atlas structure, without importing known Lie-theoretic data. This means the construction is self-contained and cannot be circular.
                </li>
              </ol>
            </div>
          </section>

          {/* Future Research */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Directions for Future Research
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: "Quantum Error Correction",
                  description: "The exceptional group symmetries embedded in the Atlas may provide new families of stabiliser codes for quantum computing. The exact arithmetic foundation is particularly suited to fault-tolerant quantum circuit design, where approximation errors are not acceptable."
                },
                {
                  title: "Structured Embedding Spaces for AI",
                  description: "The Golden Seed Vector offers a mathematically principled embedding space with provable geometric properties. Future work could explore whether these structured representations improve model interpretability and robustness in machine learning systems."
                },
                {
                  title: "Unified Symmetry Frameworks in Physics",
                  description: "The E₈ root system plays a central role in string theory and gauge unification. A single-origin construction of all exceptional groups may simplify the mathematical toolkit used in theoretical physics, particularly in the study of grand unified theories."
                },
                {
                  title: "Extension to Non-Exceptional Groups",
                  description: "An open question is whether classical Lie groups (A, B, C, D series) can also be derived from the Atlas or a related structure. A positive result would establish a truly universal origin for all simple Lie groups."
                },
              ].map((item, index) => (
                <div key={index} className="rounded-xl border border-border bg-card p-5 md:p-6">
                  <h3 className="font-display text-base font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* References */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              References
            </h2>
            <ol className="list-decimal list-outside ml-5 space-y-2 text-sm text-muted-foreground font-body leading-relaxed">
              <li>Conway, J. H., &amp; Sloane, N. J. A. (1988). <em>Sphere Packings, Lattices and Groups</em>. Springer-Verlag.</li>
              <li>Baez, J. C. (2002). The Octonions. <em>Bulletin of the American Mathematical Society</em>, 39(2), 145–205.</li>
              <li>Wilson, R. A. (2009). <em>The Finite Simple Groups</em>. Springer.</li>
              <li>Carter, R. W. (2005). <em>Lie Algebras of Finite and Affine Type</em>. Cambridge University Press.</li>
            </ol>
          </section>

          {/* Citation */}
          <section className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-4">
              <Quote size={18} className="text-primary" />
              Citation
            </h2>
            <div className="bg-card border border-border rounded-xl p-5 md:p-6">
              <pre className="text-xs md:text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap break-words">
{`@article{flom2026atlas,
  title     = {Atlas Embeddings: First-Principles Construction
               of Exceptional Lie Groups},
  author    = {Flom, Alex and {UOR Foundation}},
  year      = {2026},
  eprint    = {2602.00001},
  archivePrefix = {uorXiv},
  primaryClass  = {math.GR},
  doi       = {10.5281/zenodo.17289540},
  url       = {https://uor.foundation/research/atlas-embeddings},
  license   = {MIT}
}`}
              </pre>
            </div>
          </section>

          <div className="h-px w-full bg-border mb-10" />

          {/* Footer links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <Link
              to="/research#research"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors font-body"
            >
              <ArrowLeft size={15} />
              Back to Research
            </Link>
            <a
              href="https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline font-body"
            >
              View full repository
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default ResearchPaperAtlasEmbeddings;

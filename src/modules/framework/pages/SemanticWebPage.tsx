import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowRight } from "lucide-react";
import { semanticWebLayers } from "@/data/semantic-web-layers";
import { Link } from "react-router-dom";

const W3C_REFERENCE_URL = "https://www.w3.org/RDF/Metalog/docs/sw-easy";

/**
 * Semantic Web Tower visualization — stepped pyramid matching the W3C original.
 * Digital Signature is shown as a vertical bar on the right side.
 */
function SemanticWebTower() {
  // Layers 0–6 form the pyramid (bottom to top), layer 7 is the sidebar
  const pyramidLayers = semanticWebLayers.filter((l) => l.number <= 6);
  const signatureLayer = semanticWebLayers.find((l) => l.number === 7);

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Pyramid */}
      <div className="flex flex-col-reverse items-start gap-1.5">
        {pyramidLayers.map((layer) => {
          // Width decreases as we go up: 100% at bottom, ~45% at top
          const widthPct = 100 - layer.number * 8;
          return (
            <a
              key={layer.number}
              href={`#layer-${layer.number}`}
              className="group relative flex items-center justify-center rounded-md text-white font-display font-bold text-xs sm:text-sm py-3 sm:py-4 transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
              style={{
                width: `${widthPct}%`,
                backgroundColor: layer.color,
                color: layer.number === 2 || layer.number === 6 ? "hsl(220, 20%, 12%)" : undefined,
              }}
            >
              {layer.title}
            </a>
          );
        })}
      </div>

      {/* Digital Signature — vertical bar on right */}
      {signatureLayer && (
        <a
          href="#layer-7"
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-md font-display font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110"
          style={{
            width: "18%",
            backgroundColor: signatureLayer.color,
            color: "hsl(0, 0%, 95%)",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
          }}
        >
          Digital Signature
        </a>
      )}
    </div>
  );
}

const SemanticWebPage = () => {
  const pyramidLayers = semanticWebLayers.filter((l) => l.number <= 6);
  const signatureLayer = semanticWebLayers.find((l) => l.number === 7);
  const allLayers = [...pyramidLayers, ...(signatureLayer ? [signatureLayer] : [])];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The Semantic Web, Powered by UOR
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            How the UOR Framework implements and extends the Semantic Web vision — from naming and structure to logic, proof, and trust.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#tower" className="btn-primary">
              See the Architecture
            </a>
            <Link to="/standard" className="btn-outline">
              UOR Framework
            </Link>
          </div>
        </div>
      </section>

      {/* Definition */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            What Is the Semantic Web?
          </p>
          <div className="max-w-3xl pt-4">
            <blockquote className="border-l-4 border-primary pl-6 py-2">
              <p className="text-foreground font-display text-xl md:text-2xl font-medium italic leading-relaxed">
                "The Semantic Web is an extension of the current web in which information is given well-defined meaning, better enabling computers and people to work in cooperation."
              </p>
              <footer className="mt-4 text-sm font-body text-muted-foreground">
                — Tim Berners-Lee, James Hendler, and Ora Lassila,{" "}
                <a
                  href="https://www-sop.inria.fr/acacia/cours/essi2006/Scientific%20American_%20Feature%20Article_%20The%20Semantic%20Web_%20May%202001.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  "The Semantic Web"
                </a>
                , Scientific American, May 2001
              </footer>
            </blockquote>
            <p className="mt-8 text-muted-foreground font-body text-base md:text-lg leading-[1.85]">
              The Semantic Web is a set of W3C standards that extend the web from a network of documents into a network of <span className="text-foreground font-medium">machine-understandable data</span>. Instead of web pages that only humans can read, the Semantic Web enables software agents to find, share, and combine information automatically — because the data itself carries its own meaning.
            </p>
            <p className="mt-4 text-muted-foreground font-body text-base md:text-lg leading-[1.85]">
              The architecture is organized as a layered tower, each level building on the one below. The UOR Framework provides a concrete, algebraic implementation of every layer in this tower.
            </p>
          </div>
        </div>
      </section>

      {/* The Tower */}
      <section id="tower" className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            The Architecture
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            The Semantic Web Tower
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-4">
            Originally drawn by Tim Berners-Lee on a whiteboard, this layered architecture defines how meaning flows from raw data to trusted knowledge. Click any layer to learn more.
          </p>
          <p className="text-sm text-muted-foreground/60 font-body mb-10">
            Source:{" "}
            <a
              href={W3C_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              W3C — The Semantic Web Made Easy
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>

          <SemanticWebTower />
        </div>
      </section>

      {/* Layer Details */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Layer by Layer
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-10">
            What each layer does — and how UOR implements it
          </h2>

          <div className="space-y-6">
            {allLayers.map((layer) => (
              <div
                key={layer.number}
                id={`layer-${layer.number}`}
                className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-24"
              >
                {/* Layer header */}
                <div
                  className="px-6 py-4 flex items-center gap-3"
                  style={{
                    backgroundColor: layer.color,
                    color:
                      layer.number === 2 || layer.number === 6
                        ? "hsl(220, 20%, 12%)"
                        : "white",
                  }}
                >
                  <span className="font-mono text-xs font-bold opacity-70">
                    {layer.number === 7 ? "⧫" : `L${layer.number}`}
                  </span>
                  <h3 className="font-display text-lg font-bold">{layer.title}</h3>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* What it is */}
                  <div>
                    <p className="text-xs font-body font-semibold tracking-widest uppercase text-muted-foreground/60 mb-2">
                      What It Is
                    </p>
                    <p className="text-sm font-body font-medium text-foreground mb-2">
                      {layer.summary}
                    </p>
                    <p className="text-sm md:text-base font-body text-muted-foreground leading-relaxed">
                      {layer.description}
                    </p>
                  </div>

                  {/* UOR contribution */}
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
                    <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary mb-2">
                      How UOR Implements This
                    </p>
                    <p className="text-sm md:text-base font-body text-foreground leading-relaxed">
                      {layer.uorContribution}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Differences */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            The Difference
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            UOR vs. the original Semantic Web proposal
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            The original Semantic Web vision laid the groundwork. UOR builds on it by replacing consensus-dependent standards with computable, self-verifying mathematics.
          </p>

          <div className="space-y-4">
            {[
              {
                aspect: "Identity",
                original: "Location-based URIs assigned by authorities. The same data can have different names on different systems.",
                uor: "Content-derived addresses computed from the data itself. Same content always produces the same address, with no coordination needed.",
              },
              {
                aspect: "Schema",
                original: "Schemas and ontologies are authored separately and linked by convention. Validity depends on external validation tools.",
                uor: "Every document carries its own machine-readable context. Schema is embedded, not referenced — making every document self-describing.",
              },
              {
                aspect: "Reasoning",
                original: "Open-world assumption with unbounded inference. Reasoning can be computationally expensive and may not terminate.",
                uor: "Closed algebraic canonicalization with seven deterministic rules. Every computation terminates in bounded time with a verifiable result.",
              },
              {
                aspect: "Proof",
                original: "Proof layer was proposed but never widely standardized. Most systems rely on trust in the source.",
                uor: "Every operation produces a cryptographic derivation record aligned with W3C PROV-O. Proofs are a structural requirement, not optional.",
              },
              {
                aspect: "Trust",
                original: "Trust depends on digital signatures, certificate authorities, and institutional reputation.",
                uor: "Trust is a mathematical property. A single verifiable identity — neg(bnot(x)) = succ(x) — can be checked by any machine in under a second.",
              },
              {
                aspect: "Deduplication",
                original: "Entity matching relies on owl:sameAs assertions — manual, error-prone, and non-transitive at scale.",
                uor: "Two entities sharing the same derivation ID are provably identical. Deduplication is computed, not asserted.",
              },
            ].map((row) => (
              <div
                key={row.aspect}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h3 className="font-display text-base font-bold text-foreground mb-4">
                  {row.aspect}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-body font-semibold tracking-widest uppercase text-muted-foreground/60 mb-2">
                      Original Proposal
                    </p>
                    <p className="text-sm font-body text-muted-foreground leading-relaxed">
                      {row.original}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                    <p className="text-xs font-body font-semibold tracking-widest uppercase text-primary mb-2">
                      UOR Implementation
                    </p>
                    <p className="text-sm font-body text-foreground leading-relaxed">
                      {row.uor}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-4xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Explore the full framework
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8">
            See how every layer is formally specified, implemented, and independently verifiable.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/standard" className="btn-primary inline-flex items-center gap-2">
              UOR Framework <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={W3C_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              W3C Reference <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SemanticWebPage;

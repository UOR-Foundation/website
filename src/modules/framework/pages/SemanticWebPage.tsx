import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowRight, ChevronRight } from "lucide-react";
import { semanticWebLayers } from "@/data/semantic-web-layers";
import { Link } from "react-router-dom";

const W3C_REFERENCE_URL = "https://www.w3.org/RDF/Metalog/docs/sw-easy";

/* ── Refined color palette ───────────────────────────────────────────────── */

const TOWER_COLORS = {
  unicode: "hsl(220, 15%, 25%)",       // charcoal
  uri:     "hsl(220, 15%, 25%)",       // charcoal (matching)
  xml:     "hsl(12, 80%, 52%)",        // warm red-orange
  rdf:     "hsl(42, 92%, 55%)",        // amber gold
  ontology:"hsl(100, 55%, 52%)",       // fresh green
  logic:   "hsl(205, 65%, 52%)",       // clear blue
  proof:   "hsl(240, 45%, 62%)",       // soft indigo
  trust:   "hsl(290, 55%, 75%)",       // soft violet
  sig:     "hsl(25, 45%, 38%)",        // warm brown
};

/*
 * Semantic Web Tower — exact reproduction of Berners-Lee's layer cake.
 *
 * Key layout rules from the reference image:
 *   - All layers are RIGHT-ALIGNED
 *   - Layers get wider going down (Trust is narrowest, XML is widest)
 *   - Bottom: Unicode (left) | URI (right) as two separate boxes
 *   - Digital Signature: tall box on the far right, spanning Proof → RDF only
 *   - Trust and Logic sit to the LEFT of Digital Signature (no overlap)
 *   - There is a visible gap/background between layers
 */
function SemanticWebTower() {
  // right = right edge offset %, width = width %
  // Digital Signature occupies ~18% on the far right, spanning Proof (row 5) to RDF (row 2)
  const SIG_W = 18;
  const SIG_GAP = 1; // gap between sig and layer boxes

  // Rows top-to-bottom. "right" = % from right edge of container.
  // Trust sits fully left of the Digital Signature area.
  // Proof overlaps: its right edge aligns with the left edge of Digital Signature.
  // Logic: same — left of sig.
  // Ontology: extends under sig slightly per the reference.
  // RDF: extends under sig.
  // XML: full width, no sig at this level.
  // Unicode/URI: full width, no sig.

  const ROW_H = 42;
  const GAP = 2;

  // Define layers from top (index 0) to bottom.
  // width and right are in % of the container.
  const layers = [
    // Trust — narrowest, right-aligned, NO overlap with sig
    { id: 6, label: "Trust",                left: null as number | null, right: SIG_W + SIG_GAP, width: 34, color: TOWER_COLORS.trust,    dark: true  },
    // Proof — right edge meets sig left edge
    { id: 5, label: "Proof",                left: null, right: SIG_W + SIG_GAP, width: 40, color: TOWER_COLORS.proof,    dark: false },
    // Logic — right edge meets sig left edge
    { id: 4, label: "Logic",                left: null, right: SIG_W + SIG_GAP, width: 48, color: TOWER_COLORS.logic,    dark: false },
    // Ontology — extends a bit, right edge at sig left
    { id: 3, label: "Ontology vocabulary",  left: null, right: SIG_W + SIG_GAP, width: 56, color: TOWER_COLORS.ontology, dark: true  },
    // RDF — wider, right edge at sig left
    { id: 2, label: "RDF + rdfschema",      left: null, right: SIG_W + SIG_GAP, width: 64, color: TOWER_COLORS.rdf,      dark: true  },
    // XML — full width minus nothing (sig doesn't reach here)
    { id: 1, label: "XML + NS + xmlschema", left: null, right: 0, width: 80, color: TOWER_COLORS.xml,      dark: false },
  ];

  const TOTAL_ROWS = layers.length + 1; // +1 for Unicode/URI bottom
  const CONTAINER_H = TOTAL_ROWS * (ROW_H + GAP);

  // Digital Signature spans from Proof (index 1) to RDF (index 4)
  const sigTopIndex = 1; // Proof
  const sigBottomIndex = 4; // RDF
  const sigTop = sigTopIndex * (ROW_H + GAP);
  const sigBottom = (sigBottomIndex + 1) * (ROW_H + GAP) - GAP;

  return (
    <div
      className="relative mx-auto select-none"
      style={{ maxWidth: 540, height: CONTAINER_H }}
    >
      {/* Main layers */}
      {layers.map((layer, i) => {
        const top = i * (ROW_H + GAP);
        // Right-align: position from the right
        const rightPct = layer.right;
        const widthPct = layer.width;
        // Calculate left from right + width: left = 100 - right - width
        const leftPct = 100 - rightPct - widthPct;
        return (
          <a
            key={layer.id}
            href={`#layer-${layer.id}`}
            className="absolute flex items-center justify-center font-display font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.01]"
            style={{
              top,
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: ROW_H,
              backgroundColor: layer.color,
              color: layer.dark ? "hsl(220, 20%, 12%)" : "white",
              borderRadius: 3,
            }}
            title={`Jump to: ${layer.label}`}
          >
            {layer.label}
          </a>
        );
      })}

      {/* Bottom row: Unicode | URI — two boxes side by side, right-aligned */}
      {(() => {
        const top = layers.length * (ROW_H + GAP);
        const totalW = 85; // total width %
        const unicodeW = totalW * 0.55;
        const uriW = totalW * 0.45;
        const uriLeft = 100 - uriW;
        const unicodeLeft = uriLeft - unicodeW - 0.5;
        return (
          <>
            <a
              href="#layer-0"
              className="absolute flex items-center justify-center font-display font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.01]"
              style={{
                top,
                left: `${unicodeLeft}%`,
                width: `${unicodeW}%`,
                height: ROW_H,
                backgroundColor: TOWER_COLORS.unicode,
                color: "white",
                borderRadius: 3,
              }}
              title="Jump to: Unicode + URI"
            >
              Unicode
            </a>
            <a
              href="#layer-0"
              className="absolute flex items-center justify-center font-display font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.01]"
              style={{
                top,
                left: `${uriLeft}%`,
                width: `${uriW}%`,
                height: ROW_H,
                backgroundColor: TOWER_COLORS.uri,
                color: "white",
                borderRadius: 3,
              }}
              title="Jump to: Unicode + URI"
            >
              URI
            </a>
          </>
        );
      })()}

      {/* Digital Signature — spans Proof to RDF on the far right */}
      <a
        href="#layer-7"
        className="absolute flex items-center justify-center font-display font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110 hover:scale-[1.01]"
        style={{
          top: sigTop,
          right: 0,
          width: `${SIG_W}%`,
          height: sigBottom - sigTop,
          backgroundColor: TOWER_COLORS.sig,
          color: "hsl(0, 0%, 92%)",
          borderRadius: 3,
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "0.05em",
        }}
        title="Jump to: Digital Signature"
      >
        Digital Signature
      </a>
    </div>
  );
}

/* ── Layer Detail Card ──────────────────────────────────────────────────── */

function LayerCard({ layer }: { layer: (typeof semanticWebLayers)[number] }) {
  return (
    <div
      id={`layer-${layer.number}`}
      className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-28"
    >
      {/* Color header */}
      <div
        className="px-6 py-3.5 flex items-center gap-3"
        style={{
          backgroundColor: layer.color,
          color: layer.textDark ? "hsl(220, 20%, 12%)" : "white",
        }}
      >
        <span className="font-mono text-xs font-bold opacity-60">
          {layer.number === 7 ? "⧫" : `L${layer.number}`}
        </span>
        <h3 className="font-display text-base sm:text-lg font-bold">{layer.title}</h3>
      </div>

      <div className="p-6 md:p-8">
        {/* Two-column: What / Why */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
              What It Does
            </p>
            <p className="text-sm font-body text-foreground leading-relaxed">
              {layer.what}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">
              Why It Matters
            </p>
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {layer.why}
            </p>
          </div>
        </div>

        {/* UOR contribution */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
          <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-primary mb-2">
            UOR Implementation
          </p>
          <p className="text-sm font-body text-foreground leading-relaxed">
            {layer.uor}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

const SemanticWebPage = () => {
  const pyramid = semanticWebLayers.filter((l) => l.number <= 6);
  const signature = semanticWebLayers.find((l) => l.number === 7);
  const allLayers = [...pyramid, ...(signature ? [signature] : [])];

  const comparisons = [
    {
      aspect: "Identity",
      original: "Location-based URIs assigned by authorities. Same data can have different names on different systems.",
      uor: "Content-derived addresses. Same content, same address, every system, no coordination.",
    },
    {
      aspect: "Schema",
      original: "Schemas authored separately and linked by convention. Validity requires external tools.",
      uor: "Schema embedded in every document via JSON-LD @context. Every document is self-describing.",
    },
    {
      aspect: "Reasoning",
      original: "Open-world inference. Computationally expensive. May not terminate.",
      uor: "Seven deterministic canonicalization rules. Always terminates. Always verifiable.",
    },
    {
      aspect: "Proof",
      original: "Proposed but never widely standardized. Most systems rely on source trust.",
      uor: "Every operation produces a PROV-O aligned derivation record. Proofs are structural, not optional.",
    },
    {
      aspect: "Trust",
      original: "Depends on digital signatures, certificate authorities, and institutional reputation.",
      uor: "Mathematical property. neg(bnot(x)) = succ(x) verifiable by any machine in under a second.",
    },
    {
      aspect: "Deduplication",
      original: "owl:sameAs assertions: manual, error-prone, non-transitive at scale.",
      uor: "Same derivation ID = provably identical. Computed, not asserted.",
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            The Semantic Web, Powered by UOR
          </h1>
          <p
            className="mt-6 text-base md:text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl"
            style={{ animationDelay: "0.15s" }}
          >
            How the UOR Framework implements and extends every layer of the W3C Semantic Web architecture to power the era of trusted Agentic AI.
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
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-6">
            Definition
          </p>
          <blockquote className="border-l-4 border-primary pl-6 py-2 max-w-3xl">
            <p className="text-foreground font-display text-xl md:text-2xl font-medium italic leading-relaxed">
              "The Semantic Web is an extension of the current web in which information is given well-defined meaning, better enabling computers and people to work in cooperation."
            </p>
            <footer className="mt-4 text-sm font-body text-muted-foreground">
              Tim Berners-Lee, James Hendler, and Ora Lassila.{" "}
              <a
                href="https://www-sop.inria.fr/acacia/cours/essi2006/Scientific%20American_%20Feature%20Article_%20The%20Semantic%20Web_%20May%202001.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                "The Semantic Web"
              </a>
              . Scientific American, May 2001.
            </footer>
          </blockquote>
          <p className="mt-8 text-muted-foreground font-body text-base md:text-lg leading-[1.85] max-w-3xl">
            The Semantic Web extends the web from a network of documents into a network of{" "}
            <span className="text-foreground font-medium">machine-understandable data</span>.
            Its architecture is organized as a layered tower, where each level builds on the one below.
            The UOR Framework provides a concrete, algebraic implementation of every layer.
          </p>
        </div>
      </section>

      {/* Tower */}
      <section id="tower" className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Architecture
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            The Semantic Web Tower
          </h2>
          <p className="text-sm text-muted-foreground font-body mb-10">
            Click any layer to jump to its description.{" "}
            <a
              href={W3C_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              W3C Reference
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
            What each layer does, and how UOR implements it
          </h2>

          <div className="space-y-5">
            {allLayers.map((layer) => (
              <LayerCard key={layer.number} layer={layer} />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Comparison
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-10">
            Original proposal vs. UOR implementation
          </h2>

          {/* Table for md+ */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3.5 font-semibold text-foreground w-[15%]">Layer</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground w-[42.5%]">Original Proposal</th>
                  <th className="text-left px-6 py-3.5 font-semibold text-primary w-[42.5%]">UOR</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={row.aspect} className={i < comparisons.length - 1 ? "border-b border-border" : ""}>
                    <td className="px-6 py-4 font-display font-bold text-foreground align-top">{row.aspect}</td>
                    <td className="px-6 py-4 text-muted-foreground leading-relaxed align-top">{row.original}</td>
                    <td className="px-6 py-4 text-foreground leading-relaxed align-top bg-primary/[0.03]">{row.uor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards for mobile */}
          <div className="md:hidden space-y-3">
            {comparisons.map((row) => (
              <div key={row.aspect} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-sm font-bold text-foreground mb-3">{row.aspect}</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-muted-foreground/50 mb-1">Original</p>
                    <p className="text-sm font-body text-muted-foreground leading-relaxed">{row.original}</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                    <p className="text-[11px] font-body font-semibold tracking-widest uppercase text-primary mb-1">UOR</p>
                    <p className="text-sm font-body text-foreground leading-relaxed">{row.uor}</p>
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
          <p className="text-muted-foreground font-body text-base leading-relaxed max-w-md mx-auto mb-8">
            Every layer is formally specified, implemented, and independently verifiable.
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

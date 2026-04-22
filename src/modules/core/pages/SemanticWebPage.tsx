import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { ExternalLink, ArrowRight } from "lucide-react";
import { semanticWebLayers } from "@/data/semantic-web-layers";
import { Link } from "react-router-dom";
import heroImage from "@/assets/blog-knowledge-graph.png";
import TldrAside from "@/modules/community/components/TldrAside";

const W3C_REFERENCE_URL = "https://www.w3.org/RDF/Metalog/docs/sw-easy";

const TOWER_COLORS = {
  unicode: "hsl(220, 12%, 30%)",
  uri:     "hsl(220, 12%, 30%)",
  xml:     "hsl(14, 85%, 50%)",
  rdf:     "hsl(42, 95%, 55%)",
  ontology:"hsl(90, 60%, 48%)",
  logic:   "hsl(210, 70%, 50%)",
  proof:   "hsl(260, 40%, 60%)",
  trust:   "hsl(300, 55%, 78%)",
  sig:     "hsl(25, 40%, 38%)",
};

function SemanticWebTower() {
  const ROW_H = 44;
  const GAP = 3;
  const SIG_W_PX = 80;
  const SIG_GAP_PX = 4;
  const CONTAINER_W = 560;
  const mainRight = CONTAINER_W - SIG_W_PX - SIG_GAP_PX;

  const layers = [
    { id: 6, label: "Trust",                widthPct: 38, color: TOWER_COLORS.trust,    darkText: true  },
    { id: 5, label: "Proof",                widthPct: 46, color: TOWER_COLORS.proof,    darkText: false },
    { id: 4, label: "Logic",                widthPct: 54, color: TOWER_COLORS.logic,    darkText: false },
    { id: 3, label: "Ontology vocabulary",  widthPct: 64, color: TOWER_COLORS.ontology, darkText: true  },
    { id: 2, label: "RDF + rdfschema",      widthPct: 74, color: TOWER_COLORS.rdf,      darkText: true  },
    { id: 1, label: "XML + NS + xmlschema", widthPct: 88, color: TOWER_COLORS.xml,      darkText: false },
  ];

  const TOTAL_ROWS = layers.length + 1;
  const CONTAINER_H = TOTAL_ROWS * (ROW_H + GAP);
  const sigTopIndex = 1;
  const sigBotIndex = 4;
  const sigTop = sigTopIndex * (ROW_H + GAP);
  const sigBottom = (sigBotIndex + 1) * (ROW_H + GAP) - GAP;

  return (
    <div className="relative mx-auto select-none" style={{ maxWidth: CONTAINER_W, height: CONTAINER_H + 120 }}>
      {layers.map((layer, i) => {
        const top = i * (ROW_H + GAP);
        const widthPx = (layer.widthPct / 100) * mainRight;
        const leftPx = mainRight - widthPx;
        return (
          <a key={layer.id} href={`#layer-${layer.id}`} className="absolute flex items-center justify-center font-display font-bold text-fluid-label transition-all duration-200 hover:brightness-110 hover:scale-[1.01]" style={{ top, left: leftPx, width: widthPx, height: ROW_H, backgroundColor: layer.color, color: layer.darkText ? "hsl(220, 20%, 12%)" : "white", borderRadius: 3 }} title={`Jump to: ${layer.label}`}>
            {layer.label}
          </a>
        );
      })}
      {(() => {
        const top = layers.length * (ROW_H + GAP);
        const totalW = (90 / 100) * mainRight;
        const gap = 4;
        const uriW = totalW * 0.42;
        const unicodeW = totalW - uriW - gap;
        const uriLeft = mainRight - uriW;
        const unicodeLeft = uriLeft - unicodeW - gap;
        return (
          <>
            <a href="#layer-0" className="absolute flex items-center justify-center font-display font-bold text-fluid-label transition-all duration-200 hover:brightness-110 hover:scale-[1.01]" style={{ top, left: unicodeLeft, width: unicodeW, height: ROW_H, backgroundColor: TOWER_COLORS.unicode, color: "white", borderRadius: 3 }} title="Jump to: Unicode">Unicode</a>
            <a href="#layer-0" className="absolute flex items-center justify-center font-display font-bold text-fluid-label transition-all duration-200 hover:brightness-110 hover:scale-[1.01]" style={{ top, left: uriLeft, width: uriW, height: ROW_H, backgroundColor: TOWER_COLORS.uri, color: "white", borderRadius: 3 }} title="Jump to: URI">URI</a>
          </>
        );
      })()}
      <a href="#layer-7" className="absolute flex flex-col items-center justify-center font-display font-bold text-fluid-label transition-all duration-200 hover:brightness-110 hover:scale-[1.01]" style={{ top: sigTop, left: mainRight + SIG_GAP_PX, width: SIG_W_PX, height: sigBottom - sigTop, backgroundColor: "transparent", border: `2px solid ${TOWER_COLORS.sig}`, color: TOWER_COLORS.sig, borderRadius: 3, writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.05em" }} title="Jump to: Digital Signature">Digital Signature</a>
      <div className="absolute font-body text-fluid-caption text-muted-foreground leading-relaxed space-y-2" style={{ top: CONTAINER_H + 16, left: 0, right: 0 }}>
        <p><span className="font-display font-bold text-foreground">* URI:</span> UOR replaces location-based URIs with content-derived addresses. Identity comes from what the data is, not where it lives.</p>
        <p><span className="font-display font-bold text-foreground">* Digital Signature:</span> UOR certificates are content-addressed hashes built into every object. Any modification changes the address, making tampering self-evident.</p>
      </div>
    </div>
  );
}

function LayerCard({ layer }: { layer: (typeof semanticWebLayers)[number] }) {
  return (
    <div id={`layer-${layer.number}`} className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-28">
      <div className="px-6 py-3.5 flex items-center gap-3" style={{ backgroundColor: layer.color, color: layer.textDark ? "hsl(220, 20%, 12%)" : "white" }}>
        <span className="font-mono text-fluid-caption font-bold opacity-60">{layer.number === 7 ? "⧫" : `L${layer.number}`}</span>
        <h3 className="font-display text-fluid-card-title font-bold">{layer.title}</h3>
      </div>
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">What It Does</p>
            <p className="text-fluid-body font-body text-foreground leading-relaxed">{layer.what}</p>
          </div>
          <div>
            <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-muted-foreground/50 mb-2">Why It Matters</p>
            <p className="text-fluid-body font-body text-muted-foreground leading-relaxed">{layer.why}</p>
          </div>
        </div>
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-5">
          <p className="text-fluid-caption font-body font-semibold tracking-widest uppercase text-primary mb-2">UOR Implementation</p>
          <p className="text-fluid-body font-body text-foreground leading-relaxed">{layer.uor}</p>
        </div>
      </div>
    </div>
  );
}

const SemanticWebPage = () => {
  const pyramid = semanticWebLayers.filter((l) => l.number <= 6);
  const signature = semanticWebLayers.find((l) => l.number === 7);
  const allLayers = [...pyramid, ...(signature ? [signature] : [])];

  const comparisons = [
    { aspect: "Identity", original: "Location-based URIs assigned by authorities. Same data can have different names on different systems.", uor: "Content-derived addresses. Same content, same address, every system, no coordination." },
    { aspect: "Schema", original: "Schemas authored separately and linked by convention. Validity requires external tools.", uor: "Schema embedded in every document via JSON-LD @context. Every document is self-describing." },
    { aspect: "Reasoning", original: "Open-world inference. Computationally expensive. May not terminate.", uor: "Seven deterministic canonicalization rules. Always terminates. Always verifiable." },
    { aspect: "Proof", original: "Proposed but never widely standardized. Most systems rely on source trust.", uor: "Every operation produces a PROV-O aligned derivation record. Proofs are structural, not optional." },
    { aspect: "Trust", original: "Depends on digital signatures, certificate authorities, and institutional reputation.", uor: "Built-in mathematical verification. Any machine can check it in under a second." },
    { aspect: "Deduplication", original: "owl:sameAs assertions: manual, error-prone, non-transitive at scale.", uor: "Same derivation ID = provably identical. Computed, not asserted." },
  ];

  return (
    <ArticleLayout
      kicker="Standards"
      title="The Semantic Web, powered by UOR"
      heroImage={heroImage}
      backHref="/framework"
      backLabel="Back to Framework"
      sourceUrl={W3C_REFERENCE_URL}
      sourceLabel="W3C Semantic Web Reference"
    >
      <TldrAside
        extra={
          <blockquote className="not-prose border-l-2 border-primary/60 pl-5 py-1">
            <p className="font-body italic text-[15px] md:text-[16px] leading-[1.7] text-foreground/85 m-0">
              "The Semantic Web is an extension of the current web in which information is given well-defined meaning, better enabling computers and people to work in cooperation."
            </p>
            <footer className="mt-3 text-[13.5px] font-body text-muted-foreground">
              Tim Berners-Lee, James Hendler, and Ora Lassila.{" "}
              <a href="https://www-sop.inria.fr/acacia/cours/essi2006/Scientific%20American_%20Feature%20Article_%20The%20Semantic%20Web_%20May%202001.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">"The Semantic Web"</a>. Scientific American, May 2001.
            </footer>
          </blockquote>
        }
      >
        <p>
          The W3C Semantic Web stack — URI, RDF, Ontology, Logic, Proof, Trust — was a 2001 vision for a web of meaning, not just documents. UOR implements each layer with content-derived addresses, embedded schemas, deterministic canonicalization, and structural proofs. The result: a Semantic Web that actually works, where every object is self-describing, self-verifying, and interoperable across every system.
        </p>
      </TldrAside>

      <section id="tower" className="scroll-mt-28">
        <h2>The Semantic Web tower</h2>
        <p>
          The W3C Semantic Web is specified as a stack of layers, each one building on the layer beneath it. Click any layer below to jump to its description, or read the full{" "}
          <a href={W3C_REFERENCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
            W3C reference <ExternalLink className="w-3 h-3 inline" />
          </a>
          .
        </p>
        <div className="not-prose my-10">
          <SemanticWebTower />
        </div>
      </section>

      <section>
        <h2>What each layer does, and how UOR implements it</h2>
        <p>
          Every layer of the original specification has a direct, formally verifiable counterpart in UOR. The W3C tower defines the surface; UOR provides the substrate.
        </p>
        <div className="not-prose mt-8 space-y-5">
          {allLayers.map((layer) => (
            <LayerCard key={layer.number} layer={layer} />
          ))}
        </div>
      </section>

      <section>
        <h2>Original proposal vs. UOR implementation</h2>
        <p>
          Where the original Semantic Web depended on coordination, conventions, and external authorities, UOR derives the same guarantees from the structure of the data itself.
        </p>
        <div className="not-prose mt-8 hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full font-body text-[15px] md:text-[16px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold text-foreground w-[15%]">Layer</th>
                <th className="text-left px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold text-muted-foreground w-[42.5%]">Original Proposal</th>
                <th className="text-left px-6 py-3.5 text-[11px] uppercase tracking-[0.24em] font-semibold text-primary w-[42.5%]">UOR</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <tr key={row.aspect} className={i < comparisons.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-6 py-4 font-display font-bold text-foreground align-top">{row.aspect}</td>
                  <td className="px-6 py-4 text-muted-foreground leading-[1.7] align-top">{row.original}</td>
                  <td className="px-6 py-4 text-foreground leading-[1.7] align-top bg-primary/[0.03]">{row.uor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="not-prose mt-8 md:hidden space-y-3">
          {comparisons.map((row) => (
            <div key={row.aspect} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-[15px] font-bold text-foreground mb-3">{row.aspect}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-muted-foreground/60 mb-1">Original</p>
                  <p className="font-body text-[14.5px] text-muted-foreground leading-[1.7]">{row.original}</p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-primary mb-1">UOR</p>
                  <p className="font-body text-[14.5px] text-foreground leading-[1.7]">{row.uor}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>See it in action</h2>
        <p>
          The Oracle renders any URL or concept through the full Semantic Web stack in real time. Every object is content-addressed, machine-queryable, and interoperable with W3C standards.
        </p>
        <div className="not-prose mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/os?q=https://en.wikipedia.org/wiki/Semantic_Web"
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all"
          >
            <span className="text-lg mb-2 block">🌐</span>
            <p className="font-display font-bold text-foreground text-[14px] mb-1">Encode Wikipedia</p>
            <p className="text-[13.5px] text-muted-foreground leading-[1.65]">Absorb the Semantic Web article into UOR space</p>
          </Link>
          <Link
            to="/os?q=semantic+web"
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all"
          >
            <span className="text-lg mb-2 block">🔮</span>
            <p className="font-display font-bold text-foreground text-[14px] mb-1">Ask the Oracle</p>
            <p className="text-[13.5px] text-muted-foreground leading-[1.65]">Generate a KnowledgeCard with full W3C layer mapping</p>
          </Link>
          <Link
            to="/os"
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all"
          >
            <span className="text-lg mb-2 block">🔗</span>
            <p className="font-display font-bold text-foreground text-[14px] mb-1">Encode any URL</p>
            <p className="text-[13.5px] text-muted-foreground leading-[1.65]">Paste any website and watch UOR absorb its semantics</p>
          </Link>
        </div>
      </section>

      <section>
        <h2>Your device is the portal</h2>
        <p>
          Every layer is formally specified, implemented, and independently verifiable. The same semantic surface serves humans and AI agents alike.
        </p>
        <div className="not-prose mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
          <Link to="/os" className="btn-primary inline-flex items-center gap-2">
            Enter the Rendered Web <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/framework" className="btn-outline inline-flex items-center gap-2">
            Read the Framework <ArrowRight className="w-4 h-4" />
          </Link>
          <a href={W3C_REFERENCE_URL} target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2">
            W3C Reference <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>
    </ArticleLayout>
  );
};

export default SemanticWebPage;

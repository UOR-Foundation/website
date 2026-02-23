import Navbar from "@/modules/core/components/Navbar";
import Footer from "@/modules/core/components/Footer";
import DocsLayout from "../components/DocsLayout";
import { docSidebars } from "../data/doc-sidebars";

const ConceptsDocPage = () => (
  <>
    <Navbar />
    <DocsLayout
      sidebar={docSidebars.concepts}
      breadcrumbs={[{ label: "Core Concepts" }]}
      tocItems={[
        { label: "Content Addressing", id: "addressing" },
        { label: "Verification Grades", id: "grades" },
        { label: "Content Quality", id: "quality" },
        { label: "Precision Levels", id: "precision" },
        { label: "Trust Model", id: "trust" },
      ]}
    >
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Core Concepts
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xl mb-4">
          The five ideas that make UOR work. No prior knowledge assumed.
          Each concept is self-contained — read any one in under 2 minutes.
        </p>
      </div>

      {/* Content Addressing */}
      <section id="addressing" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Content Addressing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Every piece of content gets a permanent identifier derived from the content itself.
          The same content always produces the same address, on any system, with no coordination.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          This means identity is <em>intrinsic</em> — not assigned by a registry, not dependent on location.
          Move the content anywhere, and its address stays the same. Change a single byte, and the address changes.
        </p>
        <div className="rounded-lg border border-border/40 bg-card/20 p-4 text-xs text-muted-foreground font-mono">
          "hello" → ⠨⠥⠬⠬⠯ (always, everywhere)
        </div>
      </section>

      {/* Verification Grades */}
      <section id="grades" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Verification Grades</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Not all results are equally certain. UOR grades every result from A to D:
        </p>
        <div className="space-y-2 mb-3">
          {[
            { grade: "A", label: "Algebraically proven", desc: "Mathematical certainty. The result follows from the axioms." },
            { grade: "B", label: "Empirically verified", desc: "Verified by independent computation but not formally proven." },
            { grade: "C", label: "Plausible", desc: "Consistent with known data but not independently verified." },
            { grade: "D", label: "Unverified", desc: "Raw output, no verification applied." },
          ].map((g) => (
            <div key={g.grade} className="flex gap-3 items-start rounded-lg border border-border/30 bg-card/20 p-3">
              <span className="shrink-0 w-7 h-7 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                {g.grade}
              </span>
              <div>
                <p className="text-sm text-foreground font-medium font-body">{g.label}</p>
                <p className="text-xs text-muted-foreground">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Quality */}
      <section id="quality" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Content Quality Scoring</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          UOR scores content on a 0–1 density scale by analysing the ratio of novel bytes
          (irreducible — can't be broken down further) to repeated bytes (reducible — decomposable).
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          High density = novel, information-rich content. Low density = repetitive patterns,
          often characteristic of automated or malicious payloads. One API call, one score, no heuristics.
        </p>
      </section>

      {/* Precision Levels */}
      <section id="precision" className="mb-12">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Precision Levels</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          UOR operates at three precision levels (bit-widths):
        </p>
        <div className="space-y-2">
          {[
            { level: "Q0", bits: "8-bit", desc: "256 values. Default for most operations. Fast, compact." },
            { level: "Q1", bits: "16-bit", desc: "65,536 values. Higher precision when needed." },
            { level: "Q2", bits: "32-bit", desc: "4 billion+ values. Maximum precision for demanding use cases." },
          ].map((q) => (
            <div key={q.level} className="flex gap-3 items-start rounded-lg border border-border/30 bg-card/20 p-3">
              <span className="shrink-0 px-2 py-1 rounded-md bg-primary/15 text-primary text-xs font-mono font-bold">
                {q.level}
              </span>
              <div>
                <p className="text-sm text-foreground font-medium font-body">{q.bits}</p>
                <p className="text-xs text-muted-foreground">{q.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Model */}
      <section id="trust" className="mb-4">
        <h2 className="text-2xl font-display font-semibold text-foreground mb-3">Trust Model</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          UOR's trust model is based on <em>independent verification</em>, not authority.
          Any peer can verify any result without coordinating with anyone else.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Agents build reputation through verifiable outputs — each output is graded,
          tracked, and independently auditable. Trust is earned mathematically, not declared.
        </p>
      </section>
    </DocsLayout>
    <Footer />
  </>
);

export default ConceptsDocPage;

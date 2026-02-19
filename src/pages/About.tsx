import Layout from "@/components/layout/Layout";

const About = () => {
  return (
    <Layout>
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            About the UOR Foundation
          </h1>
           <p className="mt-6 text-lg md:text-xl text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Open standards for universal data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-28 bg-background">
        <div className="container max-w-3xl space-y-14">
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Mission</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              An open standard for true interoperability. Data referenced by what it <em className="not-italic text-foreground/70">is</em>, not where it <em className="not-italic text-foreground/70">lives</em>.
            </p>
          </div>

          <div className="rule" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">What We Do</h2>
            <ul className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">UOR Framework</strong> Universal coordinate system for semantic interoperability.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">Open Science</strong> Reproducible research and transparent knowledge sharing.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">Distribution</strong> Discovery, licensing, and monetization of research products.</span>
              </li>
            </ul>
          </div>

          <div className="rule" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Governance</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-6">
              The UOR Foundation enforces a formal governance framework across every repository. It is the single source of truth for how code, proofs, and documentation are created, reviewed, versioned, secured, and retired.
            </p>
            <div className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-6">
              <p>Five non-negotiable principles guide every decision:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Traceability.</strong> Every change is attributable to an author and linked to a reason.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Coherence.</strong> All repositories form one navigable, self-consistent body of work.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Reversibility.</strong> Every action is undoable without data loss.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Verification.</strong> Every claim about correctness is mechanically checkable.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Openness.</strong> Governance, decisions, and processes are visible to everyone.</span>
                </li>
              </ul>
            </div>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-6">
              Repositories are classified into four tiers — Core Foundation, Implementation, Presentation, and Experimental — each with specific compliance obligations, review thresholds, and automated quality gates.
            </p>
            <a
              href="https://github.com/UOR-Foundation/.github/blob/main/governance/GOVERNANCE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-body text-base md:text-lg transition-colors group"
            >
              Read the full governance framework
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          <div className="rule" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Donate Now</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Join us.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Join Discord
              </a>
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;

import Layout from "@/components/Layout";

const About = () => {
  return (
    <Layout>
      <section className="hero-gradient py-24 md:py-32">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6 font-body animate-fade-in-up">
            About
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-[1.1] text-balance animate-fade-in-up">
            About the UOR Foundation
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            A community-driven organization building open standards for universal data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-3xl space-y-16">
          <div className="rule-accent" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground font-body leading-relaxed">
              We create and maintain the Universal Object Reference — an open standard enabling true interoperability across data systems. Data referenced by what it <em className="not-italic text-foreground/70">is</em>, not where it lives. Identity from content, trust from coherence.
            </p>
          </div>

          <div className="rule-accent" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">What We Do</h2>
            <ul className="space-y-4 text-muted-foreground font-body leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                <span><strong className="text-foreground">The Standard</strong> — Universal algebra for content-addressed identity and verified computation.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                <span><strong className="text-foreground">Open Science</strong> — Reproducible research, transparent knowledge sharing, and peer-reviewed formalization.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                <span><strong className="text-foreground">Distribution</strong> — Discovery, licensing, and monetization of research products.</span>
              </li>
            </ul>
          </div>

          <div className="rule-accent" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Donate Now</h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-8">
              Researchers, developers, and architects — there's a place for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Join Discord
              </a>
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full border border-pill text-foreground font-medium text-sm hover:border-foreground/25 transition-all"
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
import Layout from "@/components/Layout";

const About = () => {
  return (
    <Layout>
      <section className="hero-gradient py-20 md:py-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            About the UOR Foundation
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            A community-driven organization building open standards for universal data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-3xl space-y-12">
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground font-body leading-relaxed">
              We create and maintain the Universal Coordinate System — an open standard enabling true interoperability across data systems. Data referenced by what it <em>is</em>, not where it <em>lives</em>.
            </p>
          </div>

          <div className="glow-line" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">What We Do</h2>
            <div className="space-y-4 text-muted-foreground font-body leading-relaxed">
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-foreground">The Standard</strong> — Universal coordinate system for semantic interoperability.</li>
                <li><strong className="text-foreground">Open Science</strong> — Reproducible research and transparent knowledge sharing.</li>
                <li><strong className="text-foreground">Distribution</strong> — Discovery, licensing, and monetization of research products.</li>
              </ul>
            </div>
          </div>

          <div className="glow-line" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Donate Now</h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-6">
              Researchers, developers, and advocates — there's a place for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Join Discord
              </a>
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full border border-pill text-foreground font-medium hover:border-foreground/30 transition-all"
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

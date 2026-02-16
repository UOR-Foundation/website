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
            We are a community-driven organization dedicated to developing open source standards and technologies for universal data infrastructure.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-background">
        <div className="container max-w-3xl space-y-12">
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground font-body leading-relaxed">
              The UOR Foundation exists to create and maintain the Universal Coordinate System — an open standard that enables true interoperability across data systems. We believe that when every piece of data can be referenced by what it <em>is</em> rather than where it <em>lives</em>, we unlock a new era of composable, trustworthy, and decentralized infrastructure.
            </p>
          </div>

          <div className="glow-line" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">What We Do</h2>
            <div className="space-y-4 text-muted-foreground font-body leading-relaxed">
              <p>
                We steward the UOR specification, fund research, and support projects that build on the standard. Our work spans three interconnected domains:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong className="text-foreground">The Standard</strong> — Developing and evolving the universal coordinate system specification for semantic interoperability.</li>
                <li><strong className="text-foreground">Open Science</strong> — Supporting reproducible research, peer-reviewed publications, and transparent knowledge sharing.</li>
                <li><strong className="text-foreground">Distribution</strong> — Building platforms for discovering, licensing, and monetizing research products.</li>
              </ul>
            </div>
          </div>

          <div className="glow-line" />

          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">Get Involved</h2>
            <p className="text-muted-foreground font-body leading-relaxed mb-6">
              The foundation thrives on community participation. Whether you're a researcher, developer, or advocate for open infrastructure — there's a place for you.
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

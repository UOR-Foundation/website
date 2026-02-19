import { Shield, GitBranch, Eye, CheckCircle, Undo2, Users } from "lucide-react";
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
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Governance</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Everything the foundation produces — code, proofs, documentation — is governed by a single public framework. It is built on six principles:
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { icon: GitBranch, label: "Traceability", desc: "Every change tied to a person and a reason." },
                { icon: Shield, label: "Coherence", desc: "One standard across every project." },
                { icon: Undo2, label: "Reversibility", desc: "Any action can be undone." },
                { icon: CheckCircle, label: "Verification", desc: "Correctness is proven, not claimed." },
                { icon: Eye, label: "Openness", desc: "All rules and decisions are public." },
                { icon: Users, label: "Accountability", desc: "Clear roles with defined responsibilities." },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-card/50 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.8} />
                    <span className="font-display text-sm font-semibold text-foreground">{label}</span>
                  </div>
                  <p className="text-muted-foreground font-body text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <a
              href="https://github.com/UOR-Foundation/.github"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-body text-base md:text-lg transition-colors group"
            >
              Read the governance framework
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

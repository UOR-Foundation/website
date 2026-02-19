import { Shield, GitBranch, Eye, CheckCircle, Undo2, Users, Heart, BookOpen, Microscope, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
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
            We build the shelves. You bring the books.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-28 bg-background">
        <div className="container max-w-3xl space-y-14">

          {/* Who We Are */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Who We Are</h2>
            <div className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              <p>
                Imagine the universe's best library. Every book has a permanent place on the shelf, determined by what is inside it, not by who donated it or which room has space. Anyone can walk in, find exactly what they need, and trust that nothing has been altered. That library does not tell you what to read. It just makes sure everything is findable, verifiable, and open.
              </p>
              <p>
                That is the UOR Foundation. We are a neutral, independent organization. We do not push a single approach. We maintain the infrastructure so that anyone, from any discipline, can explore, validate, and build.
              </p>
            </div>
          </div>

          <div className="rule" />

          {/* Our Mission */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Mission</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              Give every piece of information one permanent address, based on what it <em className="not-italic text-foreground/70">is</em>, not where it <em className="not-italic text-foreground/70">lives</em>. Make that address verifiable by anyone, composable across systems, and open forever.
            </p>
          </div>

          <div className="rule" />

          {/* What We Do */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">What We Do</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: BookOpen,
                  title: "The Framework",
                  desc: "A universal coordinate system for information. One address per object, derived from content, verifiable everywhere."
                },
                {
                  icon: Microscope,
                  title: "Open Research",
                  desc: "Community-driven research across disciplines with full transparency and reproducibility."
                },
                {
                  icon: Rocket,
                  title: "Project Incubation",
                  desc: "A structured path for open-source projects to grow from early ideas to production-ready tools."
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/60 bg-card/50 p-5 flex flex-col gap-3"
                >
                  <item.icon size={20} className="text-primary" />
                  <h3 className="font-display text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rule" />

          {/* Our Principles */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Principles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Transparency",
                  desc: "Every decision, change, and rule is publicly documented. No closed doors."
                },
                {
                  title: "Interoperability",
                  desc: "Built for connection, not lock-in. Works with any system, format, or framework."
                },
                {
                  title: "Trust",
                  desc: "Earned through verifiable proof, not authority. Every claim can be independently checked."
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/60 bg-card/50 p-5 flex flex-col gap-2"
                >
                  <h3 className="font-display text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rule" />

          {/* Governance */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Governance</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Everything the foundation produces is governed by a single transparent framework. It is built on six key principles.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { icon: GitBranch, label: "Traceability", desc: "Every change is tied to a person and a documented reason." },
                { icon: Shield, label: "Coherence", desc: "All projects follow one standard, forming a consistent whole." },
                { icon: Undo2, label: "Reversibility", desc: "Any action can be rolled back without permanent data loss." },
                { icon: CheckCircle, label: "Verification", desc: "Every correctness claim is proven, not asserted." },
                { icon: Eye, label: "Openness", desc: "All governance rules and decisions are publicly documented." },
                { icon: Users, label: "Accountability", desc: "Clear roles and responsibilities with defined escalation paths." },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-card/50 p-5 flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-[18px] h-[18px] text-primary shrink-0" strokeWidth={1.8} />
                    <span className="font-display text-base font-semibold text-foreground">{label}</span>
                  </div>
                  <p className="text-muted-foreground font-body text-sm leading-relaxed">{desc}</p>
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

          {/* Our Approach */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Approach</h2>
            <div className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              <p>
                There are many ways to solve problems in data, AI, and computation. We do not prescribe one. The foundation is a neutral space where different perspectives coexist, get tested, and are judged on their merits.
              </p>
              <p>
                If your work benefits from permanent identity, lossless composition, or verifiable transformations, there is a place for it here, regardless of your tools, language, or paradigm.
              </p>
            </div>
          </div>

          <div className="rule" />

          {/* Get Involved */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.55s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Get Involved</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Explore the framework, contribute research, or build something new. There is a place for you here.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Join Our Discord
              </a>
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                Explore on GitHub
              </a>
              <Link
                to="/donate"
                className="btn-outline inline-flex items-center gap-2"
              >
                <Heart size={15} />
                Support the Foundation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;

import { Shield, GitBranch, Eye, CheckCircle, Undo2, Users, Heart } from "lucide-react";
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
            A neutral, open foundation dedicated to building universal data infrastructure for everyone.
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
                The UOR Foundation is an independent, framework-agnostic organization. We do not advocate for a single approach to data, computation, or AI. We provide the space, tools, and governance for anyone to explore, validate, and build on ideas.
              </p>
              <p>
                We believe the most important problems in data infrastructure, from interoperability to trust to verification, are too large for any single perspective. Progress requires open collaboration across disciplines, institutions, and worldviews.
              </p>
              <p>
                Our role is to maintain the standards, host the research, and ensure that every contribution is transparent, traceable, and open.
              </p>
            </div>
          </div>

          <div className="rule" />

          {/* Our Mission */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Mission</h2>
            <div className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              <p>
                To develop and maintain an open data standard that gives every piece of information a permanent, verifiable address based on what it <em className="not-italic text-foreground/70">is</em>, not where it <em className="not-italic text-foreground/70">lives</em>.
              </p>
              <p>
                We are building the foundation for a world where data can move freely between systems without losing its meaning, where trust is mathematical rather than institutional, and where anyone can verify, compose, and build on the work of others.
              </p>
            </div>
          </div>

          <div className="rule" />

          {/* What We Do */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">What We Do</h2>
            <ul className="space-y-5 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">UOR Framework.</strong> We develop and maintain a universal coordinate system for information: one address per object, derived from content, verifiable across every system.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">Open Research.</strong> We host community-driven research across disciplines, from mathematics and AI to quantum computing and open science, with full transparency and reproducibility.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                <span><strong className="text-foreground">Project Incubation.</strong> We provide a structured path for open-source projects to grow from early experiments to production-ready tools within the foundation's ecosystem.</span>
              </li>
            </ul>
          </div>

          <div className="rule" />

          {/* Our Principles */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Principles</h2>
            <div className="space-y-4 text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              <p>
                Three commitments guide everything we do.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Transparency.</strong> Every decision, every change, and every rule is publicly documented. There are no closed-door processes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Interoperability.</strong> We build for connection, not lock-in. The standard is designed to work with any system, any format, and any framework.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Trust.</strong> Trust is earned through verifiable proof, not authority. Every claim the framework makes can be independently checked.</span>
                </li>
              </ul>
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
                { icon: CheckCircle, label: "Verification", desc: "Every correctness claim is mathematically proven, not asserted." },
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
                We acknowledge that there are many valid approaches to solving problems in data infrastructure, AI, and computation. The UOR Foundation does not prescribe a single path. Instead, we provide a neutral space where different perspectives can coexist, be tested, and be evaluated on their merits.
              </p>
              <p>
                Our framework is designed to be a shared foundation, not a walled garden. If your work can benefit from content-addressed identity, lossless composition, or verifiable transformations, there is a place for it here, regardless of which tools, languages, or paradigms you use.
              </p>
              <p>
                We believe the best ideas emerge through open exploration, honest critique, and cross-disciplinary collaboration.
              </p>
            </div>
          </div>

          <div className="rule" />

          {/* Get Involved */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.55s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Get Involved</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Whether you want to contribute research, build on the framework, or simply explore, there is a place for you here.
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

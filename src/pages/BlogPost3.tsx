import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, ExternalLink } from "lucide-react";
import coverImage from "@/assets/blog-uor-framework-launch.png";

const BlogPost3 = () => {
  return (
    <Layout>
      <article className="pt-40 md:pt-48 pb-20 md:pb-28">
        <div className="container max-w-3xl">
          {/* Back link */}
          <Link
            to="/research#blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors font-body mb-10"
          >
            <ArrowLeft size={15} />
            Back to Community
          </Link>

          {/* Meta */}
          <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-body">
              <Calendar size={14} />
              February 19, 2026
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-body">
              <Tag size={11} />
              Announcement
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            The UOR Framework Is Now Live
          </h1>

          {/* Cover image */}
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-border mb-6 animate-fade-in-up bg-card"
            style={{ animationDelay: "0.15s" }}
          >
            <img
              src={coverImage}
              alt="The UOR Framework"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Article body */}
          <div className="space-y-8 font-body text-base md:text-lg leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Today, the UOR Foundation is publishing the UOR Framework</strong>, an open data standard that gives every piece of information a single, permanent address based on what it is, not where it lives.
            </p>

            <p>
              In today's digital landscape, the same data is copied, reformatted, and stored across dozens of incompatible systems. When data moves between platforms, meaning is lost, trust breaks down, and verification becomes impossible. The UOR Framework solves this by providing a universal coordinate system for information.
            </p>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                What Is the UOR Framework?
              </h2>
              <p>
                Think of it like GPS coordinates for data. GPS gives every location on Earth a unique address that works regardless of which map application you use. Similarly, UOR gives every piece of information, whether it's a document, a dataset, a scientific finding, or a software artifact, a unique address derived from its content. Identical content always produces the same address. Different content always produces different addresses.
              </p>
              <p className="mt-4">
                This means you can verify that data hasn't been tampered with, trace its origin, and reuse it across systems, all without relying on a central authority.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                How It Works: Six Layers, One Foundation
              </h2>
              <p>
                The framework is organized into six layers, each building on the one below it. Together, they form a complete system for identifying, structuring, finding, verifying, and transforming data.
              </p>

              <div className="mt-6 space-y-6">
                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 0: The Foundation</h3>
                  <p className="text-base">Four mathematical axioms guarantee that every object can be broken down into irreducible building blocks and reassembled without losing information. This is the bedrock that makes everything else possible.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 1: Identity</h3>
                  <p className="text-base">Every object gets a single, deterministic address derived from its content. No central registry needed. If the content is the same, the address is the same, everywhere, always.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 2: Structure</h3>
                  <p className="text-base">Objects can be composed into larger structures and decomposed back into their parts, all without losing any information. Complex systems become navigable and auditable.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 3: Resolution</h3>
                  <p className="text-base">Find any object by describing what it contains, not by knowing where it is stored. Content-based addressing means discovery works across every system that implements the standard.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 4: Verification</h3>
                  <p className="text-base">Every operation produces a mathematical proof that it was performed correctly. You can verify data integrity, trace its history, and audit transformations without trusting the source.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Layer 5: Transformation</h3>
                  <p className="text-base">Data can change format, representation, or system without losing its essential properties. Move between JSON, RDF, binary, or any future format while preserving meaning and identity.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Why It Matters
              </h2>
              <p>
                The internet was built for linking documents, not for verifying, composing, and reasoning about data. As AI systems, scientific research, and decentralized applications demand trustworthy data, the absence of a universal data standard becomes a bottleneck.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">For researchers:</strong> Share datasets that can be independently verified and precisely cited, regardless of which platform hosts them.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">For developers:</strong> Build applications on a data layer that guarantees integrity and interoperability across services.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">For AI systems:</strong> Access information with verifiable provenance, enabling trustworthy reasoning and reducing hallucination.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">For organizations:</strong> Eliminate redundant integration work by adopting a single standard that connects to everything.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Explore the Framework
              </h2>
              <p>
                The full specification, documentation, and source code are open and available now. We invite researchers, developers, and anyone interested in the future of data to read, evaluate, and contribute.
              </p>
              <a
                href="https://github.com/UOR-Foundation/UOR-Framework"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline"
              >
                github.com/UOR-Foundation/UOR-Framework <ExternalLink size={14} />
              </a>
              <p className="mt-6">
                This is not a finished product. It is a foundation. The framework will grow through community review, real-world implementation, and open debate. Your perspective, especially where you disagree, is what makes this work better.
              </p>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-border">
            <p className="text-muted-foreground font-body mb-4">
              Join the conversation. Review the framework, share your feedback, and help shape the future of universal data infrastructure.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/UOR-Foundation/UOR-Framework"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                View the Framework
              </a>
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                Join Our Discord
              </a>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost3;

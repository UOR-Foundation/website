import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { DISCORD_URL, CRATE_URL, GITHUB_ORG_URL } from "@/data/external-links";
import heroImage from "@/assets/blog-uor-framework-launch.png";

const BlogCanonicalRustCrate = () => {
  return (
    <Layout>
      <article className="pt-40 md:pt-48 pb-20 md:pb-28">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] max-w-4xl">
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
              April 2, 2026
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-body">
              <Tag size={11} />
              Release
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-10 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            uor-foundation v0.1.5 — Canonical Rust Crate
          </h1>

          {/* Hero image */}
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-border mb-14 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <img
              src={heroImage}
              alt="uor-foundation canonical Rust crate release"
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Article body */}
          <div className="prose-uor space-y-8 font-body text-base md:text-lg leading-relaxed text-muted-foreground">
            <section>
              <p className="text-xl text-foreground/90 font-medium">
                We gave every digital object its own permanent, content-addressed, self-verifying identity.
              </p>
              <p className="mt-4">
                UOR is an open source standard that gives every structured object — a tool call, a config, a dataset row, a memory record, or any other piece of data moving between agents — its own permanent identity derived directly from its exact content.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Imagine this
              </h2>
              <p>
                An agent sends a structured object to another agent. The object travels through different programming languages, JSON libraries, middleware that reorders keys, queues that re-encode numbers, and checkpoint files that round-trip through different serializers.
              </p>
              <p className="mt-4">
                Traditional byte-level methods break on the first normal transformation. The identity changes even though the meaning stays the same.
              </p>
              <p className="mt-4">With UOR the identity stays exactly the same:</p>
              <pre className="mt-6 p-5 rounded-lg bg-muted/40 border border-border overflow-x-auto text-sm font-mono text-foreground/90">
{`tool_call.json
  sent                 >  identity stays identical
  after 3 round-trips  >  identity stays identical

  Verified locally in under 15 ms.`}
              </pre>
              <p className="mt-6">
                One consistent identity. No matter how many times the object is passed between systems. No trust required in the sender, the storage, the platform, or the network.
              </p>
              <blockquote className="my-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                That single property is what UOR delivers.
              </blockquote>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                How UOR works
              </h2>
              <p>
                UOR creates a single, repeatable structural description of the object at the algebraic level. It then produces a compact certificate from that description. Anyone can verify the certificate on their own device by running the same simple process.
              </p>
              <p className="mt-4">
                Change even one meaningful part of the object and the identity changes completely. Keep the meaning the same — even after reordering keys, swapping number encodings, or multiple round-trips through different JSON libraries — and the identity remains identical.
              </p>
              <p className="mt-4">
                The entire process is designed so the receiver can prove they received exactly what the sender produced, even after the normal transformations that happen between agents.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                How UOR is different
              </h2>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Git, IPFS, SHA-256:</strong> work well for fixed files and immutable blocks but break when objects are re-serialized.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Filename tags and model cards:</strong> rely on external metadata that can drift.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Platform signatures and blockchain entries:</strong> depend on the platform staying online.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Separate provenance tools:</strong> add extra databases and complexity.</span>
                </li>
              </ul>
              <p className="mt-6">
                UOR solves the problem at the object level itself. It needs no extra service, no keys, no registry, no PKI, and no coordination between parties.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                What can UOR enable?
              </h2>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">AI pipelines and agents:</strong> Every config, dataset, tool call, or output carries its own verifiable identity so downstream systems can confirm it is unchanged.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Data sharing and supply chains:</strong> Share a file or contract and the recipient can confirm it is identical, years later, on any device.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Deepfake and authenticity problems:</strong> Content carries a permanent identity that survives every mirror or re-upload.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Data lakes and reproducibility:</strong> Deduplication and lineage appear naturally without extra tools.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Why does UOR matter?
              </h2>
              <p>
                MCP and A2A define how agents talk to each other. UOR gives them the missing piece: a way for the receiver to know the object is exactly what the sender produced, even after every normal transformation across languages and runtimes.
              </p>
              <p className="mt-4">
                Identity now belongs to the object itself, not to any platform. You can verify it on your own machine in seconds.
              </p>
              <p className="mt-4">
                This makes structured data between autonomous systems trustworthy at the object level.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Try it yourself in under 30 seconds
              </h2>
              <p>
                Live playground runs entirely in your browser. No account. No server. No data leaves your device.
              </p>
              <p className="mt-4">
                Drop in any file or paste text. Instantly see the identity. Change one character or round-trip the object and watch how the identity behaves exactly as expected.
              </p>
              <p className="mt-6 text-foreground font-medium">For developers:</p>
              <pre className="mt-3 p-5 rounded-lg bg-muted/40 border border-border overflow-x-auto text-sm font-mono text-foreground/90">
{`cargo add uor-foundation
# then run the end-to-end example`}
              </pre>
              <blockquote className="my-8 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                A digital object's identity should travel with the object, survive every migration, and be verifiable by anyone, forever.
              </blockquote>
              <p className="text-foreground font-semibold text-xl font-display">
                UOR makes that real today.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Learn more
              </h2>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Live playground →</strong> <Link to="/oracle" className="text-primary hover:underline">uor.foundation/try</Link></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Full developer guide →</strong> <Link to="/framework" className="text-primary hover:underline">uor.foundation</Link></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Open repository →</strong> <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/uor-foundation</a></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Canonical Rust crate →</strong> <a href={CRATE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">crates.io/crates/uor-foundation</a></span>
                </li>
              </ul>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-border">
            <p className="text-muted-foreground font-body mb-4">
              Join our community of researchers, developers, and visionaries working to build the future of universal data representation.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Join Our Discord
              </a>
              <Link to="/community" className="btn-outline">
                Back to Community
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogCanonicalRustCrate;

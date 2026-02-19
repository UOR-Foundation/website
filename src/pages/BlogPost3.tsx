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
            Meet the UOR Framework
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
            <p className="text-xl md:text-2xl text-foreground font-display leading-snug">
              Your universal coordinate system for information.
            </p>

            <p>
              Every file you have ever shared, every dataset you have ever published, every piece of research you have ever cited, lives at an address that someone else controls. Move it, and the link breaks. Copy it, and you lose track of which version is real. Send it to another system, and half the meaning disappears.
            </p>

            <p>
              We built UOR to end that.
            </p>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                One Address. Derived from Content. Permanent.
              </h2>
              <p>
                The UOR Framework gives every piece of information a single address based on what it <em>is</em>, not where it happens to be stored. The same content always resolves to the same address, on any platform, in any format, at any point in time. No central registry. No intermediary. No single point of failure.
              </p>
              <p className="mt-4">
                Think of it as GPS for data. GPS does not care which map app you use. The coordinates are the coordinates. UOR works the same way for information. One address per object, everywhere, forever.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                What This Unlocks
              </h2>
              <p>
                Until now, every system that stores or processes data has been its own island. Getting data between islands means building bridges, and every bridge is different, fragile, and expensive to maintain.
              </p>
              <p className="mt-4">
                UOR replaces the bridges with a shared foundation. When your data has a permanent, verifiable address, everything changes.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">You can verify anything.</strong> Did this dataset change since it was published? Was this research actually produced by the person who claims it? You do not need to trust the source. The math tells you.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">You can find anything.</strong> Search by what data contains, not by where someone decided to put it. Discovery works across every system that speaks UOR.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">You can move anything.</strong> Change formats, move between platforms, transform representations. The identity and meaning of your data survive the journey intact.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">You can compose anything.</strong> Build complex structures from simple parts. Take them apart again. Nothing is lost.
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Six Layers. One Foundation.
              </h2>
              <p>
                The framework is built in layers, each one adding a new capability on top of the last. Together, they form a complete system for working with data the way it should have always worked.
              </p>

              <div className="mt-6 space-y-6">
                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">The Foundation</h3>
                  <p className="text-base">Everything starts here. Four core principles guarantee that any object can be broken into its simplest parts and perfectly reassembled. No information is ever lost. This is the bedrock.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Identity</h3>
                  <p className="text-base">Every object gets one address, derived from its content. Same content, same address. Always. Everywhere. No central authority required.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Structure</h3>
                  <p className="text-base">Combine objects into larger wholes. Pull them apart again. The composition is lossless. Complex systems become navigable, auditable, and fully transparent.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Resolution</h3>
                  <p className="text-base">Find what you need by describing it, not by knowing where it is stored. Content-based discovery that works across every system.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Verification</h3>
                  <p className="text-base">Every operation comes with proof. You can verify integrity, trace history, and audit transformations. Trust is built into the system, not bolted on after the fact.</p>
                </div>

                <div className="pl-5 border-l-2 border-primary/20">
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">Transformation</h3>
                  <p className="text-base">Change format, change system, change representation. The meaning and identity of your data travel with it. Nothing is lost in translation.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Who This Is For
              </h2>
              <p>
                If you work with data, this is for you.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Researchers</strong> who want datasets that can be independently verified and precisely cited, no matter where they are hosted.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Developers</strong> who want a data layer that guarantees integrity and interoperability without building custom integrations for every service.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">AI builders</strong> who need verifiable data provenance so their systems can reason with confidence instead of guessing.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Organizations</strong> tired of spending engineering hours gluing incompatible systems together.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                See for Yourself
              </h2>
              <p>
                The full specification, source code, and documentation are open, right now. Read it. Challenge it. Build on it.
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
                This is not a finished product. It is a foundation, and it is designed to grow through real-world use, honest critique, and open collaboration. Your perspective, especially where you see gaps, is exactly what makes this better.
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

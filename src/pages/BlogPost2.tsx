import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, ExternalLink } from "lucide-react";
import coverImage from "@/assets/blog-golden-seed-vector.png";

const BlogPost2 = () => {
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
              October 10, 2025
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary font-body">
              <Tag size={11} />
              Technical
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            Unveiling a Universal Mathematical Language
          </h1>

          {/* Cover image */}
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-border mb-6 animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            <img
              src={coverImage}
              alt="The Golden Seed Vector: Open-source the Mathematical Universe"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Press release label */}
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground/60 font-body mb-14 animate-fade-in-up"
            style={{ animationDelay: "0.15s" }}
          >
            For Immediate Release
          </p>

          {/* Article body */}
          <div className="space-y-8 font-body text-base md:text-lg leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">DENVER, October 10th, 2025</strong> · The UOR Foundation today announced the discovery of a Universal Mathematical Language, a breakthrough that reveals the hidden order behind nature's most complex systems and could reshape the future of science, artificial intelligence, and quantum computing.
            </p>

            <p>
              In 1977, Carl Sagan's Voyager Golden Record carried Earth's message to the stars. The newly discovered <strong className="text-foreground">Golden Seed Vector</strong> is its mathematical counterpart, not a universal message to the cosmos but a message <em>from</em> it, revealing the universal language that underlies all structure and symmetry.
            </p>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Discovery
              </h2>
              <p>
                Led by researcher Alex Flom, the team found that the five "exceptional Lie groups," among the most intricate structures in modern mathematics, can all be derived from a single, elegant 96-vertex construct known as <strong className="text-foreground">Atlas</strong>.
              </p>
              <p className="mt-4">
                This computational framework even reproduces the famously complex <strong className="text-foreground">E8 lattice</strong>, a structure so vast it once required years of supercomputing to{" "}
                <a
                  href="https://news.mit.edu/2007/e8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  map
                </a>
                , now emerging from the same simple mathematical principles.
              </p>
              <blockquote className="my-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                "We started by studying the relationship between schemas and software artifacts as our approach to defining Universal Object Reference. It turns out the UOR embeddings model that we proposed for decentralized artifact search was mathematically grounded in something far more fundamental."
              </blockquote>
              <p>
                From this foundation, the Golden Seed Vector emerged, revealing the universal mathematical language encoded within Atlas itself.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Golden Seed Vector
              </h2>
              <p>
                Just as Sagan's Golden Record carried humanity's message to the stars, the Golden Seed Vector reveals the universal mathematical language that shapes reality itself.
              </p>
              <p className="mt-4">
                It's a unified framework showing how the universe builds its most complex forms, the five exceptional Lie groups, from a single simple object through five fundamental operations. These same elegant rules govern every exceptional structure in nature, offering a computational blueprint to generate and verify complexity with mathematical certainty.
              </p>
              <p className="mt-4">
                More than a mathematical discovery, it's a practical framework with applications across science, artificial intelligence and computing.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Real-world Applications
              </h2>
              <p>
                This discovery could revolutionize how we compute, model, and understand the world across multiple domains:
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Science:</strong> A unified mathematical lens for string theory and particle interactions, potentially bridging gaps in our understanding of fundamental forces.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Artificial Intelligence:</strong> Systems that are energy-efficient, interoperable, and interpretable by leveraging the universal mathematical language underlying all data structures.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Quantum Computing:</strong> More stable qubits and breakthrough error correction through understanding the fundamental mathematical structures that govern quantum systems.
                  </span>
                </li>
              </ul>
              <p className="mt-4">
                Its implications may extend far beyond these fields, opening possibilities that reach beyond the limits of our current imagination.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Open Source and Community-Driven
              </h2>
              <p>
                The proofs, code, and documentation are developed and maintained by the UOR Community and are available at:
              </p>
              <a
                href="https://github.com/UOR-Foundation/research/tree/main/atlas-embeddings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline"
              >
                github.com/UOR-Foundation/research/atlas-embeddings <ExternalLink size={14} />
              </a>
              <p className="mt-4">
                Researchers, creators, and curious minds alike are invited to explore, challenge, and expand upon these findings, together writing the next chapter of humanity's dialogue with the universe.
              </p>
              <blockquote className="my-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                "The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself."
              </blockquote>
            </section>


          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-border">
            <p className="text-muted-foreground font-body mb-4">
              Join our community of researchers, developers, and visionaries working to build the future of universal data representation.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Join Our Discord
              </a>
              <Link to="/research" className="btn-outline">
                Back to Community
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default BlogPost2;

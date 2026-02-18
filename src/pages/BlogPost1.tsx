import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

const BlogPost1 = () => {
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
              December 21, 2023
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent font-body">
              <Tag size={11} />
              Vision
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-10 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            UOR: Building the Internet's Knowledge Graph
          </h1>

          {/* YouTube Embed */}
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-border mb-14 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/WWAySQvHcr0"
              title="S07E08 - From SEAL Missions to Graph Theory: A Diverse Journey with Alex Flom"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Article body */}
          <div className="prose-uor space-y-8 font-body text-base md:text-lg leading-relaxed text-muted-foreground">
            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Introduction
              </h2>
              <p>
                At the UOR Foundation, we often find ourselves contemplating ordinary objects in extraordinary ways. Take a simple coffee mug, for instance. To most, it's just a vessel for their morning caffeine fix. But to us, it represents something far more profound: a node in an infinite web of relationships, meanings, and possibilities.
              </p>
              <p className="mt-4">
                This is the vision behind UOR (Universal Object Reference), a technology that promises to transform the internet from a chaotic collection of websites into a unified knowledge graph of everything. It's not just about organizing information. It's about fundamentally reimagining how digital systems understand, relate to, and interact with the world around us.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Digital Chaos We Live In
              </h2>
              <p>
                Today's internet is a marvel of human achievement, yet it's also a labyrinth of disconnected information. When you search for something online, you're not accessing a coherent understanding of the world. You're sifting through billions of isolated documents, hoping to piece together meaning from fragments.
              </p>
              <blockquote className="my-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                "The current web is like a library where every book is written in a different language, filed in a different system, and the librarians don't talk to each other."
              </blockquote>
              <p>
                This fragmentation isn't just inconvenient; it's fundamentally limiting. It prevents us from building truly intelligent systems that can understand context, maintain relationships, and provide meaningful insights across domains.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                A Universal Language for Everything
              </h2>
              <p>
                UOR addresses this challenge by creating a universal language for describing and relating objects in the digital realm. Every piece of information, whether it's a document, an image, a concept, or even a relationship between concepts, gets a unique, mathematically-derived identifier.
              </p>
              <p className="mt-4">
                But here's where it gets interesting: these identifiers aren't just random strings. They're based on the fundamental mathematical properties of the objects they represent. This means that similar objects naturally cluster together, relationships become discoverable, and the entire system becomes self-organizing.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Mathematical Foundation:</strong> Built on prime number theory for universal uniqueness</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Self-Organizing:</strong> Similar objects naturally cluster and relate</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Context-Aware:</strong> Maintains semantic relationships across domains</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Verifiable:</strong> Every relationship can be mathematically proven</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Digital Twin Revolution
              </h2>
              <p>
                Imagine if every physical object, every concept, every relationship in the real world had a perfect digital twin. Not just a representation, but a mathematically precise mirror that maintains all the essential properties and relationships of its physical counterpart.
              </p>
              <p className="mt-4">
                This is what UOR enables. That coffee mug we mentioned earlier? In a UOR-powered system, its digital twin would know that it's made of ceramic, that it has a handle, that it's designed to hold liquids, that it was manufactured in a specific factory, that it's currently sitting on your desk next to your laptop, and that it has a small chip on the rim from when you accidentally knocked it against the sink last Tuesday.
              </p>
              <p className="mt-4">
                More importantly, it would understand the relationships: how it relates to other mugs, to the concept of containers, to the morning routine, to the coffee supply chain, and to thousands of other objects and concepts in ways that create a rich, interconnected web of meaning.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Internet, Reimagined
              </h2>
              <p>
                Now scale this concept to the entire internet. Instead of isolated websites and disconnected databases, imagine a unified knowledge graph where every piece of information is precisely positioned in a vast web of relationships and meanings.
              </p>
              <p className="mt-4">In this world:</p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Search becomes discovery. Systems don't just find documents, they understand what you're really looking for</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Applications can seamlessly share and build upon each other's knowledge</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>Data maintains its context and meaning as it moves between systems</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>New insights emerge from the connections between previously unrelated information</span>
                </li>
              </ul>
              <p className="mt-4">
                This isn't just a better search engine or a more efficient database. It's a fundamental reimagining of how digital systems understand and interact with information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Semantic Revolution
              </h2>
              <p>
                What we're describing is essentially a semantic revolution, a shift from syntax-based computing (where systems manipulate symbols without understanding their meaning) to truly semantic computing (where systems understand the meaning and relationships of the information they process).
              </p>
              <blockquote className="my-6 border-l-4 border-primary/30 pl-6 italic text-foreground/80">
                "We're not just building better tools; we're creating a new form of digital intelligence that understands the world the way humans do, through relationships, context, and meaning."
              </blockquote>
              <p>
                This has profound implications for artificial intelligence, data science, and virtually every field that deals with information. When systems can truly understand the semantic relationships between concepts, they can reason, infer, and discover in ways that were previously impossible.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                From Vision to Reality
              </h2>
              <p>
                The UOR Foundation isn't just dreaming about this future. We're building it. Our work spans multiple domains:
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Mathematical Foundations:</strong> Developing the prime number theory and algorithms that make universal object reference possible</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Protocol Development:</strong> Creating the standards and protocols that enable systems to communicate semantically</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span><strong className="text-foreground">Application Development:</strong> Building real-world applications that demonstrate the power of semantic interoperability</span>
                </li>
              </ul>
              <p className="mt-4">
                Each piece of this puzzle is essential. The mathematics provides the foundation for trust and verifiability. The protocols enable interoperability and communication. The applications prove that the vision can become reality.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Promise of Permanence
              </h2>
              <p>
                One of the most exciting aspects of UOR is its promise of permanence. In today's digital world, links break, websites disappear, and information becomes inaccessible. But in a UOR-powered system, every object has a permanent, mathematically-derived address that can't be broken or lost.
              </p>
              <p className="mt-4">
                This means that knowledge, once created and properly referenced, becomes part of the permanent fabric of human understanding. Future generations won't just inherit our information. They'll inherit our understanding, our relationships, and our insights in a form that can be built upon indefinitely.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-4">
                The Knowledge Graph Awaits
              </h2>
              <p>
                We stand at the threshold of a new era in computing, one where systems don't just process information, but truly understand it. Where the internet isn't just a collection of documents, but a living, breathing knowledge graph that grows more intelligent with every connection.
              </p>
              <p className="mt-4">
                The coffee mug on your desk is more than just a container for your morning coffee. It's a node in an infinite web of relationships, waiting to be discovered, understood, and connected to the vast tapestry of human knowledge.
              </p>
              <p className="mt-4">
                The question isn't whether this future will arrive. It's whether we'll be ready for it when it does.
              </p>
              <p className="mt-6 font-semibold text-foreground text-xl font-display">
                The knowledge graph awaits. Are you ready to help build it?
              </p>
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

export default BlogPost1;

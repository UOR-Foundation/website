import ArticleLayout from "@/modules/core/components/ArticleLayout";
import coverImage from "@/assets/blog-uor-framework-origin.jpg";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import { Box, Database, Cpu, Network } from "lucide-react";

const SLUG = "/blog/uor-framework-origin";

const COMPONENTS = [
  {
    icon: Box,
    title: "UOR Model",
    desc: "A standard for referencing any object by its attributes, including size, media type, digest, and any extension schemas a community defines. Shared schemas turn collections of objects into datasets.",
  },
  {
    icon: Database,
    title: "UOR Client",
    desc: "A reference implementation that retrieves, publishes, queries, deletes and executes attribute-addressed objects across protocols like HTTP, S3, Git, IPFS and OCI.",
  },
  {
    icon: Cpu,
    title: "Universal Runtime",
    desc: "A serverless engine that makes datasets executable. Universal Runtime Objects (UROs) ship inside datasets and provide rendering logic, storage drivers, and any utility a dataset needs to run.",
  },
  {
    icon: Network,
    title: "Attribution",
    desc: "Datasets carry intent. By combining attributes with embedded runtimes, a dataset can convey behavior to an expert system, making it possible to reason about objects across domains.",
  },
];

const OBJECT_MODES = [
  {
    name: "Immutable Singular",
    desc: "Addressed by digest. Hashing the bytes proves integrity. Ideal for content that must never change.",
  },
  {
    name: "Mutable Singular",
    desc: "Human-readable addresses with dynamic content. The pointer is stable; the payload can evolve.",
  },
  {
    name: "Mutable Array",
    desc: "An unbounded collection of any object type, only known when observed. Useful for streams like comments, events, or logs.",
  },
];

const SOURCE_URL = "https://next.redhat.com/2022/07/13/the-uor-framework/";

const BlogUorFrameworkOrigin = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      href: p.href,
      meta: `${p.tag} · ${p.date}`,
      image: getBlogCover(p.coverKey),
    }));

  return (
    <ArticleLayout
      kicker="Origin"
      date="July 13, 2022"
      title="The UOR Framework: Everything Is an Object"
      heroImage={coverImage}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl={SOURCE_URL}
      sourceLabel="Originally published on Red Hat Emerging Technologies"
      related={related}
    >
      <p>
        <strong>Universal Object Reference (UOR) is a radically different approach to serverless and decentralized systems.</strong>
      </p>
      <p>
        The phrase "everything is an object" is familiar from object-oriented programming. UOR takes the idea one step further: what if we treated <em>every</em> piece of information the same way, including websites, videos, build pipelines, network addresses, DNS zones, and infrastructure configurations, and gave each one a unique reference derived from its content?
      </p>
      <p>
        A unique fingerprint can represent any object, but a fingerprint alone tells you nothing about what the object <em>is</em>. The only thing we can really know about an object is the description we attach to it: its attributes. Addressing objects by their attributes is the heart of Universal Object Reference, and it is what gives the framework its name.
      </p>

      <section>
        <h2>The Four Core Components</h2>
        <p>
          The original framework introduced four building blocks that work together to turn any information system into a queryable, executable graph of objects.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 not-prose">
          {COMPONENTS.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon size={20} className="text-primary mb-3" />
              <h3 className="font-display text-[1.05em] font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-[1em] text-muted-foreground leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Three Modes of Objects</h2>
        <p>
          Not every piece of information has the same lifecycle. UOR recognizes three modes so that the right guarantees apply to the right kind of content.
        </p>
        <div className="mt-6 space-y-5 not-prose">
          {OBJECT_MODES.map((mode) => (
            <div key={mode.name} className="pl-5 border-l-2 border-primary/30">
              <h3 className="font-display text-[1.15em] font-semibold text-foreground mb-1">{mode.name}</h3>
              <p className="text-[1em] text-muted-foreground leading-[1.7]">{mode.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-6">
          A blog post illustrates the pattern: the post itself is a single object that can be updated and points at a permanent record of its body, while its comments, which arrive over time, live as a growing list.
        </p>
      </section>

      <section>
        <h2>Why This Matters</h2>
        <p>
          Once everything in a system is an object, and every object can be referenced by its attributes, three properties fall out naturally.
        </p>
        <ul>
          <li><strong>Everything is an object.</strong> One model spans files, services, infrastructure, and content.</li>
          <li><strong>Objects have attributes.</strong> Discovery becomes describing what you want rather than knowing where it lives.</li>
          <li><strong>Objects can be executable.</strong> Datasets carry the runtime needed to render or process them, no central server required.</li>
        </ul>
        <p>
          Combine those three, and a dataset stops being a passive bundle of files. It becomes a complete setup configuration, a webpage you can render, a knowledge graph you can query, or training material for an expert system, all addressable, verifiable, and portable across every system that speaks UOR.
        </p>
      </section>

      <section>
        <h2>Looking Ahead</h2>
        <p>
          By shifting how we perceive information systems, UOR makes the efficiencies of serverless and decentralized computing reachable, while turning scattered data into consistent, attribute-addressable datasets ready for expert reasoning. The framework was, and still is, being cultivated in the open. Everything published since builds on this foundation.
        </p>
        <p>
          Originally written by Alex Flom and Andrew Block on the{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Red Hat Emerging Technologies blog
          </a>{" "}
          in July 2022.
        </p>
      </section>
    </ArticleLayout>
  );
};

export default BlogUorFrameworkOrigin;
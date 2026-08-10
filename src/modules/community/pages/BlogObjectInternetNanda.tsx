import { useState } from "react";
import ArticleLayout from "@/modules/core/components/ArticleLayout";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import { ChevronLeft, ChevronRight, Download, Brain, Wrench, MessagesSquare, Cpu } from "lucide-react";
import slide1 from "@/assets/blog-nanda/slide-1.jpg";
import slide2 from "@/assets/blog-nanda/slide-2.jpg";
import slide3 from "@/assets/blog-nanda/slide-3.jpg";
import slide4 from "@/assets/blog-nanda/slide-4.jpg";
import slide5 from "@/assets/blog-nanda/slide-5.jpg";
import slide6 from "@/assets/blog-nanda/slide-6.jpg";
import slide7 from "@/assets/blog-nanda/slide-7.jpg";
import slide8 from "@/assets/blog-nanda/slide-8.jpg";
import slide9 from "@/assets/blog-nanda/slide-9.jpg";
import slide10 from "@/assets/blog-nanda/slide-10.jpg";
import slide11 from "@/assets/blog-nanda/slide-11.jpg";
import slide12 from "@/assets/blog-nanda/slide-12.jpg";
import slide13 from "@/assets/blog-nanda/slide-13.jpg";
import slide14 from "@/assets/blog-nanda/slide-14.jpg";
import slide15 from "@/assets/blog-nanda/slide-15.jpg";

const SLUG = "/blog/object-internet-nanda";
const PDF_URL = "/uor-object-internet-nanda-stanford-2026.pdf";

const SLIDES = [
  { src: slide1, label: "The Object Internet" },
  { src: slide2, label: "The Agentic Web: A Reframe" },
  { src: slide3, label: "uor-addr: content to address" },
  { src: slide4, label: "Where byte-level integrity breaks" },
  { src: slide5, label: "The viewer owns the meaning" },
  { src: slide6, label: "An address becomes a routing decision" },
  { src: slide7, label: "Compute starts with what already exists" },
  { src: slide8, label: "The stack: standards to substrate" },
  { src: slide9, label: "DataFacts: is the data ready?" },
  { src: slide10, label: "The triad: evidence to binding" },
  { src: slide11, label: "The operating loop" },
  { src: slide12, label: "Live demo: the trust plane" },
  { src: slide13, label: "What the Object Internet unlocks" },
  { src: slide14, label: "Operating framework placement" },
  { src: slide15, label: "Thank you" },
];

const UNLOCKS = [
  {
    icon: Brain,
    title: "Memory",
    desc: "An object that carries identity, provenance, freshness, and permissions. Not a paragraph of remembered text.",
  },
  {
    icon: Wrench,
    title: "Tool use",
    desc: "Acting on a verified object under a real capability. Not calling an API and hoping the response is honest.",
  },
  {
    icon: MessagesSquare,
    title: "Multi-agent messages",
    desc: "Signed, verifiable exchanges with shared codebooks. Not text passed between strangers.",
  },
  {
    icon: Cpu,
    title: "Compute",
    desc: "Resolve the closure, compute only what is missing. Not run the whole job again somewhere else.",
  },
];

const SlideViewer = () => {
  const [i, setI] = useState(0);
  const total = SLIDES.length;
  const prev = () => setI((p) => (p - 1 + total) % total);
  const next = () => setI((p) => (p + 1) % total);

  return (
    <figure className="not-prose w-full">
      <div className="relative bg-muted/40 w-full overflow-hidden rounded-lg border border-border aspect-[1.618/1]">
        <img
          src={SLIDES[i].src}
          alt={`Slide ${i + 1}: ${SLIDES[i].label}`}
          className="w-full h-full object-contain bg-background"
          loading="eager"
        />
        <button
          aria-label="Previous slide"
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          aria-label="Next slide"
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"}`}
            />
          ))}
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-between text-[13px] font-display text-muted-foreground/70">
        <span>
          Slide {i + 1} of {total} · <span className="italic">{SLIDES[i].label}</span>
        </span>
        <a
          href={PDF_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary transition-colors"
        >
          <Download size={14} /> Open full PDF
        </a>
      </figcaption>
    </figure>
  );
};

const BlogObjectInternetNanda = () => {
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
      kicker="Field Notes"
      date="August 10, 2026"
      title="Agents don't need more pages. They need objects they can trust."
      heroOverride={<SlideViewer />}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl="https://uor.foundation"
      sourceLabel="Presented at the Project NANDA workshop, Stanford University"
      related={related}
    >
      <p>
        <strong>
          That was the core message we shared from the UOR Foundation at the Project NANDA workshop at
          Stanford.
        </strong>{" "}
        Project NANDA is building the foundational infrastructure for the Open Agentic Web.
      </p>

      <section>
        <h2>Today's agentic internet is still file oriented</h2>
        <p>
          Agents scrape text, chase URLs, and re-verify everything from scratch. Nothing they read carries
          its own identity, so every hop is an act of faith. The Object Internet flips this by giving agents
          stable, verifiable objects instead of fragile pages.
        </p>
        <p>
          The failure is quiet and specific. When agents reserialize the same data through different key
          orders, number types, or Unicode forms, byte-level identity forks and provenance silently breaks.
          The fact never changed. The checksum did. Two addresses, and history splits in half.
        </p>
      </section>

      <section>
        <h2>An address derived from structure, not bytes</h2>
        <p>
          <code>uor-addr</code> solves this by turning content into a structural address. Same meaning
          produces the same address. Any tamper produces a different one. Key order, integer versus float,
          and Unicode normalization form all resolve to one identity; a single changed value resolves to
          another.
        </p>
        <p>
          The viewer owns the meaning. The registry resolves, verifies, and retrieves without exposing the
          underlying storage: no buckets, no paths, no shards, no peer locations. An address stops being a
          location and becomes a routing decision. Resolve what is already verified, compute only what is
          missing.
        </p>
      </section>

      <section>
        <h2>What this unlocks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 not-prose">
          {UNLOCKS.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon size={20} className="text-primary mb-3" />
              <h3 className="font-display text-[1.05em] font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-[1em] text-muted-foreground leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
        <p>It is the shift from calling an API to acting on a verified object.</p>
      </section>

      <section>
        <h2>Explore the work</h2>
        <ul>
          <li>
            <a href="https://crates.io/crates/uor-foundation" target="_blank" rel="noopener noreferrer">
              Universal type library
            </a>
            : the UOR Foundation vocabulary as typed Rust traits.
          </li>
          <li>
            <a href="https://crates.io/crates/uor-addr" target="_blank" rel="noopener noreferrer">
              Content addressable storage
            </a>
            : structural addressing for content that carries its own identity.
          </li>
          <li>
            <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
              The Object Internet (PDF)
            </a>
            : the full deck presented at Stanford.
          </li>
        </ul>
        <p>
          The agentic web needs objects, not just more pages. If you are building for it, reach us at{" "}
          <a href="mailto:hi@uor.foundation">hi@uor.foundation</a>.
        </p>
      </section>
    </ArticleLayout>
  );
};

export default BlogObjectInternetNanda;

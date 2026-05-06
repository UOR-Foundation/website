import { useState } from "react";
import ArticleLayout from "@/modules/core/components/ArticleLayout";
import coverImage from "@/assets/blog-uganda-cover.jpg";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";
import { ChevronLeft, ChevronRight, Download, Smartphone, ShieldCheck, Zap, Eye } from "lucide-react";
import slide1 from "@/assets/blog-uganda/slide-1.jpg";
import slide2 from "@/assets/blog-uganda/slide-2.jpg";
import slide3 from "@/assets/blog-uganda/slide-3.jpg";
import slide4 from "@/assets/blog-uganda/slide-4.jpg";
import slide5 from "@/assets/blog-uganda/slide-5.jpg";
import slide6 from "@/assets/blog-uganda/slide-6.jpg";

const SLUG = "/blog/sustainable-ai-uganda";
const PDF_URL = "/uor-sustainable-ai-uganda-deep-tech-2026.pdf";

const SLIDES = [
  { src: slide1, label: "The Path to Sustainable AI" },
  { src: slide2, label: "AI Scalability Challenge" },
  { src: slide3, label: "UOR Insight" },
  { src: slide4, label: "New Foundation for Sustainable AI" },
  { src: slide5, label: "Waking Up Sustainable AI with UOR" },
  { src: slide6, label: "Thank You" },
];

const PILLARS = [
  {
    icon: Smartphone,
    title: "Runs on your own device",
    desc: "Heavy AI work happens locally at the edge — almost zero energy and no centralized cloud dependency.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    desc: "Nothing ever leaves your device. True ownership and privacy by design, secured by fully homomorphic encryption.",
  },
  {
    icon: Eye,
    title: "Anyone can verify it",
    desc: "Complete trust is no longer required. Results can be checked by anyone, anywhere.",
  },
  {
    icon: Zap,
    title: "Compute once, reuse forever",
    desc: "Every operation receives a permanent UOR address based on what it is — future uses become instant zero-cost lookups.",
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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border">
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
          download
          className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary transition-colors"
        >
          <Download size={14} /> Download PDF
        </a>
      </figcaption>
    </figure>
  );
};

const BlogSustainableAiUganda = () => {
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
      date="May 6, 2026"
      title="The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit"
      hideHero
      heroOverride={<SlideViewer />}
      backHref="/news"
      backLabel="Back to News"
      sourceUrl="https://uor.foundation"
      sourceLabel="Presented by Alex Flom · 2026 Uganda Deep Tech Summit, Kampala"
      related={related}
    >
      <p>
        <strong>
          Last week Alexander Flom represented the UOR Foundation at the Uganda Deep Tech Summit in Kampala.
        </strong>{" "}
        Uganda is quickly emerging as East Africa's gateway for applied AI.
      </p>
      <p>
        The challenges are clear: top talent leaving for opportunities abroad, valuable local data flowing
        out of the country, and computing power locked in foreign data centers. These are not just policy
        issues. They are holding back real national progress — for Uganda and beyond.
      </p>

      <section>
        <h2>The Scalability Trap</h2>
        <p>
          Every time you use AI today, the answer is computed from scratch in a giant centralized data
          center. The more we use it, the more energy it burns and the more data it captures. The data of
          billions is extracted to build these systems — then rented back to us. This is not sustainable.
        </p>
      </section>

      <section>
        <h2>Compute Once. Lookup Forever.</h2>
        <p>
          The UOR Foundation is pursuing a disciplined, long-term research effort to solve this at the root.
          We are developing the <em>Universal Object Reference</em> data addressing standard — a new
          foundation for sustainable AI.
        </p>
        <p>
          Instead of computing every AI task from scratch in centralized data centers, we pre-compile the
          operation once into a universal, verifiable UOR address. Future uses become fast, zero-cost
          lookups.
        </p>
      </section>

      <section>
        <h2>What This Research Makes Possible</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 not-prose">
          {PILLARS.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon size={20} className="text-primary mb-3" />
              <h3 className="font-display text-[1.05em] font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-[0.95em] text-muted-foreground leading-[1.7]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Toward Real AI Sovereignty</h2>
        <p>
          This is the path we see toward real AI sovereignty: sustainable, local, and built for lasting
          impact. The UOR Foundation is looking forward to ongoing engagement and collaboration toward this
          brighter future.
        </p>
        <p>
          We are openly sharing our research and tooling with Uganda's builders and developers. If you are
          creating AI that delivers results for your country, we would love to hear from you —{" "}
          <a href="mailto:alex@uor.foundation">alex@uor.foundation</a>.
        </p>
      </section>
    </ArticleLayout>
  );
};

export default BlogSustainableAiUganda;
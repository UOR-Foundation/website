import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, ExternalLink, ArrowRight, Cpu, Shield, Calculator, TrendingUp, Bot, Atom, BarChart3, HeartPulse, Globe, Microscope, Rocket, Leaf, Box, Lock, Plus } from "lucide-react";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import blogFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";

const researchCategories = [
  { icon: Calculator, label: "Mathematics", slug: "mathematics", description: "Formal methods, algebraic structures, and mathematical foundations of UOR.", active: true },
  { icon: Cpu, label: "Hardware & Robotics", slug: "hardware-robotics", description: "Embedded systems, robotics middleware, and UOR-native hardware interfaces.", active: false },
  { icon: Shield, label: "Cybersecurity", slug: "cybersecurity", description: "Content-addressed security, zero-trust identity, and verifiable data provenance.", active: false },
  { icon: TrendingUp, label: "Finance", slug: "finance", description: "Decentralized finance primitives, auditable ledgers, and semantic financial data.", active: false },
  { icon: Bot, label: "Agentic AI", slug: "agentic-ai", description: "Autonomous agents, tool-use frameworks, and UOR-native AI architectures.", active: false },
  { icon: Atom, label: "Quantum", slug: "quantum", description: "Quantum computing interfaces, post-quantum cryptography, and hybrid algorithms.", active: false },
  { icon: BarChart3, label: "Data Science", slug: "data-science", description: "Semantic datasets, reproducible pipelines, and interoperable analytics.", active: false },
  { icon: HeartPulse, label: "Healthcare", slug: "healthcare", description: "Medical data interoperability, patient-centric identity, and open health standards.", active: false },
  { icon: Globe, label: "Web3", slug: "web3", description: "Decentralized protocols, on-chain identity, and content-addressed storage.", active: false },
  { icon: Microscope, label: "Physics", slug: "physics", description: "Simulation frameworks, open research data, and computational physics tooling.", active: false },
  { icon: Rocket, label: "Frontier Tech", slug: "frontier-tech", description: "Emerging technology exploration at the intersection of UOR and next-gen infrastructure.", active: false },
  { icon: Leaf, label: "Climate & Energy", slug: "climate-energy", description: "Sustainable infrastructure, carbon accounting, and open energy data standards.", active: false },
];

const categoryResearch: Record<string, Array<{ title: string; authors: string; status: string; description: string; href: string }>> = {
  mathematics: [
    {
      title: "Atlas Embeddings: Exceptional Lie Groups from a Single 96-Vertex Construct",
      authors: "Alex Flom et al.",
      status: "Published",
      description: "Demonstrates that all five exceptional Lie groups can be derived from a single geometric structure, revealing a universal mathematical language underlying complex symmetry.",
      href: "/research/atlas-embeddings",
    },
  ],
};

const blogPosts = [
  {
    title: "UOR: Building the Internet's Knowledge Graph",
    excerpt: "A deep dive into how Universal Object Reference promises to transform the internet from a chaotic collection of websites into a unified knowledge graph of everything.",
    date: "December 21, 2023",
    tag: "Vision",
    href: "/blog/building-the-internets-knowledge-graph",
    cover: blogKnowledgeGraph,
  },
  {
    title: "Unveiling a Universal Mathematical Language",
    excerpt: "A breakthrough that reveals the hidden order behind nature's most complex systems and could reshape the future of Open Science, Neuro-Symbolic AI, and topological quantum computing.",
    date: "October 10, 2025",
    tag: "Open Research",
    href: "/blog/universal-mathematical-language",
    cover: blogGoldenSeed,
  },
  {
    title: "What If Every Piece of Data Had One Permanent Address?",
    excerpt: "A universal coordinate system for information. One address per object, derived from content, verifiable across every system. The open specification is now available for community review.",
    date: "February 19, 2026",
    tag: "Open Research",
    href: "/blog/uor-framework-launch",
    cover: blogFrameworkLaunch,
  },
];

const events = [
  {
    title: "UOR Community Call",
    location: "Virtual",
    date: "March 3, 2026",
    type: "Community Call",
    link: "https://discord.com/channels/1342910418754076732/1342910419370774532/1474210293386055772",
    calendarDate: "20260303",
  },
];

const tagStyles: Record<string, string> = {
  "Open Research": "bg-primary/10 text-primary",
  Vision: "bg-accent/10 text-accent",
  Announcement: "bg-accent/10 text-accent",
  Community: "bg-primary/8 text-primary/80 border border-primary/15",
  Workshop: "bg-primary/10 text-primary",
  "Community Call": "bg-accent/10 text-accent",
  Conference: "bg-primary/8 text-primary/80 border border-primary/15",
};

const Research = () => {
  const [selectedCategory, setSelectedCategory] = useState("mathematics");
  const highlights = categoryResearch[selectedCategory] || [];

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Our Community
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl" style={{ animationDelay: "0.15s" }}>
            The UOR community facilitates open research, cross pollination of ideas, and validation of existing work through joint research exploration to accelerate our scientific progress.
          </p>
          <div
            className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.35s" }}
          >
            <a href="#research" className="btn-primary">
              Explore Research
            </a>
            <a href="#join" className="btn-outline">
              Join the Community
            </a>
          </div>
        </div>
      </section>

      {/* Research */}
      <section id="research" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Open Research
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Community
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-12">
            The UOR community spans disciplines, validating ideas across boundaries and pursuing joint research where fields converge. Find your community on{" "}
            <a href="https://discord.gg/ZwuZaNyuve" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Discord</a>.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {researchCategories.map((cat, index) => {
              const isSelected = cat.slug === selectedCategory;
              const isDisabled = !cat.active;
              return (
                <button
                  key={cat.slug}
                  onClick={() => cat.active && setSelectedCategory(cat.slug)}
                  disabled={isDisabled}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 animate-fade-in-up text-sm font-medium font-body whitespace-nowrap ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : isDisabled
                      ? "border-border/30 bg-card/40 text-muted-foreground/50 cursor-default"
                      : "border-border bg-card hover:border-primary/25 hover:shadow-sm cursor-pointer text-foreground"
                  }`}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <cat.icon size={15} className={isSelected ? "text-primary" : isDisabled ? "text-muted-foreground/40" : "text-primary"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Research Highlights */}
          {highlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {highlights.map((item, index) => {
                const isInternal = item.href.startsWith("/");
                const CardWrapper = isInternal ? Link : "a";
                const linkProps = isInternal
                  ? { to: item.href }
                  : { href: item.href, target: "_blank", rel: "noopener noreferrer" };
                return (
                  <CardWrapper
                    key={item.title}
                    {...(linkProps as any)}
                    className="group flex flex-col rounded-xl border border-border bg-card p-6 hover:border-primary/20 hover:shadow-lg transition-all duration-300 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium font-body ${
                        item.status === "Published" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-200">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground/60 font-body mb-3">{item.authors}</p>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">
                      {item.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-muted-foreground/50 group-hover:text-primary transition-colors duration-200 font-body">
                      View research <ArrowRight size={13} />
                    </span>
                  </CardWrapper>
                );
              })}

              {/* Submit Research CTA Card */}
              <a
                href="https://discord.gg/ZwuZaNyuve"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] p-6 hover:border-primary/40 hover:bg-primary/[0.06] transition-all duration-300 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${highlights.length * 0.1}s` }}
              >
                <div className="w-9 h-9 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-4 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300">
                  <Plus size={16} className="text-primary/60 group-hover:text-primary transition-colors duration-200" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors duration-200">
                  Submit Your Research
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-[240px]">
                  Share your work with the community for validation and collaboration.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary/60 group-hover:text-primary transition-colors duration-200 font-body">
                  Submit now <ArrowRight size={13} />
                </span>
              </a>
            </div>
          )}

          <a
            href="https://github.com/UOR-Foundation/research"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline font-body transition-colors"
          >
            View our research on GitHub <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* Blog */}
      <section id="blog" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Blog
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-14">
            Highlights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post, index) => (
              <Link
                key={post.title}
                to={post.href}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.cover}
                    alt={post.title}
                    className="w-full h-full object-contain bg-card transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium font-body ${tagStyles[post.tag]}`}>
                      {post.tag}
                    </span>
                    <span className="text-xs text-muted-foreground font-body">{post.date}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                    {post.title}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 mt-auto pt-4 text-sm font-medium text-muted-foreground/50 group-hover:text-primary transition-colors duration-200 font-body">
                    Read more <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-12 md:py-20 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Events
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-14">
            Upcoming Events
          </h2>

          <div className="space-y-0">
            {events.map((event, index) => (
              <div
                key={event.title}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {index === 0 && <div className="h-px w-full bg-border" />}
                <div className="group py-8 md:py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-8 items-start transition-all duration-300 hover:pl-2">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium font-body ${tagStyles[event.type]}`}>
                        {event.type}
                      </span>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                      {event.title}
                    </h3>
                    <p className="text-muted-foreground font-body text-base leading-relaxed">
                      {event.location}
                      {event.link && (
                        <>
                          {" · "}
                          <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                            Join on Discord
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 md:mt-1">
                    <span className="text-sm font-medium text-muted-foreground/60 font-body flex items-center gap-2">
                      <Calendar size={14} />
                      {event.date}
                    </span>
                    {event.calendarDate && (
                      <a
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.calendarDate}/${event.calendarDate}&details=${encodeURIComponent(event.link ? `Join on Discord: ${event.link}` : '')}&location=${encodeURIComponent(event.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:underline font-body flex items-center gap-1.5"
                      >
                        <ExternalLink size={11} />
                        Add to Calendar
                      </a>
                    )}
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join" className="section-dark py-14 md:py-20 scroll-mt-28">
        <div className="container max-w-3xl text-center">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-6">
            Get Involved
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Join the Community
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Whether you're a researcher, developer, or advocate for open data, there's a place for you. Connect with us on Discord, contribute on GitHub, or attend an upcoming event.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://discord.gg/ZwuZaNyuve"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out bg-primary text-primary-foreground hover:opacity-90 hover:shadow-lg inline-flex items-center justify-center gap-2"
            >
              Join Our Discord
            </a>
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-300 ease-out border border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10 inline-flex items-center justify-center gap-2"
            >
              Contribute on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Research;

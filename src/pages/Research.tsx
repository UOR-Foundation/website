import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { BookOpen, Calendar, ExternalLink, ArrowRight, Search, ChevronDown, Cpu, Shield, Calculator, TrendingUp, Bot, Atom, BarChart3, HeartPulse, Globe, Microscope, Rocket } from "lucide-react";

const researchCategories = [
  { icon: Cpu, label: "Hardware & Robotics", slug: "hardware-robotics", description: "Embedded systems, robotics middleware, and UOR-native hardware interfaces." },
  { icon: Shield, label: "Cybersecurity", slug: "cybersecurity", description: "Content-addressed security, zero-trust identity, and verifiable data provenance." },
  { icon: Calculator, label: "Mathematics", slug: "mathematics", description: "Formal methods, algebraic structures, and mathematical foundations of UOR." },
  { icon: TrendingUp, label: "Finance", slug: "finance", description: "Decentralized finance primitives, auditable ledgers, and semantic financial data." },
  { icon: Bot, label: "Agentic AI", slug: "agentic-ai", description: "Autonomous agents, tool-use frameworks, and UOR-native AI architectures." },
  { icon: Atom, label: "Quantum", slug: "quantum", description: "Quantum computing interfaces, post-quantum cryptography, and hybrid algorithms." },
  { icon: BarChart3, label: "Data Science", slug: "data-science", description: "Semantic datasets, reproducible pipelines, and interoperable analytics." },
  { icon: HeartPulse, label: "Healthcare", slug: "healthcare", description: "Medical data interoperability, patient-centric identity, and open health standards." },
  { icon: Globe, label: "Web3", slug: "web3", description: "Decentralized protocols, on-chain identity, and content-addressed storage." },
  { icon: Microscope, label: "Physics", slug: "physics", description: "Simulation frameworks, open research data, and computational physics tooling." },
  { icon: Rocket, label: "Frontier Tech", slug: "frontier-tech", description: "Emerging technology exploration at the intersection of UOR and next-gen infrastructure." },
];

const blogPosts = [
  {
    title: "Why Content-Addressed Identity Matters",
    excerpt: "A deep dive into how replacing location-based references with content-based identity reduces fragmentation and builds trust between systems.",
    date: "February 12, 2026",
    tag: "Technical",
  },
  {
    title: "Building the Semantic Web with UOR",
    excerpt: "How universal object referencing enables machines to understand context, not just data — and what that means for the future of the open web.",
    date: "February 5, 2026",
    tag: "Vision",
  },
  {
    title: "From Sandbox to Graduation: A Project's Journey",
    excerpt: "An inside look at the maturity framework and what it takes for a community project to earn graduated status.",
    date: "January 28, 2026",
    tag: "Community",
  },
];

const events = [
  {
    title: "Open Data Infrastructure Workshop",
    location: "Stanford University",
    date: "March 15, 2026",
    type: "Workshop",
  },
  {
    title: "UOR Community Call — Q1 Review",
    location: "Virtual (Discord)",
    date: "March 5, 2026",
    type: "Community Call",
  },
  {
    title: "Decentralized Identity Summit",
    location: "Berlin, Germany",
    date: "April 10, 2026",
    type: "Conference",
  },
];

const tagStyles: Record<string, string> = {
  Technical: "bg-primary/10 text-primary",
  Vision: "bg-accent/10 text-accent",
  Community: "bg-primary/8 text-primary/80 border border-primary/15",
  Workshop: "bg-primary/10 text-primary",
  "Community Call": "bg-accent/10 text-accent",
  Conference: "bg-primary/8 text-primary/80 border border-primary/15",
};

const Research = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredCategories = useMemo(
    () => researchCategories.filter((cat) => cat.label.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-22">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            Our Community
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-body leading-relaxed animate-fade-in-up max-w-2xl" style={{ animationDelay: "0.15s" }}>
            Open research, shared knowledge, and collective progress. The UOR community brings together researchers, engineers, and builders advancing universal data infrastructure for the semantic web and beyond.
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
      <section id="research" className="py-16 md:py-28 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Research
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            Open Research Areas
          </h2>
          <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed max-w-2xl mb-10">
            Our research agenda is public, collaborative, and designed to push the boundaries of how digital information is structured, shared, and verified.
          </p>

          {/* Searchable Dropdown */}
          <div className="relative max-w-md mb-14">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl border border-border bg-card text-foreground font-body text-sm font-medium hover:border-primary/30 transition-colors duration-200"
            >
              <span className="text-muted-foreground">Browse research categories</span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-card shadow-lg animate-fade-in-up overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
                  <Search size={15} className="text-muted-foreground/50 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search categories…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-body"
                    autoFocus
                  />
                </div>
                <ul className="max-h-72 overflow-y-auto py-1.5">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <li key={cat.slug}>
                        <button className="w-full flex items-center gap-3.5 px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-150 group">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                            <cat.icon size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground font-body truncate">{cat.label}</p>
                            <p className="text-xs text-muted-foreground font-body leading-snug mt-0.5 line-clamp-1">{cat.description}</p>
                          </div>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground/60 font-body">No categories found</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div>
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline font-body transition-colors"
            >
              View all research on GitHub <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Blog */}
      <section id="blog" className="py-16 md:py-28 bg-background border-b border-border scroll-mt-28">
        <div className="container max-w-5xl">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
            Blog
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-14">
            Latest Writing
          </h2>

          <div className="space-y-0">
            {blogPosts.map((post, index) => (
              <div
                key={post.title}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {index === 0 && <div className="h-px w-full bg-border" />}
                <div className="group py-8 md:py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:gap-8 items-start transition-all duration-300 hover:pl-2">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium font-body ${tagStyles[post.tag]}`}>
                        {post.tag}
                      </span>
                      <span className="text-sm text-muted-foreground font-body">{post.date}</span>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground font-body text-base leading-relaxed max-w-lg">
                      {post.excerpt}
                    </p>
                    <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-muted-foreground/50 group-hover:text-primary transition-colors duration-200 font-body">
                      Read article <ArrowRight size={13} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:mt-1">
                    <BookOpen size={14} className="text-muted-foreground/40" />
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="py-16 md:py-28 bg-background border-b border-border scroll-mt-28">
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
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 md:mt-1">
                    <span className="text-sm font-medium text-muted-foreground/60 font-body flex items-center gap-2">
                      <Calendar size={14} />
                      {event.date}
                    </span>
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA */}
      <section id="join" className="section-dark py-20 md:py-28 scroll-mt-28">
        <div className="container max-w-3xl text-center">
          <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/50 mb-6">
            Get Involved
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Join the Community
          </h2>
          <p className="text-section-dark-foreground/60 font-body text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Whether you're a researcher, developer, or advocate for open data — there's a place for you. Connect with us on Discord, contribute on GitHub, or attend an upcoming event.
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

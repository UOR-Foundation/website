import Layout from "@/modules/core/components/Layout";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export interface ProjectSection {
  heading: string;
  content: React.ReactNode;
}

export interface ProjectDetailProps {
  name: string;
  category: string;
  tagline: string;
  heroImage: string;
  repoUrl: string;
  sections: ProjectSection[];
}

const ProjectDetailLayout = ({
  name,
  category,
  tagline,
  heroImage,
  repoUrl,
  sections,
}: ProjectDetailProps) => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-32 md:pt-44 pb-12 md:pb-16">
        <div className="container max-w-4xl">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body mb-8"
          >
            <ArrowLeft size={14} />
            All Projects
          </Link>

          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body whitespace-nowrap">
              {category}
            </span>
            <span className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground font-body">
              Sandbox
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            {name}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground font-body leading-relaxed max-w-2xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {tagline}
          </p>
        </div>
      </section>

      {/* Cover image */}
      <section className="border-b border-border">
        <div className="container max-w-4xl py-0">
          <div className="rounded-2xl overflow-hidden border border-border project-card-glow">
            <img
              src={heroImage}
              alt={name}
              className="w-full h-64 md:h-80 object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Content sections */}
      {sections.map((section, idx) => (
        <section
          key={section.heading}
          className={`py-12 md:py-20 ${idx % 2 === 1 ? "bg-muted/30" : "bg-background"} border-b border-border`}
        >
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
              {section.heading}
            </h2>
            <div className="text-base text-muted-foreground font-body leading-relaxed space-y-4">
              {section.content}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="section-dark py-16 md:py-24">
        <div className="container max-w-4xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Get involved
          </h2>
          <p className="text-section-dark-foreground/60 font-body mb-8 max-w-lg mx-auto">
            {name} is open source and open to contributors. Explore the code, open an issue, or start building.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity font-body"
            >
              View Repository
              <ExternalLink size={14} />
            </a>
            <Link
              to="/projects#submit"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full border border-section-dark-foreground/15 text-section-dark-foreground/70 font-medium text-sm hover:border-section-dark-foreground/30 transition-colors font-body"
            >
              Submit Your Own Project
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProjectDetailLayout;

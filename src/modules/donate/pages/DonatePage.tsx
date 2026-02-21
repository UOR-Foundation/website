import Layout from "@/modules/core/components/Layout";
import { Heart, ExternalLink, ChevronDown } from "lucide-react";
import { useState } from "react";
import { donationProjects, type DonationProject } from "@/data/donation-projects";
import { DONATE_URL, DISCORD_URL, GITHUB_ORG_URL } from "@/data/external-links";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

const ProjectCard = ({ project }: { project: DonationProject }) => {
  const [expanded, setExpanded] = useState(false);
  const progress = Math.min((project.raised / project.target) * 100, 100);

  return (
    <div className="border border-border rounded-2xl p-6 md:p-8 bg-card transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
            {project.title}
          </h3>
          <div className="mt-3 flex items-center justify-between text-base text-muted-foreground font-body">
            <span>{formatCurrency(project.raised)} raised</span>
            <span>{formatCurrency(project.target)} target</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
            />
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Toggle details"
        >
          <ChevronDown
            size={20}
            className={`text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-400 ease-out ${expanded ? "max-h-96 opacity-100 mt-6" : "max-h-0 opacity-0"}`}
      >
        <p className="text-muted-foreground font-body leading-relaxed">
          {project.description}
        </p>
        <ul className="mt-4 space-y-2">
          {project.highlights.map((h) => (
            <li key={h} className="flex items-start gap-3 text-muted-foreground font-body text-base">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {h}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <a
            href={project.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Donate <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

const Donate = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-40 md:pt-52 pb-16 md:pb-24">
        <div className="container max-w-3xl">
          <h1
            className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.1] text-balance animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            Fund the future of open data infrastructure
          </h1>
          <p
            className="mt-8 text-lg md:text-xl text-muted-foreground font-body leading-relaxed max-w-2xl animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            Your donation funds an open standard that gives every piece of data one permanent, verifiable address. No lock-in, no gatekeepers. A nonprofit building infrastructure for science, software, and emerging technologies.
          </p>
          <div
            className="mt-10 flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.4s" }}
          >
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Heart size={16} fill="white" strokeWidth={0} />
              Donate Now
            </a>
            <a
              href={GITHUB_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              Contribute on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Projects to support */}
      <section className="py-16 md:py-28 bg-background">
        <div className="container max-w-3xl">
          <h2
            className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-10 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            Projects to support
          </h2>
          <div className="space-y-5">
            {donationProjects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* Ways to donate */}
      <section className="py-16 md:py-28 section-dark">
        <div className="container max-w-3xl">
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-10">
            Ways to donate
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-border/20 p-6 md:p-8 hover:border-primary/30 transition-all duration-300"
            >
              <h3 className="font-display text-lg font-semibold text-section-dark-foreground group-hover:text-primary transition-colors">
                Credit Card →
              </h3>
              <p className="mt-2 text-base text-muted-foreground font-body leading-relaxed">
                Make a one-time or recurring donation securely via credit card.
              </p>
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-border/20 p-6 md:p-8 hover:border-primary/30 transition-all duration-300"
            >
              <h3 className="font-display text-lg font-semibold text-section-dark-foreground group-hover:text-primary transition-colors">
                Get in Touch →
              </h3>
              <p className="mt-2 text-base text-muted-foreground font-body leading-relaxed">
                For larger donations, sponsorships, or partnerships, reach out to us on Discord.
              </p>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Donate;

import { Linkedin } from "lucide-react";
import { teamMembers } from "@/data/team-members";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";

const CTASection = () => {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="container max-w-6xl text-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">
          Ready to Build?
        </h2>
        <p className="mt-4 md:mt-5 text-base text-muted-foreground font-body leading-[1.68] max-w-2xl mx-auto">
          Verify your first address in five minutes, then join the community.
        </p>

        {/* Community quick links */}
        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <a
            href={GITHUB_FRAMEWORK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Getting Started Guide
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Join Discord
          </a>
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            GitHub Organization
          </a>
        </div>

        {/* Community strip */}
        <div className="h-px w-full bg-border/40 mt-12 md:mt-16" />
        <div className="mt-8 md:mt-10 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
          <p className="text-sm font-body font-medium tracking-[0.15em] uppercase text-muted-foreground/50 mb-5">
            Active Community
          </p>

          {/* Overlapping avatar row */}
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              {teamMembers.map((member, idx) => (
                <a
                  key={member.name}
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`relative rounded-full border-[3px] border-background transition-all duration-300 hover:z-30 hover:scale-110 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 focus:outline-none group ${
                    idx > 0 ? "-ml-2.5 md:-ml-3" : ""
                  }`}
                  style={{ zIndex: 15 - idx }}
                  aria-label={member.name}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-11 h-11 md:w-14 md:h-14 rounded-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-500"
                    loading="lazy"
                  />
                  {/* Tooltip */}
                  <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40">
                    {member.name}
                  </span>
                </a>
              ))}

              {/* +N pill */}
              <div className="-ml-2.5 md:-ml-3 z-0 w-11 h-11 md:w-14 md:h-14 rounded-full border-[3px] border-background bg-muted flex items-center justify-center">
                <span className="text-[10px] md:text-xs font-semibold text-muted-foreground">+30</span>
              </div>
            </div>
          </div>

          {/* Role tags */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {["AI Research", "Protocol Design", "Cloud Infra", "Developer Tools", "Web3", "Healthcare Tech", "Enterprise AI"].map((tag) => (
              <span
                key={tag}
                className="text-xs font-body text-muted-foreground/60 px-2.5 py-1 rounded-full border border-border/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

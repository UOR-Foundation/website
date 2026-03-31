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

        {/* UOR Community */}
        <div className="h-px w-full bg-border/40 mt-12 md:mt-16" />
        <div className="mt-8 md:mt-10 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
          <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-8 md:mb-10">
            UOR Community
          </p>

          {/* Member grid — each with photo, name, role */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9 max-w-5xl mx-auto">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2.5 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.25 + idx * 0.04}s` }}
              >
                <div className="relative">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover object-top border-2 border-border/20 grayscale group-hover:grayscale-0 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-sm font-display font-semibold text-foreground leading-tight truncate">
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="text-xs font-body text-primary/70 leading-tight mt-0.5 truncate">
                    {member.role}
                  </p>
                </div>
              </a>
            ))}

            {/* +N community pill */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-border/20 bg-muted flex items-center justify-center">
                <span className="text-base md:text-lg font-semibold text-muted-foreground">+150</span>
              </div>
              <p className="text-xs font-body text-muted-foreground/50 leading-tight">
                & growing
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

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

        {/* Members Grid — Foresight-style cards */}
        <div className="h-px w-full bg-border/40 mt-12 md:mt-16" />
        <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 text-left">
          {teamMembers.map((member, index) => (
            <a
              key={member.name}
              href={member.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-2xl border border-border bg-card overflow-hidden flex flex-row items-stretch min-h-[10rem] transition-all duration-300 hover:border-primary/20 hover:shadow-lg animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {/* Text content */}
              <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
                <div>
                  <h4 className="font-display text-lg md:text-xl font-semibold text-foreground leading-tight">
                    {member.name}
                  </h4>
                  <div className="h-px w-10 bg-border/60 my-2.5" />
                  <p className="text-sm font-medium text-primary font-body leading-snug">
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground font-body mt-1 leading-snug">
                    {member.description}
                  </p>
                </div>
              </div>
              {/* Photo — right-aligned, cropped */}
              <div className="w-28 md:w-32 shrink-0 relative overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover object-top grayscale group-hover:grayscale-0 transition-all duration-500"
                  loading="lazy"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTASection;

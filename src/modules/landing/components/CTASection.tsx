import { Code2, Building2, FlaskConical } from "lucide-react";
import { teamMembers } from "@/data/team-members";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_RESEARCH_URL } from "@/data/external-links";

const paths = [
  {
    icon: Code2,
    title: "Contributors",
    description:
      "Submit patches, write specs, or build reference implementations. Everything ships through GitHub.",
    cta: "Start Contributing",
    href: GITHUB_ORG_URL + "/.github/blob/main/CONTRIBUTING.md",
    external: true,
  },
  {
    icon: Building2,
    title: "Adopters",
    description:
      "Evaluate the standard for your stack. Integrate content-based addressing into existing infrastructure.",
    cta: "Explore Projects",
    href: "/projects",
    external: false,
  },
  {
    icon: FlaskConical,
    title: "Researchers",
    description:
      "Join working groups, publish findings, and help advance the formal specification.",
    cta: "View Research",
    href: GITHUB_RESEARCH_URL,
    external: true,
  },
];

const CTASection = () => {
  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container max-w-5xl text-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">
          Ready to Build?
        </h2>
        <p className="mt-4 md:mt-5 text-[0.9375rem] md:text-lg text-muted-foreground font-body leading-[1.68] max-w-2xl mx-auto">
          Join a growing community of engineers, researchers, and builders advancing the open data standard.
        </p>

        {/* Three-path audience routing */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
          {paths.map((path, index) => {
            const Icon = path.icon;
            const Tag = path.external ? "a" : "a";
            const linkProps = path.external
              ? { href: path.href, target: "_blank", rel: "noopener noreferrer" }
              : { href: path.href };

            return (
              <div
                key={path.title}
                className="group rounded-xl border border-border bg-card p-6 md:p-8 flex flex-col animate-fade-in-up opacity-0 hover:border-primary/30 transition-colors duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon
                  className="w-5 h-5 text-primary mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {path.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed flex-1">
                  {path.description}
                </p>
                <a
                  {...linkProps}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary font-body mt-5 group-hover:gap-2.5 transition-all duration-300"
                >
                  {path.cta}
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                </a>
              </div>
            );
          })}
        </div>

        {/* Community quick links */}
        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Join Discord Community
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

        {/* Members Grid */}
        <div className="mt-10 md:mt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-6 md:gap-y-12">
          {teamMembers.map((member, index) => (
            <a
              key={member.name}
              href={member.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center text-center animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full p-[2px] mb-2 md:mb-3 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(192,132,252,0.15), rgba(139,92,246,0.25))',
                  boxShadow: '0 0 16px 2px rgba(168,85,247,0.12), 0 0 32px 4px rgba(139,92,246,0.06)',
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-background">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              </div>
              <h4 className="font-display text-[0.875rem] md:text-base font-semibold text-foreground leading-tight">
                {member.name}
              </h4>
              <p className="text-[0.75rem] md:text-sm font-medium text-primary font-body mt-0.5 leading-tight min-h-[1.75rem] md:min-h-[2rem] flex items-center justify-center">
                {member.role}
              </p>
              <p className="text-[0.75rem] md:text-sm text-muted-foreground font-body mt-0.5 md:mt-1 leading-snug min-h-[2rem] md:min-h-[2.5rem] flex items-center justify-center">
                {member.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTASection;

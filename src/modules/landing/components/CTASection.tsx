import { Code2, Building2, FlaskConical } from "lucide-react";
import { teamMembers } from "@/data/team-members";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_RESEARCH_URL } from "@/data/external-links";

const paths = [
  {
    icon: Code2,
    title: "Contributors",
    description:
      "Submit improvements, write documentation, or build tools. Everything ships through GitHub.",
    cta: "Start Contributing",
    href: GITHUB_ORG_URL + "/.github/blob/main/CONTRIBUTING.md",
    external: true,
  },
  {
    icon: Building2,
    title: "Adopters",
    description:
      "Try the framework in your systems. Bring permanent, verifiable data addressing to your existing tools.",
    cta: "Explore Projects",
    href: "/projects",
    external: false,
  },
  {
    icon: FlaskConical,
    title: "Researchers",
    description:
      "Join working groups, publish findings, and help advance the framework.",
    cta: "View Research",
    href: GITHUB_RESEARCH_URL,
    external: true,
  },
];

const CTASection = () => {
  return (
    <section className="py-16 md:py-28 bg-background">
      <div className="container max-w-6xl text-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">
          Ready to Build?
        </h2>
        <p className="mt-4 md:mt-5 text-base text-muted-foreground font-body leading-[1.68] max-w-2xl mx-auto">
          Engineers, researchers, and builders working on the open data framework.
        </p>

        {/* Three-path audience routing */}
        <div className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
          {paths.map((path, index) => {
            const Icon = path.icon;
            const linkProps = path.external
              ? { href: path.href, target: "_blank" as const, rel: "noopener noreferrer" }
              : { href: path.href };

            return (
              <div
                key={path.title}
                className="group rounded-xl border border-border/30 bg-card p-6 md:p-8 flex flex-col animate-fade-in-up opacity-0 hover:border-border/50 transition-colors duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon
                  className="w-5 h-5 text-primary mb-4"
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {path.title}
                </h3>
                <p className="text-base text-muted-foreground font-body leading-relaxed flex-1">
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
        <div className="mt-10 md:mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-3">
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
        <div className="h-px w-full bg-border/40 mt-16 md:mt-24" />
        <div className="mt-12 md:mt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-8 md:gap-y-14">
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
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(192,132,252,0.1), rgba(139,92,246,0.2))',
                  boxShadow: '0 0 12px 1px rgba(168,85,247,0.08), 0 0 24px 3px rgba(139,92,246,0.04)',
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
              <h4 className="font-display text-sm md:text-base font-semibold text-foreground leading-tight">
                {member.name}
              </h4>
              <p className="text-sm font-medium text-primary font-body mt-0.5 leading-tight min-h-[1.75rem] md:min-h-[2rem] flex items-center justify-center">
                {member.role}
              </p>
              <p className="text-sm text-muted-foreground font-body mt-0.5 md:mt-1 leading-snug min-h-[2rem] md:min-h-[2.5rem] flex items-center justify-center">
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

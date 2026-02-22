import { teamMembers } from "@/data/team-members";
import { DISCORD_URL, GITHUB_ORG_URL } from "@/data/external-links";

const CTASection = () => {
  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container max-w-5xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          Join Your Community
        </h2>
        <p className="mt-5 text-lg text-muted-foreground font-body leading-relaxed max-w-2xl mx-auto">
          Connect with researchers, developers, and advocates building the future of reliable, open data.
        </p>
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
            Contribute on GitHub
          </a>
        </div>

        {/* Members Grid */}
        <div className="mt-12 md:mt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-8 md:gap-y-12">
          {teamMembers.map((member, index) => (
            <a
              key={member.name}
              href={member.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center text-center animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full p-[2px] mb-2 md:mb-3 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(192,132,252,0.15), rgba(139,92,246,0.25))',
                  boxShadow: '0 0 16px 2px rgba(168,85,247,0.12), 0 0 32px 4px rgba(139,92,246,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px 4px rgba(168,85,247,0.25), 0 0 40px 8px rgba(139,92,246,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 16px 2px rgba(168,85,247,0.12), 0 0 32px 4px rgba(139,92,246,0.06)';
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
              <h4 className="font-display text-base font-semibold text-foreground leading-tight">
                {member.name}
              </h4>
              <p className="text-sm font-medium text-primary font-body mt-0.5 leading-tight min-h-[2rem] flex items-center justify-center">
                {member.role}
              </p>
              <p className="text-sm text-muted-foreground font-body mt-1 leading-snug min-h-[2.5rem] flex items-center justify-center">
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

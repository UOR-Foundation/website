import { teamMembers } from "@/data/team-members";

const CommunitySection = () => {
  return (
    <section className="py-24 md:py-32 bg-section-dark section-depth">
      <div className="container max-w-7xl">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-10 md:mb-14">
            <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§7</span>
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-label">
              Community
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12 lg:gap-x-10 lg:gap-y-14">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center w-[120px] md:w-[140px] animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.23 + idx * 0.04}s` }}
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-sm overflow-hidden mb-3 border border-foreground/10 group-hover:border-primary/30 transition-all duration-300">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="font-body font-semibold text-foreground leading-tight text-fluid-body-sm">
                  {member.name.split(" ")[0]}
                </p>
                <p className="font-body text-foreground/55 leading-snug mt-1 text-fluid-label">
                  {member.role}
                </p>
              </a>
            ))}

            {/* Community count */}
            <div className="flex flex-col items-center text-center w-[120px] md:w-[140px] justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-sm border border-foreground/10 flex items-center justify-center mb-3">
                <span className="font-mono text-foreground/50 text-lg">+</span>
              </div>
              <p className="font-mono text-foreground/50 text-fluid-body-sm">
                150 nodes
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

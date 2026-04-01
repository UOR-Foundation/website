import { teamMembers } from "@/data/team-members";

const CommunitySection = () => {
  return (
    <section className="py-24 md:py-32 bg-section-dark">
      <div className="container max-w-6xl">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-10 md:mb-14">
            <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§7</span>
            <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-primary/70">
              UOR Community
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9 max-w-5xl mx-auto">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2.5 animate-fade-in-up opacity-0 w-[calc(33.333%-1rem)] sm:w-[calc(25%-1rem)] lg:w-[calc(12.5%-1.1rem)]"
                style={{ animationDelay: `${0.23 + idx * 0.03}s` }}
              >
                <div className="relative">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover object-top transition-all duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-sm font-body font-semibold text-foreground/80 leading-tight truncate">
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="text-xs font-body text-foreground/30 leading-tight mt-0.5 truncate">
                    {member.role}
                  </p>
                </div>
              </a>
            ))}

            <div className="flex flex-col items-center gap-2.5 w-[calc(33.333%-1rem)] sm:w-[calc(25%-1rem)] lg:w-[calc(12.5%-1.1rem)]">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-foreground/10 flex items-center justify-center">
                <span className="text-base md:text-lg font-semibold text-foreground/30">+150</span>
              </div>
              <p className="text-xs font-body text-foreground/20 leading-tight">
                & growing
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

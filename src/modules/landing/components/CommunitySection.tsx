import { teamMembers } from "@/data/team-members";

const CommunitySection = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-golden-lg">
            <span className="font-mono text-fluid-body tracking-[0.12em] text-foreground/25">§7</span>
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
              UOR Community
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap justify-center gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12 lg:gap-x-10 lg:gap-y-14">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center md:w-[140px] animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.23 + idx * 0.04}s` }}
              >
                <div className="w-[4.5rem] h-[4.5rem] md:w-24 md:h-24 mb-3 group-hover:scale-105 transition-transform duration-300" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <p className="font-body font-semibold text-foreground leading-tight text-fluid-body">
                  {member.name.split(" ")[0]}
                </p>
                <p className="font-body text-foreground/55 leading-snug mt-1 text-fluid-body">
                  {member.role}
                </p>
              </a>
            ))}

            {/* Community count */}
            <div className="flex flex-col items-center text-center md:w-[140px] justify-center">
              <div className="w-[4.5rem] h-[4.5rem] md:w-24 md:h-24 border border-foreground/10 flex items-center justify-center mb-3" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
                <span className="font-mono text-foreground/50 text-lg">+</span>
              </div>
              <p className="font-mono text-foreground/50 text-fluid-body">
                150 contributors
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

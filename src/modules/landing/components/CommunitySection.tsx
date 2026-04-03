import { teamMembers } from "@/data/team-members";

const CommunitySection = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-golden-lg">
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
              UOR Community
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12 lg:gap-x-10 lg:gap-y-14">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center md:w-[160px] animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.23 + idx * 0.04}s` }}
              >
                <div className="w-[5.5rem] h-[5.5rem] md:w-32 md:h-32 mb-4 group-hover:scale-105 transition-transform duration-300" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
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
            <div className="flex flex-col items-center text-center md:w-[160px] justify-center">
              <div className="w-[5.5rem] h-[5.5rem] md:w-32 md:h-32 border border-foreground/10 flex items-center justify-center mb-4" style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}>
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

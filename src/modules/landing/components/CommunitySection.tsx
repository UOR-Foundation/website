import { teamMembers } from "@/data/team-members";

const CommunitySection = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-golden-lg">
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
              UOR Community
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 justify-items-center gap-x-8 gap-y-12 md:gap-x-10 md:gap-y-14 lg:gap-x-12 lg:gap-y-16">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center text-center w-full max-w-[200px] animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.23 + idx * 0.04}s` }}
              >
                {/* Hexagon photo — larger */}
                <div
                  className="w-28 h-28 md:w-40 md:h-40 lg:w-44 lg:h-44 mb-5 group-hover:scale-105 transition-transform duration-300 ring-1 ring-primary/20 group-hover:ring-primary/50"
                  style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                {/* Name — larger & bolder */}
                <p className="font-body font-semibold text-foreground leading-tight text-fluid-lead">
                  {member.name.split(" ")[0]}
                </p>
                {/* Role — more legible */}
                <p className="font-body text-foreground/60 leading-snug mt-1.5 text-fluid-body">
                  {member.role}
                </p>
              </a>
            ))}

            {/* Community count */}
            <div className="flex flex-col items-center text-center w-full max-w-[200px] justify-center">
              <div
                className="w-28 h-28 md:w-40 md:h-40 lg:w-44 lg:h-44 border border-foreground/10 flex items-center justify-center mb-5"
                style={{ clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' }}
              >
                <span className="font-mono text-foreground/50 text-2xl">+</span>
              </div>
              <p className="font-mono text-foreground/50 text-fluid-lead">
                150+
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

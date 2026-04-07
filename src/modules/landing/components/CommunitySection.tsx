import { teamMembers } from "@/data/team-members";

const HEX_CLIP = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

const CommunitySection = () => {
  const row1 = teamMembers.slice(0, 8);
  const row2 = [...teamMembers.slice(8), { name: "150+", role: "contributors", image: "", link: "", description: "", isCount: true }];

  // Mobile: show first 8 + count tile = 9 items in a 3-column grid
  const mobileMembers = [...teamMembers.slice(0, 8), { name: "150+", role: "contributors", image: "", link: "", description: "", isCount: true }];

  const hexSize = "w-[5rem] h-[5rem] md:w-[5.5rem] md:h-[5.5rem] lg:w-[6.5rem] lg:h-[6.5rem]";
  const cellWidth = "w-[6.5rem] md:w-[8rem] lg:w-[9.5rem]";

  const renderHex = (member: any, idx: number, rowDelay: number) => {
    const delay = `${rowDelay + idx * 0.04}s`;

    if (member.isCount) {
      return (
        <div
          key="count"
          className={`flex flex-col items-center text-center ${cellWidth} animate-fade-in-up opacity-0`}
          style={{ animationDelay: delay }}
        >
          <div
            className={`${hexSize} border border-foreground/10 flex items-center justify-center`}
            style={{ clipPath: HEX_CLIP }}
          >
            <span className="font-mono text-foreground/40 text-xl">+</span>
          </div>
          <p className="font-display font-bold text-foreground text-sm md:text-base lg:text-lg leading-tight mt-3">150+</p>
          <p className="font-body text-foreground/45 text-xs md:text-sm mt-0.5">contributors</p>
        </div>
      );
    }

    return (
      <a
        key={member.name}
        href={member.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex flex-col items-center text-center ${cellWidth} animate-fade-in-up opacity-0`}
        style={{ animationDelay: delay }}
      >
        <div
          className={`${hexSize} group-hover:scale-105 transition-transform duration-300 ring-1 ring-foreground/8 group-hover:ring-primary/40`}
          style={{ clipPath: HEX_CLIP }}
        >
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>
        <p className="font-display font-semibold text-foreground leading-tight text-base md:text-lg lg:text-xl mt-3">
          {member.name.split(" ")[0]}
        </p>
        <p className="font-body text-foreground/50 leading-snug mt-0.5 text-sm md:text-base">
          {member.role}
        </p>
      </a>
    );
  };

  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>

          {/* Honeycomb. Row 1: 8 members */}
          <div className="flex flex-wrap justify-center gap-x-1 md:gap-x-2 lg:gap-x-3 gap-y-8">
            {row1.map((m, i) => renderHex(m, i, 0.22))}
          </div>

          {/* Honeycomb. Row 2: offset for honeycomb interlock */}
          <div
            className="flex flex-wrap justify-center gap-x-1 md:gap-x-2 lg:gap-x-3 gap-y-8 mt-8 md:mt-10"
            style={{ paddingLeft: "calc(4rem + 0.125rem)", paddingRight: "calc(4rem + 0.125rem)" }}
          >
            {row2.map((m, i) => renderHex(m, i, 0.45))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

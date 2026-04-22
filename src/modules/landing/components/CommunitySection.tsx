import { teamMembers } from "@/data/team-members";

const HEX_CLIP = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

const CommunitySection = () => {
  // Split into two balanced rows for honeycomb: 7 top, 6+count bottom
  const row1 = teamMembers.slice(0, 7);
  const row2 = [
    ...teamMembers.slice(7),
    { name: "150+", role: "contributors", image: "", link: "", description: "", isCount: true },
  ];

  // Mobile: 3-column grid, show first 8 + count
  const mobileMembers = [
    ...teamMembers.slice(0, 8),
    { name: "150+", role: "contributors", image: "", link: "", description: "", isCount: true },
  ];

  const hexSize = "w-[5rem] h-[5rem] md:w-[7rem] md:h-[7rem] lg:w-[8.5rem] lg:h-[8.5rem]";
  const cellWidth = "w-[6.5rem] md:w-[10rem] lg:w-[12rem]";

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
            className={`${hexSize} border border-black/10 md:border-foreground/10 flex items-center justify-center`}
            style={{ clipPath: HEX_CLIP }}
          >
            <span className="font-mono text-black/30 md:text-foreground/40 text-2xl md:text-3xl">+</span>
          </div>
          <p className="font-display font-bold text-black md:text-foreground text-base md:text-xl lg:text-2xl leading-tight mt-3">150+</p>
          <p className="font-body text-black/70 md:text-foreground/45 text-[12px] md:text-base lg:text-lg mt-1 font-medium">contributors</p>
        </div>
      );
    }

    return (
      <a
        key={`${member.name}-${idx}`}
        href={member.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex flex-col items-center text-center ${cellWidth} animate-fade-in-up opacity-0`}
        style={{ animationDelay: delay }}
      >
        <div
          className={`${hexSize} group-hover:scale-105 transition-transform duration-300 ring-1 ring-black/8 md:ring-foreground/8 group-hover:ring-primary/40`}
          style={{ clipPath: HEX_CLIP }}
        >
          <img
            src={member.image}
            alt={member.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </div>
        <p className="font-display font-bold text-black md:text-foreground leading-tight text-[15px] md:text-xl lg:text-2xl mt-4 tracking-[0.01em]">
          {member.name.split(" ")[0]}
        </p>
        <p className="font-body text-black/70 md:text-foreground/50 leading-snug mt-1 text-[12px] md:text-base lg:text-lg font-medium">
          {member.role}
        </p>
      </a>
    );
  };

  return (
    <section className="py-14 md:py-20 bg-white md:bg-section-dark md:section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="mb-golden-lg">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-amber-700 md:text-primary/70 text-fluid-lead mb-golden-sm">
            Contributors
          </p>
          <h2 className="font-display font-bold text-black md:text-foreground text-fluid-heading">
            People behind UOR.
          </h2>
        </div>
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>

          {/* Mobile: 3-column grid */}
          <div className="md:hidden grid grid-cols-3 gap-x-2 gap-y-8 justify-items-center">
            {mobileMembers.map((m, i) => renderHex(m, i, 0.22))}
          </div>

          {/* Desktop: Honeycomb Row 1 — 7 members centered */}
          <div className="hidden md:flex justify-center gap-x-2 lg:gap-x-3">
            {row1.map((m, i) => renderHex(m, i, 0.22))}
          </div>

          {/* Desktop: Honeycomb Row 2 — 6 members + count, offset half-cell for interlock */}
          <div className="hidden md:flex justify-center gap-x-2 lg:gap-x-3 mt-8 md:mt-10">
            {row2.map((m, i) => renderHex(m, i, 0.45))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

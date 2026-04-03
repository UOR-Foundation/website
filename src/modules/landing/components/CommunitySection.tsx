import { teamMembers } from "@/data/team-members";

const HEX_CLIP = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

/**
 * Honeycomb layout: even rows have N items, odd rows have N-1 and are offset right.
 * This mirrors a natural bee honeycomb pattern.
 */
const CommunitySection = () => {
  const allItems = [
    ...teamMembers.map((m) => ({ type: "member" as const, ...m })),
    { type: "count" as const, name: "150+", role: "contributors", image: "", link: "", description: "" },
  ];

  // Build honeycomb rows: 5 cols on desktop, odd rows get 4 + offset
  const colsPerEvenRow = 5;
  const rows: (typeof allItems)[] = [];
  let idx = 0;
  let rowIdx = 0;
  while (idx < allItems.length) {
    const isOdd = rowIdx % 2 === 1;
    const count = isOdd ? colsPerEvenRow - 1 : colsPerEvenRow;
    rows.push(allItems.slice(idx, idx + count));
    idx += count;
    rowIdx++;
  }

  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-golden-lg">
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
              Our Community
            </p>
          </div>

          {/* Honeycomb grid */}
          <div className="flex flex-col items-center gap-3 md:gap-4">
            {rows.map((row, rIdx) => {
              const isOdd = rIdx % 2 === 1;
              return (
                <div
                  key={rIdx}
                  className="flex justify-center gap-4 md:gap-6 lg:gap-8"
                  style={{ marginLeft: isOdd ? "calc(var(--hex-offset, 3.5rem))" : 0 }}
                >
                  {row.map((item, cIdx) => {
                    const delay = `${0.2 + (rIdx * colsPerEvenRow + cIdx) * 0.035}s`;

                    if (item.type === "count") {
                      return (
                        <div
                          key="count"
                          className="flex flex-col items-center text-center animate-fade-in-up opacity-0"
                          style={{ animationDelay: delay, ["--hex-offset" as string]: "3.5rem" }}
                        >
                          <div
                            className="w-20 h-20 md:w-24 md:h-24 border border-foreground/10 flex items-center justify-center mb-3"
                            style={{ clipPath: HEX_CLIP }}
                          >
                            <span className="font-mono text-foreground/50 text-lg">+</span>
                          </div>
                          <p className="font-display font-bold text-foreground text-fluid-lead leading-tight">
                            150+
                          </p>
                          <p className="font-body text-foreground/50 text-fluid-body mt-1">
                            contributors
                          </p>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={item.name}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center text-center animate-fade-in-up opacity-0"
                        style={{ animationDelay: delay }}
                      >
                        <div
                          className="w-20 h-20 md:w-24 md:h-24 mb-3 group-hover:scale-105 transition-transform duration-300 ring-1 ring-primary/15 group-hover:ring-primary/40"
                          style={{ clipPath: HEX_CLIP }}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                        </div>
                        <p className="font-display font-bold text-foreground leading-tight text-fluid-lead">
                          {item.name.split(" ")[0]}
                        </p>
                        <p className="font-body text-foreground/55 leading-snug mt-1 text-fluid-body max-w-[140px]">
                          {item.role}
                        </p>
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

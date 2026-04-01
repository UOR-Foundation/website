import { teamMembers } from "@/data/team-members";

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const getNodeId = (name: string, idx: number) =>
  `node.${name.split(" ")[0].toLowerCase()}.${String(idx + 1).padStart(2, "0")}`;

const CommunitySection = () => {
  return (
    <section className="py-24 md:py-32 bg-section-dark section-depth">
      <div className="container max-w-7xl">
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.19s" }}>
          <div className="flex items-center gap-3 mb-10 md:mb-14">
            <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§7</span>
            <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70" style={{ fontSize: 'clamp(12px, 0.8vw, 14px)' }}>
              Network Registry
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-px bg-foreground/[0.06]">
            {teamMembers.map((member, idx) => (
              <a
                key={member.name}
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-background p-4 lg:p-5 flex flex-col gap-2 panel-active animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.23 + idx * 0.03}s` }}
              >
                <div className="w-10 h-10 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors duration-300">
                  <span className="font-mono text-sm text-primary/60 group-hover:text-primary/90 transition-colors duration-300">
                    {getInitials(member.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-body font-semibold text-foreground/70 leading-tight truncate" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="text-[0.6875rem] font-body text-foreground/30 leading-tight mt-0.5 truncate">
                    {member.role}
                  </p>
                </div>
                <span className="font-mono text-[0.5625rem] text-primary/0 group-hover:text-primary/30 transition-colors duration-500 truncate">
                  {getNodeId(member.name, idx)}
                </span>
              </a>
            ))}

            <div className="bg-background p-4 lg:p-5 flex flex-col gap-2 items-start justify-center">
              <div className="w-10 h-10 border border-foreground/10 flex items-center justify-center">
                <span className="font-mono text-xs text-foreground/30">+</span>
              </div>
              <p className="font-mono text-xs text-foreground/20">150 nodes</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;

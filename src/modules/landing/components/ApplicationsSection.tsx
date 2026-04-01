import {
  Globe,
  ShieldCheck,
  Bot,
  Microscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Application {
  icon: LucideIcon;
  title: string;
  description: string;
  systemId: string;
}

const applications: Application[] = [
  {
    icon: Globe,
    title: "Semantic Web",
    description:
      "Make data understandable by both people and machines, so systems can work together without custom translations.",
    systemId: "sys.semantic-web.v1",
  },
  {
    icon: ShieldCheck,
    title: "Proof-Based Computation",
    description:
      "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it.",
    systemId: "sys.proof-compute.v1",
  },
  {
    icon: Bot,
    title: "Agentic AI",
    description:
      "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own.",
    systemId: "sys.agentic-ai.v1",
  },
  {
    icon: Microscope,
    title: "Open Science",
    description:
      "Make research data findable, reproducible, and composable across institutions and fields.",
    systemId: "sys.open-science.v1",
  },
];

const ApplicationsSection = () => {
  return (
    <section className="py-24 md:py-32 bg-section-dark section-depth">
      <div className="container max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§3</span>
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-primary/70">
            Where It Applies
          </p>
        </div>
        <div className="rule-prime" />
        <p
          className="py-8 md:py-10 text-foreground/60 font-body text-base leading-[1.75] max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.11s" }}
        >
          When every system shares one way to address data, new capabilities emerge.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {applications.map((app, idx) => {
            const Icon = app.icon;
            return (
              <div
                key={app.title}
                className="group p-8 md:p-10 border-t border-foreground/8 flex flex-col gap-4 panel-active animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.17 + idx * 0.07}s` }}
              >
                <Icon
                  size={24}
                  className="text-primary/60 shrink-0 transition-colors duration-300 group-hover:text-primary"
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground leading-tight">
                  {app.title}
                </h3>
                <p className="text-foreground/45 font-body text-[0.938rem] leading-[1.7]">
                  {app.description}
                </p>
                {/* Layered reality — hover-reveal system ID */}
                <span className="font-mono text-[0.625rem] text-primary/0 group-hover:text-primary/25 transition-colors duration-500 tracking-wider">
                  {app.systemId}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ApplicationsSection;

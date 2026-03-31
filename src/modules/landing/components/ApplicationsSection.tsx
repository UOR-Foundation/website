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
}

const applications: Application[] = [
  {
    icon: Globe,
    title: "Semantic Web",
    description:
      "Make data understandable by both people and machines, so systems can work together without custom translations.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-Based Computation",
    description:
      "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it.",
  },
  {
    icon: Bot,
    title: "Agentic AI",
    description:
      "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own.",
  },
  {
    icon: Microscope,
    title: "Open Science",
    description:
      "Make research data findable, reproducible, and composable across institutions and fields.",
  },
];

const ApplicationsSection = () => {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-4">
          Where It Applies
        </p>
        <div className="h-px w-full bg-border/40" />
        <p
          className="py-6 md:py-8 text-foreground/75 font-body text-base leading-[1.75] max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          When every system shares one way to address data, new capabilities emerge.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {applications.map((app, idx) => {
            const Icon = app.icon;
            return (
              <div
                key={app.title}
                className="group rounded-2xl border border-border bg-card p-6 md:p-7 flex flex-col gap-4 transition-all duration-300 hover:border-primary/20 hover:shadow-lg animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.15 + idx * 0.07}s` }}
              >
                <Icon
                  size={22}
                  className="text-primary shrink-0 transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground leading-tight">
                  {app.title}
                </h3>
                <p className="text-muted-foreground font-body text-[0.938rem] leading-[1.7]">
                  {app.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ApplicationsSection;

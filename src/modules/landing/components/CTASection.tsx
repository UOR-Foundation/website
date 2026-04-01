import { ArrowRight } from "lucide-react";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";

const PRIME_POSITIONS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];

const CTASection = () => {
  return (
     <section className="relative py-section-lg bg-background overflow-hidden">
       <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] md:w-[900px] md:h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
       </div>
       <div className="relative container max-w-[1400px] text-center">
         <div className="relative h-px w-full mb-golden-xl" aria-hidden="true">
           <div className="absolute inset-0 bg-foreground/[0.06]" />
           {PRIME_POSITIONS.map((p) => (
             <div
               key={p}
               className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/60"
               style={{ left: `${p}%` }}
             />
           ))}
         </div>

         <div className="flex items-center justify-center gap-3 mb-golden-md">
           <span className="font-mono text-fluid-caption tracking-[0.05em] text-foreground/[0.12]">§17</span>
         </div>

         <h2 className="font-display font-bold text-foreground text-fluid-heading">
          Join the UOR Mission
        </h2>
        <p className="mt-golden-md text-foreground/65 font-body leading-[1.68] max-w-5xl mx-auto text-fluid-body">
          Learn the spec. Contribute to the codebase. Build the future of data identity with us.
        </p>

        <div className="mt-golden-lg flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <a
            href={GITHUB_FRAMEWORK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Getting Started Guide
            <ArrowRight size={14} />
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            Join Discord
          </a>
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            GitHub Organization
          </a>
         </div>
       </div>
     </section>
  );
};

export default CTASection;

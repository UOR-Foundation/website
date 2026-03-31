import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";

const CTASection = () => {
  return (
    <section className="py-8 md:py-14 bg-background">
      <div className="container max-w-6xl text-center">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">
          Ready to Build?
        </h2>
        <p className="mt-4 md:mt-5 text-base text-muted-foreground font-body leading-[1.68] max-w-2xl mx-auto">
          Verify your first address in five minutes, then join the community.
        </p>

        <div className="mt-8 md:mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <a
            href={GITHUB_FRAMEWORK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Getting Started Guide
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Join Discord
          </a>
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            GitHub Organization
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

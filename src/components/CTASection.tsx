const CTASection = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container max-w-3xl">
        <div className="rule-accent mb-16" />
        <div className="text-center">
          <p className="text-xs font-medium tracking-widest uppercase text-primary mb-4 font-body">
            Support the Foundation
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Donate Now
          </h2>
          <p className="text-muted-foreground font-body leading-relaxed mb-10 max-w-lg mx-auto text-sm">
            Open infrastructure for the next foundation of the internet. Every contribution sustains verified, composable, and freely available standards.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="https://discord.gg/ZwuZaNyuve"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Join Discord Community
            </a>
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full border border-pill text-foreground font-medium text-sm hover:border-foreground/25 transition-all"
            >
              Contribute on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
const CTASection = () => {
  return (
    <section className="py-16 md:py-28 bg-background">
      <div className="container">
        <div className="rule-accent mb-10 md:mb-16" />
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Donate Now
          </h2>
          <p className="mt-4 text-muted-foreground font-body leading-relaxed">
            Support open infrastructure for the next foundation of the internet.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
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
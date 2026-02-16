const CTASection = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Donate Now
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="https://discord.gg/ZwuZaNyuve"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Join Discord Community
            </a>
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full border border-pill text-foreground font-medium hover:border-foreground/30 transition-all"
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

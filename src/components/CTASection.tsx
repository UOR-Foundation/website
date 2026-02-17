const CTASection = () => {
  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          Join Your Community
        </h2>
        <p className="mt-5 text-lg text-muted-foreground font-body leading-relaxed">
          Connect with researchers, developers, and advocates building the future of open data infrastructure.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="https://discord.gg/ZwuZaNyuve"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Join Discord Community
          </a>
          <a
            href="https://github.com/UOR-Foundation"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline"
          >
            Contribute on GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

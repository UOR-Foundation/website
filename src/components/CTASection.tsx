const members = [
  {
    name: "Alex Flom",
    role: "Chief Scientist @ UOR",
    description: "Framework architect and protocol implementation.",
    image: "/images/profiles/alex-flom.jpg",
    link: "https://www.linkedin.com/in/alexander-flom/",
  },
  {
    name: "Tirath Virdee",
    role: "Chief Scientist @ Xenesis",
    description: "Data science and artificial intelligence.",
    image: "/images/profiles/tirath-virdee.jpg",
    link: "https://www.linkedin.com/in/tirath-virdee-6a08255/",
  },
  {
    name: "Kat Morgan",
    role: "Engineer @ Cisco",
    description: "Cloud infrastructure and DevOps specialist.",
    image: "/images/profiles/kat-morgan.jpg",
    link: "https://linkedin.com/in/usrbinkat",
  },
  {
    name: "Dan Simmerman",
    role: "Founder @ Mintify",
    description: "Digital assets and decentralized networks.",
    image: "/images/profiles/dan-simmerman.jpg",
    link: "https://x.com/dansimerman?lang=en",
  },
  {
    name: "Ilya Paveliev",
    role: "Founding Partner @ Arete Capital",
    description: "Capital formation and emergent technologies strategy.",
    image: "/images/profiles/ilya-paveliev.jpg",
    link: "https://www.linkedin.com/in/trinityinvestor/",
  },
  {
    name: "Bill Wright",
    role: "Chief Architect @ Red Hat",
    description: "Enterprise AI and network technology strategist.",
    image: "/images/profiles/bill-wright.jpg",
    link: "https://www.linkedin.com/in/billwright1/",
  },
  {
    name: "Emmanuel Bello",
    role: "Founder @ Kinetic Keys",
    description: "Full-stack development and system architecture.",
    image: "/images/profiles/emmanuel-bello.jpg",
    link: "https://www.linkedin.com/in/emmanuxl/",
  },
  {
    name: "Adam de Delva",
    role: "Founder @ DTR",
    description: "Building systems that bridge technology & humanity.",
    image: "/images/profiles/adam-dedelva.jpg",
    link: "https://www.linkedin.com/in/adamdedelva/",
  },
  {
    name: "Mateusz Tobola",
    role: "Product Manager @ Stealth AI Startup",
    description: "Knowledge graph architecture, design and AI.",
    image: "/images/profiles/mateusz-tobola.jpg",
    link: "https://www.linkedin.com/in/mateusz-tobola-ai/",
  },
  {
    name: "Ryan Westerberg",
    role: "Engineer @ Peoplevine",
    description: "Full-stack development and system architecture.",
    image: "/images/profiles/ryan-westerberg.jpg",
    link: "https://www.linkedin.com/in/ryan-westerberg/",
  },
  {
    name: "Matt McKibbin",
    role: "Founder @ DecentraNet",
    description: "Decentralized networks and emergent technologies.",
    image: "/images/profiles/matt-mckibbin.jpg",
    link: "https://www.linkedin.com/in/mattmckibbin/",
  },
  {
    name: "Max Phelps",
    role: "Engineer @ Maitai (YC S24)",
    description: "Full-stack builder and solutions engineer.",
    image: "/images/profiles/max-phelps.jpg",
    link: "https://www.linkedin.com/in/guy-maximillian-phelps/",
  },
  {
    name: "Lucio",
    role: "Founder @ AiresAI",
    description: "Architect of an open-source modular AI LLM.",
    image: "/images/profiles/lucio.jpg",
    link: "https://x.com/luussta",
  },
  {
    name: "Jimmy Danella",
    role: "Alternative Medicine",
    description: "Exploring healthcare frontier technology innovations.",
    image: "/images/profiles/jimmy-danella.jpg",
    link: "https://www.linkedin.com/in/wellnessworxio/",
  },
  {
    name: "Ari Lerner",
    role: "Hacking Software/Hardware",
    description: "Technologist with experience in AI and robotics.",
    image: "/images/profiles/ari-lerner.jpg",
    link: "https://www.linkedin.com/in/arilerner/",
  },
];

const CTASection = () => {
  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container max-w-5xl text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          Join Your Community
        </h2>
        <p className="mt-5 text-lg text-muted-foreground font-body leading-relaxed max-w-2xl mx-auto">
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

        {/* Members Grid */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-10">
          {members.map((member, index) => (
            <a
              key={member.name}
              href={member.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center text-center animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] mb-3 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(192,132,252,0.15), rgba(139,92,246,0.25))',
                  boxShadow: '0 0 16px 2px rgba(168,85,247,0.12), 0 0 32px 4px rgba(139,92,246,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px 4px rgba(168,85,247,0.25), 0 0 40px 8px rgba(139,92,246,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 16px 2px rgba(168,85,247,0.12), 0 0 32px 4px rgba(139,92,246,0.06)';
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-background">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              </div>
              <h4 className="font-display text-base font-semibold text-foreground">
                {member.name}
              </h4>
              <p className="text-sm font-medium text-primary font-body mt-0.5">
                {member.role}
              </p>
              <p className="text-sm text-muted-foreground font-body mt-1 leading-snug">
                {member.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CTASection;

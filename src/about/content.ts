const GH = "https://github.com/UOR-Foundation/.github";

export const INTRO = {
  label: "Open governance",
  title: "The UOR Foundation.",
  line: "A 501(c)(3) nonprofit maintaining the UOR specification and the projects built on it.",
  cta: { label: "Governance on GitHub", href: GH },
};

export const FOCUS = {
  label: "What we do",
  title: "Our focus areas.",
  items: [
    { t: "Specification", b: "We maintain the formal specification as the Rust crate uor foundation, published on crates.io under Apache 2.0." },
    { t: "Community", b: "We run working groups across mathematics, AI and systems engineering. Everything is published on GitHub." },
    { t: "Projects", b: "A home for open source projects built on the UOR Framework, with community review at every step." },
  ],
};

export const BOARD = {
  label: "Governance board",
  title: "Leadership.",
  line: "A five member board serving three year terms. All governance rules are published on GitHub.",
  members: [
    { name: "Bill Wright", role: "Chair", bio: "Chairman at Enterprise Neurosystems. Led adoption of enterprise software architectures across multinational corporations.", href: "https://www.linkedin.com/in/billwright1/", photo: "bill" },
    { name: "Alexander Flom", role: "Research Director", bio: "Open standards researcher focused on model centric runtimes and the UOR specification.", href: "https://www.linkedin.com/in/alexander-flom/", photo: "alex" },
    { name: "Tirath Virdee", role: "Independent Director", bio: "Scientist and technology leader specializing in AI, data intelligence and due diligence for emerging technology investments.", href: "https://www.linkedin.com/in/tirath-virdee-6a08255/", photo: "tirath" },
    { name: "Ilya Paveliev", role: "Treasurer", bio: "Investment banking and venture capital background. Founded a VC fund focused on AI and frontier infrastructure.", href: "https://www.linkedin.com/in/trinityinvestor/", photo: "ilya" },
    { name: "John Haines", role: "Secretary", bio: "Operations and governance lead ensuring the foundation runs with transparency and accountability.", href: "https://www.linkedin.com/in/john-haines-62504a35/", photo: "john" },
  ],
};

export const DOCS = {
  label: "Resources",
  title: "Governance documents.",
  items: [
    { t: "Foundation Bylaws", href: `${GH}/blob/main/governance/The_UOR_Foundation_Bylaws.pdf` },
    { t: "Code of Conduct", href: `${GH}/blob/main/CODE_OF_CONDUCT.md` },
    { t: "Contributing Guide", href: `${GH}/blob/main/CONTRIBUTING.md` },
    { t: "Organization on GitHub", href: GH },
  ],
};

export const CLOSE = { title: "Build the future with us.", cta: "Join Discord" };

/**
 * Research domain categories — serializable data for UOR certification.
 * Icons are mapped at the component level by `iconKey`.
 */
export const researchCategories = [
  { iconKey: "Calculator", label: "Mathematics", slug: "mathematics", description: "Formal methods, algebraic structures, and mathematical foundations of UOR.", active: true },
  { iconKey: "Cpu", label: "Hardware & Robotics", slug: "hardware-robotics", description: "Embedded systems, robotics middleware, and UOR-native hardware interfaces.", active: false },
  { iconKey: "Shield", label: "Cybersecurity", slug: "cybersecurity", description: "Security that is built into the data itself. Verify where information came from and confirm it has not been altered.", active: false },
  { iconKey: "TrendingUp", label: "Finance", slug: "finance", description: "Financial systems where every transaction is independently auditable and data flows reliably between institutions.", active: false },
  { iconKey: "Bot", label: "Agentic AI", slug: "agentic-ai", description: "Give AI systems a reliable, shared map of data so they can find, verify, and use information without custom integrations.", active: false },
  { iconKey: "Atom", label: "Quantum", slug: "quantum", description: "Preparing data systems for the next generation of computing, where today's security methods will need to be replaced.", active: false },
  { iconKey: "BarChart3", label: "Data Science", slug: "data-science", description: "Semantic datasets, reproducible pipelines, and interoperable analytics.", active: false },
  { iconKey: "HeartPulse", label: "Healthcare", slug: "healthcare", description: "Medical data interoperability, patient-centric identity, and open health standards.", active: false },
  { iconKey: "Globe", label: "Web3", slug: "web3", description: "Decentralized protocols, on-chain identity, and content-addressed storage.", active: false },
  { iconKey: "Microscope", label: "Physics", slug: "physics", description: "Simulation frameworks, open research data, and computational physics tooling.", active: false },
  { iconKey: "Rocket", label: "Frontier Tech", slug: "frontier-tech", description: "Emerging technology exploration at the intersection of UOR and next-gen infrastructure.", active: false },
  { iconKey: "Leaf", label: "Climate & Energy", slug: "climate-energy", description: "Sustainable infrastructure, carbon accounting, and open energy data standards.", active: false },
];

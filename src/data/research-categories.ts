/**
 * Research domain categories — serializable data for UOR certification.
 * Icons are mapped at the component level by `iconKey`.
 */
export const researchCategories = [
  { iconKey: "Calculator", label: "Mathematics", slug: "mathematics", description: "The mathematical structures that UOR is built on. Proofs, algebra, and formal verification.", active: true },
  { iconKey: "Cpu", label: "Hardware & Robotics", slug: "hardware-robotics", description: "Running UOR on physical devices — embedded systems, sensors, and robotics.", active: false },
  { iconKey: "Shield", label: "Cybersecurity", slug: "cybersecurity", description: "Security that is built into the data itself. Verify where information came from and confirm it has not been altered.", active: false },
  { iconKey: "TrendingUp", label: "Finance", slug: "finance", description: "Financial systems where every transaction is independently auditable and data flows reliably between institutions.", active: false },
  { iconKey: "Bot", label: "Agentic AI", slug: "agentic-ai", description: "Give AI systems a reliable, shared map of data so they can find, verify, and use information without custom integrations.", active: false },
  { iconKey: "Atom", label: "Quantum", slug: "quantum", description: "Preparing data systems for the next generation of computing, where today's security methods will need to be replaced.", active: false },
  { iconKey: "BarChart3", label: "Data Science", slug: "data-science", description: "Reproducible data pipelines and analytics that work across tools and teams.", active: false },
  { iconKey: "HeartPulse", label: "Healthcare", slug: "healthcare", description: "Portable medical records and patient-owned identity. Data moves with the person, not the institution.", active: false },
  { iconKey: "Globe", label: "Web3", slug: "web3", description: "Decentralized identity and storage. UOR addressing works natively with blockchain protocols.", active: false },
  { iconKey: "Microscope", label: "Physics", slug: "physics", description: "Discrete spacetime geometry, self-verification, and the geometric origin of fundamental constants.", active: true },
  { iconKey: "Rocket", label: "Frontier Tech", slug: "frontier-tech", description: "Early-stage work on technologies that don't fit existing categories yet.", active: false },
  { iconKey: "Leaf", label: "Climate & Energy", slug: "climate-energy", description: "Open data standards for carbon accounting, energy tracking, and climate infrastructure.", active: false },
];

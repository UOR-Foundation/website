/**
 * UOR application domains. serializable for UOR certification.
 * Icons are mapped at the component level by iconKey.
 */

export interface ApplicationCard {
  iconKey: string;
  title: string;
  text: string;
}

export const applications: ApplicationCard[] = [
  { iconKey: "Globe", title: "Semantic Web", text: "Make data understandable by both people and machines, so systems can work together without custom translations." },
  { iconKey: "ShieldCheck", title: "Proof Based Computation", text: "Run a computation once and get a proof anyone can check. No re-running, no trust required." },
  { iconKey: "Bot", title: "Agentic AI", text: "Give AI a shared, verified index of data. Models find and use information without custom integrations." },
  { iconKey: "Microscope", title: "Open Science", text: "Make research data findable, reproducible, and composable across institutions and fields." },
  { iconKey: "Layers", title: "Cross Domain Unification", text: "Share data across fields without losing meaning. One addressing system, every discipline." },
  { iconKey: "Rocket", title: "Frontier Technologies", text: "A foundation for quantum computing and next-generation AI, where data identity must be reliable from day one." },
];

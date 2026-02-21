/**
 * UOR application domains — serializable for UOR certification.
 * Icons are mapped at the component level by iconKey.
 */

export interface ApplicationCard {
  iconKey: string;
  title: string;
  text: string;
}

export const applications: ApplicationCard[] = [
  { iconKey: "Globe", title: "Semantic Web", text: "Make data understandable by both people and machines, so systems can work together without custom translations." },
  { iconKey: "ShieldCheck", title: "Proof Based Computation", text: "Run a computation once and produce a receipt that anyone can check. No need to re-run it, no need to trust the person who ran it." },
  { iconKey: "Bot", title: "Agentic AI", text: "Give AI systems a single, reliable map of all available data so they can find, verify, and use information on their own." },
  { iconKey: "Microscope", title: "Open Science", text: "Make research data findable, reproducible, and composable across institutions and fields." },
  { iconKey: "Layers", title: "Cross Domain Unification", text: "Let different fields share data and ideas without losing meaning in translation. One shared system, many disciplines." },
  { iconKey: "Rocket", title: "Frontier Technologies", text: "Provide a foundation for emerging fields like quantum computing and next-generation AI, where reliable data identity is essential." },
];

/**
 * UOR Closure modes — serializable data for UOR certification.
 * Defines the three trust levels an agent can request when traversing the graph.
 */

export interface ClosureMode {
  name: string;
  label: string;
  description: string;
  useCase: string;
}

export const closureModes: ClosureMode[] = [
  {
    name: "ONE_STEP",
    label: "One Step",
    description: "Apply each rule once from your starting point. Fast and bounded. You see your immediate neighbours but nothing beyond.",
    useCase: "Quick lookups where you only need directly related data.",
  },
  {
    name: "FIXED_POINT",
    label: "Fixed Point",
    description: "Keep applying the rules until no new results appear. This guarantees you reach everything that is reachable, with nothing left out.",
    useCase: "Complete analysis where you need the full picture.",
  },
  {
    name: "GRAPH_CLOSED",
    label: "Graph Closed",
    description: "Same as Fixed Point, plus a mathematical proof that every connection in your result points to something that is also in your result. Nothing dangling, nothing missing.",
    useCase: "High-trust environments where you need verified completeness.",
  },
];

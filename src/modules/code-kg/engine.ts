/**
 * Code-to-Knowledge-Graph — TypeScript Source Code Parser
 * ════════════════════════════════════════════════════════
 *
 * A client-side TypeScript/JavaScript code analyzer that extracts
 * structural entities (modules, functions, classes, imports, exports)
 * and their relationships into UOR-native knowledge graph triples.
 *
 * Inspired by Bevel Software's Code-to-Knowledge-Graph (Kotlin/JVM).
 * This implementation runs entirely in-browser using regex-based parsing,
 * producing content-addressed triples compatible with the UOR kg-store.
 *
 * Node types: File, Module, Function, Class, Interface, Import, Export, Variable
 * Edge types: imports, exports, contains, extends, implements, calls, dependsOn
 *
 * @module code-kg/engine
 * @see https://github.com/Bevel-Software/code-to-knowledge-graph
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type NodeKind =
  | "file" | "module" | "function" | "class"
  | "interface" | "import" | "export" | "variable" | "type";

export type EdgeKind =
  | "imports" | "exports" | "contains" | "extends"
  | "implements" | "calls" | "dependsOn" | "reExports";

export interface CodeNode {
  id: string;
  kind: NodeKind;
  name: string;
  filePath: string;
  line?: number;
  metadata?: Record<string, string>;
}

export interface CodeEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  weight?: number;
}

export interface CodeGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
  metadata: {
    fileCount: number;
    nodeCount: number;
    edgeCount: number;
    parsedAt: string;
  };
}

// ── Parser ──────────────────────────────────────────────────────────────────

/** Regex patterns for TypeScript/JavaScript structural extraction */
const PATTERNS = {
  // import { Foo, Bar } from "./module"
  namedImport: /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  // import Foo from "./module"
  defaultImport: /import\s+(\w+)\s+from\s*["']([^"']+)["']/g,
  // import * as Foo from "./module"
  namespaceImport: /import\s*\*\s*as\s+(\w+)\s+from\s*["']([^"']+)["']/g,
  // import type { Foo } from "./module"
  typeImport: /import\s+type\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  // export { Foo } from "./module"
  reExport: /export\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  // export function foo() / export const foo = / export default
  namedExport: /export\s+(?:default\s+)?(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/g,
  // function foo() or const foo = () =>
  functionDef: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
  arrowFn: /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+(?:<[^>]+>)?\s*)?=>/g,
  // class Foo extends Bar implements Baz
  classDef: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g,
  // interface Foo extends Bar
  interfaceDef: /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?/g,
  // type Foo = ...
  typeDef: /(?:export\s+)?type\s+(\w+)\s*(?:<[^>]*>)?\s*=/g,
};

function makeNodeId(filePath: string, kind: NodeKind, name: string): string {
  return `${kind}:${filePath}:${name}`;
}

function makeFileId(filePath: string): string {
  return `file:${filePath}`;
}

/**
 * Parse a single TypeScript/JavaScript source file into nodes and edges.
 */
function parseFile(filePath: string, content: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];
  const seen = new Set<string>();

  const addNode = (kind: NodeKind, name: string, line?: number, meta?: Record<string, string>) => {
    const id = makeNodeId(filePath, kind, name);
    if (seen.has(id)) return id;
    seen.add(id);
    nodes.push({ id, kind, name, filePath, line, metadata: meta });
    // File contains this entity
    edges.push({ source: makeFileId(filePath), target: id, kind: "contains" });
    return id;
  };

  // ── Imports ──
  let m: RegExpExecArray | null;

  // Named imports
  const namedImportRe = new RegExp(PATTERNS.namedImport.source, "g");
  while ((m = namedImportRe.exec(content))) {
    const names = m[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const source = m[2];
    for (const name of names) {
      const id = addNode("import", name);
      edges.push({ source: id, target: `module:${source}`, kind: "imports" });
    }
  }

  // Default imports
  const defaultImportRe = new RegExp(PATTERNS.defaultImport.source, "g");
  while ((m = defaultImportRe.exec(content))) {
    const name = m[1];
    const source = m[2];
    if (name === "type") continue; // skip "import type"
    const id = addNode("import", name);
    edges.push({ source: id, target: `module:${source}`, kind: "imports" });
  }

  // Type imports
  const typeImportRe = new RegExp(PATTERNS.typeImport.source, "g");
  while ((m = typeImportRe.exec(content))) {
    const names = m[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const source = m[2];
    for (const name of names) {
      const id = addNode("type", name);
      edges.push({ source: id, target: `module:${source}`, kind: "imports" });
    }
  }

  // Re-exports
  const reExportRe = new RegExp(PATTERNS.reExport.source, "g");
  while ((m = reExportRe.exec(content))) {
    const names = m[1].split(",").map(n => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const source = m[2];
    for (const name of names) {
      const id = addNode("export", name);
      edges.push({ source: id, target: `module:${source}`, kind: "reExports" });
    }
  }

  // Named exports
  const namedExportRe = new RegExp(PATTERNS.namedExport.source, "g");
  while ((m = namedExportRe.exec(content))) {
    addNode("export", m[1]);
  }

  // Functions
  const fnRe = new RegExp(PATTERNS.functionDef.source, "g");
  while ((m = fnRe.exec(content))) {
    addNode("function", m[1]);
  }

  // Arrow functions
  const arrowRe = new RegExp(PATTERNS.arrowFn.source, "g");
  while ((m = arrowRe.exec(content))) {
    addNode("function", m[1]);
  }

  // Classes
  const classRe = new RegExp(PATTERNS.classDef.source, "g");
  while ((m = classRe.exec(content))) {
    const id = addNode("class", m[1]);
    if (m[2]) {
      edges.push({ source: id, target: `class:*:${m[2]}`, kind: "extends" });
    }
    if (m[3]) {
      const impls = m[3].split(",").map(s => s.trim()).filter(Boolean);
      for (const impl of impls) {
        edges.push({ source: id, target: `interface:*:${impl}`, kind: "implements" });
      }
    }
  }

  // Interfaces
  const ifaceRe = new RegExp(PATTERNS.interfaceDef.source, "g");
  while ((m = ifaceRe.exec(content))) {
    const id = addNode("interface", m[1]);
    if (m[2]) {
      const parents = m[2].split(",").map(s => s.trim()).filter(Boolean);
      for (const p of parents) {
        edges.push({ source: id, target: `interface:*:${p}`, kind: "extends" });
      }
    }
  }

  // Type aliases
  const typeRe = new RegExp(PATTERNS.typeDef.source, "g");
  while ((m = typeRe.exec(content))) {
    addNode("type", m[1]);
  }

  return { nodes, edges };
}

/**
 * Parse multiple files into a unified code knowledge graph.
 */
export function buildCodeGraph(
  files: { path: string; content: string }[]
): CodeGraph {
  const allNodes: CodeNode[] = [];
  const allEdges: CodeEdge[] = [];
  const fileNodes: CodeNode[] = [];

  // Create file nodes
  for (const file of files) {
    fileNodes.push({
      id: makeFileId(file.path),
      kind: "file",
      name: file.path.split("/").pop() ?? file.path,
      filePath: file.path,
    });
  }

  // Parse each file
  for (const file of files) {
    const { nodes, edges } = parseFile(file.path, file.content);
    allNodes.push(...nodes);
    allEdges.push(...edges);
  }

  // Create module dependency edges (file → file via imports)
  const fileByPath = new Map(files.map(f => [f.path, f]));
  for (const edge of allEdges) {
    if (edge.kind === "imports" && edge.target.startsWith("module:")) {
      const modulePath = edge.target.replace("module:", "");
      // Resolve relative paths
      if (modulePath.startsWith("./") || modulePath.startsWith("../") || modulePath.startsWith("@/")) {
        const sourceFile = allNodes.find(n => n.id === edge.source)?.filePath;
        if (sourceFile) {
          allEdges.push({
            source: makeFileId(sourceFile),
            target: makeFileId(modulePath),
            kind: "dependsOn",
          });
        }
      }
    }
  }

  return {
    nodes: [...fileNodes, ...allNodes],
    edges: allEdges,
    metadata: {
      fileCount: files.length,
      nodeCount: fileNodes.length + allNodes.length,
      edgeCount: allEdges.length,
      parsedAt: new Date().toISOString(),
    },
  };
}

// ── UOR Triple Emission ─────────────────────────────────────────────────────

export interface CodeTriple {
  subject: string;
  predicate: string;
  object: string;
}

const CODE_NS = "https://uor.foundation/code/";

/**
 * Convert a CodeGraph into UOR-native triples.
 * Each node becomes a subject with rdf:type and properties.
 * Each edge becomes a predicate triple.
 */
export function graphToTriples(graph: CodeGraph): CodeTriple[] {
  const triples: CodeTriple[] = [];

  for (const node of graph.nodes) {
    const s = `${CODE_NS}${node.id}`;
    triples.push({ subject: s, predicate: "rdf:type", object: `${CODE_NS}${node.kind}` });
    triples.push({ subject: s, predicate: `${CODE_NS}name`, object: node.name });
    triples.push({ subject: s, predicate: `${CODE_NS}filePath`, object: node.filePath });
  }

  for (const edge of graph.edges) {
    triples.push({
      subject: `${CODE_NS}${edge.source}`,
      predicate: `${CODE_NS}${edge.kind}`,
      object: `${CODE_NS}${edge.target}`,
    });
  }

  return triples;
}

// ── Graph Statistics ────────────────────────────────────────────────────────

export interface GraphStats {
  nodesByKind: Record<string, number>;
  edgesByKind: Record<string, number>;
  topFiles: { path: string; entityCount: number }[];
  avgEntitiesPerFile: number;
}

export function computeStats(graph: CodeGraph): GraphStats {
  const nodesByKind: Record<string, number> = {};
  const edgesByKind: Record<string, number> = {};

  for (const n of graph.nodes) {
    nodesByKind[n.kind] = (nodesByKind[n.kind] ?? 0) + 1;
  }
  for (const e of graph.edges) {
    edgesByKind[e.kind] = (edgesByKind[e.kind] ?? 0) + 1;
  }

  // Count entities per file
  const fileCounts = new Map<string, number>();
  for (const e of graph.edges) {
    if (e.kind === "contains") {
      fileCounts.set(e.source, (fileCounts.get(e.source) ?? 0) + 1);
    }
  }

  const topFiles = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({
      path: path.replace("file:", ""),
      entityCount: count,
    }));

  const fileCount = graph.nodes.filter(n => n.kind === "file").length;

  return {
    nodesByKind,
    edgesByKind,
    topFiles,
    avgEntitiesPerFile: fileCount > 0
      ? (graph.nodes.length - fileCount) / fileCount
      : 0,
  };
}

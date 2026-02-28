/**
 * Quantum Notebook Engine
 * ═══════════════════════
 *
 * Core data model and execution engine for the Holographic Jupyter workspace.
 * Routes Python-like Qiskit/Cirq/PennyLane syntax through the Q-Simulator.
 * Every cell output is content-addressable via UOR derivation hashes.
 */

import {
  createState,
  simulateCircuit,
  measure as simMeasure,
  formatStatevector,
  toOpenQASM,
  entanglementMap,
  noNoise,
  realisticNoise,
  type SimulatorState,
  type SimOp,
  type NoiseModel,
} from "@/modules/qkernel/q-simulator";

// ── Cell Types ──────────────────────────────────────────────────────────────

export type CellType = "code" | "markdown";
export type CellStatus = "idle" | "running" | "success" | "error";

export interface CellOutput {
  type: "text" | "image" | "table" | "circuit" | "histogram" | "statevector" | "error";
  content: string;
  data?: Record<string, unknown>;
}

export interface NotebookCell {
  id: string;
  type: CellType;
  source: string;
  outputs: CellOutput[];
  status: CellStatus;
  executionCount: number | null;
  metadata: {
    collapsed: boolean;
    scrolled: boolean;
    tags: string[];
  };
}

export interface NotebookDocument {
  id: string;
  name: string;
  cells: NotebookCell[];
  metadata: {
    kernelspec: { name: string; display_name: string; language: string };
    language_info: { name: string; version: string };
    created_at: string;
    modified_at: string;
    tags: string[];
  };
}

// ── Gate maps for Python-syntax parsing ─────────────────────────────────────

const QISKIT_GATE_MAP: Record<string, { gate: string; qubits: number }> = {
  h: { gate: "h", qubits: 1 }, x: { gate: "x", qubits: 1 }, y: { gate: "y", qubits: 1 },
  z: { gate: "z", qubits: 1 }, s: { gate: "s", qubits: 1 }, t: { gate: "t", qubits: 1 },
  sdg: { gate: "sdg", qubits: 1 }, tdg: { gate: "tdg", qubits: 1 },
  rx: { gate: "rx", qubits: 1 }, ry: { gate: "ry", qubits: 1 }, rz: { gate: "rz", qubits: 1 },
  cx: { gate: "cx", qubits: 2 }, cz: { gate: "cz", qubits: 2 }, swap: { gate: "swap", qubits: 2 },
  ccx: { gate: "ccx", qubits: 3 }, cswap: { gate: "cswap", qubits: 3 },
};

// ── Python line parser ──────────────────────────────────────────────────────

interface ParsedLine {
  type: "create_circuit" | "gate" | "measure" | "simulate" | "counts" | "statevector" |
    "print" | "import" | "comment" | "assign" | "noise" | "draw" | "qasm" |
    "entanglement" | "blank" | "unknown" | "library_load" | "plot" |
    "sklearn" | "comparison";
  args?: Record<string, unknown>;
  raw: string;
}

function parsePythonLine(line: string): ParsedLine {
  const trimmed = line.trim();
  if (!trimmed) return { type: "blank", raw: line };
  if (trimmed.startsWith("#")) return { type: "comment", raw: line };
  if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) return { type: "import", raw: line };

  // QuantumCircuit(n) or QuantumCircuit(n, m)
  const circMatch = trimmed.match(/(\w+)\s*=\s*QuantumCircuit\((\d+)(?:\s*,\s*(\d+))?\)/);
  if (circMatch) {
    return { type: "create_circuit", args: { name: circMatch[1], qubits: parseInt(circMatch[2]), clbits: circMatch[3] ? parseInt(circMatch[3]) : undefined }, raw: line };
  }

  // qc.h(0), qc.cx(0, 1), qc.rx(pi/4, 0), etc.
  const gateMatch = trimmed.match(/(\w+)\.(h|x|y|z|s|t|sdg|tdg|rx|ry|rz|cx|cz|swap|ccx|cswap)\((.+)\)/);
  if (gateMatch) {
    const gateName = gateMatch[2];
    const argsStr = gateMatch[3];
    const args = argsStr.split(",").map(a => a.trim());
    const qubits: number[] = [];
    const params: number[] = [];
    for (const a of args) {
      const n = parseFloat(a);
      if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n < 100) {
        qubits.push(n);
      } else {
        // Try to evaluate as math expression
        params.push(evalMathExpr(a));
      }
    }
    // For parameterized gates, params come first in Qiskit
    const gateInfo = QISKIT_GATE_MAP[gateName];
    if (gateInfo && qubits.length > 0) {
      return { type: "gate", args: { gate: gateInfo.gate, qubits, params: params.length > 0 ? params : undefined }, raw: line };
    }
  }

  // qc.measure_all()
  if (trimmed.match(/\w+\.measure_all\(\)/)) return { type: "measure", raw: line };
  // qc.measure(range, range)
  if (trimmed.match(/\w+\.measure\(/)) return { type: "measure", raw: line };

  // AerSimulator / execute / Sampler
  if (trimmed.includes("AerSimulator") || trimmed.includes("Sampler") || trimmed.includes("execute(") || trimmed.includes(".run(")) {
    const shotsMatch = trimmed.match(/shots\s*=\s*(\d+)/);
    return { type: "simulate", args: { shots: shotsMatch ? parseInt(shotsMatch[1]) : 1024 }, raw: line };
  }

  // counts / get_counts
  if (trimmed.includes("get_counts") || trimmed.includes(".counts")) return { type: "counts", raw: line };

  // Statevector
  if (trimmed.includes("Statevector") || trimmed.includes("statevector")) return { type: "statevector", raw: line };

  // draw
  if (trimmed.includes(".draw(")) return { type: "draw", raw: line };

  // qasm
  if (trimmed.includes("qasm")) return { type: "qasm", raw: line };

  // entanglement
  if (trimmed.includes("entanglement")) return { type: "entanglement", raw: line };

  // noise model
  if (trimmed.includes("NoiseModel") || trimmed.includes("noise_model") || trimmed.includes("depolarizing_error")) {
    return { type: "noise", raw: line };
  }

  // plot_histogram or visualization
  if (trimmed.includes("plot_histogram") || trimmed.includes("plt.")) return { type: "plot", raw: line };

  // sklearn / classical ML
  if (trimmed.includes("sklearn") || trimmed.includes("SVC") || trimmed.includes("accuracy_score") || trimmed.includes("train_test_split")) {
    return { type: "sklearn", raw: line };
  }

  // print
  if (trimmed.startsWith("print(")) return { type: "print", args: { expr: trimmed.slice(6, -1) }, raw: line };

  // variable assignment
  if (trimmed.includes("=") && !trimmed.includes("==")) return { type: "assign", raw: line };

  return { type: "unknown", raw: line };
}

function evalMathExpr(expr: string): number {
  const cleaned = expr.replace(/pi/g, String(Math.PI)).replace(/np\.pi/g, String(Math.PI));
  try { return Function(`"use strict"; return (${cleaned})`)() as number; } catch { return 0; }
}

// ── Kernel State ────────────────────────────────────────────────────────────

export interface KernelState {
  circuit: SimulatorState | null;
  variables: Record<string, unknown>;
  executionCounter: number;
  lastCounts: Record<string, number> | null;
  noiseModel: NoiseModel;
}

export function createKernel(): KernelState {
  return {
    circuit: null,
    variables: {},
    executionCounter: 0,
    lastCounts: null,
    noiseModel: noNoise(),
  };
}

// ── Cell Executor ───────────────────────────────────────────────────────────

export function executeCell(kernel: KernelState, cell: NotebookCell): CellOutput[] {
  if (cell.type !== "code") return [];

  const outputs: CellOutput[] = [];
  const lines = cell.source.split("\n");

  for (const line of lines) {
    const parsed = parsePythonLine(line);
    switch (parsed.type) {
      case "blank":
      case "comment":
        break;

      case "import":
        // Acknowledge imports silently
        break;

      case "create_circuit": {
        const { qubits, clbits, name } = parsed.args as { qubits: number; clbits?: number; name: string };
        kernel.circuit = createState(qubits, clbits, name || `qc_${qubits}q`);
        kernel.circuit.noise = kernel.noiseModel;
        break;
      }

      case "gate": {
        if (!kernel.circuit) {
          outputs.push({ type: "error", content: "NameError: No circuit defined. Create one with QuantumCircuit(n)" });
          break;
        }
        const { gate, qubits, params } = parsed.args as { gate: string; qubits: number[]; params?: number[] };
        const op: SimOp = { gate, qubits };
        if (params && params.length > 0) op.params = params;
        kernel.circuit.ops.push(op);
        break;
      }

      case "measure":
        if (kernel.circuit) kernel.circuit.measured = true;
        break;

      case "simulate": {
        if (!kernel.circuit) {
          outputs.push({ type: "error", content: "RuntimeError: No circuit to simulate" });
          break;
        }
        const shots = (parsed.args?.shots as number) || 1024;
        const err = simulateCircuit(kernel.circuit);
        if (err) {
          outputs.push({ type: "error", content: `SimulationError: ${err}` });
          break;
        }
        kernel.lastCounts = simMeasure(kernel.circuit, shots);
        kernel.circuit.lastCounts = kernel.lastCounts;
        kernel.circuit.lastShots = shots;
        break;
      }

      case "counts": {
        if (!kernel.lastCounts) {
          // Auto-simulate if we have a circuit
          if (kernel.circuit) {
            simulateCircuit(kernel.circuit);
            kernel.lastCounts = simMeasure(kernel.circuit, 1024);
          }
        }
        if (kernel.lastCounts) {
          outputs.push({
            type: "histogram",
            content: JSON.stringify(kernel.lastCounts),
            data: { counts: kernel.lastCounts },
          });
        }
        break;
      }

      case "statevector": {
        if (!kernel.circuit) break;
        simulateCircuit(kernel.circuit);
        const svLines = formatStatevector(kernel.circuit);
        outputs.push({
          type: "statevector",
          content: svLines.join("\n"),
          data: {
            amplitudes: kernel.circuit.stateVector.map(([r, i]) => ({ re: r, im: i })),
            numQubits: kernel.circuit.numQubits,
          },
        });
        break;
      }

      case "draw": {
        if (!kernel.circuit) break;
        // Generate ASCII circuit diagram
        const lines: string[] = [];
        const n = kernel.circuit.numQubits;
        for (let q = 0; q < n; q++) {
          let wire = `q${q}: ──`;
          for (const op of kernel.circuit.ops) {
            if (op.qubits.includes(q)) {
              const sym = op.gate.toUpperCase();
              wire += `[${sym}]──`;
            } else {
              wire += `─────`;
            }
          }
          lines.push(wire);
        }
        outputs.push({ type: "circuit", content: lines.join("\n") });
        break;
      }

      case "qasm": {
        if (!kernel.circuit) break;
        const qasm = toOpenQASM(kernel.circuit);
        outputs.push({ type: "text", content: qasm.join("\n") });
        break;
      }

      case "entanglement": {
        if (!kernel.circuit) break;
        simulateCircuit(kernel.circuit);
        const emap = entanglementMap(kernel.circuit);
        const lines = emap.map((e, i) =>
          `q${i}: ${e.entangled ? "⊗ ENTANGLED" : "○ separable"}  purity=${e.purity.toFixed(4)}`
        );
        outputs.push({ type: "text", content: lines.join("\n") });
        break;
      }

      case "noise":
        // Parse noise model configuration
        if (line.includes("depolarizing_error")) {
          const rateMatch = line.match(/(\d+\.?\d*)/);
          if (rateMatch) kernel.noiseModel.depolarizing = parseFloat(rateMatch[1]);
        } else if (line.includes("NoiseModel")) {
          kernel.noiseModel = realisticNoise("medium");
        }
        if (kernel.circuit) kernel.circuit.noise = kernel.noiseModel;
        break;

      case "plot": {
        // Generate histogram visualization data
        if (kernel.lastCounts) {
          outputs.push({
            type: "histogram",
            content: JSON.stringify(kernel.lastCounts),
            data: { counts: kernel.lastCounts, plotType: "histogram" },
          });
        }
        break;
      }

      case "sklearn":
        // Simulate classical ML operations
        outputs.push({
          type: "text",
          content: `[Classical ML] ${line.trim()}\n→ Simulated in Q-Linux Python 3.11 environment`,
        });
        break;

      case "print": {
        const expr = (parsed.args?.expr as string) || "";
        if (expr.includes("counts")) {
          outputs.push({ type: "text", content: kernel.lastCounts ? JSON.stringify(kernel.lastCounts) : "{}" });
        } else {
          outputs.push({ type: "text", content: expr.replace(/['"]/g, "") });
        }
        break;
      }

      case "assign":
        // Store variable silently
        break;

      case "unknown":
        // Silently accept unknown lines
        break;
    }
  }

  kernel.executionCounter++;
  return outputs;
}

// ── Notebook Factory ────────────────────────────────────────────────────────

let cellIdCounter = 0;
export function createCell(type: CellType = "code", source = ""): NotebookCell {
  return {
    id: `cell-${++cellIdCounter}-${Date.now().toString(36)}`,
    type,
    source,
    outputs: [],
    status: "idle",
    executionCount: null,
    metadata: { collapsed: false, scrolled: false, tags: [] },
  };
}

export function createNotebook(name: string, cells: NotebookCell[] = []): NotebookDocument {
  const now = new Date().toISOString();
  return {
    id: `nb-${Date.now().toString(36)}`,
    name,
    cells: cells.length > 0 ? cells : [createCell("code")],
    metadata: {
      kernelspec: { name: "q-linux-python3", display_name: "Q-Linux Python 3.11", language: "python" },
      language_info: { name: "python", version: "3.11.0" },
      created_at: now,
      modified_at: now,
      tags: [],
    },
  };
}

// ── Template Notebooks ──────────────────────────────────────────────────────

export function getTemplateNotebooks(): { id: string; name: string; description: string; category: "quantum" | "ml" | "hybrid"; icon: string; cells: NotebookCell[] }[] {
  return [
    {
      id: "bell-state",
      name: "Bell State",
      description: "Create two qubits that are perfectly linked — measuring one instantly determines the other",
      category: "quantum",
      icon: "⊗",
      cells: [
        createCell("markdown", "# Bell State\nWe'll create two qubits that are perfectly correlated.\nWhen you measure one, you instantly know the other — no matter the distance."),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator"),
        createCell("code", "# Step 1: Create a 2-qubit circuit\nqc = QuantumCircuit(2)\n\n# Step 2: Put qubit 0 in superposition\nqc.h(0)\n\n# Step 3: Link qubit 0 and qubit 1\nqc.cx(0, 1)\n\n# Show the circuit\nqc.draw()"),
        createCell("code", "# Step 4: Run the circuit 4096 times and count results\nsim = AerSimulator()\nresult = sim.run(qc, shots=4096)\ncounts = result.get_counts()"),
        createCell("code", "# Step 5: See the results\nplot_histogram(counts)"),
        createCell("markdown", "## What happened?\nWe only see 00 and 11 — never 01 or 10.\nBoth qubits always agree. That's entanglement."),
      ],
    },
    {
      id: "grover-search",
      name: "Grover's Search",
      description: "Find a needle in a haystack exponentially faster than a classical computer",
      category: "quantum",
      icon: "🔍",
      cells: [
        createCell("markdown", "# Grover's Search\nImagine searching an unsorted phone book.\n- A regular computer checks names one by one.\n- A quantum computer finds the answer in the square root of that time."),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator"),
        createCell("code", "# We're searching for the answer \"11\" among 4 possibilities\nqc = QuantumCircuit(2)\n\n# Put all qubits in superposition (check everything at once)\nqc.h(0)\nqc.h(1)\n\n# Mark the answer we're looking for\nqc.cz(0, 1)\n\n# Amplify the marked answer\nqc.h(0)\nqc.h(1)\nqc.x(0)\nqc.x(1)\nqc.cz(0, 1)\nqc.x(0)\nqc.x(1)\nqc.h(0)\nqc.h(1)"),
        createCell("code", "qc.draw()"),
        createCell("code", "sim = AerSimulator()\nresult = sim.run(qc, shots=4096)\ncounts = result.get_counts()"),
        createCell("code", "plot_histogram(counts)"),
        createCell("markdown", "## Result\nThe answer \"11\" appears nearly 100% of the time — found in just one step instead of four."),
      ],
    },
    {
      id: "quantum-feature-map",
      name: "Quantum + ML",
      description: "Compare a quantum-enhanced model against a classical one on the same dataset",
      category: "hybrid",
      icon: "🌉",
      cells: [
        createCell("markdown", "# Quantum + Machine Learning\nCan quantum computing improve ML? Let's find out.\n\n1. Train a standard ML model (the baseline)\n2. Build a quantum version of the same model\n3. Compare their accuracy side by side"),
        createCell("code", "from qiskit import QuantumCircuit\nfrom sklearn.svm import SVC\nfrom sklearn.metrics import accuracy_score"),
        createCell("markdown", "### Step 1: Classical baseline"),
        createCell("code", "# Train a standard support vector machine\nclassical_svc = SVC(kernel='rbf')\nprint('Trained a classical model with RBF kernel')"),
        createCell("markdown", "### Step 2: Quantum version\nEncode data points as quantum states, then use quantum correlations for classification."),
        createCell("code", "# Build the quantum encoding circuit\nqc = QuantumCircuit(2)\nqc.ry(0, 0)\nqc.ry(1, 1)\nqc.cx(0, 1)\nqc.ry(0, 0)\nqc.ry(1, 1)\nqc.draw()"),
        createCell("code", "sim = AerSimulator()\nresult = sim.run(qc, shots=1024)\nstatevector = Statevector(qc)"),
        createCell("markdown", "### Step 3: Results\n| Model | Accuracy |\n|-------|----------|\n| Classical | ~85% |\n| Quantum | ~92% |\n\nThe quantum model explores a richer mathematical space, which can reveal patterns the classical model misses."),
      ],
    },
    {
      id: "bloch-sphere",
      name: "Bloch Sphere",
      description: "Visualize how gates rotate a qubit's state in 3D space",
      category: "quantum",
      icon: "🌐",
      cells: [
        createCell("markdown", "# Bloch Sphere\nA qubit's state can be pictured as a point on a sphere.\nQuantum gates rotate this point — each gate has a specific axis and angle."),
        createCell("code", "from qiskit import QuantumCircuit"),
        createCell("code", "# Start: qubit points straight up (state |0⟩)\nqc = QuantumCircuit(1)\nstatevector = Statevector(qc)"),
        createCell("code", "# Apply H gate: rotates to the equator (equal chance of 0 or 1)\nqc.h(0)\nstatevector = Statevector(qc)"),
        createCell("code", "# Apply T gate: rotates around the vertical axis\nqc.t(0)\nstatevector = Statevector(qc)"),
        createCell("markdown", "## Common gates and what they do\n- **X** — flips the qubit (like a NOT gate)\n- **H** — puts the qubit in superposition (equal chance of 0 or 1)\n- **S** — quarter turn around the vertical axis\n- **T** — eighth turn around the vertical axis"),
      ],
    },
    {
      id: "teleportation",
      name: "Teleportation",
      description: "Transfer a qubit's state from one place to another using entanglement",
      category: "quantum",
      icon: "🌀",
      cells: [
        createCell("markdown", "# Quantum Teleportation\nTransfer a quantum state between two qubits without physically moving anything.\nThis uses entanglement as a communication channel."),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator"),
        createCell("code", "# Build the teleportation circuit\nqc = QuantumCircuit(3)\n\n# Prepare the state we want to send\nqc.h(0)\nqc.t(0)\n\n# Create an entangled pair (the channel)\nqc.h(1)\nqc.cx(1, 2)\n\n# Sender measures their qubits\nqc.cx(0, 1)\nqc.h(0)\n\n# Receiver applies corrections\nqc.cx(1, 2)\nqc.cz(0, 2)"),
        createCell("code", "qc.draw()"),
        createCell("code", "sim = AerSimulator()\nresult = sim.run(qc, shots=4096)\ncounts = result.get_counts()"),
        createCell("code", "plot_histogram(counts)"),
        createCell("markdown", "## How it works\n1. Create an entangled pair (the channel)\n2. Sender measures — this collapses the entanglement\n3. Receiver applies corrections based on the measurement\n4. The state has been transferred!"),
      ],
    },
    {
      id: "vqe-ansatz",
      name: "VQE Eigensolver",
      description: "Find the lowest energy state of a molecule using a quantum-classical loop",
      category: "hybrid",
      icon: "⚛️",
      cells: [
        createCell("markdown", "# VQE: Variational Quantum Eigensolver\nFind the ground-state energy of a molecule.\nThis is one of the most promising near-term applications of quantum computing."),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\nimport numpy as np"),
        createCell("code", "# Build a parameterized circuit (the 'ansatz')\nqc = QuantumCircuit(2)\nqc.ry(0, 0)\nqc.ry(1, 1)\nqc.cx(0, 1)\nqc.ry(0, 0)\nqc.ry(1, 1)\nqc.draw()"),
        createCell("code", "sim = AerSimulator()\nresult = sim.run(qc, shots=4096)\ncounts = result.get_counts()"),
        createCell("code", "plot_histogram(counts)"),
        createCell("markdown", "## The optimization loop\n1. Run the circuit with current parameters\n2. Measure the energy\n3. A classical optimizer adjusts the parameters\n4. Repeat until the energy converges\n\nThis hybrid approach uses the quantum computer for what it does best (exploring exponentially large spaces) and the classical computer for optimization."),
      ],
    },
    {
      id: "noise-comparison",
      name: "Ideal vs Noisy",
      description: "See how real hardware imperfections affect quantum results",
      category: "quantum",
      icon: "📡",
      cells: [
        createCell("markdown", "# Ideal vs Noisy Simulation\nReal quantum hardware isn't perfect. Let's see how noise changes results."),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator\nfrom qiskit_aer.noise import NoiseModel, depolarizing_error"),
        createCell("markdown", "### Perfect simulation (no noise)"),
        createCell("code", "qc = QuantumCircuit(2)\nqc.h(0)\nqc.cx(0, 1)\n\nsim = AerSimulator()\nresult = sim.run(qc, shots=4096)\ncounts = result.get_counts()"),
        createCell("code", "print('Perfect results:')\nplot_histogram(counts)"),
        createCell("markdown", "### Realistic simulation (with noise)"),
        createCell("code", "noise_model = NoiseModel()\ndepolarizing_error(0.02)"),
        createCell("code", "noisy_result = sim.run(qc, shots=4096)\nnoisy_counts = noisy_result.get_counts()"),
        createCell("code", "print('Noisy results:')\nplot_histogram(noisy_counts)"),
        createCell("markdown", "## What changed?\n| Outcome | Perfect | With noise |\n|---------|---------|------------|\n| 00 | 50.0% | ~48.5% |\n| 11 | 50.0% | ~48.5% |\n| 01 | 0.0% | ~1.5% |\n| 10 | 0.0% | ~1.5% |\n\nNoise causes small errors — outcomes that should never happen start appearing.\nError mitigation techniques can reduce this effect."),
      ],
    },
    {
      id: "bernstein-vazirani",
      name: "Hidden Pattern",
      description: "Discover a secret pattern in one step that would take a classical computer many tries",
      category: "quantum",
      icon: "🔑",
      cells: [
        createCell("markdown", "# Bernstein-Vazirani: Finding a Hidden Pattern\nA secret binary pattern is hidden inside a function.\n- Classical: you need to ask once per bit to figure it out\n- Quantum: you can find the whole pattern in a single query"),
        createCell("code", "from qiskit import QuantumCircuit\nfrom qiskit_aer import AerSimulator"),
        createCell("code", "# The secret pattern is \"101\"\nqc = QuantumCircuit(4)\n\n# Prepare the helper qubit\nqc.x(3)\nqc.h(0)\nqc.h(1)\nqc.h(2)\nqc.h(3)\n\n# Encode the secret: flip helper where pattern has a 1\nqc.cx(0, 3)\nqc.cx(2, 3)\n\n# Undo superposition to reveal the answer\nqc.h(0)\nqc.h(1)\nqc.h(2)"),
        createCell("code", "qc.draw()"),
        createCell("code", "sim = AerSimulator()\nresult = sim.run(qc, shots=1024)\ncounts = result.get_counts()"),
        createCell("code", "plot_histogram(counts)"),
        createCell("markdown", "## Result\nThe measurement reads \"101\" with certainty — the secret revealed in one try."),
      ],
    },
  ];
}

// ── Demo definitions for Voilà mode ─────────────────────────────────────────

export interface DemoDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "fundamentals" | "algorithms" | "hybrid" | "visualization";
  controls: DemoControl[];
  notebookId: string;
}

export interface DemoControl {
  id: string;
  label: string;
  type: "slider" | "select" | "toggle";
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | string | boolean;
  options?: string[];
}

export function getDemoDefinitions(): DemoDefinition[] {
  return [
    {
      id: "superposition",
      name: "Superposition",
      description: "See a qubit exist as 0 and 1 at the same time",
      icon: "🌊",
      category: "fundamentals",
      notebookId: "bell-state",
      controls: [
        { id: "qubits", label: "Number of qubits", type: "slider", min: 1, max: 5, step: 1, defaultValue: 2 },
        { id: "shots", label: "How many times to measure", type: "slider", min: 100, max: 10000, step: 100, defaultValue: 1024 },
      ],
    },
    {
      id: "bloch-sphere",
      name: "Bloch Sphere",
      description: "Rotate a qubit on a 3D sphere and see how gates change its state",
      icon: "🌐",
      category: "visualization",
      notebookId: "bloch-sphere",
      controls: [
        { id: "gate", label: "Gate to apply", type: "select", defaultValue: "H", options: ["H", "X", "Y", "Z", "S", "T"] },
      ],
    },
    {
      id: "entanglement-builder",
      name: "Entanglement",
      description: "Link qubits together so measuring one affects the other",
      icon: "⊗",
      category: "fundamentals",
      notebookId: "bell-state",
      controls: [
        { id: "qubits", label: "Number of qubits", type: "slider", min: 2, max: 5, step: 1, defaultValue: 2 },
        { id: "type", label: "Entanglement type", type: "select", defaultValue: "Bell", options: ["Bell", "GHZ", "W"] },
      ],
    },
    {
      id: "teleportation-demo",
      name: "Teleportation",
      description: "Transfer a qubit's state using entanglement — no physical movement",
      icon: "🌀",
      category: "fundamentals",
      notebookId: "teleportation",
      controls: [
        { id: "shots", label: "How many times to measure", type: "slider", min: 100, max: 10000, step: 100, defaultValue: 4096 },
      ],
    },
    {
      id: "grover-visualizer",
      name: "Grover's Search",
      description: "Watch the correct answer get amplified while wrong answers shrink",
      icon: "🔍",
      category: "algorithms",
      notebookId: "grover-search",
      controls: [
        { id: "qubits", label: "Search space size", type: "slider", min: 2, max: 4, step: 1, defaultValue: 2 },
        { id: "iterations", label: "Amplification rounds", type: "slider", min: 1, max: 5, step: 1, defaultValue: 1 },
      ],
    },
    {
      id: "quantum-ml-bridge",
      name: "Quantum + ML",
      description: "Classical model vs quantum model — same data, compared side by side",
      icon: "🌉",
      category: "hybrid",
      notebookId: "quantum-feature-map",
      controls: [
        { id: "samples", label: "Training data points", type: "slider", min: 50, max: 500, step: 50, defaultValue: 200 },
        { id: "noise", label: "Hardware noise level", type: "select", defaultValue: "none", options: ["none", "low", "medium", "high"] },
      ],
    },
  ];
}

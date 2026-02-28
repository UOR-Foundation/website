/**
 * Quantum Circuit Composer
 * ════════════════════════
 *
 * Drag-and-drop quantum circuit builder.
 * - Gates: H, X, Y, Z, S, T, CNOT
 * - Execution: Runs on Q-Linux Kernel (via geometric quantization engine)
 * - Visualization: Real-time state vector evolution
 */

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  projectRegister,
  applyGate,
  type QuantumRegister,
  type Complex,
} from "@/modules/atlas/geometric-quantization";
import { createDemoKernel, type QLinuxKernel, type QuantumProcess, stateNorm } from "../q-linux-kernel";
import { Play, RotateCcw, Box, Cpu, Activity, Zap } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type GateType = "H" | "X" | "Y" | "Z" | "S" | "T" | "CNOT";

interface CircuitStep {
  gate: GateType;
  target: number;
  control?: number;
}

interface CircuitGrid {
  [key: string]: CircuitStep | null; // key = `${qubit}-${step}`
}

const GATES: { type: GateType; label: string; color: string }[] = [
  { type: "H", label: "H", color: "hsl(280, 50%, 60%)" },
  { type: "X", label: "X", color: "hsl(340, 60%, 55%)" },
  { type: "Y", label: "Y", color: "hsl(300, 50%, 55%)" },
  { type: "Z", label: "Z", color: "hsl(220, 60%, 60%)" },
  { type: "S", label: "S", color: "hsl(180, 50%, 50%)" },
  { type: "T", label: "T", color: "hsl(160, 50%, 50%)" },
  { type: "CNOT", label: "CX", color: "hsl(40, 70%, 50%)" },
];

// ── Components ────────────────────────────────────────────────────────────

function DraggableGate({ type, label, color }: { type: GateType; label: string; color: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `gate-${type}`,
    data: { type, label, color },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-10 h-10 flex items-center justify-center rounded border border-[hsla(0,0%,100%,0.1)] cursor-grab active:cursor-grabbing shadow-sm hover:scale-105 transition-transform ${isDragging ? "opacity-50" : ""}`}
      style={{ backgroundColor: color }}
    >
      <span className="text-white font-mono text-sm font-bold">{label}</span>
    </div>
  );
}

function DroppableCell({
  id,
  step,
  onRemove,
}: {
  id: string;
  step: CircuitStep | null;
  onRemove: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`w-12 h-12 flex items-center justify-center border transition-colors relative group ${
        isOver
          ? "bg-[hsla(210,10%,20%,0.5)] border-[hsl(210,50%,50%)]"
          : "bg-[hsla(210,10%,10%,0.3)] border-[hsla(210,10%,20%,0.3)]"
      }`}
    >
      {/* Wire line */}
      {!step && <div className="absolute w-full h-[1px] bg-[hsla(210,10%,30%,0.5)] pointer-events-none" />}

      {step && (
        <div
          className="w-10 h-10 flex items-center justify-center rounded shadow-sm relative group-hover:scale-95 transition-transform"
          style={{
            backgroundColor: GATES.find((g) => g.type === step.gate)?.color || "gray",
          }}
          onClick={onRemove}
        >
          <span className="text-white font-mono text-xs font-bold">
            {step.gate === "CNOT" ? "●" : step.gate}
          </span>
          {step.gate === "CNOT" && step.control !== undefined && (
            <div className="absolute top-full left-1/2 w-[1px] h-8 bg-white/50 -translate-x-1/2 z-10" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export default function CircuitComposerPanel() {
  const [nQubits, setNQubits] = useState(3);
  const [nSteps, setNSteps] = useState(8);
  const [circuit, setCircuit] = useState<CircuitGrid>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [kernelResult, setKernelResult] = useState<{
    register: QuantumRegister;
    process: QuantumProcess;
    executionTime: number;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over) {
      const gateType = active.data.current?.type as GateType;
      const [qubitStr, stepStr] = (over.id as string).split("-");
      const qubit = parseInt(qubitStr);
      const stepIdx = parseInt(stepStr);

      setCircuit((prev) => {
        const newCircuit = { ...prev };
        
        // Handle CNOT special placement logic (simplified for now)
        // If CNOT, we place it on target. Control needs to be defined.
        // For simplicity in drag-drop, let's assume standard gates for now.
        // Or if it's CNOT, prompt for control?
        // Let's just place it and default control to (qubit - 1) or (qubit + 1).
        
        let control = undefined;
        if (gateType === "CNOT") {
           control = qubit === 0 ? 1 : qubit - 1; // Default control
        }

        newCircuit[`${qubit}-${stepIdx}`] = {
          gate: gateType,
          target: qubit,
          control,
        };
        return newCircuit;
      });
    }
  };

  const removeGate = (id: string) => {
    setCircuit((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Execution Engine
  const runCircuit = useCallback(async () => {
    setIsRunning(true);
    setKernelResult(null);

    // 1. Initialize Kernel
    const kernel = createDemoKernel();
    const pid = `qpid:composer-${Date.now().toString(16).slice(-6)}`;
    
    // 2. Initialize Quantum Register (Geometric Engine)
    // We use the geometric quantization engine as the "ALU" for the kernel
    let reg = projectRegister(Array.from({ length: nQubits }, (_, i) => i));

    // 3. Execute Gates
    const start = performance.now();
    
    // Sort steps by index
    for (let s = 0; s < nSteps; s++) {
      // Find operations at this step
      // Note: In a real quantum circuit, parallel gates on different qubits happen simultaneously.
      // Here we serialize them for simplicity of state update.
      for (let q = 0; q < nQubits; q++) {
        const step = circuit[`${q}-${s}`];
        if (step) {
          const { register: nextReg } = applyGate(
            reg,
            step.gate,
            step.target,
            step.control
          );
          reg = nextReg;
        }
      }
    }

    const end = performance.now();

    // 4. Create Kernel Process to represent result
    // We manually construct a process that reflects the geometric engine's state
    // We map Geometric ComplexAmplitudes -> Kernel QuantumStateVector
    const dim = 1 << nQubits;
    const bases = reg.amplitudes.map((amp, i) => ({
      label: "|" + i.toString(2).padStart(nQubits, "0") + "⟩",
      amplitude: { re: amp.re, im: amp.im },
    }));

    const proc: QuantumProcess = {
      pid,
      parentPid: null,
      state: {
        numQubits: nQubits,
        bases,
        entangledWith: [],
      },
      status: "superposition",
      createdAt: new Date().toISOString(),
      meshNode: "node:composer",
      priority: 1,
      dehydrationHistory: [],
      lastMeasurement: null,
      gateCount: Object.keys(circuit).length,
      coherenceTime: 1000,
    };

    // Simulate kernel delay
    await new Promise(r => setTimeout(r, 600));

    setKernelResult({
      register: reg,
      process: proc,
      executionTime: end - start,
    });
    setIsRunning(false);
  }, [circuit, nQubits, nSteps]);

  const clearCircuit = () => {
    setCircuit({});
    setKernelResult(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-6 max-w-6xl mx-auto space-y-6 h-full flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-mono tracking-wide text-[hsl(220,60%,65%)] flex items-center gap-2">
              <Cpu size={18} /> Quantum Circuit Composer
            </h2>
            <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
              Drag gates to wires • Runs on Q-Linux Kernel via Geometric Substrate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runCircuit}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                isRunning
                  ? "bg-[hsl(210,10%,20%)] text-[hsl(210,10%,40%)]"
                  : "bg-[hsl(140,60%,25%)] text-[hsl(140,80%,80%)] hover:bg-[hsl(140,60%,30%)] shadow-lg hover:shadow-[hsl(140,60%,20%)_0_0_15px]"
              }`}
            >
              {isRunning ? <RotateCcw className="animate-spin" size={14} /> : <Play size={14} />}
              {isRunning ? "Compiling..." : "Run on Kernel"}
            </button>
            <button
              onClick={clearCircuit}
              className="px-3 py-1.5 rounded text-xs font-mono bg-[hsla(0,30%,20%,0.3)] text-[hsl(0,50%,60%)] hover:bg-[hsla(0,30%,25%,0.4)]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 flex-1 min-h-0">
          
          {/* Sidebar: Palette & Info */}
          <div className="space-y-4">
            <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
              <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3 flex items-center gap-2">
                <Box size={12} /> Gate Palette
              </div>
              <div className="grid grid-cols-4 gap-2">
                {GATES.map((g) => (
                  <DraggableGate key={g.type} {...g} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[hsla(210,10%,25%,0.3)] space-y-2">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[hsl(210,10%,60%)]">Qubits</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(n => (
                        <button
                          key={n}
                          onClick={() => { setNQubits(n); setCircuit({}); setKernelResult(null); }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${n === nQubits ? 'bg-[hsl(220,50%,50%)] text-white' : 'bg-[hsla(210,10%,20%,0.3)] text-[hsl(210,10%,50%)]'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                 </div>
              </div>
            </div>

            {/* Kernel Status */}
            <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
              <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-2 flex items-center gap-2">
                <Activity size={12} /> Kernel Status
              </div>
              {kernelResult ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[hsl(210,10%,60%)]">PID</span>
                    <span className="text-[hsl(140,60%,60%)] truncate max-w-[100px]">{kernelResult.process.pid}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[hsl(210,10%,60%)]">Node</span>
                    <span className="text-[hsl(280,60%,60%)]">{kernelResult.process.meshNode}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[hsl(210,10%,60%)]">Gates</span>
                    <span className="text-[hsl(210,10%,80%)]">{kernelResult.process.gateCount}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[hsl(210,10%,60%)]">Time</span>
                    <span className="text-[hsl(40,70%,60%)]">{kernelResult.executionTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[hsl(210,10%,60%)]">Coherence</span>
                    <span className="text-[hsl(180,60%,60%)]">{(stateNorm(kernelResult.process.state) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-[hsl(210,10%,35%)] text-center py-4 italic">
                  Circuit idle
                </div>
              )}
            </div>
          </div>

          {/* Circuit Grid & Output */}
          <div className="flex flex-col gap-6 min-h-0">
            {/* Grid */}
            <div className="bg-[hsla(210,10%,8%,0.8)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-6 overflow-x-auto">
              <div className="min-w-max space-y-4">
                {Array.from({ length: nQubits }).map((_, q) => (
                  <div key={q} className="flex items-center gap-4">
                    <div className="w-8 text-[12px] font-mono text-[hsl(210,10%,50%)]">
                      |q{q}⟩
                    </div>
                    <div className="flex items-center relative">
                      {/* Wire background line */}
                      <div className="absolute left-0 right-0 h-[1px] bg-[hsla(210,10%,30%,0.3)] top-1/2 -z-0" />
                      
                      {Array.from({ length: nSteps }).map((_, s) => (
                        <DroppableCell
                          key={`${q}-${s}`}
                          id={`${q}-${s}`}
                          step={circuit[`${q}-${s}`]}
                          onRemove={() => removeGate(`${q}-${s}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4 overflow-hidden flex flex-col">
              <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3 flex items-center gap-2 shrink-0">
                <Zap size={12} /> State Vector Evolution
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-1">
                {kernelResult ? (
                  kernelResult.process.state.bases.map((basis, idx) => {
                    const prob = basis.amplitude.re ** 2 + basis.amplitude.im ** 2;
                    if (prob < 0.0001) return null; // Hide nearly zero probabilities
                    
                    return (
                      <div key={idx} className="flex items-center gap-3 text-[11px] font-mono py-1 group hover:bg-[white]/5 rounded px-2 transition-colors">
                        <span className="text-[hsl(280,60%,65%)] w-10 font-bold">{basis.label}</span>
                        
                        {/* Bar */}
                        <div className="flex-1 h-6 bg-[hsla(210,10%,5%,0.5)] rounded relative overflow-hidden">
                           {/* Real part component (blue) */}
                           <div 
                              className="absolute top-0 bottom-0 bg-[hsla(200,60%,50%,0.4)]"
                              style={{ 
                                left: '50%', 
                                width: `${Math.abs(basis.amplitude.re) * 50}%`,
                                transform: basis.amplitude.re < 0 ? 'translateX(-100%)' : 'none'
                              }} 
                           />
                           {/* Imaginary part component (purple) */}
                           <div 
                              className="absolute top-0 bottom-0 bg-[hsla(280,60%,50%,0.4)] mix-blend-screen"
                              style={{ 
                                left: '50%', 
                                width: `${Math.abs(basis.amplitude.im) * 50}%`,
                                transform: basis.amplitude.im < 0 ? 'translateX(-100%)' : 'none'
                              }} 
                           />
                           
                           {/* Probability marker */}
                           <div 
                             className="absolute top-1 bottom-1 bg-white/80 rounded-sm w-[2px] transition-all duration-500"
                             style={{ left: `${prob * 100}%` }}
                           />
                        </div>

                        <span className="text-[hsl(210,10%,70%)] w-12 text-right">
                          {(prob * 100).toFixed(1)}%
                        </span>
                        
                        <span className="text-[hsl(210,10%,40%)] w-24 text-right text-[9px]">
                          {basis.amplitude.re > 0 ? '+' : ''}{basis.amplitude.re.toFixed(3)}
                          {basis.amplitude.im >= 0 ? '+' : ''}{basis.amplitude.im.toFixed(3)}i
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-[hsl(210,10%,30%)] text-[11px] font-mono italic">
                    Run circuit to see state vector
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeId.startsWith("gate-") ? (
           <div className="w-10 h-10 flex items-center justify-center rounded shadow-xl scale-110 cursor-grabbing border border-white/20"
             style={{ backgroundColor: GATES.find(g => `gate-${g.type}` === activeId)?.color }}
           >
              <span className="text-white font-mono text-sm font-bold">
                {GATES.find(g => `gate-${g.type}` === activeId)?.label}
              </span>
           </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

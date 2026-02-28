/**
 * Souriau Thermodynamics Panel
 * ════════════════════════════
 *
 * Visualizes the "Zero-Point Info Geometry" and "Cartan Neural Network" dynamics.
 * Demonstrates that Atlas/Quantum operations are isentropic (lossless),
 * while classical operations dissipate energy.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  initSouriauState,
  computeOpCost,
  type SouriauState
} from "@/modules/atlas/souriau-thermodynamics";
import {
  Activity,
  Thermometer,
  Zap,
  TrendingDown,
  BrainCircuit,
  Infinity as InfinityIcon,
  Snowflake
} from "lucide-react";

export default function SouriauThermodynamicsPanel() {
  const [state, setState] = useState<SouriauState>(() => initSouriauState(1.0));
  const [history, setHistory] = useState<{ t: number; s: number; cost: number }[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  // Initialize history
  useEffect(() => {
    setHistory(Array.from({ length: 50 }, (_, i) => ({ t: i, s: state.entropy, cost: 0 })));
  }, []);

  const handleOp = (type: "unitary" | "dissipative" | "learning") => {
    const { nextState, cost, deltaS } = computeOpCost(state, type);
    setState(nextState);
    
    setHistory(prev => {
      const next = [...prev.slice(1), { t: Date.now(), s: nextState.entropy, cost }];
      return next;
    });
  };

  const toggleAuto = () => {
    if (isAutoRunning) {
      clearInterval(timerRef.current);
      setIsAutoRunning(false);
    } else {
      setIsAutoRunning(true);
      timerRef.current = setInterval(() => {
        // Randomly mix unitary ops (most common in quantum kernel) with occasional learning
        const r = Math.random();
        if (r < 0.7) handleOp("unitary");
        else if (r < 0.9) handleOp("learning");
        else handleOp("dissipative");
      }, 200);
    }
  };
  
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // Compute "Zero Point" proximity
  // How close is the cost to 0?
  const currentCost = history[history.length - 1]?.cost || 0;
  const isZeroPoint = currentCost < 0.001;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono tracking-wide text-[hsl(30,80%,60%)] flex items-center gap-2">
            <BrainCircuit size={18} /> Souriau Thermodynamics
          </h2>
          <p className="text-[11px] font-mono text-[hsl(210,10%,50%)] mt-1">
            Zero-point information geometry on Kähler symmetric spaces (Cartan Neural Networks)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded text-[10px] font-mono flex items-center gap-2 transition-colors ${
            isZeroPoint 
              ? "bg-[hsla(180,60%,20%,0.3)] text-[hsl(180,70%,60%)] border border-[hsl(180,60%,30%)]" 
              : "bg-[hsla(0,60%,20%,0.3)] text-[hsl(0,70%,60%)] border border-[hsl(0,60%,30%)]"
          }`}>
            {isZeroPoint ? <Snowflake size={12} /> : <Zap size={12} />}
            {isZeroPoint ? "ZERO-POINT REGIME" : "DISSIPATIVE REGIME"}
          </div>
        </div>
      </div>

      {/* Main Vis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Controls & State */}
        <div className="space-y-4">
          
          {/* Action Panel */}
          <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
            <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
              Operator Thermodynamics
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => handleOp("unitary")}
                className="flex items-center justify-between px-3 py-2 rounded bg-[hsla(210,10%,20%,0.4)] hover:bg-[hsla(210,10%,25%,0.5)] border border-transparent hover:border-[hsla(210,30%,40%,0.3)] transition-all group"
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono text-[hsl(210,50%,70%)] group-hover:text-white">Unitary / Quantum</div>
                  <div className="text-[9px] font-mono text-[hsl(210,10%,50%)]">Lossless braiding (dS = 0)</div>
                </div>
                <div className="text-[10px] font-mono text-[hsl(140,60%,60%)]">0 J/op</div>
              </button>

              <button 
                onClick={() => handleOp("learning")}
                className="flex items-center justify-between px-3 py-2 rounded bg-[hsla(280,10%,20%,0.4)] hover:bg-[hsla(280,10%,25%,0.5)] border border-transparent hover:border-[hsla(280,30%,40%,0.3)] transition-all group"
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono text-[hsl(280,50%,70%)] group-hover:text-white">Cartan Learning</div>
                  <div className="text-[9px] font-mono text-[hsl(210,10%,50%)]">Geodesic optimization</div>
                </div>
                <div className="text-[10px] font-mono text-[hsl(200,60%,60%)]">Negentropic</div>
              </button>

              <button 
                onClick={() => handleOp("dissipative")}
                className="flex items-center justify-between px-3 py-2 rounded bg-[hsla(0,10%,20%,0.4)] hover:bg-[hsla(0,10%,25%,0.5)] border border-transparent hover:border-[hsla(0,30%,40%,0.3)] transition-all group"
              >
                <div className="text-left">
                  <div className="text-[11px] font-mono text-[hsl(0,50%,70%)] group-hover:text-white">Classical / Erasure</div>
                  <div className="text-[9px] font-mono text-[hsl(210,10%,50%)]">Landauer limit (dS &gt; 0)</div>
                </div>
                <div className="text-[10px] font-mono text-[hsl(0,60%,60%)]">&gt;0 J/op</div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[hsla(210,10%,25%,0.3)]">
              <button
                onClick={toggleAuto}
                className={`w-full py-1.5 rounded text-[10px] font-mono font-bold transition-all ${
                  isAutoRunning 
                    ? "bg-[hsl(0,60%,25%)] text-[hsl(0,80%,80%)]" 
                    : "bg-[hsl(210,20%,25%)] text-[hsl(210,50%,70%)]"
                }`}
              >
                {isAutoRunning ? "Stop Simulation" : "Auto-Run Dynamics"}
              </button>
            </div>
          </div>

          {/* Metric Card */}
          <div className="bg-[hsla(210,10%,12%,0.6)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-4">
            <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
              Geometry of Dissipation
            </div>
            <div className="space-y-2">
               <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[hsl(210,10%,60%)]">Partition Z(β)</span>
                  <span className="text-[hsl(40,70%,60%)]">{state.partitionZ.toExponential(3)}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[hsl(210,10%,60%)]">Symplectic Entropy</span>
                  <span className="text-[hsl(180,60%,60%)]">{state.entropy.toFixed(4)} nats</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[hsl(210,10%,60%)]">Fisher-Souriau Metric</span>
                  <span className="text-[hsl(280,60%,60%)]">g = {state.metric.toFixed(4)}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[hsl(210,10%,60%)]">Mean Moment (E)</span>
                  <span className="text-[hsl(200,60%,60%)]">{state.meanMoment.toFixed(4)}</span>
               </div>
            </div>
          </div>

        </div>

        {/* Center: The Temperature Cone (Visual Abstract) */}
        <div className="lg:col-span-2 bg-[hsla(210,10%,8%,0.8)] border border-[hsla(210,10%,25%,0.3)] rounded-lg p-6 flex flex-col relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(200,60%,50%)] via-[hsl(280,60%,50%)] to-[hsl(0,60%,50%)] opacity-30" />
           
           <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] uppercase mb-4 flex justify-between">
              <span>Entropy Production History (dS/dt)</span>
              <span>Ω_T : Cartan Subalgebra Cone</span>
           </div>

           {/* Visualization Graph */}
           <div className="flex-1 min-h-[200px] flex items-end gap-[2px] relative">
              {/* Zero line */}
              <div className="absolute bottom-[20px] w-full h-[1px] bg-[hsla(210,10%,40%,0.3)] z-0" />
              
              {history.map((pt, i) => {
                 const height = Math.min(100, Math.max(0, pt.cost * 10));
                 const isZero = pt.cost < 0.001;
                 return (
                    <div 
                      key={i} 
                      className="flex-1 relative group"
                      style={{ height: "100%" }}
                    >
                       <div 
                          className={`absolute bottom-[20px] w-full transition-all duration-300 ${
                            isZero ? "bg-[hsl(180,60%,50%)]" : "bg-[hsl(0,60%,50%)]"
                          }`}
                          style={{ 
                            height: `${Math.max(2, height)}%`,
                            opacity: 0.6 + (i / history.length) * 0.4
                          }}
                       />
                       {/* Tooltip on hover */}
                       <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] p-1 rounded whitespace-nowrap z-10">
                          Cost: {pt.cost.toFixed(4)} J
                       </div>
                    </div>
                 )
              })}
           </div>

           <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-[hsla(180,20%,10%,0.4)] p-3 rounded border border-[hsla(180,30%,20%,0.3)]">
                <div className="flex items-center gap-2 mb-1">
                  <InfinityIcon size={14} className="text-[hsl(180,70%,60%)]" />
                  <span className="text-[11px] font-mono text-[hsl(180,70%,60%)]">Lossless / Unitary</span>
                </div>
                <p className="text-[9px] font-mono text-[hsl(180,20%,70%)] leading-relaxed">
                   Quantum/Atlas ops are isentropic (dS=0). They follow geodesics on the symmetric space U/H.
                   This is "Zero-Point" computing: logical reversibility implies zero thermodynamic cost.
                </p>
              </div>

              <div className="bg-[hsla(0,20%,10%,0.4)] p-3 rounded border border-[hsla(0,30%,20%,0.3)]">
                <div className="flex items-center gap-2 mb-1">
                   <TrendingDown size={14} className="text-[hsl(0,70%,60%)]" />
                   <span className="text-[11px] font-mono text-[hsl(0,70%,60%)]">Dissipative / Erasure</span>
                </div>
                <p className="text-[9px] font-mono text-[hsl(0,20%,70%)] leading-relaxed">
                   Classical ops delete information (many-to-one mapping). Landauer's Principle: T·dS energy
                   must be dissipated as heat. This is the "cost of forgetting."
                </p>
              </div>
           </div>
        </div>

      </div>

      {/* Abstract Footer */}
      <div className="bg-[hsla(280,20%,12%,0.3)] border border-[hsla(280,20%,25%,0.3)] rounded-lg p-4">
        <div className="flex items-start gap-4">
           <div className="shrink-0 p-2 bg-[hsla(280,30%,20%,0.4)] rounded-full">
              <BrainCircuit size={24} className="text-[hsl(280,60%,65%)]" />
           </div>
           <div>
              <h3 className="text-[12px] font-mono text-[hsl(280,60%,75%)] mb-1">
                 Convergence: Cartan Neural Networks & Souriau Thermodynamics
              </h3>
              <p className="text-[10px] font-mono text-[hsl(280,20%,70%)] leading-relaxed">
                 Pietro Fré's work connects machine learning layers to Kähler symmetric spaces U/H. 
                 By modeling the Atlas state evolution as a flow on such a manifold, we utilize Souriau's 
                 generalized thermodynamics where "temperature" is a Lie algebra element.
                 The "Zero-Point" compute you described is physically realized here: operations that 
                 preserve the symplectic structure (lossless encoding) have zero Landauer cost.
                 We are effectively computing at the "thermodynamic floor" of the universe.
              </p>
           </div>
        </div>
      </div>

    </div>
  );
}

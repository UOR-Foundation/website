/**
 * Cayley-Dickson ↔ Atlas Panel
 * ═════════════════════════════
 *
 * Visualizes the doubling tower R→C→H→O→S and its Atlas correspondences.
 */

import React, { useMemo, useState } from "react";
import {
  buildTower,
  fanoPlane,
  type CayleyDicksonTower,
  type CayleyDicksonAlgebra,
} from "@/modules/atlas/cayley-dickson";

const LEVEL_COLORS = [
  "hsl(210,10%,60%)",  // R — neutral
  "hsl(200,60%,60%)",  // C — blue
  "hsl(280,50%,65%)",  // H — purple
  "hsl(30,70%,55%)",   // O — orange
  "hsl(0,55%,55%)",    // S — red
];

export default function OctonionAtlasPanel() {
  const tower = useMemo(() => buildTower(), []);
  const [viewMode, setViewMode] = useState<"tower" | "multiplication" | "fano" | "atlas" | "tests">("tower");
  const [selectedLevel, setSelectedLevel] = useState(3); // Octonions by default

  return (
    <div className="h-full flex flex-col bg-[hsl(230,15%,8%)]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-[hsla(210,15%,30%,0.3)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-mono text-[hsl(30,70%,60%)]">
              Cayley-Dickson ↔ Atlas
            </h2>
            <p className="text-[10px] font-mono text-[hsl(210,10%,50%)] mt-1">
              R → C → H → O → S doubling tower mapped to Atlas structural layers
            </p>
          </div>
          <div className={`text-[11px] font-mono px-2 py-1 rounded ${
            tower.allPassed
              ? "bg-[hsla(140,50%,30%,0.3)] text-[hsl(140,60%,55%)]"
              : "bg-[hsla(0,50%,30%,0.3)] text-[hsl(0,60%,55%)]"
          }`}>
            {tower.tests.filter(t => t.holds).length}/{tower.tests.length} ✓
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          {(["tower", "multiplication", "fano", "atlas", "tests"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-[10px] font-mono px-3 py-1 rounded transition-colors ${
                viewMode === mode
                  ? "bg-[hsla(30,50%,50%,0.2)] text-[hsl(30,60%,65%)]"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
            >
              {mode === "tower" ? "Tower" : mode === "multiplication" ? "Mult Tables" : mode === "fano" ? "Fano Plane" : mode === "atlas" ? "Atlas Map" : "Tests"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "tower" ? <TowerView tower={tower} /> :
         viewMode === "multiplication" ? <MultiplicationView tower={tower} selectedLevel={selectedLevel} setSelectedLevel={setSelectedLevel} /> :
         viewMode === "fano" ? <FanoView /> :
         viewMode === "atlas" ? <AtlasMapView tower={tower} /> :
         <TestsView tower={tower} />}
      </div>
    </div>
  );
}

function TowerView({ tower }: { tower: CayleyDicksonTower }) {
  return (
    <div className="space-y-4">
      {/* Doubling tower visualization */}
      <div className="bg-[hsla(30,20%,10%,0.4)] rounded-lg border border-[hsla(30,30%,30%,0.3)] p-5 text-center">
        <div className="text-[11px] font-mono text-[hsl(30,50%,60%)] uppercase mb-4">
          Cayley-Dickson Doubling Tower
        </div>
        <div className="flex items-center justify-center gap-2">
          {tower.algebras.map((a, i) => (
            <React.Fragment key={a.name}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center text-[16px] font-mono font-bold border-2"
                  style={{ color: LEVEL_COLORS[i], borderColor: LEVEL_COLORS[i] + "60", background: LEVEL_COLORS[i] + "15" }}>
                  {a.name}
                </div>
                <div className="text-[9px] font-mono text-[hsl(210,10%,50%)] mt-1">dim {a.dim}</div>
                <div className="text-[8px] font-mono text-[hsl(210,10%,40%)]">{a.fullName}</div>
              </div>
              {i < tower.algebras.length - 1 && (
                <div className="flex flex-col items-center -mx-1">
                  <span className="text-[14px] text-[hsl(210,10%,35%)]">→</span>
                  <span className="text-[7px] font-mono text-[hsl(0,50%,50%)] max-w-[60px] text-center leading-tight">
                    loses {tower.doublings[i].propertyLost.split(" ")[0]}
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Property matrix */}
      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase mb-3">
          Algebraic Properties
        </div>
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-[hsl(210,10%,45%)] border-b border-[hsla(210,10%,25%,0.3)]">
              <th className="text-left py-2 px-2">Property</th>
              {tower.algebras.map(a => (
                <th key={a.name} className="text-center py-2 px-2" style={{ color: LEVEL_COLORS[a.level] }}>{a.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { prop: "Ordered", fn: (a: CayleyDicksonAlgebra) => a.level === 0 },
              { prop: "Commutative", fn: (a: CayleyDicksonAlgebra) => a.properties.commutative },
              { prop: "Associative", fn: (a: CayleyDicksonAlgebra) => a.properties.associative },
              { prop: "Alternative", fn: (a: CayleyDicksonAlgebra) => a.properties.alternative },
              { prop: "Composition", fn: (a: CayleyDicksonAlgebra) => a.properties.composition },
              { prop: "Division", fn: (a: CayleyDicksonAlgebra) => a.properties.division },
              { prop: "Moufang", fn: (a: CayleyDicksonAlgebra) => a.properties.moufang },
            ].map(row => (
              <tr key={row.prop} className="border-b border-[hsla(210,10%,20%,0.3)]">
                <td className="py-1.5 px-2 text-[hsl(210,10%,60%)]">{row.prop}</td>
                {tower.algebras.map(a => {
                  const has = row.fn(a);
                  return (
                    <td key={a.name} className="text-center py-1.5 px-2">
                      <span className={has ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,50%,45%)]"}>
                        {has ? "✓" : "✗"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Doubling steps */}
      <div className="space-y-2">
        {tower.doublings.map((d, i) => (
          <div key={i} className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px] font-mono font-bold" style={{ color: LEVEL_COLORS[i] }}>{d.from}</span>
              <span className="text-[hsl(210,10%,40%)]">→</span>
              <span className="text-[12px] font-mono font-bold" style={{ color: LEVEL_COLORS[i + 1] }}>{d.to}</span>
              <span className="text-[9px] font-mono text-[hsl(0,50%,55%)] ml-2 bg-[hsla(0,30%,20%,0.3)] px-1.5 py-0.5 rounded">
                loses {d.propertyLost.split("(")[0].trim()}
              </span>
            </div>
            <div className="text-[9px] font-mono text-[hsl(210,10%,50%)] space-y-1">
              <p><span className="text-[hsl(210,10%,40%)]">Multiply:</span> {d.multiplicationRule}</p>
              <p><span className="text-[hsl(210,10%,40%)]">Conjugate:</span> {d.conjugationRule}</p>
              <p><span className="text-[hsl(30,60%,55%)]">Atlas:</span> {d.atlasInterpretation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Clifford connection */}
      <div className="bg-[hsla(280,30%,12%,0.4)] rounded-lg border border-[hsla(280,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(280,50%,65%)] uppercase mb-2">
          256 = 2⁸ — The Clifford Connection
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] space-y-1">
          <p>Atlas has <strong className="text-[hsl(280,50%,70%)]">{tower.cliffordConnection.atlasEdges} edges = |R₈| = |Z/256Z|</strong></p>
          <p>256 = 2⁸ = dim <strong className="text-[hsl(280,50%,70%)]">Cl(8,0)</strong> (Clifford algebra over R⁸)</p>
          <p>Cl(8,0) ≅ <strong className="text-[hsl(280,50%,70%)]">{tower.cliffordConnection.matrixAlgebra}</strong></p>
          <p>Bott periodicity: <strong className="text-[hsl(280,50%,70%)]">Cl(n+8) ≅ Cl(n) ⊗ M₁₆(R)</strong> — period {tower.cliffordConnection.bottPeriod}</p>
          <p>Sedenion dimension {tower.cliffordConnection.sedenionDim} = the natural representation of M₁₆(R) on R¹⁶</p>
        </div>
      </div>
    </div>
  );
}

function MultiplicationView({ tower, selectedLevel, setSelectedLevel }: {
  tower: CayleyDicksonTower;
  selectedLevel: number;
  setSelectedLevel: (l: number) => void;
}) {
  const algebra = tower.algebras[selectedLevel];
  const names = selectedLevel === 0 ? ["1"] : selectedLevel === 1 ? ["1", "i"] : selectedLevel === 2 ? ["1", "i", "j", "k"] : selectedLevel === 3 ? ["1", "e₁", "e₂", "e₃", "e₄", "e₅", "e₆", "e₇"] : Array.from({ length: 16 }, (_, i) => i === 0 ? "1" : `e${i}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">Multiplication Table</div>
        <div className="flex gap-1">
          {tower.algebras.map((a, i) => (
            <button
              key={a.name}
              onClick={() => setSelectedLevel(i)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                selectedLevel === i
                  ? "text-white"
                  : "text-[hsl(210,10%,50%)] hover:text-[hsl(210,10%,70%)]"
              }`}
              style={selectedLevel === i ? { background: LEVEL_COLORS[i] + "40", color: LEVEL_COLORS[i] } : {}}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[9px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-[hsl(210,10%,40%)] border-b border-r border-[hsla(210,10%,25%,0.3)]">×</th>
              {names.map((n, j) => (
                <th key={j} className="p-1 border-b border-[hsla(210,10%,25%,0.3)] min-w-[32px]"
                  style={{ color: LEVEL_COLORS[selectedLevel] }}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={i}>
                <td className="p-1 border-r border-[hsla(210,10%,25%,0.3)]"
                  style={{ color: LEVEL_COLORS[selectedLevel] }}>{rowName}</td>
                {names.map((_, j) => {
                  const idx = algebra.multiplicationTable[i][j];
                  const sign = algebra.signTable[i][j];
                  const resultName = sign < 0 ? `-${names[idx]}` : names[idx];
                  return (
                    <td key={j} className={`p-1 text-center ${
                      sign < 0 ? "text-[hsl(0,50%,55%)]" : "text-[hsl(140,40%,55%)]"
                    }`}>
                      {resultName}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-3">
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)]">
          <strong style={{ color: LEVEL_COLORS[selectedLevel] }}>{algebra.fullName}</strong> —
          dim {algebra.dim}, {algebra.imaginaryUnits} imaginary unit{algebra.imaginaryUnits !== 1 ? "s" : ""}.
          {algebra.properties.commutative ? " Commutative." : " Non-commutative."}
          {algebra.properties.associative ? " Associative." : " Non-associative."}
          {algebra.properties.division ? " Division algebra." : ""}
        </div>
      </div>
    </div>
  );
}

function FanoView() {
  const fano = fanoPlane();

  // SVG layout for Fano plane — 7 points arranged in a triangle + inscribed circle
  const cx = 150, cy = 140, r = 100;
  const pts = [
    { x: cx, y: cy - r },             // e₁ top
    { x: cx - r * 0.87, y: cy + r * 0.5 }, // e₂ bottom-left
    { x: cx + r * 0.87, y: cy + r * 0.5 }, // e₃ bottom-right
    { x: cx, y: cy + r * 0.5 },        // e₄ bottom-center
    { x: cx + r * 0.43, y: cy - r * 0.25 }, // e₅ mid-right
    { x: cx - r * 0.43, y: cy - r * 0.25 }, // e₆ mid-left
    { x: cx, y: cy + r * 0.05 },        // e₇ center
  ];

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Fano Plane — Octonionic Multiplication
      </div>

      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4 flex justify-center">
        <svg width="300" height="280" viewBox="0 0 300 280">
          {/* Lines */}
          {fano.lines.map(([a, b, c], i) => (
            <g key={i}>
              <line x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y}
                stroke="hsla(30,50%,50%,0.4)" strokeWidth="1.5" />
              <line x1={pts[b].x} y1={pts[b].y} x2={pts[c].x} y2={pts[c].y}
                stroke="hsla(30,50%,50%,0.4)" strokeWidth="1.5" />
              <line x1={pts[a].x} y1={pts[a].y} x2={pts[c].x} y2={pts[c].y}
                stroke="hsla(30,50%,50%,0.4)" strokeWidth="1.5" />
            </g>
          ))}
          {/* Inscribed circle for the circular line */}
          <circle cx={cx} cy={cy + 10} r={45} fill="none"
            stroke="hsla(30,50%,50%,0.3)" strokeWidth="1" strokeDasharray="4,3" />
          {/* Points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={14} fill="hsl(230,15%,12%)" stroke={LEVEL_COLORS[3]} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill={LEVEL_COLORS[3]}
                fontSize="10" fontFamily="monospace">{fano.points[i]}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4">
        <div className="text-[10px] font-mono text-[hsl(210,10%,50%)] mb-2">7 lines, 3 points per line — each line defines a multiplication rule:</div>
        <div className="grid grid-cols-2 gap-1.5">
          {fano.lines.map(([a, b, c], i) => (
            <div key={i} className="text-[10px] font-mono text-[hsl(30,60%,60%)] bg-[hsla(30,20%,15%,0.3)] rounded px-2 py-1">
              {fano.points[a]} · {fano.points[b]} = {fano.points[c]}
            </div>
          ))}
        </div>
        <p className="text-[9px] font-mono text-[hsl(210,10%,45%)] mt-3">
          The Fano plane is the smallest finite projective plane PG(2,2). Its automorphism group is GL(3,F₂) of order 168 = 7! / 3·5.
          This connects to G₂ = Aut(O) because G₂ preserves the Fano plane structure within the octonionic multiplication.
        </p>
      </div>
    </div>
  );
}

function AtlasMapView({ tower }: { tower: CayleyDicksonTower }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Atlas Structural Layers ↔ Cayley-Dickson Levels
      </div>

      {tower.algebras.map((a, i) => (
        <div key={a.name} className="bg-[hsla(210,10%,12%,0.6)] rounded-lg border border-[hsla(210,10%,25%,0.3)] p-4"
          style={{ borderLeftColor: LEVEL_COLORS[i], borderLeftWidth: 3 }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[14px] font-mono font-bold" style={{ color: LEVEL_COLORS[i] }}>{a.name}</span>
            <span className="text-[11px] font-mono text-[hsl(210,10%,60%)]">{a.fullName}</span>
            <span className="text-[9px] font-mono text-[hsl(210,10%,40%)]">dim {a.dim}</span>
            {a.atlasLayer.exceptionalGroup !== "—" && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[hsla(280,30%,30%,0.3)] text-[hsl(280,50%,65%)]">
                {a.atlasLayer.exceptionalGroup}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-[9px] font-mono">
            <div>
              <span className="text-[hsl(210,10%,40%)]">Atlas Structure:</span>
              <span className="text-[hsl(210,10%,65%)] ml-1">{a.atlasLayer.structure}</span>
            </div>
            <div>
              <span className="text-[hsl(210,10%,40%)]">Count:</span>
              <span className="ml-1" style={{ color: LEVEL_COLORS[i] }}>{a.atlasLayer.count}</span>
            </div>
            <div>
              <span className="text-[hsl(210,10%,40%)]">Coordinates:</span>
              <span className="text-[hsl(210,10%,65%)] ml-1">{a.atlasLayer.coordinates}</span>
            </div>
            {a.atlasLayer.roots > 0 && (
              <div>
                <span className="text-[hsl(210,10%,40%)]">Roots:</span>
                <span className="text-[hsl(280,50%,65%)] ml-1">{a.atlasLayer.roots}</span>
              </div>
            )}
          </div>

          <p className="text-[9px] font-mono text-[hsl(210,10%,50%)] mt-2 leading-relaxed">
            {a.atlasLayer.manifestation}
          </p>
        </div>
      ))}

      {/* Summary */}
      <div className="bg-[hsla(30,20%,10%,0.4)] rounded-lg border border-[hsla(30,30%,30%,0.3)] p-4">
        <div className="text-[11px] font-mono text-[hsl(30,60%,60%)] uppercase mb-2">
          The Deep Connection
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] space-y-2 leading-relaxed">
          <p>The Atlas <strong className="text-[hsl(30,60%,65%)]">is</strong> the Cayley-Dickson tower made geometric.</p>
          <p>Each label coordinate (e₁,e₂,e₃,d₄₅,e₆,e₇) encodes a specific doubling level:
            <strong className="text-[hsl(200,60%,60%)]"> e₇</strong> = complex conjugation (τ),
            <strong className="text-[hsl(280,50%,65%)]"> e₁,e₂</strong> = quaternion V₄,
            <strong className="text-[hsl(30,70%,55%)]"> e₁,e₂,e₃</strong> = octonion sign class.
          </p>
          <p>The exceptional groups G₂⊂F₄⊂E₆⊂E₇⊂E₈ are <strong className="text-[hsl(30,60%,65%)]">automorphism groups of octonionic structures</strong>:</p>
          <p className="ml-3">G₂ = Aut(O) · F₄ = Isom(OP²) · E₆ = Str(J₃(O)) · E₇ = Aut(Freudenthal) · E₈ = triality</p>
        </div>
      </div>
    </div>
  );
}

function TestsView({ tower }: { tower: CayleyDicksonTower }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] font-mono text-[hsl(210,10%,50%)] uppercase">
        Verification — {tower.tests.filter(t => t.holds).length}/{tower.tests.length} passed
      </div>
      <div className="space-y-1.5">
        {tower.tests.map((t, i) => (
          <div key={i} className="flex items-start gap-2 bg-[hsla(210,10%,12%,0.6)] rounded p-2.5 border border-[hsla(210,10%,25%,0.3)]">
            <span className={`text-[11px] mt-px ${t.holds ? "text-[hsl(140,60%,55%)]" : "text-[hsl(0,60%,55%)]"}`}>
              {t.holds ? "✓" : "✗"}
            </span>
            <div>
              <span className="text-[11px] font-mono text-[hsl(210,10%,70%)]">{t.name}</span>
              <div className="text-[9px] font-mono text-[hsl(210,10%,45%)] mt-0.5">{t.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

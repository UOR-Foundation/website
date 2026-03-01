/**
 * AtlasManifold3D — Interactive 3D Visualization of the 96-Vertex Atlas
 * ═════════════════════════════════════════════════════════════════════════
 *
 * Renders the Atlas graph as a 3D manifold with:
 * - 96 vertices positioned on nested spherical shells by sign class
 * - 256 edges as luminous connections
 * - Real-time vertex activation animation (coherence inference)
 * - Fano-plane routing paths (7 colored lines)
 * - Gradient flow visualization (∂H/∂t)
 */

import React, { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { getAtlas } from "../atlas";
import { constructFanoTopology } from "../fano-plane";

// ── Vertex layout: place 96 vertices on nested shells by sign class ─────

interface VertexLayout {
  positions: Float32Array;       // 96 × 3
  edges: [number, number][];
  signClasses: number[];         // per-vertex sign class 0–7
  mirrorPairs: number[];         // per-vertex mirror partner
  fanoLines: [number, number, number][]; // 7 Fano triples
}

function computeLayout(): VertexLayout {
  const atlas = getAtlas();
  const fano = constructFanoTopology();

  const positions = new Float32Array(96 * 3);
  const signClasses: number[] = [];
  const mirrorPairs: number[] = [];

  // Group vertices by sign class (8 groups of 12)
  const groups: number[][] = Array.from({ length: 8 }, () => []);
  for (const v of atlas.vertices) {
    groups[v.signClass].push(v.index);
    signClasses.push(v.signClass);
    mirrorPairs.push(v.mirrorPair);
  }

  // Position each sign class on a different shell / latitude band
  const SHELL_RADIUS = 4;
  for (let sc = 0; sc < 8; sc++) {
    const group = groups[sc];
    const lat = ((sc / 7) - 0.5) * Math.PI * 0.85; // spread from -π/2 to +π/2
    const r = SHELL_RADIUS * Math.cos(lat * 0.5) + 1.5;

    group.forEach((idx, j) => {
      const lon = (j / group.length) * Math.PI * 2 + sc * 0.3;
      const x = r * Math.cos(lon) * Math.cos(lat);
      const y = r * Math.sin(lat) + (sc - 3.5) * 0.4;
      const z = r * Math.sin(lon) * Math.cos(lat);
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;
    });
  }

  // Collect edges (deduplicated)
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  for (const v of atlas.vertices) {
    for (const n of v.neighbors) {
      const key = v.index < n ? `${v.index}-${n}` : `${n}-${v.index}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([v.index, n]);
      }
    }
  }

  // Fano lines (7 triples of point indices)
  const fanoLines = fano.lines.map(l => l.points as [number, number, number]);

  return { positions, edges, signClasses, mirrorPairs, fanoLines };
}

// ── Sign class colors ────────────────────────────────────────────────────

const SIGN_CLASS_COLORS = [
  new THREE.Color("hsl(38, 70%, 55%)"),   // 0 — gold
  new THREE.Color("hsl(200, 60%, 55%)"),  // 1 — cyan
  new THREE.Color("hsl(280, 55%, 55%)"),  // 2 — violet
  new THREE.Color("hsl(130, 50%, 50%)"),  // 3 — green
  new THREE.Color("hsl(350, 60%, 55%)"),  // 4 — rose
  new THREE.Color("hsl(50, 65%, 55%)"),   // 5 — amber
  new THREE.Color("hsl(170, 55%, 50%)"),  // 6 — teal
  new THREE.Color("hsl(320, 50%, 55%)"),  // 7 — magenta
];

const FANO_LINE_COLORS = [
  "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff",
  "#ff6eb4", "#a855f7", "#06d6a0",
];

// ── Vertex instances (instanced mesh for performance) ────────────────────

function VertexCloud({ layout, activations }: {
  layout: VertexLayout;
  activations: Float32Array;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(96 * 3), []);

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < 96; i++) {
      const x = layout.positions[i * 3];
      const y = layout.positions[i * 3 + 1];
      const z = layout.positions[i * 3 + 2];
      const act = activations[i];
      const scale = 0.06 + act * 0.12;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Blend base color with white based on activation
      const base = SIGN_CLASS_COLORS[layout.signClasses[i]];
      const r = THREE.MathUtils.lerp(base.r * 0.4, 1, act);
      const g = THREE.MathUtils.lerp(base.g * 0.4, 1, act);
      const b = THREE.MathUtils.lerp(base.b * 0.4, 1, act);
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(colorArray, 3)
    );
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 96]}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial vertexColors toneMapped={false} emissive="white" emissiveIntensity={0.3} />
    </instancedMesh>
  );
}

// ── Atlas edges ──────────────────────────────────────────────────────────

function EdgeLines({ layout, activations }: {
  layout: VertexLayout;
  activations: Float32Array;
}) {
  const lineRef = useRef<THREE.LineSegments>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(layout.edges.length * 6);
    const col = new Float32Array(layout.edges.length * 6);

    layout.edges.forEach(([a, b], i) => {
      pos[i * 6] = layout.positions[a * 3];
      pos[i * 6 + 1] = layout.positions[a * 3 + 1];
      pos[i * 6 + 2] = layout.positions[a * 3 + 2];
      pos[i * 6 + 3] = layout.positions[b * 3];
      pos[i * 6 + 4] = layout.positions[b * 3 + 1];
      pos[i * 6 + 5] = layout.positions[b * 3 + 2];
    });

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, [layout]);

  useFrame(() => {
    if (!lineRef.current) return;
    const col = lineRef.current.geometry.getAttribute("color") as THREE.BufferAttribute;
    const colors = col.array as Float32Array;

    layout.edges.forEach(([a, b], i) => {
      const act = (activations[a] + activations[b]) * 0.5;
      const bright = 0.08 + act * 0.5;
      // Warm white-gold tint
      colors[i * 6] = bright * 1.0;
      colors[i * 6 + 1] = bright * 0.85;
      colors[i * 6 + 2] = bright * 0.5;
      colors[i * 6 + 3] = bright * 1.0;
      colors[i * 6 + 4] = bright * 0.85;
      colors[i * 6 + 5] = bright * 0.5;
    });
    col.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.35} />
    </lineSegments>
  );
}

// ── Fano routing paths (7 colored triangles overlaid) ────────────────────

function FanoRoutes({ layout, activations }: {
  layout: VertexLayout;
  activations: Float32Array;
}) {
  // Map Fano points (0–6) to Atlas vertices: pick the first vertex of each
  // sign class except class 0 (which is the "identity" shell)
  const atlas = getAtlas();
  const fanoVertexMap = useMemo(() => {
    // Map Fano point i → Atlas vertex from sign class (i+1) mod 8
    const groups: number[][] = Array.from({ length: 8 }, () => []);
    for (const v of atlas.vertices) groups[v.signClass].push(v.index);
    return Array.from({ length: 7 }, (_, i) => groups[(i + 1) % 8][0]);
  }, []);

  return (
    <>
      {layout.fanoLines.map((triple, li) => {
        const pts = triple.map(p => {
          const vi = fanoVertexMap[p];
          return new THREE.Vector3(
            layout.positions[vi * 3],
            layout.positions[vi * 3 + 1],
            layout.positions[vi * 3 + 2]
          );
        });
        // Close the triangle
        const loopPts = [...pts, pts[0]];
        return (
          <Line
            key={li}
            points={loopPts}
            color={FANO_LINE_COLORS[li]}
            lineWidth={2}
            transparent
            opacity={0.6}
            dashed
            dashSize={0.15}
            gapSize={0.1}
          />
        );
      })}
    </>
  );
}

// ── Gradient flow arrows ─────────────────────────────────────────────────

function GradientFlow({ layout, activations, flowDirection }: {
  layout: VertexLayout;
  activations: Float32Array;
  flowDirection: number; // -1 to +1
}) {
  const arrowsRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!arrowsRef.current) return;
    arrowsRef.current.rotation.y += delta * flowDirection * 0.3;
  });

  // Show flow as a slow rotation of the entire field + subtle pulsing ring
  return (
    <group ref={arrowsRef}>
      <mesh>
        <torusGeometry args={[5.5, 0.015, 8, 64]} />
        <meshBasicMaterial
          color={flowDirection > 0 ? "#4ade80" : "#f87171"}
          transparent
          opacity={Math.abs(flowDirection) * 0.4 + 0.1}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.5, 0.015, 8, 64]} />
        <meshBasicMaterial
          color={flowDirection > 0 ? "#4ade80" : "#f87171"}
          transparent
          opacity={Math.abs(flowDirection) * 0.25}
        />
      </mesh>
    </group>
  );
}

// ── Main Scene ───────────────────────────────────────────────────────────

function AtlasScene({ running, speed }: { running: boolean; speed: number }) {
  const layout = useMemo(() => computeLayout(), []);
  const activations = useMemo(() => new Float32Array(96), []);
  const [flowDir, setFlowDir] = useState(0);

  // Simulate coherence inference: wave propagation across vertices
  useFrame(({ clock }) => {
    if (!running) return;
    const t = clock.getElapsedTime() * speed;

    let rising = 0;
    let total = 0;
    for (let i = 0; i < 96; i++) {
      const x = layout.positions[i * 3];
      const y = layout.positions[i * 3 + 1];
      const z = layout.positions[i * 3 + 2];

      // Multi-frequency wave: simulates morphism cascade
      const wave1 = Math.sin(t * 1.5 + x * 0.5 + y * 0.3) * 0.5 + 0.5;
      const wave2 = Math.sin(t * 0.7 + z * 0.8 - y * 0.4) * 0.3 + 0.5;
      const wave3 = Math.sin(t * 2.1 + (x + z) * 0.6) * 0.2;

      const prev = activations[i];
      const next = Math.max(0, Math.min(1, wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2));
      activations[i] = next;
      if (next > prev) rising++;
      total++;
    }
    setFlowDir((rising / total - 0.5) * 2);
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffe8c0" />
      <pointLight position={[-8, -5, -8]} intensity={0.3} color="#a0c4ff" />

      <VertexCloud layout={layout} activations={activations} />
      <EdgeLines layout={layout} activations={activations} />
      <FanoRoutes layout={layout} activations={activations} />
      <GradientFlow layout={layout} activations={activations} flowDirection={flowDir} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

// ── Exported Component ───────────────────────────────────────────────────

export default function AtlasManifold3D() {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  return (
    <div className="h-full w-full relative">
      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 bg-[hsla(230,15%,10%,0.85)] backdrop-blur-sm rounded-lg px-3 py-2 border border-[hsla(210,15%,30%,0.3)]">
        <button
          onClick={() => setRunning(r => !r)}
          className="text-[11px] font-mono px-2 py-1 rounded transition-colors bg-[hsla(38,50%,50%,0.15)] text-[hsl(38,50%,65%)] hover:bg-[hsla(38,50%,50%,0.3)]"
        >
          {running ? "⏸ Pause" : "▶ Run"}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[hsl(210,10%,50%)]">Speed</span>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-16 h-1 accent-[hsl(38,50%,55%)]"
          />
          <span className="text-[10px] font-mono text-[hsl(38,50%,60%)] w-6">{speed.toFixed(1)}×</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-[hsla(230,15%,10%,0.85)] backdrop-blur-sm rounded-lg px-3 py-2 border border-[hsla(210,15%,30%,0.3)]">
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] mb-1.5">Sign Classes</div>
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          {SIGN_CLASS_COLORS.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: `#${c.getHexString()}` }}
              />
              <span className="text-[9px] font-mono text-[hsl(210,10%,50%)]">SC{i}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)] mt-2 mb-1">Fano Lines</div>
        <div className="flex gap-1.5 flex-wrap">
          {FANO_LINE_COLORS.map((c, i) => (
            <div
              key={i}
              className="w-4 h-1 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-3 right-3 z-10 bg-[hsla(230,15%,10%,0.85)] backdrop-blur-sm rounded-lg px-3 py-2 border border-[hsla(210,15%,30%,0.3)]">
        <div className="text-[10px] font-mono text-[hsl(210,10%,55%)]">
          <div>96 vertices · 256 edges</div>
          <div>8 sign classes · 48 τ-pairs</div>
          <div>7 Fano routing lines</div>
        </div>
      </div>

      <Canvas
        camera={{ position: [8, 5, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <AtlasScene running={running} speed={speed} />
      </Canvas>
    </div>
  );
}

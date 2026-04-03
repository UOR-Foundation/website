import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

const UorSchematic = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 420;
    const h = 380;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // --- LEFT SIDE: Isolated Systems (3x3 grid) ---
    const gridX = 30;
    const gridY = 40;
    const cellSize = 38;
    const gap = 6;
    const labels = ["DB", "API", "FS", "DNS", "URI", "PKI", "S3", "Git", "IoT"];
    const colors = [
      "rgba(239,68,68,0.6)", "rgba(59,130,246,0.6)", "rgba(34,197,94,0.6)",
      "rgba(251,191,36,0.6)", "rgba(168,85,247,0.6)", "rgba(236,72,153,0.6)",
      "rgba(14,165,233,0.6)", "rgba(249,115,22,0.6)", "rgba(99,102,241,0.6)",
    ];

    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Section label
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Isolated Data Systems", gridX + (cellSize * 3 + gap * 2) / 2, gridY - 14);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const i = row * 3 + col;
        const x = gridX + col * (cellSize + gap);
        const y = gridY + row * (cellSize + gap);

        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colors[i];
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labels[i], x + cellSize / 2, y + cellSize / 2);
      }
    }

    // --- CENTER: Arrow with UOR label ---
    const arrowY = gridY + (cellSize * 3 + gap * 2) / 2;
    const arrowStartX = gridX + cellSize * 3 + gap * 2 + 18;
    const arrowEndX = arrowStartX + 80;

    // Arrow line
    const grad = ctx.createLinearGradient(arrowStartX, arrowY, arrowEndX, arrowY);
    grad.addColorStop(0, "rgba(212,175,55,0.3)");
    grad.addColorStop(1, "rgba(212,175,55,0.8)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowY);
    ctx.lineTo(arrowEndX - 6, arrowY);
    ctx.stroke();

    // Arrowhead
    ctx.fillStyle = "rgba(212,175,55,0.8)";
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowY);
    ctx.lineTo(arrowEndX - 8, arrowY - 4);
    ctx.lineTo(arrowEndX - 8, arrowY + 4);
    ctx.closePath();
    ctx.fill();

    // UOR label
    ctx.fillStyle = "rgba(212,175,55,0.9)";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UOR", (arrowStartX + arrowEndX) / 2, arrowY - 12);
    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.font = "8px system-ui, sans-serif";
    ctx.fillText("Universal Address", (arrowStartX + arrowEndX) / 2, arrowY + 14);

    // --- RIGHT SIDE: Unified graph ---
    const graphCx = arrowEndX + 70;
    const graphCy = arrowY;
    const nodeRadius = 16;
    const orbitRadius = 52;

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("One Shared System", graphCx, gridY - 14);

    // Outer ring
    ctx.strokeStyle = "rgba(212,175,55,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(graphCx, graphCy, orbitRadius + 8, 0, Math.PI * 2);
    ctx.stroke();

    // Nodes around center
    const nodeCount = 6;
    const nodePositions: [number, number][] = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (Math.PI * 2 * i) / nodeCount - Math.PI / 2;
      const nx = graphCx + Math.cos(angle) * orbitRadius;
      const ny = graphCy + Math.sin(angle) * orbitRadius;
      nodePositions.push([nx, ny]);
    }

    // Edges (connect each to center and neighbors)
    for (const [nx, ny] of nodePositions) {
      ctx.strokeStyle = "rgba(212,175,55,0.15)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(graphCx, graphCy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
    for (let i = 0; i < nodeCount; i++) {
      const [x1, y1] = nodePositions[i];
      const [x2, y2] = nodePositions[(i + 1) % nodeCount];
      ctx.strokeStyle = "rgba(212,175,55,0.1)";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Center node
    const centerGrad = ctx.createRadialGradient(graphCx, graphCy, 0, graphCx, graphCy, nodeRadius);
    centerGrad.addColorStop(0, "rgba(212,175,55,0.3)");
    centerGrad.addColorStop(1, "rgba(212,175,55,0.05)");
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(graphCx, graphCy, nodeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(212,175,55,0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "rgba(212,175,55,0.9)";
    ctx.font = "bold 8px monospace";
    ctx.fillText("CID", graphCx, graphCy + 1);

    // Outer nodes
    const outerLabels = ["DB", "API", "FS", "DNS", "S3", "IoT"];
    for (let i = 0; i < nodeCount; i++) {
      const [nx, ny] = nodePositions[i];
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, 10);
      ng.addColorStop(0, "rgba(255,255,255,0.12)");
      ng.addColorStop(1, "rgba(255,255,255,0.02)");
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 7px monospace";
      ctx.fillText(outerLabels[i], nx, ny + 1);
    }

    // Bottom caption
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Same data → same address → any system", w / 2, h - 16);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[420px] h-auto opacity-80"
      style={{ aspectRatio: "420/380" }}
    />
  );
};

const WhatIsUorSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />

        <div className="py-golden-lg flex flex-col lg:flex-row lg:items-center lg:gap-16 animate-fade-in-up opacity-0" style={{ animationDelay: "0.11s" }}>
          {/* Text */}
          <div className="max-w-2xl lg:flex-1">
            <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              <span className="text-foreground/90 font-medium">Today, the same data gets different IDs in different systems. Move it, copy it, or federate it — the IDs break.</span>{" "}
              <span className="text-foreground/70 font-normal">UOR fixes this with one rule: the address comes from the content itself. Same data, same address, everywhere.</span>
            </p>
            <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
              Move data anywhere — the address stays the same. No central authority required, no single point of failure.
            </p>
            <div className="mt-golden-lg">
              <a
                href="/docs"
                className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
              >
                Read the Docs
                <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {/* Schematic */}
          <div className="mt-golden-lg lg:mt-0 lg:flex-1 flex justify-center">
            <UorSchematic />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;

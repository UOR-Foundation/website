/**
 * BrowserSkeleton — Animated content placeholder shown during page loads.
 * Dissolves into real content for a seamless transition.
 */

import { P } from "./browser-palette";

const shimmer = `
  @keyframes browser-shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

function Bar({ w, h = 12, mb = 12 }: { w: string; h?: number; mb?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginBottom: mb,
        borderRadius: 6,
        background: `linear-gradient(90deg, hsla(38, 8%, 14%, 0.4) 25%, hsla(38, 8%, 18%, 0.5) 50%, hsla(38, 8%, 14%, 0.4) 75%)`,
        backgroundSize: "800px 100%",
        animation: "browser-shimmer 1.8s ease-in-out infinite",
      }}
    />
  );
}

export default function BrowserSkeleton() {
  return (
    <div className="px-8 md:px-14 py-8 max-w-[1000px] mx-auto w-full animate-fade-in">
      <style>{shimmer}</style>
      {/* Title skeleton */}
      <Bar w="55%" h={22} mb={8} />
      <Bar w="40%" h={10} mb={24} />
      <div style={{ borderBottom: `1px solid ${P.border}`, marginBottom: 24 }} />
      {/* Paragraph blocks */}
      <Bar w="100%" mb={6} />
      <Bar w="95%" mb={6} />
      <Bar w="88%" mb={6} />
      <Bar w="92%" mb={20} />
      {/* Subheading */}
      <Bar w="35%" h={16} mb={12} />
      <Bar w="100%" mb={6} />
      <Bar w="90%" mb={6} />
      <Bar w="96%" mb={6} />
      <Bar w="70%" mb={20} />
      {/* Another section */}
      <Bar w="42%" h={16} mb={12} />
      <Bar w="100%" mb={6} />
      <Bar w="85%" mb={6} />
      <Bar w="93%" mb={6} />
    </div>
  );
}

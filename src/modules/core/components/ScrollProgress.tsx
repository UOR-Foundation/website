import { useState, useEffect, useCallback } from "react";

const ScrollProgress = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    const sections = document.querySelectorAll("main section");
    const count = sections.length;
    if (count !== sectionCount) setSectionCount(count);
    if (count === 0) return;

    setVisible(window.scrollY > 100);

    // Find which section is most in view
    const vh = window.innerHeight;
    let bestIdx = 0;
    let bestScore = -Infinity;

    sections.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();
      // How much of the viewport center this section covers
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, vh);
      const visible = Math.max(0, bottom - top);
      // Bias toward sections whose top is near viewport top
      const centerBias = 1 - Math.abs(rect.top + rect.height / 2 - vh * 0.4) / vh;
      const score = visible + centerBias * 200;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });

    setActiveIndex(bestIdx);
  }, [sectionCount]);

  useEffect(() => {
    window.addEventListener("scroll", update, { passive: true });
    // Re-detect on route change / content change
    const observer = new MutationObserver(update);
    const main = document.querySelector("main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  if (sectionCount < 2) return null;

  return (
    <div
      className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {Array.from({ length: sectionCount }).map((_, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;

        return (
          <button
            key={i}
            onClick={() => {
              const sections = document.querySelectorAll("main section");
              sections[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="transition-all duration-300 ease-out rounded-full cursor-pointer"
            style={{
              width: isActive ? 7 : 4,
              height: isActive ? 7 : 4,
              backgroundColor: isActive
                ? "hsl(0 0% 100%)"
                : isPast
                  ? "hsl(0 0% 100% / 0.35)"
                  : "hsl(0 0% 100% / 0.1)",
              boxShadow: isActive ? "0 0 8px hsl(0 0% 100% / 0.3)" : "none",
              border: "none",
              padding: 0,
            }}
            aria-label={`Scroll to section ${i + 1}`}
          />
        );
      })}
    </div>
  );
};

export default ScrollProgress;

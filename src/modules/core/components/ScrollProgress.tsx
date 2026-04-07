import { useState, useEffect, useCallback } from "react";

const ScrollProgress = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const [visible, setVisible] = useState(false);

  const rafPending = useRef(false);

  const update = useCallback(() => {
    const sections = document.querySelectorAll("main section");
    const count = sections.length;
    if (count !== sectionCount) setSectionCount(count);
    if (count === 0) return;

    setVisible(window.scrollY > 100);

    const vh = window.innerHeight;
    let bestIdx = 0;
    let bestScore = -Infinity;

    sections.forEach((sec, i) => {
      const rect = sec.getBoundingClientRect();
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, vh);
      const visible = Math.max(0, bottom - top);
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
    const onScroll = () => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        update();
        rafPending.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new MutationObserver(update);
    const main = document.querySelector("main");
    if (main) observer.observe(main, { childList: true, subtree: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [update]);

  if (sectionCount < 2) return null;

  return (
    <div
      className={`fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ gap: 0 }}
    >
      {Array.from({ length: sectionCount }).map((_, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        const isLast = i === sectionCount - 1;

        return (
          <div key={i} className="flex flex-col items-center">
            {/* Dot */}
            <button
              onClick={() => {
                const sections = document.querySelectorAll("main section");
                sections[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="transition-all duration-300 ease-out rounded-full cursor-pointer"
              style={{
                width: isActive ? 10 : 6,
                height: isActive ? 10 : 6,
                backgroundColor: isActive
                  ? "hsl(38 60% 55%)"
                  : isPast
                    ? "hsl(0 0% 100% / 0.35)"
                    : "hsl(0 0% 100% / 0.15)",
                boxShadow: isActive
                  ? "0 0 10px hsla(38, 60%, 55%, 0.4), 0 0 20px hsla(38, 60%, 55%, 0.18)"
                  : "none",
                border: "none",
                padding: 0,
              }}
              aria-label={`Scroll to section ${i + 1}`}
            />
            {/* Connecting line */}
            {!isLast && (
              <div
                style={{
                  width: 1,
                  height: 18,
                  backgroundColor: "hsl(0 0% 100% / 0.12)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScrollProgress;

import { useState, useEffect } from "react";

const TOTAL_DOTS = 8;

const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(scrollPercent, 1));
      setVisible(scrollTop > 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeDot = progress * (TOTAL_DOTS - 1);

  return (
    <div
      className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
        const distance = Math.abs(i - activeDot);
        const isActive = distance < 0.6;
        const isNear = distance < 1.4;
        const isPast = i <= activeDot;

        return (
          <div
            key={i}
            className="transition-all duration-300 ease-out rounded-full"
            style={{
              width: isActive ? 7 : isNear ? 5 : 4,
              height: isActive ? 7 : isNear ? 5 : 4,
              backgroundColor: isActive
                ? "hsl(var(--primary))"
                : isPast
                  ? "hsl(var(--primary) / 0.4)"
                  : "hsl(var(--foreground) / 0.12)",
              boxShadow: isActive ? "0 0 8px hsl(var(--primary) / 0.35)" : "none",
            }}
          />
        );
      })}
    </div>
  );
};

export default ScrollProgress;

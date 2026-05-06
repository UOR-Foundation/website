import "@/modules/landing/components/galaxy.css";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Galaxy animation.
 *  Desktop: 2 galaxies × 16 stars × 28 dots ≈ 900 nodes.
 *  Mobile:  2 galaxies × 8  stars × 24 dots ≈ 380 nodes.
 * Wrapper uses aspect-ratio 1/1 and scales to fill its flex parent
 * via max-height:100% + max-width:100%, keeping a perfect circle.
 *
 * Performance: the rotating CSS animation pauses whenever the orb is
 * off-screen or the tab is hidden, eliminating compositor work when
 * the user is reading further down the page.
 */
const GalaxyAnimation = () => {
  const isMobile = useIsMobile();
  const galaxyCount = 2;
  const starsPerGalaxy = isMobile ? 8 : 16;
  const dotsPerStar = isMobile ? 24 : 28;
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const setPaused = (paused: boolean) => {
      el.classList.toggle("is-paused", paused);
    };

    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { rootMargin: "0px" },
    );
    io.observe(el);

    const onVisibility = () => {
      if (document.hidden) setPaused(true);
      else {
        // Re-evaluate via observer; force resume only if currently in view.
        const rect = el.getBoundingClientRect();
        const inView =
          rect.bottom > 0 &&
          rect.top < (window.innerHeight || document.documentElement.clientHeight);
        setPaused(!inView);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="galaxy-viewport" ref={viewportRef}>
      <div className="galaxy-wrapper">
        <div>
          {Array.from({ length: galaxyCount }, (_, g) => (
            <div className="galaxy" key={g}>
              {Array.from({ length: starsPerGalaxy }, (_, j) => (
                <div className="stars" key={j}>
                  <div className="circle">
                    {Array.from({ length: dotsPerStar }, (_, k) => (
                      <div className="dot" key={k} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalaxyAnimation;
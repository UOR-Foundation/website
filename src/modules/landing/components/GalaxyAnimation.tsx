import "@/modules/landing/components/galaxy.css";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Galaxy animation.
 *  Desktop: 2 galaxies × 20 stars × 35 dots = 1400 nodes.
 *  Mobile:  1 galaxy  × 8  stars × 35 dots = 280 nodes (5x lighter).
 * Wrapper uses aspect-ratio 1/1 and scales to fill its flex parent
 * via max-height:100% + max-width:100%, keeping a perfect circle.
 */
const GalaxyAnimation = () => {
  const isMobile = useIsMobile();
  // Always render both galaxies so the orb is a full circle on mobile too.
  // Reduce stars on mobile to keep node count low.
  const galaxyCount = 2;
  const starsPerGalaxy = isMobile ? 12 : 20;

  return (
    <div className="galaxy-viewport">
      <div className="galaxy-wrapper">
        <div>
          {Array.from({ length: galaxyCount }, (_, g) => (
            <div className="galaxy" key={g}>
              {Array.from({ length: starsPerGalaxy }, (_, j) => (
                <div className="stars" key={j}>
                  <div className="circle">
                    {Array.from({ length: 35 }, (_, k) => (
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
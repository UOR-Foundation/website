import "@/modules/landing/components/galaxy.css";

/**
 * Galaxy animation — optimized to use fewer DOM nodes.
 * 2 galaxies × 12 stars × 20 dots = 480 nodes (down from 1,400).
 */
const GalaxyAnimation = () => {
  return (
    <div className="hero-galaxy-container">
      <div className="galaxy-wrapper">
        <div>
          <div className="galaxy">
            {Array.from({ length: 12 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 20 }, (_, k) => (
                    <div className="dot" key={k} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="galaxy">
            {Array.from({ length: 12 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 20 }, (_, k) => (
                    <div className="dot" key={k} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GalaxyAnimation;

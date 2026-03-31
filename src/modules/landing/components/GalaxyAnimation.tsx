import "@/modules/landing/components/galaxy.css";

/**
 * Galaxy animation — 2 galaxies × 20 stars × 35 dots = 1400 nodes.
 */
const GalaxyAnimation = () => {
  return (
    <div className="hero-galaxy-container">
      <div className="galaxy-wrapper">
        <div>
          <div className="galaxy">
            {Array.from({ length: 20 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 35 }, (_, k) => (
                    <div className="dot" key={k} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="galaxy">
            {Array.from({ length: 20 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 35 }, (_, k) => (
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

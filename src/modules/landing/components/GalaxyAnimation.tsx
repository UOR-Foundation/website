import "@/modules/landing/components/galaxy.css";

/**
 * Galaxy animation — optimized for fewer DOM nodes.
 * 2 galaxies × 8 stars × 15 dots = 240 nodes.
 */
const GalaxyAnimation = () => {
  return (
    <div className="hero-galaxy-container">
      <div className="galaxy-wrapper">
        <div>
          <div className="galaxy">
            {Array.from({ length: 8 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 15 }, (_, k) => (
                    <div className="dot" key={k} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="galaxy">
            {Array.from({ length: 8 }, (_, j) => (
              <div className="stars" key={j}>
                <div className="circle">
                  {Array.from({ length: 15 }, (_, k) => (
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

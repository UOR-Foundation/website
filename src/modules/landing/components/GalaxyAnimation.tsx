import "@/modules/landing/components/galaxy.css";

const GalaxyAnimation = () => {
  // 2 galaxies, each with 20 stars, each star has a circle with 35 dots
  const galaxies = Array.from({ length: 2 });
  const starsPerGalaxy = Array.from({ length: 20 });
  const dotsPerCircle = Array.from({ length: 35 });

  return (
    <div className="hero-galaxy-container">
      <div className="galaxy-wrapper">
        <div>
          {galaxies.map((_, i) => (
            <div className="galaxy" key={i}>
              {starsPerGalaxy.map((_, j) => (
                <div className="stars" key={j}>
                  <div className="circle">
                    {dotsPerCircle.map((_, k) => (
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

import { useEffect, useRef, useState } from "react";
import {
  getCurrentPhase,
  getHourlyFallback,
  getPhasePhoto,
  initLocation,
  preloadNextPhasePhoto,
  preloadCurrentPhasePhoto,
} from "@/modules/oracle/lib/immersive-photos";
import type { SolarPhase } from "@/modules/oracle/lib/solar-position";

/**
 * CSS gradient fallbacks for each solar phase — guarantees a beautiful
 * background even when all network images fail to load.
 */
const PHASE_GRADIENTS: Record<SolarPhase, string> = {
  deep_night:     "linear-gradient(180deg, #0a0a1a 0%, #0d1117 40%, #141428 100%)",
  pre_dawn:       "linear-gradient(180deg, #0d1b2a 0%, #1b2838 40%, #1a1a3e 100%)",
  dawn:           "linear-gradient(180deg, #1a1a3e 0%, #3d2b5a 30%, #6b3a6e 60%, #c76b4a 100%)",
  sunrise:        "linear-gradient(180deg, #2d1b4e 0%, #8b4a6b 25%, #d4845a 50%, #f0c27f 100%)",
  golden_morning: "linear-gradient(180deg, #f0c27f 0%, #d4a574 30%, #8cc0a8 60%, #6bb5c9 100%)",
  bright_morning: "linear-gradient(180deg, #87ceeb 0%, #6bb5c9 30%, #5ea89a 60%, #4a9a7e 100%)",
  midday:         "linear-gradient(180deg, #4a90d9 0%, #5ba3e0 30%, #6bb5e0 50%, #87ceeb 100%)",
  afternoon:      "linear-gradient(180deg, #5a9fd4 0%, #7ab5d8 30%, #9ac5a0 60%, #c4d4a0 100%)",
  golden_hour:    "linear-gradient(180deg, #d4a060 0%, #d48a50 30%, #c47040 60%, #a05a3a 100%)",
  sunset:         "linear-gradient(180deg, #ff6b35 0%, #d4445a 25%, #8b3a6e 50%, #2d1b4e 100%)",
  dusk:           "linear-gradient(180deg, #4a2c5e 0%, #2d2050 40%, #1a1840 70%, #0d1030 100%)",
  twilight:       "linear-gradient(180deg, #1a1840 0%, #141430 40%, #0d1025 70%, #0a0a1a 100%)",
  night:          "linear-gradient(180deg, #0a0a1a 0%, #0d1117 40%, #141428 100%)",
};

export default function DesktopImmersiveWallpaper() {
  const [photoUrl, setPhotoUrl] = useState(() => getPhasePhoto());
  const [imgLoaded, setImgLoaded] = useState(false);
  const [networkFailed, setNetworkFailed] = useState(false);
  const phaseRef = useRef<SolarPhase>(getCurrentPhase());
  const retryCountRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const refreshPhoto = () => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        retryCountRef.current = 0;
        setImgLoaded(false);
        setNetworkFailed(false);
        setPhotoUrl(getPhasePhoto());
      }
      preloadNextPhasePhoto();
    };

    // Preload current phase photo immediately
    preloadCurrentPhasePhoto();

    initLocation().then(() => {
      if (!mounted) return;
      refreshPhoto();
    });

    const interval = setInterval(() => {
      if (!mounted) return;
      refreshPhoto();
    }, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const currentPhase = phaseRef.current;
  const gradientBg = PHASE_GRADIENTS[currentPhase] ?? PHASE_GRADIENTS.midday;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* CSS gradient base — always visible as fallback */}
      <div
        className="absolute inset-0"
        style={{ background: gradientBg, transition: "background 2s ease-in-out" }}
      />

      {/* Network image — fades in on top of gradient when loaded */}
      {!networkFailed && (
        <img
          src={photoUrl}
          alt=""
          onLoad={() => { setImgLoaded(true); retryCountRef.current = 0; }}
          onError={() => {
            if (retryCountRef.current === 0) {
              // First failure: try hourly fallback
              retryCountRef.current = 1;
              const fallback = getHourlyFallback();
              if (fallback !== photoUrl) {
                setImgLoaded(false);
                setPhotoUrl(fallback);
              } else {
                setNetworkFailed(true);
              }
            } else {
              // Second failure: give up, gradient is showing
              setNetworkFailed(true);
            }
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          draggable={false}
        />
      )}

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
    </div>
  );
}

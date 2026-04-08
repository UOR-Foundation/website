import { useEffect, useRef, useState } from "react";
import {
  getCurrentPhase,
  getHourlyFallback,
  getPhasePhoto,
  initLocation,
  preloadNextPhasePhoto,
} from "@/modules/oracle/lib/immersive-photos";
import type { SolarPhase } from "@/modules/oracle/lib/solar-position";

export default function DesktopImmersiveWallpaper() {
  const [photoUrl, setPhotoUrl] = useState(() => getPhasePhoto());
  const [imgLoaded, setImgLoaded] = useState(false);
  const phaseRef = useRef<SolarPhase>(getCurrentPhase());

  useEffect(() => {
    let mounted = true;

    const refreshPhoto = () => {
      const phase = getCurrentPhase();
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        setImgLoaded(false);
        setPhotoUrl(getPhasePhoto());
      }
      preloadNextPhasePhoto();
    };

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

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <img
        src={photoUrl}
        alt=""
        onLoad={() => setImgLoaded(true)}
        onError={() => {
          const fallback = getHourlyFallback();
          if (fallback !== photoUrl) {
            setImgLoaded(false);
            setPhotoUrl(fallback);
          }
        }}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
    </div>
  );
}

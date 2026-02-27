/**
 * WeatherWidget — Landscape-frame exclusive
 * ═══════════════════════════════════════════
 * Serene weather display using browser geolocation + Open-Meteo (no key).
 * Falls back to a calm static display if location is unavailable.
 */

import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind } from "lucide-react";

interface WeatherData {
  temp: number;
  code: number;
  windSpeed: number;
  humidity: number;
}

const WMO_ICONS: Record<number, React.ElementType> = {
  0: Sun, 1: Sun, 2: Cloud, 3: Cloud,
  45: Cloud, 48: Cloud,
  51: CloudDrizzle, 53: CloudDrizzle, 55: CloudDrizzle,
  61: CloudRain, 63: CloudRain, 65: CloudRain,
  71: CloudSnow, 73: CloudSnow, 75: CloudSnow,
  95: CloudLightning, 96: CloudLightning, 99: CloudLightning,
};

function wmoLabel(code: number): string {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 75) return "Snow";
  return "Stormy";
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;

    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          // Reverse geocode for city name
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
          );
          const geoData = await geoRes.json();
          if (!cancelled) {
            setCity(
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              ""
            );
          }

          // Weather
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
          );
          const data = await res.json();
          if (!cancelled && data.current) {
            setWeather({
              temp: Math.round(data.current.temperature_2m),
              code: data.current.weather_code,
              windSpeed: Math.round(data.current.wind_speed_10m),
              humidity: data.current.relative_humidity_2m,
            });
          }
        } catch {
          /* silent */
        }
      },
      () => {
        // Fallback — no location access
        if (!cancelled) {
          setWeather({ temp: 22, code: 1, windSpeed: 8, humidity: 55 });
          setCity("Your area");
        }
      },
      { timeout: 5000 }
    );

    return () => { cancelled = true; };
  }, []);

  const Icon = weather ? (WMO_ICONS[weather.code] || Cloud) : Sun;

  return (
    <div
      className="flex flex-col gap-1.5 select-none"
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        minWidth: 140,
      }}
    >
      {/* Top row: icon + temp */}
      <div className="flex items-center gap-3">
        <Icon
          className="shrink-0"
          size={28}
          strokeWidth={1.2}
          style={{ color: "hsla(38, 20%, 92%, 0.85)" }}
        />
        <span
          style={{
            fontSize: "clamp(28px, 3vw, 42px)",
            fontWeight: 300,
            color: "hsla(0, 0%, 100%, 0.92)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {weather ? `${weather.temp}°` : "—"}
        </span>
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: "12px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "hsla(38, 12%, 88%, 0.6)",
          fontWeight: 400,
        }}
      >
        {weather ? wmoLabel(weather.code) : "Loading…"}
        {city ? ` · ${city}` : ""}
      </span>

      {/* Wind + humidity */}
      {weather && (
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1" style={{ fontSize: "11px", color: "hsla(38, 10%, 85%, 0.5)" }}>
            <Wind size={11} strokeWidth={1.5} /> {weather.windSpeed} km/h
          </span>
          <span style={{ fontSize: "11px", color: "hsla(38, 10%, 85%, 0.5)" }}>
            {weather.humidity}% humidity
          </span>
        </div>
      )}
    </div>
  );
}

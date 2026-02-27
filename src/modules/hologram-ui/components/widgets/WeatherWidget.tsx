/**
 * WeatherWidget — Landscape-frame exclusive
 * ═══════════════════════════════════════════
 * Ring-style weather display matching DayProgressRing aesthetics.
 * Uses browser geolocation (high accuracy) + Open-Meteo API.
 * Falls back to IP-based geolocation if device GPS is denied.
 */

import { useState, useEffect, useMemo } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from "lucide-react";

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

/* ── Ring geometry (matches DayProgressRing exactly) ── */
const SIZE = 96;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ── Fetch helpers ──────────────────────────────────── */
async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`
    );
    const data = await res.json();
    if (data.current) {
      return {
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        windSpeed: Math.round(data.current.wind_speed_10m),
        humidity: data.current.relative_humidity_2m,
      };
    }
  } catch { /* silent */ }
  return null;
}

async function fetchCity(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || "";
  } catch {
    return "";
  }
}

async function fetchIpLocation(): Promise<{ lat: number; lon: number; city: string } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return { lat: data.latitude, lon: data.longitude, city: data.city || "" };
    }
  } catch { /* silent */ }
  return null;
}

/* ── Component ──────────────────────────────────────── */
export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadFromCoords = async (lat: number, lon: number, fallbackCity?: string) => {
      const [w, c] = await Promise.all([
        fetchWeather(lat, lon),
        fetchCity(lat, lon),
      ]);
      if (cancelled) return;
      if (w) setWeather(w);
      setCity(c || fallbackCity || "");
    };

    const loadFromIp = async () => {
      const loc = await fetchIpLocation();
      if (cancelled) return;
      if (loc) {
        await loadFromCoords(loc.lat, loc.lon, loc.city);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) loadFromCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // GPS denied → fall back to IP
          if (!cancelled) loadFromIp();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300_000 }
      );
    } else {
      loadFromIp();
    }

    return () => { cancelled = true; };
  }, []);

  const Icon = useMemo(() => {
    if (!weather) return Sun;
    return WMO_ICONS[weather.code] || Cloud;
  }, [weather]);

  /* Humidity-based ring fill — visually mirrors day-progress concept */
  const humidityFill = weather ? (weather.humidity / 100) * CIRCUMFERENCE : 0;

  return (
    <div className="group relative flex flex-col items-center gap-2 cursor-default select-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke="hsla(38, 12%, 60%, 0.08)"
            strokeWidth={STROKE}
          />
          {/* Humidity arc */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke="hsla(200, 30%, 65%, 0.5)"
            strokeWidth={STROKE}
            strokeLinecap="butt"
            strokeDasharray={`${humidityFill} ${CIRCUMFERENCE - humidityFill}`}
            style={{ transition: "stroke-dasharray 0.8s ease-out" }}
          />
        </svg>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsla(200, 30%, 55%, 0.05) 0%, transparent 70%)",
            animation: "ring-breathe 6s ease-in-out infinite",
          }}
        />

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-[6px]"
          style={{ textRendering: "geometricPrecision" }}
        >
          <Icon
            size={16}
            strokeWidth={1.3}
            style={{ color: "hsla(38, 20%, 90%, 0.7)" }}
          />
          <span
            className="leading-none"
            style={{
              fontSize: "22px",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              color: "hsla(38, 15%, 94%, 0.95)",
              letterSpacing: "0.02em",
            }}
          >
            {weather ? `${weather.temp}°` : "—"}
          </span>
        </div>
      </div>

      {/* Label — matches DayProgressRing style */}
      <span
        className="text-[12px] tracking-[0.35em] uppercase transition-all duration-300"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: "hsla(38, 15%, 85%, 0.75)",
          fontWeight: 500,
        }}
      >
        {weather ? wmoLabel(weather.code) : "Weather"}
      </span>

      {/* Hover detail — city + wind */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-5 transition-all duration-300 pointer-events-none whitespace-nowrap"
        style={{
          opacity: 0,
          transform: "translateX(-50%) translateY(6px)",
        }}
      >
        {/* Uses group-hover to reveal */}
      </div>
      <div
        className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-all duration-300 pointer-events-none whitespace-nowrap"
        style={{
          opacity: 0,
          transform: "translateX(-50%) translateY(6px)",
        }}
      >
        {city && (
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              color: "hsla(38, 15%, 90%, 0.85)",
              letterSpacing: "0.02em",
            }}
          >
            {city}
          </span>
        )}
        {weather && (
          <span
            style={{
              fontSize: "10px",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 500,
              color: "hsla(38, 15%, 82%, 0.55)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {weather.windSpeed} km/h
          </span>
        )}
      </div>

      {/* Hover reveal via CSS group */}
      <style>{`
        .group:hover > div[class*="-top-10"] {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      `}</style>
    </div>
  );
}

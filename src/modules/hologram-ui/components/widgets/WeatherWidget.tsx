/**
 * WeatherWidget — Landscape-frame exclusive
 * ═══════════════════════════════════════════
 * An evocative, ring-based weather display that conveys the *feeling*
 * of the current weather — not just numbers.
 *
 * Data: Open-Meteo (WMO standard, free, no API key)
 * Location: Browser Geolocation API (high accuracy) → IP fallback
 * Reverse geocode: Nominatim (OpenStreetMap)
 *
 * Ring hue shifts with temperature. Mood text reflects human experience.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, CloudFog, Cloudy, Wind, Droplets, Sunrise, Moon,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────── */
interface WeatherData {
  temp: number;
  feelsLike: number;
  code: number;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
  uvIndex: number;
  precipProb: number;
}

/* ── WMO code → icon mapping ────────────────────────── */
function weatherIcon(code: number, isDay: boolean): React.ElementType {
  if (code === 0)  return isDay ? Sun : Moon;
  if (code === 1)  return isDay ? Sun : Moon;
  if (code <= 3)   return Cloudy;
  if (code <= 48)  return CloudFog;
  if (code <= 57)  return CloudDrizzle;
  if (code <= 67)  return CloudRain;
  if (code <= 77)  return CloudSnow;
  if (code >= 95)  return CloudLightning;
  return Cloud;
}

/* ── WMO code → concise label ───────────────────────── */
function weatherLabel(code: number): string {
  if (code === 0)  return "Clear skies";
  if (code === 1)  return "Mostly clear";
  if (code === 2)  return "Partly cloudy";
  if (code === 3)  return "Overcast";
  if (code <= 48)  return "Foggy";
  if (code <= 55)  return "Light drizzle";
  if (code <= 57)  return "Freezing drizzle";
  if (code === 61) return "Light rain";
  if (code === 63) return "Moderate rain";
  if (code === 65) return "Heavy rain";
  if (code <= 67)  return "Freezing rain";
  if (code === 71) return "Light snow";
  if (code === 73) return "Moderate snow";
  if (code === 75) return "Heavy snow";
  if (code === 77) return "Snow grains";
  if (code === 80) return "Light showers";
  if (code === 81) return "Moderate showers";
  if (code === 82) return "Heavy showers";
  if (code === 85) return "Light snow showers";
  if (code === 86) return "Heavy snow showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96)  return "Thunderstorm with hail";
  return "Uncertain";
}

/* ── Human mood text — what the weather *feels* like ── */
function weatherMood(data: WeatherData): string {
  const { temp, feelsLike, code, windSpeed, isDay, precipProb } = data;

  // Night moods
  if (!isDay) {
    if (code === 0)  return "Stars are out. A beautiful night.";
    if (code <= 3)   return "A quiet evening under soft clouds.";
    if (code <= 48)  return "Mist wraps the night in silence.";
    if (code <= 67)  return "Rain whispers against the windows.";
    if (code <= 77)  return "Snow falls softly in the dark.";
    if (code >= 95)  return "Thunder rumbles in the distance.";
    return "The night is calm.";
  }

  // Temperature-driven moods
  if (temp >= 35) return "Intense heat. Stay cool, drink water.";
  if (temp >= 30) return "Warm and radiant. The sun is generous.";
  if (temp >= 25 && code === 0) return "Golden light. A perfect day.";
  if (temp >= 20 && code <= 1) return "Gentle warmth. The air is kind.";

  // Wind
  if (windSpeed >= 40) return "The wind has a voice today. Hold steady.";
  if (windSpeed >= 25) return "A brisk breeze stirs the world awake.";

  // Rain / precipitation
  if (precipProb >= 80 && code >= 61) return "The sky is giving. Carry something warm.";
  if (precipProb >= 50) return "Rain may visit. A good day to be cozy.";
  if (code >= 61 && code <= 65) return "Rain washes the world clean.";
  if (code >= 51 && code <= 55) return "A gentle drizzle. The earth breathes.";

  // Snow
  if (code >= 71 && code <= 77) return "Snow blankets the world in quiet.";

  // Fog
  if (code >= 45 && code <= 48) return "The world is soft-edged. Move gently.";

  // Feels-like divergence
  if (feelsLike <= temp - 5) return "Cooler than it looks. Layer up.";
  if (feelsLike >= temp + 5) return "Warmer than you'd think. Enjoy it.";

  // Cold
  if (temp <= 0) return "Biting cold. Wrap up warmly.";
  if (temp <= 10) return "Crisp air. A day for warm drinks.";
  if (temp <= 15) return "Cool and composed. A thoughtful day.";

  // Cloudy
  if (code === 3) return "Overcast calm. A day for focus.";
  if (code === 2) return "Clouds drift by. Light plays through.";

  return "A good day. Take it as it comes.";
}

/* ── Temperature → ring hue (warm gradient) ─────────── */
function tempHue(temp: number): number {
  // -10°C → 220 (cool blue), 15°C → 38 (warm gold), 35°C → 10 (amber/red)
  if (temp <= -10) return 220;
  if (temp >= 35)  return 10;
  // Interpolate: -10→220, 15→38, 35→10
  if (temp <= 15) {
    const t = (temp + 10) / 25; // 0..1
    return Math.round(220 + (38 - 220) * t);
  }
  const t = (temp - 15) / 20; // 0..1
  return Math.round(38 + (10 - 38) * t);
}

/* ── Ring geometry (matches DayProgressRing) ────────── */
const SIZE = 96;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ── Fetch helpers ──────────────────────────────────── */
async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day,uv_index` +
      `&hourly=precipitation_probability&forecast_hours=1` +
      `&timezone=auto`
    );
    const data = await res.json();
    if (!data.current) return null;
    const c = data.current;
    return {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      code: c.weather_code,
      windSpeed: Math.round(c.wind_speed_10m),
      humidity: c.relative_humidity_2m,
      isDay: c.is_day === 1,
      uvIndex: Math.round(c.uv_index ?? 0),
      precipProb: data.hourly?.precipitation_probability?.[0] ?? 0,
    };
  } catch { /* silent */ }
  return null;
}

async function fetchCity(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );
    const d = await res.json();
    return d.address?.city || d.address?.town || d.address?.village || d.address?.county || "";
  } catch { return ""; }
}

async function fetchIpLocation(): Promise<{ lat: number; lon: number; city: string } | null> {
  // Try multiple IP geolocation services for reliability
  const services = [
    async () => {
      const res = await fetch("https://ipapi.co/json/");
      const d = await res.json();
      if (d.latitude && d.longitude) return { lat: d.latitude, lon: d.longitude, city: d.city || "" };
      return null;
    },
    async () => {
      const res = await fetch("https://ip-api.com/json/?fields=lat,lon,city");
      const d = await res.json();
      if (d.lat && d.lon) return { lat: d.lat, lon: d.lon, city: d.city || "" };
      return null;
    },
    async () => {
      // Ultimate fallback: use a default location (New York)
      return { lat: 40.71, lon: -74.01, city: "New York" };
    },
  ];
  for (const svc of services) {
    try {
      const result = await svc();
      if (result) return result;
    } catch { /* try next */ }
  }
  return null;
}

/* ── Component ──────────────────────────────────────── */
export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [city, setCity] = useState("");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async (lat: number, lon: number, fallbackCity?: string) => {
      const [w, c] = await Promise.all([fetchWeather(lat, lon), fetchCity(lat, lon)]);
      if (cancelled) return;
      if (w) setWeather(w);
      setCity(c || fallbackCity || "");
    };

    const fromIp = async () => {
      const loc = await fetchIpLocation();
      if (!cancelled && loc) load(loc.lat, loc.lon, loc.city);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) load(pos.coords.latitude, pos.coords.longitude); },
        () => { if (!cancelled) fromIp(); },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 600_000 }
      );
      // Safety net: if geolocation hangs without calling either callback
      setTimeout(() => { if (!cancelled && !weather) fromIp(); }, 3500);
    } else {
      fromIp();
    }

    return () => { cancelled = true; };
  }, []);

  const Icon = useMemo(() => {
    if (!weather) return Sun;
    return weatherIcon(weather.code, weather.isDay);
  }, [weather]);

  const hue = weather ? tempHue(weather.temp) : 38;
  const mood = weather ? weatherMood(weather) : "";

  /* Ring fill: UV index (0–11+) mapped to arc */
  const uvFill = weather ? Math.min(weather.uvIndex / 11, 1) * CIRCUMFERENCE : 0;
  /* Secondary subtle arc: humidity */
  const humFill = weather ? (weather.humidity / 100) * CIRCUMFERENCE : 0;

  return (
    <div
      className="relative flex flex-col items-center gap-4 cursor-default select-none px-6 py-5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE} height={SIZE}
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
          {/* Humidity arc (outer, very subtle) */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={`hsla(${hue}, 25%, 65%, 0.15)`}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            strokeDasharray={`${humFill} ${CIRCUMFERENCE - humFill}`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
          {/* Temperature-hued primary arc */}
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS - 0.5}
            fill="none"
            stroke={`hsla(${hue}, 45%, 60%, 0.65)`}
            strokeWidth={STROKE * 0.8}
            strokeLinecap="round"
            strokeDasharray={`${uvFill} ${CIRCUMFERENCE - uvFill}`}
            style={{ transition: "stroke-dasharray 1s ease-out, stroke 0.8s ease" }}
          />
        </svg>

        {/* Breathing glow — tinted to temperature */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, hsla(${hue}, 35%, 55%, 0.06) 0%, transparent 70%)`,
            animation: "ring-breathe 5.82s ease-in-out infinite",
            transition: "background 1s ease",
          }}
        />

        {/* Center: icon + temperature */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-[5px]"
          style={{ textRendering: "geometricPrecision" }}
        >
          <Icon
            size={15}
            strokeWidth={1.3}
            style={{
              color: `hsla(${hue}, 30%, 88%, 0.9)`,
              transition: "color 0.8s ease",
            }}
          />
          <span
            className="leading-none"
            style={{
              fontSize: "22px",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              color: "hsla(38, 15%, 96%, 1)",
              letterSpacing: "0.02em",
            }}
          >
            {weather ? `${weather.temp}°` : "—"}
          </span>
        </div>
      </div>

      {/* Primary label */}
      <span
        className="text-[12px] tracking-[0.35em] uppercase text-center transition-all duration-300"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: "hsla(38, 15%, 90%, 0.9)",
          fontWeight: 500,
        }}
      >
        {weather ? weatherLabel(weather.code) : "Weather"}
      </span>

      {/* Hover reveal: mood + details */}
      <div
        className="absolute -top-12 left-1/2 flex flex-col items-center gap-1 transition-all duration-300 pointer-events-none whitespace-nowrap"
        style={{
          transform: `translateX(-50%) translateY(${hovered ? "4px" : "6px"})`,
          opacity: hovered ? 1 : 0,
        }}
      >
        {city && (
          <span
            style={{
              fontSize: "13px",
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              color: "hsla(38, 15%, 95%, 0.95)",
              letterSpacing: "0.02em",
            }}
          >
            {city}
          </span>
        )}
        <div className="flex items-center gap-3">
          {weather && weather.temp !== weather.feelsLike && (
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 500,
                color: "hsla(38, 15%, 88%, 0.7)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Feels {weather.feelsLike}°
            </span>
          )}
          {weather && (
            <span className="flex items-center gap-1"
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 500,
                color: "hsla(38, 15%, 88%, 0.7)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              <Wind size={9} strokeWidth={1.5} /> {weather.windSpeed} km/h
            </span>
          )}
          {weather && (
            <span className="flex items-center gap-1"
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 500,
                color: "hsla(38, 15%, 88%, 0.7)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              <Droplets size={9} strokeWidth={1.5} /> {weather.humidity}%
            </span>
          )}
        </div>
      </div>

      {/* Mood text — below the label, always visible */}
      {mood && (
        <p
          className="text-center transition-opacity duration-700"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: "11px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "hsla(38, 12%, 88%, 0.7)",
            letterSpacing: "0.03em",
            maxWidth: 180,
            lineHeight: 1.5,
          }}
        >
          {mood}
        </p>
      )}
    </div>
  );
}

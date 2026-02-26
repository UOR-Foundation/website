/**
 * Curated Radio Stations
 * ═══════════════════════
 *
 * Station catalog for the Ambient Player. Pure data — no UI, no logic.
 *
 * @module audio/stations
 * @namespace audio/
 */

export interface AmbientStation {
  id: string;
  name: string;
  description: string;
  category: "focus" | "nature";
  streamUrl: string;
  /** Hue value for accent color. */
  color: string;
}

export const STATIONS: AmbientStation[] = [
  {
    id: "drone-zone",
    name: "Drone Zone",
    description: "Atmospheric textures with minimal beats",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/dronezone-256-mp3",
    color: "220",
  },
  {
    id: "deep-space",
    name: "Deep Space One",
    description: "Deep ambient electronic & space music",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/deepspaceone-256-mp3",
    color: "260",
  },
  {
    id: "groove-salad",
    name: "Groove Salad",
    description: "Ambient & downtempo with a groove",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/groovesalad-256-mp3",
    color: "140",
  },
  {
    id: "fluid",
    name: "Fluid",
    description: "Smooth instrumental jazz & bossa nova",
    category: "focus",
    streamUrl: "https://ice2.somafm.com/fluid-256-mp3",
    color: "30",
  },
  {
    id: "mission-control",
    name: "Mission Control",
    description: "NASA comm with ambient music",
    category: "nature",
    streamUrl: "https://ice2.somafm.com/missioncontrol-256-mp3",
    color: "200",
  },
  {
    id: "sleep",
    name: "SleepBot",
    description: "Ambient soundscapes for deep relaxation",
    category: "nature",
    streamUrl: "https://ice2.somafm.com/vaporwaves-256-mp3",
    color: "280",
  },
];

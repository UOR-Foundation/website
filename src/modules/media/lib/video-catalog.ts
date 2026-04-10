/**
 * Curated video catalog — hand-picked high-quality YouTube content.
 * No API key needed; thumbnails via img.youtube.com.
 */

export interface CatalogVideo {
  id: string;
  title: string;
  channel: string;
  category: VideoCategory;
  duration: string;
}

export type VideoCategory = "All" | "Music" | "Nature" | "Science" | "Art" | "Ambient" | "Technology";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "All", "Music", "Nature", "Science", "Technology", "Art", "Ambient",
];

export const VIDEO_CATALOG: CatalogVideo[] = [
  // ── Music ───────────────────────────────────────
  { id: "VjHMDlAPMUw", title: "Adriatique at Château de Chambord", channel: "Cercle", category: "Music", duration: "1:32:00" },
  { id: "F1Lp9LSgOXw", title: "Mind Against at Piscinao de Ramos", channel: "Cercle", category: "Music", duration: "1:15:00" },
  { id: "nO9aot9RgQc", title: "RÜFÜS DU SOL — Live from Joshua Tree", channel: "RÜFÜS DU SOL", category: "Music", duration: "49:00" },
  { id: "kv-3E82SfZY", title: "Nils Frahm — Live at Montreux Jazz Festival", channel: "Montreux Jazz Festival", category: "Music", duration: "1:28:00" },
  { id: "5DP5S_w5Fn0", title: "FKJ — Live at La Fée Electricité", channel: "FKJ", category: "Music", duration: "57:00" },
  { id: "HCbVLMBaRME", title: "Stephan Bodzin at Piz Gloria", channel: "Cercle", category: "Music", duration: "1:31:00" },
  { id: "sVHkfVmHAhM", title: "Ben Böhmer at Cappadocia", channel: "Cercle", category: "Music", duration: "1:10:00" },
  { id: "RvRhUHTV_8k", title: "Bonobo — Boiler Room London", channel: "Boiler Room", category: "Music", duration: "1:05:00" },
  { id: "7maJOI3QMu0", title: "Above & Beyond Acoustic — Full Concert", channel: "Above & Beyond", category: "Music", duration: "1:00:00" },
  { id: "sFBfMhkMal4", title: "Worakls Orchestra at Château La Coste", channel: "Cercle", category: "Music", duration: "1:20:00" },

  // ── Nature ──────────────────────────────────────
  { id: "GfO-3Oir-qM", title: "Our Planet — Frozen Worlds", channel: "Netflix", category: "Nature", duration: "48:30" },
  { id: "lkOMpruQFVg", title: "Amazing Octopus Intelligence", channel: "BBC Earth", category: "Nature", duration: "12:00" },
  { id: "a6MxGiD4bRY", title: "Coral Reefs in 4K — Underwater Wonders", channel: "Scenic Relaxation", category: "Nature", duration: "11:00" },
  { id: "6v2L2UGZJAM", title: "Planet Earth II — Cities", channel: "BBC Earth", category: "Nature", duration: "58:00" },
  { id: "cTQ3Ko9ZKg8", title: "The Art of Flying — Bird Migration", channel: "Nature Relaxation", category: "Nature", duration: "14:00" },
  { id: "WmVLcj-XKnM", title: "Africa 4K — Scenic Relaxation Film", channel: "Scenic Relaxation", category: "Nature", duration: "1:07:00" },
  { id: "BHACKCNDMW8", title: "Wild Alaska — Nature Documentary", channel: "Free Documentary", category: "Nature", duration: "50:00" },
  { id: "ChOhcHD8fBA", title: "Deep Ocean — Creatures of the Abyss", channel: "Free Documentary", category: "Nature", duration: "51:00" },

  // ── Science & Technology ────────────────────────
  { id: "JhHMJCUmq28", title: "The Egg — A Short Story", channel: "Kurzgesagt", category: "Science", duration: "8:00" },
  { id: "EFqVnj-2IcE", title: "What Happens After the Universe Ends?", channel: "Kurzgesagt", category: "Science", duration: "10:00" },
  { id: "MBnnXbOM5S4", title: "But what is a Neural Network?", channel: "3Blue1Brown", category: "Science", duration: "19:00" },
  { id: "aircAruvnKk", title: "But what is the Fourier Transform?", channel: "3Blue1Brown", category: "Science", duration: "20:00" },
  { id: "Unzc731iCUY", title: "How Electricity Actually Works", channel: "Veritasium", category: "Science", duration: "14:00" },
  { id: "HeQX2HjkcNo", title: "The Largest Black Holes in the Universe", channel: "Kurzgesagt", category: "Science", duration: "10:00" },
  { id: "rPVYJzl_9ZI", title: "The Map of Mathematics", channel: "Domain of Science", category: "Science", duration: "11:00" },
  { id: "fCn8zs912OE", title: "Essence of Linear Algebra", channel: "3Blue1Brown", category: "Science", duration: "16:00" },

  // ── Technology ──────────────────────────────────
  { id: "zjkBMFhNj_g", title: "How Do CPUs Actually Work?", channel: "Branch Education", category: "Technology", duration: "21:00" },
  { id: "cNN_tTXABkM", title: "The Revolutionary RISC-V", channel: "Asianometry", category: "Technology", duration: "16:00" },
  { id: "wvJc9CZcvBc", title: "How Does the Internet Work?", channel: "Lesics", category: "Technology", duration: "12:00" },
  { id: "ExxFxD4OSZ0", title: "How Quantum Computers Break The Internet", channel: "Veritasium", category: "Technology", duration: "18:00" },

  // ── Art & Design ────────────────────────────────
  { id: "owGykVbfgUE", title: "The Story of Bauhaus", channel: "Art Explained", category: "Art", duration: "20:00" },
  { id: "v2Au9fkZOkA", title: "Abstract — Olafur Eliasson: The Design of Art", channel: "Netflix", category: "Art", duration: "43:00" },
  { id: "M6-iC_aYcug", title: "How Studio Ghibli Animates Movement", channel: "Entertain The Elk", category: "Art", duration: "18:00" },
  { id: "36rSFrIhFZI", title: "The Genius of Hokusai", channel: "NHK World", category: "Art", duration: "24:00" },

  // ── Ambient ─────────────────────────────────────
  { id: "L_LUpnjgPso", title: "Rainy Jazz Cafe — Relaxing Background Music", channel: "Cafe Music BGM", category: "Ambient", duration: "3:00:00" },
  { id: "lFcSrYw-ARY", title: "Cozy Fireplace with Snowfall", channel: "Relaxing Fire Sounds", category: "Ambient", duration: "8:00:00" },
  { id: "f77SKdyn-1Y", title: "Ocean Waves — 10 Hours of Relaxation", channel: "Nature Soundscapes", category: "Ambient", duration: "10:00:00" },
  { id: "1ZYbU82GVz4", title: "Space Ambient Music — Journey Through Cosmos", channel: "Ambient Worlds", category: "Ambient", duration: "3:04:00" },
  { id: "hHW1oY26kxQ", title: "Tolkien's Middle-earth — Ambient Music & Atmosphere", channel: "Ambient Worlds", category: "Ambient", duration: "3:01:00" },
];

export function getVideosByCategory(category: VideoCategory): CatalogVideo[] {
  if (category === "All") return VIDEO_CATALOG;
  return VIDEO_CATALOG.filter(v => v.category === category);
}

export function searchCatalog(query: string): CatalogVideo[] {
  const q = query.toLowerCase().trim();
  if (!q) return VIDEO_CATALOG;
  return VIDEO_CATALOG.filter(v =>
    v.title.toLowerCase().includes(q) ||
    v.channel.toLowerCase().includes(q) ||
    v.category.toLowerCase().includes(q)
  );
}

export function getThumbnail(id: string, quality: "default" | "mq" | "hq" | "maxres" = "mq"): string {
  const qualityMap = { default: "default", mq: "mqdefault", hq: "hqdefault", maxres: "maxresdefault" };
  return `https://img.youtube.com/vi/${id}/${qualityMap[quality]}.jpg`;
}

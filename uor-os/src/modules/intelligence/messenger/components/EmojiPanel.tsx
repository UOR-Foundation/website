import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const CATEGORIES = [
  { id: "recent", icon: "🕐", label: "Recent" },
  { id: "smileys", icon: "😀", label: "Smileys" },
  { id: "people", icon: "👋", label: "People" },
  { id: "animals", icon: "🐱", label: "Animals" },
  { id: "food", icon: "🍕", label: "Food" },
  { id: "travel", icon: "✈️", label: "Travel" },
  { id: "activities", icon: "⚽", label: "Activities" },
  { id: "objects", icon: "💡", label: "Objects" },
  { id: "symbols", icon: "❤️", label: "Symbols" },
  { id: "flags", icon: "🏁", label: "Flags" },
];

const EMOJI_DATA: Record<string, string[]> = {
  smileys: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","🫠","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  people: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄","🫦","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵"],
  animals: ["🐱","🐶","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮"],
  food: ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥖","🫓","🥨","🥯","🥝","🫐","🍓","🍇","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏","🍐","🍑","🍒","🫒","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄","🥜","🌰","🍦","🍧","🍨","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"],
  travel: ["✈️","🛫","🛬","🪂","💺","🚁","🚀","🛸","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚋","🚌","🚍","🚎","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🛻","🚚","🚛","🚜","🏎️","🏍️","🛵","🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","🛢️","⛽","🏁","🚦","🚧","⚓","🛟","⛵","🛶","🚤","🛳️","⛴️","🛥️","🚢"],
  activities: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🏋️","🤼","🤸","🤺","⛷️","🏂","🪂","🏇","⛸️","🏄","🚣","🏊","🧗","🚴","🚵","🎮","🕹️","🎲","🧩","🎯","🎳","🎪","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🪗"],
  objects: ["💡","🔦","🕯️","💰","💵","💴","💶","💷","💎","⚖️","🪜","🧰","🪛","🔧","🔩","⚙️","🗜️","⚖️","🦯","🔗","⛓️","🪝","🧲","💊","🩹","🩺","🩻","🔬","🔭","📡","💻","🖥️","🖨️","⌨️","🖱️","💾","💿","📀","📱","☎️","📞","📟","📠","📺","📻","🎙️","📷","📸","📹","🎥","📽️","🎞️","📔","📕","📖","📗","📘","📙","📚","📓","📒","📃","📜","📄","📰","🗞️","📑","🔖","🏷️","✉️","📧","📨","📩","📤","📥","📦","📫","📪","📬","📭","🗳️","✏️","✒️","🖋️","🖊️","🖌️","🖍️","📝","🔍","🔎"],
  symbols: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","❤️‍🔥","❤️‍🩹","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚻","🚼","🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸️","⏯️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️","🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🎵","🎶","➕","➖","➗","✖️","🟰","♾️","💲","💱","™️","©️","®️","〰️","➰","➿","🔚","🔙","🔛","🔝","🔜","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨","🟩","🟦","🟪","⬛","⬜","🟫","🔈","🔇","🔉","🔊","🔔","🔕","📣","📢"],
  flags: ["🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇧🇷","🇷🇺","🇮🇹","🇪🇸","🇨🇦","🇦🇺","🇲🇽","🇦🇷","🇨🇴","🇨🇱","🇵🇪","🇻🇪","🇪🇨","🇧🇴","🇵🇾","🇺🇾","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇳🇱","🇧🇪","🇨🇭","🇦🇹","🇵🇱","🇨🇿","🇷🇴","🇭🇺","🇵🇹","🇬🇷","🇹🇷","🇮🇱","🇪🇬","🇿🇦","🇳🇬","🇰🇪","🇹🇭","🇻🇳","🇮🇩","🇵🇭","🇲🇾","🇸🇬","🇳🇿","🇮🇪","🇺🇦"],
};

// Lightweight keyword map for emoji search
const EMOJI_KEYWORDS: Record<string, string> = {
  "😀": "grinning face happy smile", "😃": "smiley face happy", "😄": "smile grin happy", "😁": "beaming grin teeth",
  "😆": "laughing squint happy", "😅": "sweat smile nervous", "🤣": "rofl rolling laughing", "😂": "tears joy laughing cry",
  "🙂": "slight smile", "😊": "blush smile happy warm", "😇": "angel halo innocent", "🥰": "love hearts face smiling",
  "😍": "heart eyes love", "🤩": "star struck excited", "😘": "kiss blowing love", "😋": "yummy delicious tongue",
  "😜": "wink tongue playful", "🤪": "zany crazy wild", "🤔": "thinking hmm wonder", "😎": "cool sunglasses",
  "🥳": "party celebrate birthday", "😢": "crying sad tear", "😭": "sobbing loud cry sad", "😡": "angry mad rage red",
  "😱": "scream shocked horror", "💀": "skull dead death", "💩": "poop poo", "👻": "ghost boo halloween",
  "👽": "alien ufo extraterrestrial", "🤖": "robot bot android", "❤️": "red heart love", "💔": "broken heart sad",
  "🔥": "fire hot flame lit", "⭐": "star", "🎉": "party tada celebration", "👍": "thumbs up yes agree like",
  "👎": "thumbs down no dislike", "👋": "wave hello hi bye", "👏": "clap applause bravo", "🙏": "pray thanks please folded",
  "💪": "muscle strong flex bicep", "🤝": "handshake deal agree", "✌️": "peace victory two",
  "🐱": "cat kitten", "🐶": "dog puppy", "🐻": "bear", "🦁": "lion king",
  "🍕": "pizza food", "🍔": "burger hamburger food", "☕": "coffee hot drink", "🍺": "beer drink",
  "✈️": "airplane plane travel fly", "🚀": "rocket launch space", "🎮": "game controller gaming video",
  "💻": "laptop computer", "📱": "phone mobile cell", "🎵": "music note song",
  "✅": "check mark done yes", "❌": "cross mark no wrong", "⚠️": "warning caution alert",
  "💯": "hundred perfect score", "🏁": "checkered flag finish race",
};

// Build a flat searchable index
const ALL_EMOJIS_FLAT = Object.values(EMOJI_DATA).flat();

const RECENT_KEY = "emoji_recent";

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 32);
  } catch { return []; }
}

function addRecent(emoji: string) {
  const recent = getRecent().filter(e => e !== emoji);
  recent.unshift(emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 32)));
}

export default function EmojiPanel({ open, onClose, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [search, setSearch] = useState("");
  const recent = getRecent();

  const displayEmojis = useMemo(() => {
    if (activeCategory === "recent") return recent;
    return EMOJI_DATA[activeCategory] ?? [];
  }, [activeCategory, recent]);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return displayEmojis;
    const q = search.toLowerCase();
    return ALL_EMOJIS_FLAT.filter((emoji) => {
      const keywords = EMOJI_KEYWORDS[emoji];
      if (keywords && keywords.includes(q)) return true;
      // Fallback: match emoji itself
      return emoji.includes(q);
    }).slice(0, 80);
  }, [search, displayEmojis]);

  const handleSelect = (emoji: string) => {
    addRecent(emoji);
    onSelect(emoji);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-0 right-0 h-[320px] bg-slate-950/98 backdrop-blur-xl border-t border-white/[0.06] z-50 flex flex-col"
        >
          {/* Search */}
          <div className="px-3 py-2 border-b border-white/[0.04]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emoji…"
                className="w-full h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 text-[13px] pl-8 pr-3 outline-none placeholder:text-white/20 focus:border-teal-500/30 transition-colors"
              />
            </div>
          </div>

          {/* Category tabs */}
          {!search && (
            <div className="flex px-1 py-1 gap-0.5 border-b border-white/[0.04] overflow-x-auto scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 w-9 h-8 flex items-center justify-center rounded-md text-base transition-colors duration-75 active:scale-[0.92] ${
                    activeCategory === cat.id ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <div className="flex-1 overflow-y-auto px-2 py-2" style={{ willChange: "transform" }}>
            <div className="grid grid-cols-8 gap-0.5">
              {filteredEmojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => handleSelect(emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-[0.9] transition-all duration-75 text-xl select-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {filteredEmojis.length === 0 && (
              <div className="text-center text-white/20 text-sm py-8">
                {search ? "No emojis found" : activeCategory === "recent" ? "No recent emojis" : "No emojis found"}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

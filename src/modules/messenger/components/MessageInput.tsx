import { useState } from "react";
import { Send, Smile, Paperclip } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="h-[62px] bg-white/[0.02] backdrop-blur-xl flex items-center px-4 gap-2 border-t border-white/[0.06] flex-shrink-0">
      <button className="text-white/20 hover:text-white/40 transition-colors p-2">
        <Smile size={20} />
      </button>
      <button className="text-white/20 hover:text-white/40 transition-colors p-2">
        <Paperclip size={20} />
      </button>

      <div className="flex-1">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message…"
          disabled={disabled}
          className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/90 text-sm px-4 outline-none placeholder:text-white/25 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all disabled:opacity-40"
        />
      </div>

      <button
        onClick={text.trim() ? handleSend : undefined}
        disabled={!text.trim() || disabled}
        className={`p-2 rounded-lg transition-all ${
          text.trim()
            ? "text-teal-400 hover:bg-teal-500/10"
            : "text-white/15"
        }`}
      >
        <Send size={20} />
      </button>
    </div>
  );
}

import { useState } from "react";
import { Smile, Paperclip, Mic, Send } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
}

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="h-[62px] bg-[#202c33] flex items-center px-4 gap-2 border-t border-[#2a3942] flex-shrink-0">
      <button className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-2">
        <Smile size={24} />
      </button>
      <button className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-2">
        <Paperclip size={24} />
      </button>

      <div className="flex-1">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message"
          className="w-full h-[42px] rounded-lg bg-[#2a3942] text-[#e9edef] text-[15px] px-3 outline-none placeholder:text-[#8696a0]"
        />
      </div>

      <button
        onClick={text.trim() ? handleSend : undefined}
        className="text-[#8696a0] hover:text-[#e9edef] transition-colors p-2"
      >
        {text.trim() ? <Send size={24} /> : <Mic size={24} />}
      </button>
    </div>
  );
}

import { Check, CheckCheck, Mic, Image as ImageIcon } from "lucide-react";
import type { Message } from "../lib/mock-data";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const sent = message.sent;

  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"} mb-[2px] px-[6%]`}>
      <div
        className={`
          relative max-w-[65%] rounded-lg px-[9px] pt-[6px] pb-[8px] shadow-sm
          ${sent
            ? "bg-[#005c4b] text-[#e9edef]"
            : "bg-[#202c33] text-[#e9edef]"
          }
        `}
        style={{ wordBreak: "break-word" }}
      >
        {/* Tail nub */}
        <span
          className={`absolute top-0 w-2 h-3 ${sent ? "-right-1.5" : "-left-1.5"}`}
          style={{
            background: sent ? "#005c4b" : "#202c33",
            clipPath: sent
              ? "polygon(0 0, 100% 0, 0 100%)"
              : "polygon(100% 0, 0 0, 100% 100%)",
          }}
        />

        {message.type === "image" && (
          <div className="w-[280px] h-[160px] rounded bg-[#111b21] flex items-center justify-center mb-1">
            <ImageIcon size={32} className="text-[#8696a0]" />
            <span className="text-xs text-[#8696a0] ml-2">{message.imagePlaceholder}</span>
          </div>
        )}

        {message.type === "voice" && (
          <div className="flex items-center gap-2 min-w-[200px]">
            <button className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">▶</span>
            </button>
            <div className="flex-1 h-[4px] bg-[#374045] rounded-full relative">
              <div className="absolute left-0 top-0 h-full w-1/3 bg-[#00a884] rounded-full" />
            </div>
            <span className="text-[11px] text-[#8696a0]">{message.voiceDuration}</span>
            <Mic size={14} className="text-[#00a884]" />
          </div>
        )}

        {message.type === "text" && (
          <span className="text-[14.2px] leading-[19px]">{message.text}</span>
        )}

        {/* Timestamp + read receipt */}
        <span className="float-right mt-[2px] ml-2 flex items-center gap-[2px] text-[11px] text-[#ffffff99] leading-none translate-y-[2px]">
          {message.timestamp}
          {sent && (
            message.read
              ? <CheckCheck size={16} className="text-[#53bdeb] ml-0.5" />
              : <Check size={16} className="text-[#ffffff99] ml-0.5" />
          )}
        </span>
      </div>
    </div>
  );
}

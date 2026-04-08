import { Check, CheckCheck, Lock } from "lucide-react";
import type { DecryptedMessage } from "../lib/types";

interface Props {
  message: DecryptedMessage;
}

export default function MessageBubble({ message }: Props) {
  const sent = message.sentByMe;
  const isEncrypted = message.plaintext === "🔒 Encrypted";

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className={`flex ${sent ? "justify-end" : "justify-start"} mb-1 px-[6%]`}>
      <div
        className={`
          relative max-w-[65%] rounded-2xl px-3.5 pt-2 pb-2 
          ${sent
            ? "bg-indigo-500/15 border border-indigo-400/10 text-white/90"
            : "bg-white/[0.06] border border-white/[0.06] text-white/85"
          }
        `}
        style={{ wordBreak: "break-word" }}
      >
        {isEncrypted ? (
          <span className="text-sm leading-relaxed flex items-center gap-1.5 text-white/40">
            <Lock size={12} />
            Encrypted message
          </span>
        ) : (
          <span className="text-sm leading-relaxed">{message.plaintext}</span>
        )}

        {/* Timestamp + read receipt */}
        <span className="float-right mt-0.5 ml-2 flex items-center gap-0.5 text-[10px] text-white/30 leading-none translate-y-0.5">
          {time}
          {sent && (
            <CheckCheck size={14} className="text-teal-400/60 ml-0.5" />
          )}
        </span>
      </div>
    </div>
  );
}

import type { DecryptedMessage } from "../lib/types";

interface Props {
  replyTo: DecryptedMessage;
}

export default function ReplyBubble({ replyTo }: Props) {
  return (
    <div className="border-l-2 border-teal-400/40 pl-2 mb-1.5 py-0.5">
      <p className="text-[11px] text-teal-400/60 font-medium truncate">
        {replyTo.sentByMe ? "You" : "Them"}
      </p>
      <p className="text-[12px] text-white/35 truncate leading-snug">
        {replyTo.plaintext === "🔒 Encrypted" ? "Encrypted message" : replyTo.plaintext}
      </p>
    </div>
  );
}

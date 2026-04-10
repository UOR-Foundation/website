import { useState } from "react";

const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

interface Props {
  onReact: (emoji: string) => void;
  show: boolean;
  onClose: () => void;
}

export default function ReactionPicker({ onReact, show, onClose }: Props) {
  if (!show) return null;

  return (
    <div
      className="absolute bottom-full mb-1 left-0 bg-slate-900/95 backdrop-blur-md border border-white/[0.1] rounded-xl px-1.5 py-1 flex items-center gap-0.5 shadow-xl z-50 sov-scale-in"
      onMouseLeave={onClose}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onReact(emoji); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors duration-75 text-base active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

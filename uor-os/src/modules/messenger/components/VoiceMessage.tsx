import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause } from "lucide-react";

interface Props {
  /** Duration in seconds if displaying a received voice note. */
  duration?: number;
  /** Audio blob URL for playback. */
  audioUrl?: string;
  sentByMe?: boolean;
}

export default function VoiceMessage({ duration, audioUrl, sentByMe }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    audio.onended = () => { setPlaying(false); setProgress(0); };

    return () => { audio.pause(); audio.src = ""; };
  }, [audioUrl]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const displayDuration = duration ?? 0;
  const mins = Math.floor(displayDuration / 60);
  const secs = Math.floor(displayDuration % 60);

  return (
    <div className={`flex items-center gap-3 py-1 ${sentByMe ? "flex-row-reverse" : ""}`}>
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          sentByMe ? "bg-indigo-500/25 text-indigo-300" : "bg-teal-500/20 text-teal-300"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-[120px]">
        {/* Waveform bars (decorative) */}
        <div className="flex items-end gap-[2px] h-6">
          {Array.from({ length: 28 }, (_, i) => {
            const h = Math.sin(i * 0.5) * 0.5 + 0.5;
            const filled = i / 28 <= progress;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-colors ${
                  filled
                    ? sentByMe ? "bg-indigo-400/60" : "bg-teal-400/60"
                    : "bg-white/10"
                }`}
                style={{ height: `${Math.max(4, h * 24)}px` }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-white/30 mt-0.5">
          {mins}:{secs.toString().padStart(2, "0")}
        </p>
      </div>

      <Mic size={12} className="text-white/15 flex-shrink-0" />
    </div>
  );
}

import { useState, useRef } from "react";
import { Send, Smile, Mic, X, Square } from "lucide-react";
import FilePickerButton from "./FilePickerButton";
import type { DecryptedMessage, MessageType, FileManifest } from "../lib/types";

interface Props {
  onSend: (text: string, options?: { messageType?: MessageType; fileManifest?: FileManifest; replyToHash?: string }) => void;
  onTyping?: () => void;
  disabled?: boolean;
  replyTo?: DecryptedMessage | null;
  onCancelReply?: () => void;
  onFileSelected?: (file: File) => void;
}

export default function MessageInput({ onSend, onTyping, disabled, replyTo, onCancelReply, onFileSelected }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), {
      replyToHash: replyTo?.messageHash,
    });
    setText("");
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    onTyping?.();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        // Convert to file and send
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        onFileSelected?.(file);
        setRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      console.warn("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="bg-white/[0.02] backdrop-blur-sm border-t border-white/[0.06] flex-shrink-0">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04]">
          <div className="w-0.5 h-8 bg-teal-400/40 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-teal-400/60 font-medium">
              Replying to {replyTo.sentByMe ? "yourself" : "message"}
            </p>
            <p className="text-[12px] text-white/30 truncate">{replyTo.plaintext}</p>
          </div>
          <button onClick={onCancelReply} className="text-white/25 hover:text-white/50 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="h-[62px] flex items-center px-4 gap-2">
        <button className="text-white/20 hover:text-white/40 transition-colors p-2">
          <Smile size={20} />
        </button>

        <FilePickerButton
          onFileSelected={(file) => onFileSelected?.(file)}
          disabled={disabled}
        />

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={disabled || recording}
            rows={1}
            className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/90 text-sm px-4 py-2.5 outline-none placeholder:text-white/25 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/15 transition-all disabled:opacity-40 resize-none overflow-hidden"
            style={{ lineHeight: "1.25rem" }}
          />
        </div>

        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={disabled}
            className="p-2 rounded-lg text-teal-400 hover:bg-teal-500/10 transition-all"
          >
            <Send size={20} />
          </button>
        ) : recording ? (
          <button
            onClick={stopRecording}
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all animate-pulse"
          >
            <Square size={20} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="p-2 rounded-lg text-white/15 hover:text-white/40 transition-all"
          >
            <Mic size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

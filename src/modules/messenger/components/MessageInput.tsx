import { useState, useRef } from "react";
import { Send, Smile, Mic, X, Square, Timer } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import FilePickerButton from "./FilePickerButton";
import MentionAutocomplete from "./MentionAutocomplete";
import type { DecryptedMessage, MessageType, FileManifest, GroupMember } from "../lib/types";
import { EPHEMERAL_PRESETS } from "../lib/ephemeral";

interface Props {
  onSend: (text: string, options?: { messageType?: MessageType; fileManifest?: FileManifest; replyToHash?: string; selfDestructSeconds?: number | null }) => void;
  onTyping?: () => void;
  disabled?: boolean;
  replyTo?: DecryptedMessage | null;
  onCancelReply?: () => void;
  onFileSelected?: (file: File) => void;
  members?: GroupMember[];
  isGroup?: boolean;
}

export default function MessageInput({ onSend, onTyping, disabled, replyTo, onCancelReply, onFileSelected, members, isGroup }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [selfDestructSeconds, setSelfDestructSeconds] = useState<number | null>(null);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), {
      replyToHash: replyTo?.messageHash,
      selfDestructSeconds,
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Check for @mention trigger in group chats
    if (isGroup && members && members.length > 0) {
      const cursorPos = e.target.selectionStart;
      const textBefore = value.slice(0, cursorPos);
      const mentionMatch = textBefore.match(/@(\w*)$/);
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
      } else {
        setMentionQuery(null);
      }
    }
  };

  const handleMentionSelect = (member: GroupMember) => {
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      const newText = textBefore.slice(0, mentionMatch.index!) + `@${member.handle ?? member.displayName} ` + textAfter;
      setText(newText);
    }
    setMentionQuery(null);
    inputRef.current?.focus();
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

  const activeTimerPreset = EPHEMERAL_PRESETS.find(p => p.seconds === selfDestructSeconds);

  return (
    <div className="bg-white/[0.02] backdrop-blur-sm border-t border-white/[0.06] flex-shrink-0 relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04]">
          <div className="w-0.5 h-8 bg-teal-400/40 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-teal-400/60 font-medium">
              Replying to {replyTo.sentByMe ? "yourself" : (replyTo.senderName ?? "message")}
            </p>
            <p className="text-[12px] text-white/30 truncate">{replyTo.plaintext}</p>
          </div>
          <button onClick={onCancelReply} className="text-white/25 hover:text-white/50 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Self-destruct timer indicator */}
      {selfDestructSeconds && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/10 bg-amber-500/[0.03]">
          <Timer size={12} className="text-amber-400/60" />
          <span className="text-[11px] text-amber-400/60">
            Message will disappear after {activeTimerPreset?.label ?? `${selfDestructSeconds}s`}
          </span>
          <button onClick={() => setSelfDestructSeconds(null)} className="ml-auto text-white/25 hover:text-white/50">
            <X size={12} />
          </button>
        </div>
      )}

      {/* @Mention autocomplete */}
      <AnimatePresence>
        {mentionQuery !== null && isGroup && members && (
          <MentionAutocomplete
            members={members.filter(m => m.displayName !== "You")}
            query={mentionQuery}
            onSelect={handleMentionSelect}
          />
        )}
      </AnimatePresence>

      {/* Timer picker */}
      {showTimerPicker && (
        <div className="absolute bottom-full mb-1 left-4 bg-slate-900/95 backdrop-blur-md border border-white/[0.1] rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
          {EPHEMERAL_PRESETS.filter(p => p.seconds !== null).map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setSelfDestructSeconds(preset.seconds);
                setShowTimerPicker(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                selfDestructSeconds === preset.seconds
                  ? "text-amber-400/80 bg-amber-500/10"
                  : "text-white/50 hover:bg-white/[0.06]"
              }`}
            >
              {preset.label}
            </button>
          ))}
          {selfDestructSeconds && (
            <button
              onClick={() => { setSelfDestructSeconds(null); setShowTimerPicker(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] text-red-400/60 hover:bg-white/[0.06] border-t border-white/[0.06]"
            >
              Turn off
            </button>
          )}
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

        {/* Timer button */}
        <button
          onClick={() => setShowTimerPicker(!showTimerPicker)}
          className={`p-2 transition-colors ${
            selfDestructSeconds ? "text-amber-400/70 hover:text-amber-400" : "text-white/20 hover:text-white/40"
          }`}
        >
          <Timer size={18} />
        </button>

        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
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

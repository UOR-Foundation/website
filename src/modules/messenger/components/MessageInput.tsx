import { useState, useRef } from "react";
import { Send, Smile, Mic, X, Square, Timer } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import FilePickerButton from "./FilePickerButton";
import MentionAutocomplete from "./MentionAutocomplete";
import EmojiPanel from "./EmojiPanel";
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
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim(), { replyToHash: replyTo?.messageHash, selfDestructSeconds });
    setText("");
    setShowEmoji(false);
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    onTyping?.();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    if (isGroup && members && members.length > 0) {
      const cursorPos = e.target.selectionStart;
      const textBefore = value.slice(0, cursorPos);
      const mentionMatch = textBefore.match(/@(\w*)$/);
      setMentionQuery(mentionMatch ? mentionMatch[1] : null);
    }
  };

  const handleMentionSelect = (member: GroupMember) => {
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const textAfter = text.slice(cursorPos);
    const mentionMatch = textBefore.match(/@(\w*)$/);
    if (mentionMatch) {
      setText(textBefore.slice(0, mentionMatch.index!) + `@${member.handle ?? member.displayName} ` + textAfter);
    }
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? text.length;
    const newText = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
    setText(newText);
    inputRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        onFileSelected?.(new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" }));
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { console.warn("Microphone access denied"); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const activeTimerPreset = EPHEMERAL_PRESETS.find(p => p.seconds === selfDestructSeconds);

  return (
    <div className="bg-slate-950/90 backdrop-blur-sm border-t border-white/[0.06] flex-shrink-0 relative">
      {/* Emoji Panel */}
      <EmojiPanel open={showEmoji} onClose={() => setShowEmoji(false)} onSelect={handleEmojiSelect} />

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04]">
          <div className="w-0.5 h-8 bg-teal-400/40 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-teal-400/60 font-medium">Replying to {replyTo.sentByMe ? "yourself" : (replyTo.senderName ?? "message")}</p>
            <p className="text-[12px] text-white/30 truncate">{replyTo.plaintext}</p>
          </div>
          <button onClick={onCancelReply} className="text-white/25 hover:text-white/50 transition-colors"><X size={14} /></button>
        </div>
      )}

      {/* Self-destruct indicator */}
      {selfDestructSeconds && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/10 bg-amber-500/[0.03]">
          <Timer size={12} className="text-amber-400/60" />
          <span className="text-[11px] text-amber-400/60">Disappears after {activeTimerPreset?.label ?? `${selfDestructSeconds}s`}</span>
          <button onClick={() => setSelfDestructSeconds(null)} className="ml-auto text-white/25 hover:text-white/50"><X size={12} /></button>
        </div>
      )}

      {/* @Mention autocomplete */}
      <AnimatePresence>
        {mentionQuery !== null && isGroup && members && (
          <MentionAutocomplete members={members.filter(m => m.displayName !== "You")} query={mentionQuery} onSelect={handleMentionSelect} />
        )}
      </AnimatePresence>

      {/* Timer picker */}
      {showTimerPicker && (
        <div className="absolute bottom-full mb-1 left-4 bg-slate-900/95 backdrop-blur-md border border-white/[0.1] rounded-xl shadow-xl z-50 py-1 min-w-[140px]">
          {EPHEMERAL_PRESETS.filter(p => p.seconds !== null).map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setSelfDestructSeconds(preset.seconds); setShowTimerPicker(false); }}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                selfDestructSeconds === preset.seconds ? "text-amber-400/80 bg-amber-500/10" : "text-white/50 hover:bg-white/[0.06]"
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

      <div className="h-[56px] flex items-center px-3 gap-1.5">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2 rounded-lg transition-colors duration-100 ${showEmoji ? "text-teal-400/80" : "text-white/20 hover:text-white/40"}`}
        >
          <Smile size={22} />
        </button>

        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            disabled={disabled || recording}
            rows={1}
            className="w-full h-[38px] rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/90 text-[15px] px-4 py-2 outline-none placeholder:text-white/25 focus:border-teal-500/30 transition-all duration-100 disabled:opacity-40 resize-none overflow-hidden"
            style={{ lineHeight: "1.25rem" }}
          />
        </div>

        <FilePickerButton onFileSelected={(file) => onFileSelected?.(file)} disabled={disabled} />

        {/* Timer */}
        <button
          onClick={() => setShowTimerPicker(!showTimerPicker)}
          className={`p-2 transition-colors duration-100 ${selfDestructSeconds ? "text-amber-400/70" : "text-white/15 hover:text-white/35"}`}
        >
          <Timer size={18} />
        </button>

        {text.trim() ? (
          <button onClick={handleSend} disabled={disabled} className="w-10 h-10 rounded-full bg-teal-500/90 hover:bg-teal-500 flex items-center justify-center text-white transition-all duration-100">
            <Send size={18} className="translate-x-[1px]" />
          </button>
        ) : recording ? (
          <button onClick={stopRecording} className="p-2 text-red-400 hover:bg-red-500/10 transition-all animate-pulse">
            <Square size={20} />
          </button>
        ) : (
          <button onClick={startRecording} disabled={disabled} className="p-2 text-white/15 hover:text-white/40 transition-all duration-100">
            <Mic size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

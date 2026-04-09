import { useRef } from "react";
import { Paperclip } from "lucide-react";

interface Props {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function FilePickerButton({ onFileSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="text-white/20 hover:text-white/40 transition-colors p-2 disabled:opacity-40"
        title="Attach file"
      >
        <Paperclip size={20} />
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelected(file);
            e.target.value = "";
          }
        }}
      />
    </>
  );
}

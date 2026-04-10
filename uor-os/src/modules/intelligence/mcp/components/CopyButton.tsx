import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
  large?: boolean;
}

const CopyButton = ({ text, label, large }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handle = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      onClick={handle}
      className={`inline-flex items-center gap-1.5 shrink-0 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-body ${
        large ? "px-5 py-2.5 text-base" : "px-3 py-1.5 text-sm"
      }`}
      aria-label={`Copy ${label || "text"}`}
    >
      {copied ? (
        <>
          <Check size={large ? 16 : 14} /> Copied!
        </>
      ) : (
        <>
          <Copy size={large ? 16 : 14} /> {label || "Copy"}
        </>
      )}
    </button>
  );
};

export default CopyButton;

import { formatFileSize } from "../lib/file-transfer";
import type { FileManifest } from "../lib/types";
import { FileText, Download, Image, Film, Loader2 } from "lucide-react";
import { useState } from "react";

interface Props {
  manifest: FileManifest;
  sentByMe: boolean;
  onDownload?: () => void;
}

const iconForMime = (mime: string) => {
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return Film;
  return FileText;
};

export default function FileMessage({ manifest, sentByMe, onDownload }: Props) {
  const [downloading, setDownloading] = useState(false);
  const Icon = iconForMime(manifest.mimeType);

  const handleDownload = async () => {
    if (downloading || !onDownload) return;
    setDownloading(true);
    try {
      onDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        sentByMe
          ? "bg-indigo-500/10 border-indigo-400/15 hover:bg-indigo-500/15"
          : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
      }`}
      onClick={handleDownload}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        sentByMe ? "bg-indigo-500/20" : "bg-white/[0.06]"
      }`}>
        {downloading ? (
          <Loader2 size={18} className="animate-spin text-teal-400" />
        ) : (
          <Icon size={18} className="text-white/50" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{manifest.filename}</p>
        <p className="text-[11px] text-white/30">
          {formatFileSize(manifest.sizeBytes)} · {manifest.chunkCount} chunk{manifest.chunkCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Download size={16} className="text-white/25 flex-shrink-0" />
    </div>
  );
}

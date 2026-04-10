import { useState } from "react";
import { Image as ImageIcon, Download, Loader2 } from "lucide-react";

interface Props {
  thumbnailUrl?: string;
  filename: string;
  sizeLabel: string;
  sentByMe: boolean;
  onDownload?: () => void;
}

export default function ImageMessage({ thumbnailUrl, filename, sizeLabel, sentByMe, onDownload }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (downloading || !onDownload) return;
    setDownloading(true);
    onDownload();
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div className="relative max-w-[240px] rounded-xl overflow-hidden group cursor-pointer" onClick={handleDownload}>
      {thumbnailUrl ? (
        <>
          {!loaded && (
            <div className="w-full h-40 bg-white/[0.04] flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-white/20" />
            </div>
          )}
          <img
            src={thumbnailUrl}
            alt={filename}
            className={`w-full max-h-[300px] object-cover ${loaded ? "block" : "hidden"}`}
            onLoad={() => setLoaded(true)}
          />
        </>
      ) : (
        <div className={`w-full h-40 flex flex-col items-center justify-center gap-2 ${
          sentByMe ? "bg-indigo-500/10" : "bg-white/[0.04]"
        }`}>
          <ImageIcon size={28} className="text-white/20" />
          <p className="text-xs text-white/30 truncate max-w-[90%]">{filename}</p>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {downloading ? (
          <Loader2 size={24} className="animate-spin text-white" />
        ) : (
          <Download size={24} className="text-white" />
        )}
      </div>

      <div className="absolute bottom-1 right-1 bg-black/50 rounded px-1.5 py-0.5 text-[10px] text-white/70">
        {sizeLabel}
      </div>
    </div>
  );
}

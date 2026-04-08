import React from "react";
import { Camera } from "lucide-react";

import cover0 from "@/assets/covers/cover-0.jpg";
import cover1 from "@/assets/covers/cover-1.jpg";
import cover2 from "@/assets/covers/cover-2.jpg";
import cover3 from "@/assets/covers/cover-3.jpg";
import cover4 from "@/assets/covers/cover-4.jpg";
import cover5 from "@/assets/covers/cover-5.jpg";
import cover6 from "@/assets/covers/cover-6.jpg";
import cover7 from "@/assets/covers/cover-7.jpg";
import cover8 from "@/assets/covers/cover-8.jpg";
import cover9 from "@/assets/covers/cover-9.jpg";

const COVERS = [cover0, cover1, cover2, cover3, cover4, cover5, cover6, cover7, cover8, cover9];

function pickCover(cid: string): string {
  const code = cid.charCodeAt(cid.length - 1) % 10;
  return COVERS[code];
}

interface ProfileCoverProps {
  cid: string;
}

const ProfileCover: React.FC<ProfileCoverProps> = ({ cid }) => {
  const src = pickCover(cid);

  return (
    <div className="relative w-full h-[120px] md:h-[180px] rounded-xl overflow-hidden group">
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        width={1536}
        height={512}
      />
      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
      {/* Future edit overlay */}
      <button
        disabled
        className="absolute top-3 right-3 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/20 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed"
        title="Cover editing coming soon"
      >
        <Camera className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ProfileCover;

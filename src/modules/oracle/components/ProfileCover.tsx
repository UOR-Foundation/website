import React, { useState, useRef, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

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
  const defaultSrc = pickCover(cid);
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const viewH = window.innerHeight;
        // Only compute when visible
        if (rect.bottom > 0 && rect.top < viewH) {
          // Shift range: -30px to +30px based on scroll position
          const progress = (rect.top + rect.height / 2) / viewH;
          setOffsetY((0.5 - progress) * 60);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Fetch any existing custom cover
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("address_cover_images")
        .select("storage_path")
        .eq("address_cid", cid)
        .maybeSingle();
      if (!cancelled && data?.storage_path) {
        const { data: urlData } = supabase.storage
          .from("address-covers")
          .getPublicUrl(data.storage_path);
        if (urlData?.publicUrl) setCustomUrl(urlData.publicUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [cid]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${cid}.${ext}`;

      // Upload to storage (upsert)
      const { error: uploadErr } = await supabase.storage
        .from("address-covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Upsert DB record
      const { error: dbErr } = await supabase
        .from("address_cover_images")
        .upsert(
          { address_cid: cid, user_id: user.id, storage_path: path },
          { onConflict: "address_cid" }
        );
      if (dbErr) throw dbErr;

      // Update displayed URL
      const { data: urlData } = supabase.storage
        .from("address-covers")
        .getPublicUrl(path);
      setCustomUrl(urlData.publicUrl + "?t=" + Date.now());
      toast.success("Cover updated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[200px] md:h-[260px] rounded-2xl overflow-hidden group">
      <img
        src={customUrl || defaultSrc}
        alt=""
        className="w-full h-full object-cover will-change-transform"
        loading="lazy"
        width={1536}
        height={512}
        style={{
          transform: `translateY(${offsetY}px) scale(1.15)`,
          transition: "transform 0.1s linear",
        }}
      />
      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />

      {/* Edit button — only for logged-in users */}
      {user && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute top-3 right-3 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/20 text-muted-foreground/70 hover:text-foreground hover:bg-background/60 opacity-0 group-hover:opacity-100 transition-all"
            title="Change cover image"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileCover;

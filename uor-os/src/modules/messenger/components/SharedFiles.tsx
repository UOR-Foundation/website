import { useState, useEffect } from "react";
import { Folder, File, Upload, Download, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatFileSize } from "../lib/file-transfer";

interface FolderEntry {
  id: string;
  filename: string;
  fileCid: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
}

interface SharedFolder {
  id: string;
  name: string;
  createdBy: string;
  entries: FolderEntry[];
}

interface Props {
  sessionId: string;
  onClose: () => void;
}

export default function SharedFiles({ sessionId, onClose }: Props) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchFolders();
  }, [sessionId]);

  const fetchFolders = async () => {
    const { data: folderData } = await supabase
      .from("shared_folders")
      .select("id, name, created_by")
      .eq("session_id", sessionId);

    if (!folderData) { setLoading(false); return; }

    const foldersWithEntries: SharedFolder[] = [];
    for (const f of folderData) {
      const { data: entries } = await supabase
        .from("folder_entries")
        .select("id, filename, file_cid, size_bytes, uploaded_by, created_at")
        .eq("folder_id", f.id)
        .order("created_at", { ascending: false });

      foldersWithEntries.push({
        id: f.id,
        name: f.name,
        createdBy: f.created_by,
        entries: (entries ?? []).map((e: any) => ({
          id: e.id,
          filename: e.filename,
          fileCid: e.file_cid,
          sizeBytes: e.size_bytes,
          uploadedBy: e.uploaded_by,
          createdAt: e.created_at,
        })),
      });
    }

    setFolders(foldersWithEntries);
    setLoading(false);
  };

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const { error } = await supabase
        .from("shared_folders")
        .insert({
          session_id: sessionId,
          name: newFolderName.trim(),
          created_by: user.id,
        } as any);

      if (error) throw error;
      toast.success("Folder created");
      setNewFolderName("");
      fetchFolders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const totalFiles = folders.reduce((acc, f) => acc + f.entries.length, 0);
  const totalSize = folders.reduce(
    (acc, f) => acc + f.entries.reduce((a, e) => a + e.sizeBytes, 0),
    0,
  );

  return (
    <div className="h-full flex flex-col bg-slate-950/90">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-teal-400/60" />
          <h3 className="text-sm text-white/70 font-medium">Shared Files</h3>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 text-sm transition-colors">
          Close
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <p className="text-xs text-white/30">
          {totalFiles} files · {formatFileSize(totalSize)}
        </p>
      </div>

      {/* Create folder */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name…"
          className="flex-1 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs px-3 outline-none placeholder:text-white/20 focus:border-teal-500/30 transition-colors"
        />
        <button
          onClick={createFolder}
          disabled={creatingFolder || !newFolderName.trim()}
          className="h-8 px-3 rounded-lg bg-teal-500/15 text-teal-300/70 text-xs hover:bg-teal-500/25 transition-colors disabled:opacity-30 flex items-center gap-1"
        >
          {creatingFolder ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Create
        </button>
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-white/30" />
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className="text-center py-12 text-white/20 text-sm">
            <Folder size={24} className="mx-auto mb-2 text-white/10" />
            <p>No shared folders yet</p>
          </div>
        )}

        {folders.map((folder) => (
          <div key={folder.id} className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04]">
              <Folder size={14} className="text-teal-400/50" />
              <span className="text-sm text-white/70 font-medium flex-1">{folder.name}</span>
              <span className="text-[10px] text-white/25">{folder.entries.length} files</span>
            </div>

            {folder.entries.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-white/20">Empty folder</div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {folder.entries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                    <File size={14} className="text-white/25 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 truncate">{entry.filename}</p>
                      <p className="text-[10px] text-white/25">{formatFileSize(entry.sizeBytes)}</p>
                    </div>
                    <Download size={14} className="text-white/20 hover:text-white/50 cursor-pointer flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

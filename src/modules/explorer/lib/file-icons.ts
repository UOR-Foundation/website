/**
 * file-icons — Maps source types and MIME types to lucide icons and accent colors.
 */

import {
  FileText, File, Globe, ClipboardPaste, FolderOpen,
  Braces, FileSpreadsheet, FileImage, FileCode, FileArchive,
  Layers,
} from "lucide-react";
import type { ComponentType } from "react";

export interface FileIconInfo {
  icon: ComponentType<any>;
  color: string; // HSL accent
  label: string;
}

const SOURCE_MAP: Record<string, FileIconInfo> = {
  file: { icon: FileText, color: "hsl(210 70% 55%)", label: "File" },
  paste: { icon: ClipboardPaste, color: "hsl(270 60% 60%)", label: "Paste" },
  url: { icon: Globe, color: "hsl(160 55% 45%)", label: "URL" },
  vault: { icon: File, color: "hsl(38 60% 55%)", label: "Vault" },
  workspace: { icon: Layers, color: "hsl(200 65% 50%)", label: "Workspace" },
  folder: { icon: FolderOpen, color: "hsl(35 75% 50%)", label: "Folder" },
};

const EXT_MAP: Record<string, FileIconInfo> = {
  pdf: { icon: FileText, color: "hsl(0 65% 55%)", label: "PDF" },
  json: { icon: Braces, color: "hsl(38 70% 50%)", label: "JSON" },
  csv: { icon: FileSpreadsheet, color: "hsl(140 50% 45%)", label: "CSV" },
  xlsx: { icon: FileSpreadsheet, color: "hsl(140 55% 40%)", label: "Excel" },
  xls: { icon: FileSpreadsheet, color: "hsl(140 55% 40%)", label: "Excel" },
  png: { icon: FileImage, color: "hsl(280 50% 55%)", label: "Image" },
  jpg: { icon: FileImage, color: "hsl(280 50% 55%)", label: "Image" },
  jpeg: { icon: FileImage, color: "hsl(280 50% 55%)", label: "Image" },
  webp: { icon: FileImage, color: "hsl(280 50% 55%)", label: "Image" },
  svg: { icon: FileImage, color: "hsl(30 70% 50%)", label: "SVG" },
  html: { icon: FileCode, color: "hsl(15 70% 55%)", label: "HTML" },
  js: { icon: FileCode, color: "hsl(50 70% 50%)", label: "JavaScript" },
  ts: { icon: FileCode, color: "hsl(210 70% 55%)", label: "TypeScript" },
  md: { icon: FileText, color: "hsl(200 40% 50%)", label: "Markdown" },
  txt: { icon: FileText, color: "hsl(0 0% 50%)", label: "Text" },
  zip: { icon: FileArchive, color: "hsl(0 0% 45%)", label: "Archive" },
  xml: { icon: FileCode, color: "hsl(20 60% 50%)", label: "XML" },
};

export function getFileIcon(filename: string, source: string): FileIconInfo {
  // Check extension first
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (EXT_MAP[ext]) return EXT_MAP[ext];
  // Fall back to source type
  return SOURCE_MAP[source] || SOURCE_MAP.file;
}

/**
 * Text Extraction Pipeline
 * ════════════════════════
 *
 * Extracts text from files based on MIME type.
 * - Plain text / Markdown / JSON / CSV: read directly
 * - HTML: strip tags
 * - PDF / DOCX: delegate to parse-document edge function
 * - Images: extract filename metadata only
 */

import { supabase } from "@/integrations/supabase/client";
import type { ExtractedContent } from "./types";

/** Strip HTML tags and decode entities */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

/**
 * Extract text content from a File object.
 */
export async function extractText(file: File): Promise<ExtractedContent> {
  const type = file.type || "text/plain";
  const metadata: Record<string, string> = {
    filename: file.name,
    mimeType: type,
    sizeBytes: String(file.size),
    lastModified: new Date(file.lastModified).toISOString(),
  };

  // Text-based formats: read directly
  if (
    type.startsWith("text/") ||
    type === "application/json" ||
    type === "application/xml" ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".csv") ||
    file.name.endsWith(".tsv")
  ) {
    const text = await file.text();
    return { text, metadata };
  }

  // HTML
  if (type === "text/html" || file.name.endsWith(".html") || file.name.endsWith(".htm")) {
    const html = await file.text();
    return { text: stripHtml(html), metadata };
  }

  // Binary documents (PDF, DOCX) — use edge function
  if (
    type === "application/pdf" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".pdf") ||
    file.name.endsWith(".docx")
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), "")
      );

      const { data, error } = await supabase.functions.invoke("parse-document", {
        body: { 
          filename: file.name,
          content: base64,
          mimeType: type,
        },
      });

      if (error) throw error;
      return { text: data?.text || `[Binary file: ${file.name}]`, metadata };
    } catch {
      return { text: `[Could not extract text from ${file.name}]`, metadata };
    }
  }

  // Images: metadata only
  if (type.startsWith("image/")) {
    return { text: `[Image: ${file.name}]`, metadata };
  }

  // Fallback: try reading as text
  try {
    const text = await file.text();
    return { text, metadata };
  } catch {
    return { text: `[Unsupported file: ${file.name}]`, metadata };
  }
}

/**
 * Extract text from a URL using Firecrawl scraping.
 */
export async function extractFromUrl(url: string): Promise<ExtractedContent> {
  const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
    body: { url, options: { formats: ["markdown"], onlyMainContent: true } },
  });

  if (error || !data?.success) {
    return {
      text: `[Could not fetch: ${url}]`,
      metadata: { sourceUrl: url, mimeType: "text/html" },
    };
  }

  const markdown = data?.data?.markdown || data?.data?.content || "";
  const title = data?.data?.metadata?.title || url;

  return {
    text: markdown,
    metadata: {
      sourceUrl: url,
      title,
      mimeType: "text/html",
    },
  };
}

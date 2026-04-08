import { corsHeaders } from '@supabase/supabase-js/cors';

/**
 * parse-document — Server-side text extraction for binary files
 * 
 * Accepts base64-encoded file content and extracts text.
 * Currently handles plain text extraction from base64.
 * For PDF/DOCX, we do basic text extraction.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { filename, content, mimeType } = await req.json();

    if (!content || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing filename or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 content
    const binaryStr = atob(content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    let extractedText = "";

    if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
      // Basic PDF text extraction: find text between BT/ET blocks
      // and decode literal strings in parentheses
      const raw = new TextDecoder("latin1").decode(bytes);
      
      // Extract text from PDF streams
      const textMatches = raw.match(/\(([^)]*)\)/g);
      if (textMatches) {
        extractedText = textMatches
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
          .join(" ");
      }

      // If no text found via parentheses, try extracting readable ASCII sequences
      if (!extractedText.trim()) {
        const readable = raw.match(/[A-Za-z][A-Za-z0-9 .,;:!?'"-]{4,}/g);
        if (readable) {
          extractedText = readable.join(" ");
        }
      }

      if (!extractedText.trim()) {
        extractedText = `[PDF: ${filename} — ${bytes.length} bytes. Text extraction limited server-side. For full extraction, use a PDF viewer.]`;
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.endsWith(".docx")
    ) {
      // DOCX is a ZIP file. Extract text from XML content.
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      
      // Find text between <w:t> tags
      const wt = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (wt) {
        extractedText = wt
          .map(m => m.replace(/<[^>]+>/g, ""))
          .join(" ");
      }

      if (!extractedText.trim()) {
        extractedText = `[DOCX: ${filename} — ${bytes.length} bytes]`;
      }
    } else {
      // Try UTF-8 text extraction
      try {
        extractedText = new TextDecoder("utf-8").decode(bytes);
      } catch {
        extractedText = `[Binary file: ${filename} — ${bytes.length} bytes]`;
      }
    }

    return new Response(
      JSON.stringify({ text: extractedText, filename, bytes: bytes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

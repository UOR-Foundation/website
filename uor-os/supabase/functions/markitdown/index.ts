import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    let text = "";
    let filename = "input";

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
      filename = file.name;
      text = await file.text();
    } else {
      // JSON body with text/url
      const body = await req.json();
      text = body.text ?? "";
      filename = body.filename ?? "input.txt";

      // If URL is provided, fetch and convert
      if (body.url) {
        const resp = await fetch(body.url);
        if (!resp.ok) {
          return new Response(JSON.stringify({ error: `Failed to fetch URL: ${resp.status}` }), {
            status: 400,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
        text = await resp.text();
        filename = body.url.split("/").pop() ?? "page.html";
      }
    }

    // Convert to markdown based on file type
    const markdown = convertToMarkdown(text, filename);

    return new Response(JSON.stringify({
      success: true,
      filename,
      markdown,
      stats: {
        inputLength: text.length,
        outputLength: markdown.length,
        compressionRatio: text.length > 0 ? (markdown.length / text.length).toFixed(2) : "1.00",
      },
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

function convertToMarkdown(text: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "html":
    case "htm":
      return htmlToMarkdown(text);
    case "csv":
      return csvToMarkdown(text);
    case "json":
      return jsonToMarkdown(text);
    case "xml":
      return xmlToMarkdown(text);
    case "md":
    case "markdown":
      return text; // Already markdown
    case "txt":
    case "log":
      return text; // Plain text → markdown as-is
    case "py":
    case "js":
    case "ts":
    case "rs":
    case "go":
    case "java":
    case "c":
    case "cpp":
    case "rb":
      return `# ${filename}\n\n\`\`\`${ext}\n${text}\n\`\`\`\n`;
    default:
      return htmlToMarkdown(text);
  }
}

function htmlToMarkdown(html: string): string {
  let md = html;
  // Strip scripts, styles
  md = md.replace(/<script[\s\S]*?<\/script>/gi, "");
  md = md.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Headers
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1\n\n");
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "##### $1\n\n");
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, "###### $1\n\n");
  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");
  // Bold, italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  // Links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  // Images
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[ou]l[^>]*>/gi, "\n");
  // Code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n");
  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Decode entities
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Collapse whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

function csvToMarkdown(csv: string): string {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return "";
  const header = lines[0].split(",").map(c => c.trim());
  const sep = header.map(() => "---");
  const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim()));
  let md = `| ${header.join(" | ")} |\n| ${sep.join(" | ")} |\n`;
  for (const row of rows) {
    md += `| ${row.join(" | ")} |\n`;
  }
  return md;
}

function jsonToMarkdown(json: string): string {
  try {
    const obj = JSON.parse(json);
    return `# JSON Document\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`;
  } catch {
    return `\`\`\`\n${json}\n\`\`\`\n`;
  }
}

function xmlToMarkdown(xml: string): string {
  return `# XML Document\n\n\`\`\`xml\n${xml}\n\`\`\`\n`;
}

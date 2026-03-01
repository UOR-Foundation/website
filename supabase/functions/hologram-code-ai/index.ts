/**
 * hologram-code-ai — AI-powered code completions for Hologram Code
 * ════════════════════════════════════════════════════════════════
 *
 * Uses Lovable AI (Gemini Flash) to provide contextual code
 * completions beyond what static TypeScript analysis can offer.
 *
 * Actions:
 *   complete  — Given code context + cursor position, return completions
 *   hover     — Given a symbol, return documentation/explanation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert code completion engine for a TypeScript/React IDE called Hologram Code.
You receive the surrounding code context and cursor position, and return precise code completions.

Rules:
1. Return ONLY valid JSON with a "completions" array
2. Each completion has: label, text, insertText, kind, detail, documentation (optional), isSnippet (boolean)
3. Return 3-8 completions max, ranked by relevance
4. Completions should be contextually appropriate (methods after ".", types after ":", etc.)
5. Include proper TypeScript types in suggestions
6. For snippets, use $1, $2 etc. for tab stops
7. "kind" must be one of: function, method, property, variable, class, interface, module, keyword, snippet, text, constant, enum, type
8. "detail" should show the type signature briefly
9. Do NOT include markdown formatting, just plain JSON

Example response:
{
  "completions": [
    { "label": "useState", "text": "useState", "insertText": "useState<$1>($2)", "kind": "function", "detail": "<T>(initial: T) => [T, SetState<T>]", "isSnippet": true },
    { "label": "useEffect", "text": "useEffect", "insertText": "useEffect(() => {\\n  $1\\n}, [$2])", "kind": "function", "detail": "(effect, deps?) => void", "isSnippet": true }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, filePath, prefix, lineContent, contextLines, cursorOffset, allFiles } =
      await req.json();

    if (action !== "complete") {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ completions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the prompt with code context
    const contextWithCursor = (contextLines as string[])
      .map((line: string, i: number) => {
        const marker = i === cursorOffset ? " ◄── cursor here" : "";
        return `${i + 1}: ${line}${marker}`;
      })
      .join("\n");

    const userPrompt = `File: ${filePath}
Current line: "${lineContent}"
Prefix being typed: "${prefix}"
Other project files: ${(allFiles as string[]).slice(0, 15).join(", ")}

Code context (cursor marked with ◄──):
\`\`\`typescript
${contextWithCursor}
\`\`\`

Return completions for what the developer is likely trying to type next. Focus on:
- If after a dot (.), suggest relevant methods/properties
- If starting a new statement, suggest common patterns for this context
- If in an import, suggest likely module names
- Include type information in detail fields`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ completions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ completions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    // Parse the JSON from the AI response
    let completions: any[] = [];
    try {
      // Try to extract JSON from the response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*"completions"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        completions = parsed.completions || [];
      }
    } catch {
      console.error("Failed to parse AI completions:", content);
    }

    return new Response(JSON.stringify({ completions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hologram-code-ai error:", e);
    return new Response(
      JSON.stringify({ completions: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

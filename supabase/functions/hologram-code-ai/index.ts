/**
 * hologram-code-ai — AI-powered code intelligence for Hologram Code
 * ════════════════════════════════════════════════════════════════
 *
 * Uses Lovable AI (Gemini Flash) to provide contextual code
 * completions and inline code actions.
 *
 * Actions:
 *   complete   — Given code context + cursor position, return completions
 *   refactor   — Suggest refactored version of selected code
 *   explain    — Explain selected code in plain language
 *   docstring  — Generate JSDoc/TSDoc for selected code
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPLETE_SYSTEM = `You are an expert code completion engine for a TypeScript/React IDE called Hologram Code.
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
    { "label": "useState", "text": "useState", "insertText": "useState<$1>($2)", "kind": "function", "detail": "<T>(initial: T) => [T, SetState<T>]", "isSnippet": true }
  ]
}`;

const REFACTOR_SYSTEM = `You are an expert TypeScript/React refactoring assistant.
Given selected code, return a refactored version that is cleaner, more idiomatic, and follows best practices.
Return ONLY valid JSON: { "refactored": "<the refactored code>", "explanation": "<one-sentence summary of changes>" }
Do NOT wrap in markdown. Return raw JSON only.`;

const EXPLAIN_SYSTEM = `You are an expert code explainer for TypeScript/React.
Given selected code, explain what it does in clear, concise language that a mid-level developer would understand.
Return ONLY valid JSON: { "explanation": "<your explanation>" }
Use 2-5 sentences. Mention key patterns, potential issues, and what the code achieves.
Do NOT wrap in markdown. Return raw JSON only.`;

const DOCSTRING_SYSTEM = `You are an expert TypeScript documentation generator.
Given selected code (function, class, interface, or variable), generate a JSDoc/TSDoc comment block.
Return ONLY valid JSON: { "docstring": "<the JSDoc comment including /** and */>" }
Include @param, @returns, @throws, @example where appropriate.
Do NOT wrap in markdown. Return raw JSON only.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ completions: [], error: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Complete action ─────────────────────────────────────────
    if (action === "complete") {
      const { filePath, prefix, lineContent, contextLines, cursorOffset, allFiles } = body;

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

Return completions for what the developer is likely trying to type next.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: COMPLETE_SYSTEM },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ completions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content ?? "";
      let completions: any[] = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*"completions"[\s\S]*\}/);
        if (jsonMatch) {
          completions = JSON.parse(jsonMatch[0]).completions || [];
        }
      } catch { /* ignore */ }

      return new Response(JSON.stringify({ completions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Code action actions (refactor, explain, docstring) ───────
    if (action === "refactor" || action === "explain" || action === "docstring") {
      const { selectedCode, filePath, language } = body;

      if (!selectedCode || selectedCode.trim().length === 0) {
        return new Response(JSON.stringify({ error: "No code selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemPrompts: Record<string, string> = {
        refactor: REFACTOR_SYSTEM,
        explain: EXPLAIN_SYSTEM,
        docstring: DOCSTRING_SYSTEM,
      };

      const userPrompts: Record<string, string> = {
        refactor: `File: ${filePath} (${language || "typescript"})\n\nRefactor this code:\n\`\`\`\n${selectedCode}\n\`\`\``,
        explain: `File: ${filePath} (${language || "typescript"})\n\nExplain this code:\n\`\`\`\n${selectedCode}\n\`\`\``,
        docstring: `File: ${filePath} (${language || "typescript"})\n\nGenerate a JSDoc/TSDoc comment for:\n\`\`\`\n${selectedCode}\n\`\`\``,
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompts[action] },
            { role: "user", content: userPrompts[action] },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content ?? "";

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* fallback below */ }

      // Fallback: return raw content
      if (action === "explain") {
        return new Response(JSON.stringify({ explanation: content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action === "refactor") {
        return new Response(JSON.stringify({ refactored: content, explanation: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ docstring: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hologram-code-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
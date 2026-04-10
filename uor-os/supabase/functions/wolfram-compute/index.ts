import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * wolfram-compute — Proxy to Wolfram Alpha Full Results API.
 *
 * Accepts a natural-language query, returns structured pods
 * with titles, plaintext, images, and metadata.
 *
 * GET /wolfram-compute?q=mass+of+the+sun
 * POST /wolfram-compute { "query": "mass of the sun" }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface WolframPod {
  title: string;
  id: string;
  subpods: Array<{
    title: string;
    plaintext: string;
    img?: { src: string; alt: string; width: string; height: string };
  }>;
  primary?: boolean;
}

interface WolframResult {
  success: boolean;
  inputInterpretation?: string;
  pods: WolframPod[];
  didYouMean?: string[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const WOLFRAM_APP_ID = Deno.env.get("WOLFRAM_APP_ID");
  if (!WOLFRAM_APP_ID) {
    return new Response(
      JSON.stringify({ success: false, error: "WOLFRAM_APP_ID not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let query = "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    query = url.searchParams.get("q") || "";
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      query = body.query || body.q || "";
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  query = query.trim();
  if (!query) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing query parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const apiUrl = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&appid=${WOLFRAM_APP_ID}&output=json&format=plaintext,image`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wolfram API error [${response.status}]: ${text}`);
    }

    const data = await response.json();
    const queryResult = data?.queryresult;

    if (!queryResult || queryResult.success === false) {
      const result: WolframResult = {
        success: false,
        didYouMean: queryResult?.didyoumeans?.map((d: any) =>
          typeof d === "string" ? d : d?.val
        ).filter(Boolean) || [],
        pods: [],
        error: queryResult?.error?.msg || "No results found",
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse pods
    const rawPods: any[] = queryResult.pods || [];
    const pods: WolframPod[] = rawPods.map((pod: any) => ({
      title: pod.title || "Untitled",
      id: pod.id || "",
      primary: pod.primary === true,
      subpods: (pod.subpods || []).map((sp: any) => ({
        title: sp.title || "",
        plaintext: sp.plaintext || "",
        img: sp.img ? {
          src: sp.img.src,
          alt: sp.img.alt || "",
          width: sp.img.width || "200",
          height: sp.img.height || "50",
        } : undefined,
      })),
    }));

    // Extract input interpretation
    const inputPod = pods.find(p => p.id === "Input" || p.id === "InputInformation");
    const inputInterpretation = inputPod?.subpods?.[0]?.plaintext || query;

    const result: WolframResult = {
      success: true,
      inputInterpretation,
      pods: pods.filter(p => p.id !== "Input"),
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("Wolfram compute error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message, pods: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

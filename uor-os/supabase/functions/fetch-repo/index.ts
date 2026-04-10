/**
 * fetch-repo — Edge function to proxy GitHub repository ZIP downloads.
 *
 * Accepts { owner, repo, branch } and returns the ZIP archive as binary.
 * This avoids CORS issues when fetching from GitHub's archive endpoint.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { owner, repo, branch } = await req.json();

    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: "Missing owner or repo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch || "main"}.zip`;

    const ghResponse = await fetch(archiveUrl, {
      headers: { "User-Agent": "UOR-CodeNexus/1.0" },
      redirect: "follow",
    });

    if (!ghResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `GitHub returned ${ghResponse.status}`,
          detail: `Could not fetch ${archiveUrl}`,
        }),
        { status: ghResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zipData = await ghResponse.arrayBuffer();

    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Length": zipData.byteLength.toString(),
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

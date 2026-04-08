const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    if (!PINATA_JWT) {
      return new Response(
        JSON.stringify({ error: "PINATA_JWT not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PINATA_GATEWAY_URL = Deno.env.get("PINATA_GATEWAY_URL");

    const body = await req.json();
    const { source, receipt } = body;

    if (!source || !receipt) {
      return new Response(
        JSON.stringify({ error: "Missing 'source' and/or 'receipt' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the IPFS payload: the full UOR artifact
    const artifact = {
      "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
      "@type": "uor:InscribedArtifact",
      "uor:source": source,
      "uor:receipt": {
        cid: receipt.cid,
        derivationId: receipt.derivationId,
        glyph: receipt.glyph,
        ipv6: receipt.ipv6,
        hashHex: receipt.hashHex,
        triword: receipt.triword,
        triwordFormatted: receipt.triwordFormatted,
        engine: receipt.engine,
        crateVersion: receipt.crateVersion,
        ringByte: receipt.ringByte,
        ringPartition: receipt.ringPartition,
        ringFactors: receipt.ringFactors,
        ringCriticalIdentity: receipt.ringCriticalIdentity,
        ringPopcount: receipt.ringPopcount,
        ringBasis: receipt.ringBasis,
      },
      "uor:inscribedAt": new Date().toISOString(),
    };

    // Pin to IPFS via Pinata
    const pinResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: artifact,
        pinataMetadata: {
          name: `uor:${receipt.triword || receipt.cid?.slice(0, 16) || "artifact"}`,
          keyvalues: {
            uor_cid: receipt.cid || "",
            triword: receipt.triword || "",
            ipv6: receipt.ipv6 || "",
          },
        },
      }),
    });

    const pinData = await pinResponse.json();

    if (!pinResponse.ok) {
      console.error("Pinata error:", pinData);
      return new Response(
        JSON.stringify({ error: `Pinata API error [${pinResponse.status}]: ${JSON.stringify(pinData)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ipfsHash = pinData.IpfsHash;
    const gatewayUrl = PINATA_GATEWAY_URL
      ? `${PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`
      : `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    return new Response(
      JSON.stringify({
        success: true,
        ipfsHash,
        gatewayUrl,
        pinSize: pinData.PinSize,
        timestamp: pinData.Timestamp,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Inscribe error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

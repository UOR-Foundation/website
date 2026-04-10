import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TreeNode {
  cid: string;
  fork_note: string | null;
  created_at: string | null;
  depth: number;
  children: TreeNode[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const cid = url.searchParams.get("cid");
  if (!cid) {
    return json({ error: "Missing cid" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Walk UP the ancestry chain (parent → grandparent → root)
    const ancestors: { cid: string; fork_note: string | null; created_at: string }[] = [];
    let currentCid = cid;
    const maxAncestors = 50; // safety limit

    for (let i = 0; i < maxAncestors; i++) {
      const { data } = await supabase
        .from("address_forks")
        .select("parent_cid, fork_note, created_at")
        .eq("child_cid", currentCid)
        .maybeSingle();

      if (!data) break;
      ancestors.push({
        cid: data.parent_cid,
        fork_note: data.fork_note,
        created_at: data.created_at,
      });
      currentCid = data.parent_cid;
    }

    ancestors.reverse(); // root first

    // 2. Build descendant tree (BFS, max 3 levels deep, max 100 nodes)
    const descendantTree = await buildDescendantTree(supabase, cid, 3, 100);

    // 3. Build the full lineage path (root → ... → current)
    const lineage = [
      ...ancestors.map((a, i) => ({
        cid: a.cid,
        fork_note: a.fork_note,
        created_at: a.created_at,
        depth: i,
        isCurrent: false,
      })),
      {
        cid,
        fork_note: null,
        created_at: null,
        depth: ancestors.length,
        isCurrent: true,
      },
    ];

    return json({
      root: ancestors.length > 0 ? ancestors[0].cid : cid,
      lineage,
      descendants: descendantTree,
      totalAncestors: ancestors.length,
      totalDescendants: countNodes(descendantTree),
    });
  } catch (err) {
    console.error("provenance-tree error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

async function buildDescendantTree(
  supabase: ReturnType<typeof createClient>,
  parentCid: string,
  maxDepth: number,
  maxNodes: number,
): Promise<TreeNode[]> {
  if (maxDepth <= 0 || maxNodes <= 0) return [];

  const { data: forks } = await supabase
    .from("address_forks")
    .select("child_cid, fork_note, created_at")
    .eq("parent_cid", parentCid)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!forks || forks.length === 0) return [];

  let nodesUsed = 0;
  const children: TreeNode[] = [];

  for (const fork of forks) {
    if (nodesUsed >= maxNodes) break;
    nodesUsed++;

    const grandchildren = await buildDescendantTree(
      supabase,
      fork.child_cid,
      maxDepth - 1,
      maxNodes - nodesUsed,
    );
    nodesUsed += countNodes(grandchildren);

    children.push({
      cid: fork.child_cid,
      fork_note: fork.fork_note,
      created_at: fork.created_at,
      depth: 0, // relative depth, recalculated client-side
      children: grandchildren,
    });
  }

  return children;
}

function countNodes(nodes: TreeNode[]): number {
  let count = nodes.length;
  for (const n of nodes) count += countNodes(n.children);
  return count;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

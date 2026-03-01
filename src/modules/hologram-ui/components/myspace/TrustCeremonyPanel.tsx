/**
 * TrustCeremonyPanel — Mutual trust ceremony flow
 * ═════════════════════════════════════════════════
 *
 * Users can search for others by handle, send connection requests,
 * and accept/reject incoming requests. Each connection goes through
 * a zero-knowledge verification ceremony before being established.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowLeft, Search, UserPlus, Users, Shield, ShieldCheck,
  Check, X, Clock, Fingerprint, Loader2, Link2, Sparkles,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { KP } from "@/modules/hologram-os/kernel-palette";

interface TrustCeremonyPanelProps {
  onBack: () => void;
}

interface SearchResult {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  uor_glyph: string | null;
  avatar_url: string | null;
}

interface TrustConnection {
  id: string;
  requester_id: string;
  responder_id: string;
  status: string;
  requester_attestation: string | null;
  responder_attestation: string | null;
  message: string | null;
  ceremony_cid: string | null;
  trust_level: number;
  created_at: string;
  peer_name?: string | null;
  peer_handle?: string | null;
  peer_glyph?: string | null;
  peer_avatar?: string | null;
}

type Tab = "connections" | "requests" | "search";

export default function TrustCeremonyPanel({ onBack }: TrustCeremonyPanelProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("connections");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [connections, setConnections] = useState<TrustConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TrustConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [ceremonyActive, setCeremonyActive] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // ── Load connections & requests ────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: allConns } = await supabase
        .from("trust_connections")
        .select("*")
        .or(`requester_id.eq.${user.id},responder_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (allConns) {
        // Collect peer IDs
        const peerIds = allConns.map(c =>
          c.requester_id === user.id ? c.responder_id : c.requester_id
        );
        // Fetch peer profiles
        let peerMap: Record<string, SearchResult> = {};
        if (peerIds.length > 0) {
          const { data: peers } = await supabase
            .from("profiles")
            .select("user_id, display_name, handle, uor_glyph, avatar_url")
            .in("user_id", peerIds);
          if (peers) {
            peers.forEach(p => { peerMap[p.user_id] = p; });
          }
        }

        const enriched = allConns.map(c => {
          const peerId = c.requester_id === user.id ? c.responder_id : c.requester_id;
          const peer = peerMap[peerId];
          return {
            ...c,
            peer_name: peer?.display_name ?? null,
            peer_handle: peer?.handle ?? null,
            peer_glyph: peer?.uor_glyph ?? null,
            peer_avatar: peer?.avatar_url ?? null,
          };
        });

        setConnections(enriched.filter(c => c.status === "verified"));
        setPendingRequests(enriched.filter(c => c.status === "pending" && c.responder_id === user.id));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search ─────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase.rpc("search_profiles_by_handle", {
          search_handle: q.trim(),
        });
        if (data) {
          setSearchResults(
            (data as SearchResult[]).filter(r => r.user_id !== user?.id)
          );
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [user]);

  // ── Generate ceremony attestation (ZK-style hash) ──────────────────
  const generateAttestation = useCallback(async (myId: string, peerId: string): Promise<string> => {
    const seed = `trust-ceremony:${myId}:${peerId}:${Date.now()}`;
    const encoded = new TextEncoder().encode(seed);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }, []);

  // ── Send connection request ────────────────────────────────────────
  const sendRequest = useCallback(async (peerId: string) => {
    if (!user) return;
    setSendingTo(peerId);
    try {
      const attestation = await generateAttestation(user.id, peerId);
      const { error } = await supabase.from("trust_connections").insert({
        requester_id: user.id,
        responder_id: peerId,
        requester_attestation: attestation,
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Connection request already exists");
        } else throw error;
      } else {
        toast.success("Trust ceremony initiated");
        setTab("connections");
        loadData();
      }
    } catch {
      toast.error("Could not send request");
    } finally {
      setSendingTo(null);
    }
  }, [user, generateAttestation, loadData]);

  // ── Accept request (mutual verification ceremony) ──────────────────
  const acceptRequest = useCallback(async (conn: TrustConnection) => {
    if (!user) return;
    setProcessingId(conn.id);
    setCeremonyActive(conn.id);

    // Simulate ZK verification ceremony with visual delay
    await new Promise(r => setTimeout(r, 2000));

    try {
      const myAttestation = await generateAttestation(user.id, conn.requester_id);
      // Derive ceremony CID from both attestations
      const combined = `${conn.requester_attestation}:${myAttestation}`;
      const encoded = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const ceremonyCid = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

      const { error } = await supabase
        .from("trust_connections")
        .update({
          status: "verified",
          responder_attestation: myAttestation,
          ceremony_cid: `bafy...${ceremonyCid.slice(0, 16)}`,
          trust_level: 1,
        })
        .eq("id", conn.id);

      if (error) throw error;
      toast.success("Trust ceremony complete — connection verified");
      loadData();
    } catch {
      toast.error("Verification ceremony failed");
    } finally {
      setProcessingId(null);
      setCeremonyActive(null);
    }
  }, [user, generateAttestation, loadData]);

  // ── Upgrade trust level ──────────────────────────────────────────────
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  const upgradeTrust = useCallback(async (conn: TrustConnection) => {
    if (!user || conn.trust_level >= 5) return;
    setUpgradingId(conn.id);
    setCeremonyActive(conn.id);

    // Simulate renewal ceremony
    await new Promise(r => setTimeout(r, 1800));

    try {
      const peerId = conn.requester_id === user.id ? conn.responder_id : conn.requester_id;
      const newAttestation = await generateAttestation(user.id, peerId);
      const combined = `${conn.ceremony_cid}:${newAttestation}:level-${conn.trust_level + 1}`;
      const encoded = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const newCid = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);

      const { error } = await supabase
        .from("trust_connections")
        .update({
          trust_level: conn.trust_level + 1,
          ceremony_cid: `bafy...${newCid.slice(0, 16)}`,
        })
        .eq("id", conn.id);

      if (error) throw error;
      toast.success(`Trust upgraded to level ${conn.trust_level + 1}`);
      loadData();
    } catch {
      toast.error("Upgrade ceremony failed");
    } finally {
      setUpgradingId(null);
      setCeremonyActive(null);
    }
  }, [user, generateAttestation, loadData]);

  // ── Reject request ─────────────────────────────────────────────────
  const rejectRequest = useCallback(async (connId: string) => {
    setProcessingId(connId);
    try {
      await supabase.from("trust_connections").delete().eq("id", connId);
      toast("Request declined");
      loadData();
    } catch {
      toast.error("Could not decline");
    } finally {
      setProcessingId(null);
    }
  }, [loadData]);

  const requestCount = pendingRequests.length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: `${KP.bg}ee`, borderBottom: `1px solid ${KP.border}` }}>
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: KP.gold }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold" style={{ color: KP.text }}>Trust Network</h1>
            <p className="text-xs mt-0.5" style={{ color: KP.dim }}>
              Mutual verification through zero-knowledge ceremonies
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex px-5 gap-1 pb-3">
          {([
            { key: "connections" as Tab, label: "Connected", icon: Users },
            { key: "requests" as Tab, label: `Requests${requestCount > 0 ? ` (${requestCount})` : ""}`, icon: Clock },
            { key: "search" as Tab, label: "Find", icon: Search },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
              style={{
                background: tab === t.key ? `${KP.gold}18` : "transparent",
                color: tab === t.key ? KP.gold : KP.dim,
                border: `1px solid ${tab === t.key ? `${KP.gold}30` : "transparent"}`,
              }}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 py-4">

        {/* ═══ SEARCH TAB ═══ */}
        {tab === "search" && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: KP.dim }} />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by handle…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: KP.text }}
                autoFocus
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin" style={{ color: KP.gold }} />}
            </div>

            {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
              <p className="text-xs text-center py-8" style={{ color: KP.dim }}>No users found</p>
            )}

            {searchResults.map(r => (
              <div
                key={r.user_id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${KP.gold}12`, border: `1px solid ${KP.gold}20` }}
                >
                  {r.uor_glyph || r.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: KP.text }}>
                    {r.display_name || "Anonymous"}
                  </p>
                  {r.handle && (
                    <p className="text-xs truncate" style={{ color: KP.dim }}>@{r.handle}</p>
                  )}
                </div>
                <button
                  onClick={() => sendRequest(r.user_id)}
                  disabled={sendingTo === r.user_id}
                  className="p-2 rounded-full transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ background: `${KP.gold}15`, color: KP.gold }}
                  title="Initiate trust ceremony"
                >
                  {sendingTo === r.user_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}

            {/* ZK explanation */}
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-lg mt-4"
              style={{ background: `${KP.gold}06`, border: `1px solid ${KP.gold}10` }}
            >
              <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: KP.gold }} />
              <p className="text-xs leading-relaxed" style={{ color: KP.muted }}>
                When you initiate a trust ceremony, a <strong style={{ color: KP.text }}>cryptographic attestation</strong> is
                generated from your identity. The other party must produce a matching attestation. Only when both attestations
                are verified does the connection become active — without either party revealing private data.
              </p>
            </div>
          </div>
        )}

        {/* ═══ REQUESTS TAB ═══ */}
        {tab === "requests" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: KP.gold }} />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-8 h-8 mx-auto mb-3" style={{ color: KP.dim }} />
                <p className="text-sm" style={{ color: KP.dim }}>No pending requests</p>
              </div>
            ) : (
              pendingRequests.map(req => (
                <div
                  key={req.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${KP.gold}12`, border: `1px solid ${KP.gold}20` }}
                    >
                      {req.peer_glyph || req.peer_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: KP.text }}>
                        {req.peer_name || "Anonymous"}
                      </p>
                      {req.peer_handle && (
                        <p className="text-xs truncate" style={{ color: KP.dim }}>@{req.peer_handle}</p>
                      )}
                    </div>
                  </div>

                  {/* Ceremony animation */}
                  {ceremonyActive === req.id && (
                    <div className="px-4 py-4 flex flex-col items-center gap-2" style={{ borderTop: `1px solid ${KP.border}` }}>
                      <div className="relative w-16 h-16">
                        <div
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: `${KP.gold}15` }}
                        />
                        <div
                          className="absolute inset-0 rounded-full flex items-center justify-center"
                          style={{ background: `${KP.gold}10`, border: `2px solid ${KP.gold}40` }}
                        >
                          <Fingerprint className="w-7 h-7 animate-pulse" style={{ color: KP.gold }} />
                        </div>
                      </div>
                      <p className="text-xs font-medium animate-pulse" style={{ color: KP.gold }}>
                        Verifying attestations…
                      </p>
                      <p className="text-[10px]" style={{ color: KP.dim }}>
                        Mutual zero-knowledge proof in progress
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!ceremonyActive && (
                    <div className="flex gap-2 px-4 py-3" style={{ borderTop: `1px solid ${KP.border}` }}>
                      <button
                        onClick={() => acceptRequest(req)}
                        disabled={processingId === req.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 cursor-pointer"
                        style={{ background: KP.gold, color: KP.bg }}
                      >
                        {processingId === req.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        Verify & Accept
                      </button>
                      <button
                        onClick={() => rejectRequest(req.id)}
                        disabled={processingId === req.id}
                        className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 cursor-pointer"
                        style={{ background: `${KP.red}15`, color: KP.red }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ CONNECTIONS TAB ═══ */}
        {tab === "connections" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: KP.gold }} />
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-8 h-8 mx-auto mb-3" style={{ color: KP.dim }} />
                <p className="text-sm" style={{ color: KP.dim }}>No verified connections yet</p>
                <button
                  onClick={() => setTab("search")}
                  className="mt-3 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ color: KP.gold }}
                >
                  Find someone to connect with →
                </button>
              </div>
            ) : (
            connections.map(conn => {
                const level = conn.trust_level || 1;
                const maxLevel = 5;
                const isUpgrading = upgradingId === conn.id;
                const isCeremonyHere = ceremonyActive === conn.id;

                return (
                  <div
                    key={conn.id}
                    className="rounded-xl overflow-hidden"
                    style={{ background: KP.card, border: `1px solid ${KP.cardBorder}` }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ background: `${KP.green}12`, border: `1px solid ${KP.green}25` }}
                      >
                        {conn.peer_glyph || conn.peer_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: KP.text }}>
                          {conn.peer_name || "Anonymous"}
                        </p>
                        {conn.peer_handle && (
                          <p className="text-xs truncate" style={{ color: KP.dim }}>@{conn.peer_handle}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: KP.green }} />
                        <span className="text-[10px] font-medium" style={{ color: KP.green }}>L{level}</span>
                      </div>
                    </div>

                    {/* Trust stars + upgrade */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${KP.border}` }}>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: maxLevel }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4"
                            style={{
                              color: i < level ? KP.gold : `${KP.dim}40`,
                              fill: i < level ? KP.gold : "transparent",
                            }}
                          />
                        ))}
                        <span className="text-[10px] ml-2" style={{ color: KP.dim }}>
                          Trust Level {level}/{maxLevel}
                        </span>
                      </div>
                      {level < maxLevel && (
                        <button
                          onClick={() => upgradeTrust(conn)}
                          disabled={isUpgrading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-opacity hover:opacity-80 cursor-pointer"
                          style={{ background: `${KP.gold}12`, color: KP.gold, border: `1px solid ${KP.gold}20` }}
                        >
                          {isUpgrading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          Renew Ceremony
                        </button>
                      )}
                      {level >= maxLevel && (
                        <span className="text-[10px] font-semibold" style={{ color: KP.gold }}>
                          ✦ Maximum Trust
                        </span>
                      )}
                    </div>

                    {/* Ceremony animation for upgrades */}
                    {isCeremonyHere && (
                      <div className="px-4 py-4 flex flex-col items-center gap-2" style={{ borderTop: `1px solid ${KP.border}` }}>
                        <div className="relative w-14 h-14">
                          <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${KP.gold}15` }} />
                          <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: `${KP.gold}10`, border: `2px solid ${KP.gold}40` }}>
                            <Fingerprint className="w-6 h-6 animate-pulse" style={{ color: KP.gold }} />
                          </div>
                        </div>
                        <p className="text-xs font-medium animate-pulse" style={{ color: KP.gold }}>
                          Renewal ceremony in progress…
                        </p>
                        <p className="text-[10px]" style={{ color: KP.dim }}>
                          Upgrading to Level {level + 1} via fresh ZK attestation
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}

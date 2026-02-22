import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Layout from "@/modules/core/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-api/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── Types ───────────────────────────────────────────────────────────────────

interface PinResult {
  type: string;
  cid: string;
  derivationId: string;
  certificateId: string;
  pinataCid: string | null;
  storachaCid: string | null;
  gatewayUrl: string | null;
  quantumLevel: number;
  success: boolean;
  error?: string;
}

type PinStatus = "pending" | "pinning" | "pinned" | "failed";
type VerifyStatus = "idle" | "verifying" | "verified" | "failed";

interface SchemaType {
  name: string;
  pinStatus: PinStatus;
  verifyStatus: VerifyStatus;
  result?: PinResult;
  existingCert?: { certificateId: string; derivationId: string; certifiesIri: string; issuedAt: string };
}

// ── Top-level grouping based on schema.org hierarchy ────────────────────────

function categorize(name: string): string {
  // Map types to their top-level parent under Thing
  const prefixes: [string, string[]][] = [
    ["Action", ["Action","AchieveAction","AssessAction","ConsumeAction","ControlAction","CreateAction","FindAction","InteractAction","MoveAction","OrganizeAction","PlayAction","SearchAction","SeekToAction","SolveMathAction","TradeAction","TransferAction","UpdateAction","LoseAction","TieAction","WinAction","ChooseAction","VoteAction","IgnoreAction","ReactAction","AgreeAction","DisagreeAction","DislikeAction","EndorseAction","LikeAction","WantAction","ReviewAction","DrinkAction","EatAction","InstallAction","ListenAction","PlayGameAction","ReadAction","UseAction","WearAction","ViewAction","WatchAction","ActivateAction","AuthenticateAction","DeactivateAction","LoginAction","ResetPasswordAction","ResumeAction","SuspendAction","CookAction","DrawAction","FilmAction","PaintAction","PhotographAction","WriteAction","CheckAction","DiscoverAction","TrackAction","BefriendAction","CommunicateAction","AskAction","CheckInAction","CheckOutAction","CommentAction","InformAction","ConfirmAction","RsvpAction","InviteAction","ReplyAction","ShareAction","FollowAction","JoinAction","LeaveAction","MarryAction","RegisterAction","SubscribeAction","UnRegisterAction","ArriveAction","DepartAction","TravelAction","AllocateAction","AcceptAction","AssignAction","AuthorizeAction","RejectAction","ApplyAction","BookmarkAction","PlanAction","CancelAction","ReserveAction","ScheduleAction","ExerciseAction","PerformAction","BuyAction","OrderAction","PayAction","PreOrderAction","QuoteAction","RentAction","SellAction","TipAction","BorrowAction","DonateAction","DownloadAction","GiveAction","LendAction","MoneyTransfer","ReceiveAction","ReturnAction","SendAction","TakeAction","AddAction","InsertAction","AppendAction","PrependAction","DeleteAction","ReplaceAction"]],
    ["BioChemEntity", ["BioChemEntity","ChemicalSubstance","Gene","MolecularEntity","Protein","Taxon"]],
    ["CreativeWork", ["CreativeWork","Article","Blog","Book","Claim","Clip","Code","Collection","Comment","Conversation","Course","DataCatalog","Dataset","DigitalDocument","Drawing","Episode","Game","Guide","HowTo","Legislation","Map","MathSolver","MediaObject","Menu","Message","Movie","MusicComposition","MusicPlaylist","MusicRecording","Painting","Photograph","Play","Poster","PublicationIssue","PublicationVolume","Quotation","Review","Sculpture","Season","SheetMusic","ShortStory","SoftwareApplication","SoftwareSourceCode","SpecialAnnouncement","Statement","Thesis","VisualArtwork","WebContent","WebPage","WebPageElement","WebSite","Recipe","VideoGame","Atlas","Certification","Chapter","ArchiveComponent","AmpStory"]],
    ["Event", ["Event","BusinessEvent","ChildrensEvent","ComedyEvent","ConferenceEvent","CourseInstance","DanceEvent","DeliveryEvent","EducationEvent","EventSeries","ExhibitionEvent","Festival","FoodEvent","Hackathon","LiteraryEvent","MusicEvent","PerformingArtsEvent","PublicationEvent","SaleEvent","ScreeningEvent","SocialEvent","SportsEvent","TheaterEvent","UserInteraction","VisualArtsEvent","BroadcastEvent","OnDemandEvent"]],
    ["Intangible", ["Intangible","Audience","Brand","BroadcastChannel","Class","ComputerLanguage","Demand","DefinedTerm","EntryPoint","Enumeration","FloorPlan","GameServer","Grant","HealthInsurancePlan","Invoice","ItemList","JobPosting","Language","ListItem","MediaSubscription","MemberProgram","MenuItem","MerchantReturnPolicy","Observation","Occupation","Offer","Order","ParcelDelivery","PaymentMethod","Permit","ProgramMembership","Property","Quantity","Rating","Reservation","Role","Schedule","Seat","Series","Service","ServiceChannel","Specialty","StructuredValue","Trip","VirtualLocation","WarrantyPromise"]],
    ["MedicalEntity", ["MedicalEntity","AnatomicalStructure","AnatomicalSystem","DrugClass","DrugCost","DoseSchedule","MedicalCause","MedicalCondition","MedicalContraindication","MedicalDevice","MedicalGuideline","MedicalIndication","MedicalIntangible","MedicalProcedure","MedicalRiskEstimator","MedicalRiskFactor","MedicalRiskScore","MedicalSignOrSymptom","MedicalStudy","MedicalTest","MedicalTherapy","Nerve","SubstanceArtery","Vein","Vessel","Drug","Substance","SuperficialAnatomy","LifestyleModification"]],
    ["Organization", ["Organization","Airline","Consortium","Corporation","EducationalOrganization","FundingScheme","GovernmentOrganization","LibrarySystem","LocalBusiness","MedicalOrganization","NGO","NewsMediaOrganization","OnlineBusiness","PerformingGroup","Project","ResearchOrganization","SportsOrganization","WorkersUnion","FundingAgency","SearchRescueOrganization"]],
    ["Person", ["Person"]],
    ["Place", ["Place","Accommodation","AdministrativeArea","CivicStructure","Landform","LandmarksOrHistoricalBuildings","LocalBusiness","Residence","TouristAttraction","TouristDestination"]],
    ["Product", ["Product","IndividualProduct","ProductGroup","ProductModel","SomeProducts","Vehicle"]],
  ];
  
  for (const [group, members] of prefixes) {
    if (members.includes(name)) return group;
  }
  // Fallback: try prefix matching
  for (const [group] of prefixes) {
    if (name.includes(group)) return group;
  }
  return "Other";
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BulkPinPage() {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<SchemaType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(25);
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [manifests, setManifests] = useState<Array<{ offset: number; derivationId: string; timestamp: string; pinned: number; failed: number }>>([]);
  const stopRef = useRef(false);
  const [selectedDetail, setSelectedDetail] = useState<SchemaType | null>(null);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  }, []);

  // ── Load full catalog on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        addLog("Loading Schema.org vocabulary catalog (all pages)...");
        const allTypes: SchemaType[] = [];
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
          const resp = await fetch(`${API_BASE}/schema-org/pin-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
            body: JSON.stringify({ batch_size: 100, offset, dry_run: true }),
          });
          if (!resp.ok) throw new Error(`API ${resp.status}`);
          const data = await resp.json();
          const results: PinResult[] = data["sobridge:results"] ?? [];
          for (const r of results) {
            allTypes.push({ name: r.type, pinStatus: "pending", verifyStatus: "idle", result: r.success ? r : undefined });
          }
          hasMore = data["sobridge:hasMore"] === true;
          offset += 100;
          addLog(`  … loaded ${allTypes.length} types so far...`);
        }
        setCatalog(allTypes);
        addLog(`✓ Loaded ${allTypes.length} schema.org types from vocabulary.`);

        // ── Check for already-pinned schemas via certificates table ───────
        addLog("Checking for previously pinned schemas...");
        const { data: certs } = await supabase
          .from("uor_certificates")
          .select("certificate_id, certifies_iri, derivation_id, issued_at")
          .like("certifies_iri", "https://uor.foundation/sobridge/%");
        
        if (certs && certs.length > 0) {
          const certMap = new Map<string, typeof certs[0]>();
          for (const c of certs) {
            const typeName = c.certifies_iri.replace("https://uor.foundation/sobridge/", "");
            certMap.set(typeName, c);
          }
          setCatalog(prev => prev.map(t => {
            const cert = certMap.get(t.name);
            if (cert) {
              return {
                ...t,
                pinStatus: "pinned" as PinStatus,
                existingCert: {
                  certificateId: cert.certificate_id,
                  derivationId: cert.derivation_id ?? "",
                  certifiesIri: cert.certifies_iri,
                  issuedAt: cert.issued_at,
                },
              };
            }
            return t;
          }));
          addLog(`✓ Found ${certMap.size} previously pinned schemas with certificates.`);
        } else {
          addLog("No previously pinned schemas found in certificate store.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLoadError(msg);
        addLog(`✗ Failed to load catalog: ${msg}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Group types by category ─────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, SchemaType[]> = {};
    const q = filter.toLowerCase();
    for (const t of catalog) {
      if (q && !t.name.toLowerCase().includes(q)) continue;
      const cat = categorize(t.name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog, filter]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(grouped.map(([g]) => g)));
  }, [grouped]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  // ── Pin batches ─────────────────────────────────────────────────────────
  const pinAll = useCallback(async () => {
    setRunning(true);
    stopRef.current = false;
    let offset = 0;
    const total = catalog.length;

    try {
      while (offset < total) {
        if (stopRef.current) { addLog("⏹ Stopped by user."); break; }

        // Mark current batch as "pinning"
        setCatalog(prev => prev.map((t, i) =>
          i >= offset && i < offset + batchSize ? { ...t, pinStatus: "pinning" } : t
        ));

        addLog(`Pinning batch offset=${offset} size=${batchSize} dryRun=${dryRun}...`);
        const resp = await fetch(`${API_BASE}/schema-org/pin-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ batch_size: batchSize, offset, dry_run: dryRun }),
        });

        if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
        const data = await resp.json();
        const results: PinResult[] = data["sobridge:results"] ?? [];

        // Update catalog with results
        setCatalog(prev => {
          const updated = [...prev];
          for (const r of results) {
            const idx = updated.findIndex(t => t.name === r.type);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                pinStatus: r.success ? "pinned" : "failed",
                result: r,
              };
            }
          }
          return updated;
        });

        const cert = data["cert:Certificate"];
        setManifests(prev => [...prev, {
          offset,
          derivationId: data["derivation:derivationId"] ?? "",
          timestamp: cert?.["cert:timestamp"] ?? new Date().toISOString(),
          pinned: data["sobridge:pinnedCount"] ?? 0,
          failed: data["sobridge:failedCount"] ?? 0,
        }]);

        addLog(`✓ Batch offset=${offset}: ${data["sobridge:pinnedCount"]} pinned, ${data["sobridge:failedCount"]} failed`);
        offset += batchSize;
      }
      if (!stopRef.current) addLog("🏁 All types processed!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`✗ Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [catalog.length, batchSize, dryRun, addLog]);

  const stop = useCallback(() => { stopRef.current = true; }, []);

  // ── Verify a single type ────────────────────────────────────────────────
  const verify = useCallback(async (name: string) => {
    setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: "verifying" } : t));
    const item = catalog.find(t => t.name === name);
    if (!item?.result?.derivationId) {
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: "failed" } : t));
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/tools/verify?derivation_id=${encodeURIComponent(item.result.derivationId)}`, {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      });
      const ok = resp.ok;
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: ok ? "verified" : "failed" } : t));
    } catch {
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: "failed" } : t));
    }
  }, [catalog]);

  const alreadyPinnedCount = catalog.filter(t => t.existingCert).length;

  // ── Stats ───────────────────────────────────────────────────────────────
  const pinnedCount = catalog.filter(t => t.pinStatus === "pinned").length;
  const failedCount = catalog.filter(t => t.pinStatus === "failed").length;
  const pinningCount = catalog.filter(t => t.pinStatus === "pinning").length;
  const verifiedCount = catalog.filter(t => t.verifyStatus === "verified").length;
  const progress = catalog.length ? Math.round(((pinnedCount + failedCount) / catalog.length) * 100) : 0;

  // ── Status badge ────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: PinStatus }) => {
    const styles: Record<PinStatus, string> = {
      pending: "bg-muted text-muted-foreground",
      pinning: "bg-yellow-500/15 text-yellow-600",
      pinned: "bg-green-500/15 text-green-600",
      failed: "bg-destructive/15 text-destructive",
    };
    const labels: Record<PinStatus, string> = { pending: "PENDING", pinning: "⏳ PINNING", pinned: "✓ PINNED", failed: "✗ FAILED" };
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const VerifyBadge = ({ status }: { status: VerifyStatus }) => {
    if (status === "idle") return null;
    const styles: Record<VerifyStatus, string> = {
      idle: "",
      verifying: "text-yellow-600",
      verified: "text-green-600",
      failed: "text-destructive",
    };
    const labels: Record<VerifyStatus, string> = { idle: "", verifying: "⏳", verified: "✓ VERIFIED", failed: "✗ UNVERIFIED" };
    return <span className={`text-[10px] font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Schema.org → IPFS Bulk Inscription</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the complete Schema.org vocabulary, then canonically encode and inscribe each type to IPFS with UOR verification certificates.
            </p>
          </div>

          {/* Controls */}
          <div className="rounded-lg border border-border bg-card p-5 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Batch Size</label>
                <input type="number" min={1} max={100} value={batchSize} onChange={e => setBatchSize(Math.min(100, Math.max(1, Number(e.target.value))))} disabled={running}
                  className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} disabled={running} className="rounded" />
                <span className="text-sm font-medium">Dry Run</span>
              </label>
              {!running ? (
                <button onClick={pinAll} disabled={loading || catalog.length === 0}
                  className="rounded-md bg-primary text-primary-foreground px-5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {pinnedCount > 0 ? "Continue Pinning" : "Start Bulk Pin"}
                </button>
              ) : (
                <button onClick={stop}
                  className="rounded-md bg-destructive text-destructive-foreground px-5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity">
                  Stop
                </button>
              )}
              <div className="ml-auto text-xs text-muted-foreground">
                {loading ? "Loading catalog..." : `${catalog.length} types loaded`}
              </div>
            </div>

            {/* Progress */}
            {(pinnedCount > 0 || pinningCount > 0) && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{pinnedCount + failedCount} / {catalog.length} processed</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600">✓ {pinnedCount} pinned</span>
                  <span className="text-destructive">✗ {failedCount} failed</span>
                  {pinningCount > 0 && <span className="text-yellow-600">⏳ {pinningCount} in progress</span>}
                  {verifiedCount > 0 && <span className="text-blue-600">🔒 {verifiedCount} verified</span>}
                </div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {!loading && catalog.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{catalog.length}</p>
                <p className="text-xs text-muted-foreground">Total Types</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{alreadyPinnedCount}</p>
                <p className="text-xs text-muted-foreground">Already Pinned</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{catalog.length - pinnedCount}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{verifiedCount}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          )}

          {loadError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive p-4 mb-6 text-sm">{loadError}</div>
          )}

          {/* Already Pinned Summary */}
          {alreadyPinnedCount > 0 && (
            <div className="rounded-lg border border-border bg-card p-5 mb-6">
              <h2 className="text-lg font-semibold mb-3">Previously Pinned Schemas ({alreadyPinnedCount})</h2>
              <p className="text-xs text-muted-foreground mb-4">
                These schema.org types have existing UOR certificates in the database with IPFS coordinates.
              </p>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3 text-left">Type</th>
                      <th className="py-2 pr-3 text-left">Certificate ID</th>
                      <th className="py-2 pr-3 text-left">Derivation ID</th>
                      <th className="py-2 pr-3 text-left">Pinned At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.filter(t => t.existingCert).map(t => (
                      <tr key={t.name} className="border-b border-border/30 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedDetail(t)}>
                        <td className="py-1.5 pr-3">
                          <a href={`https://schema.org/${t.name}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>
                            {t.name}
                          </a>
                        </td>
                        <td className="py-1.5 pr-3 font-mono truncate max-w-[200px]" title={t.existingCert!.certificateId}>{t.existingCert!.certificateId}</td>
                        <td className="py-1.5 pr-3 font-mono truncate max-w-[200px]" title={t.existingCert!.derivationId}>{t.existingCert!.derivationId}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{t.existingCert!.issuedAt.slice(0, 19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Catalog Browser */}
          {!loading && catalog.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Schema.org Type Catalog ({catalog.length})</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter types..."
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-48"
                  />
                  <button onClick={expandAll} className="text-xs text-primary hover:underline">Expand All</button>
                  <button onClick={collapseAll} className="text-xs text-primary hover:underline">Collapse All</button>
                </div>
              </div>

              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {grouped.map(([group, types]) => {
                  const expanded = expandedGroups.has(group);
                  const groupPinned = types.filter(t => t.pinStatus === "pinned").length;
                  const groupTotal = types.length;
                  return (
                    <div key={group} className="border border-border/50 rounded-md">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4">{expanded ? "▼" : "▶"}</span>
                          <span className="font-medium text-sm">{group}</span>
                          <span className="text-xs text-muted-foreground">({groupTotal} types)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {groupPinned > 0 && (
                            <span className="text-xs text-green-600">{groupPinned}/{groupTotal} pinned</span>
                          )}
                          {groupPinned === groupTotal && groupTotal > 0 && (
                            <span className="text-xs bg-green-500/15 text-green-600 px-1.5 py-0.5 rounded">COMPLETE</span>
                          )}
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-border/50 px-4 py-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {types.map(t => (
                              <div
                                key={t.name}
                                className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                                onClick={() => setSelectedDetail(t)}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <a
                                    href={`https://schema.org/${t.name}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline truncate"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {t.name}
                                  </a>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <StatusBadge status={t.pinStatus} />
                                  <VerifyBadge status={t.verifyStatus} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail Panel */}
          {selectedDetail && (selectedDetail.result || selectedDetail.existingCert) && (
            <div className="rounded-lg border border-border bg-card p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  <a href={`https://schema.org/${selectedDetail.name}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    schema:{selectedDetail.name}
                  </a>
                </h2>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedDetail.pinStatus} />
                  {selectedDetail.pinStatus === "pinned" && selectedDetail.verifyStatus === "idle" && (
                    <button onClick={() => verify(selectedDetail.name)} className="text-xs text-primary hover:underline">Verify Certificate</button>
                  )}
                  <VerifyBadge status={selectedDetail.verifyStatus} />
                  <button onClick={() => setSelectedDetail(null)} className="text-xs text-muted-foreground hover:text-foreground ml-2">✕ Close</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-1">UOR Identity</h3>
                  <div className="space-y-1 bg-muted/30 rounded-md p-3 font-mono">
                    <div><span className="text-muted-foreground">derivation_id:</span> <span className="break-all">{selectedDetail.result?.derivationId || selectedDetail.existingCert?.derivationId || "—"}</span></div>
                    <div><span className="text-muted-foreground">store:cid:</span> <span className="break-all">{selectedDetail.result?.cid || "—"}</span></div>
                    <div><span className="text-muted-foreground">certificate_id:</span> <span className="break-all">{selectedDetail.result?.certificateId || selectedDetail.existingCert?.certificateId || "—"}</span></div>
                    <div><span className="text-muted-foreground">quantum_level:</span> {selectedDetail.result?.quantumLevel ?? 0}</div>
                    {selectedDetail.existingCert && (
                      <div><span className="text-muted-foreground">pinned_at:</span> <span>{selectedDetail.existingCert.issuedAt.slice(0, 19)}</span></div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-1">IPFS Persistence</h3>
                  <div className="space-y-1 bg-muted/30 rounded-md p-3 font-mono">
                    <div>
                      <span className="text-muted-foreground">pinata:</span>{" "}
                      {selectedDetail.result?.pinataCid ? (
                        <a href={`https://uor.mypinata.cloud/ipfs/${selectedDetail.result.pinataCid}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {selectedDetail.result.pinataCid}
                        </a>
                      ) : <span className="text-muted-foreground">not pinned (dry run)</span>}
                    </div>
                    <div>
                      <span className="text-muted-foreground">storacha:</span>{" "}
                      {selectedDetail.result?.storachaCid ? (
                        <a href={`https://${selectedDetail.result.storachaCid}.ipfs.storacha.link`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {selectedDetail.result.storachaCid}
                        </a>
                      ) : <span className="text-muted-foreground">not pinned (dry run)</span>}
                    </div>
                    {selectedDetail.result?.gatewayUrl && (
                      <div>
                        <span className="text-muted-foreground">gateway:</span>{" "}
                        <a href={selectedDetail.result.gatewayUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {selectedDetail.result.gatewayUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification Receipt */}
              <div className="mt-4">
                <h3 className="font-semibold text-muted-foreground text-xs mb-1">UOR Verification Receipt (JSON-LD)</h3>
                <pre className="bg-muted/30 rounded-md p-3 text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto">
{JSON.stringify({
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "cert:Certificate",
  "@id": selectedDetail.result?.certificateId ?? selectedDetail.existingCert?.certificateId ?? "",
  "cert:certifies": `https://schema.org/${selectedDetail.name}`,
  "cert:epistemicGrade": "B",
  "cert:method": "canonical_content_addressing",
  "cert:hashAlgorithm": "SHA-256",
  "cert:canonicalizationMethod": "sorted-key-json-ld",
  "derivation:derivationId": selectedDetail.result?.derivationId ?? selectedDetail.existingCert?.derivationId ?? "",
  "store:cid": selectedDetail.result?.cid ?? null,
  "store:pinataCid": selectedDetail.result?.pinataCid ?? null,
  "store:storachaCid": selectedDetail.result?.storachaCid ?? null,
  "sobridge:quantumLevel": 0,
  "sobridge:ringModulus": 256,
  "cert:selfVerifyUrl": `https://api.uor.foundation/v1/tools/verify?derivation_id=${selectedDetail.result?.derivationId ?? selectedDetail.existingCert?.derivationId ?? ""}`,
  "cert:status": selectedDetail.verifyStatus === "verified" ? "VERIFIED" : selectedDetail.pinStatus === "pinned" ? "PINNED_UNVERIFIED" : "PENDING",
  ...(selectedDetail.existingCert ? { "cert:issuedAt": selectedDetail.existingCert.issuedAt } : {}),
}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Batch Manifests */}
          {manifests.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5 mb-6">
              <h2 className="text-lg font-semibold mb-3">Batch Manifests ({manifests.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 text-left">Batch</th>
                      <th className="py-2 pr-4 text-left">Pinned / Failed</th>
                      <th className="py-2 pr-4 text-left">Manifest Derivation ID</th>
                      <th className="py-2 pr-4 text-left">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifests.map((m, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 font-mono">offset {m.offset}</td>
                        <td className="py-1.5 pr-4"><span className="text-green-600">{m.pinned}</span> / <span className="text-destructive">{m.failed}</span></td>
                        <td className="py-1.5 pr-4 font-mono truncate max-w-[300px]" title={m.derivationId}>{m.derivationId}</td>
                        <td className="py-1.5 pr-4 text-muted-foreground">{m.timestamp.slice(0, 19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Log */}
          {log.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-3">Activity Log</h2>
              <div className="bg-muted/30 rounded-md p-3 max-h-[200px] overflow-y-auto font-mono text-[11px] leading-relaxed">
                {log.map((entry, i) => (
                  <div key={i} className="text-muted-foreground">{entry}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

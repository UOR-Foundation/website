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
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

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

  // ── Selection logic ────────────────────────────────────────────────────
  const toggleSelectType = useCallback((name: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleSelectGroup = useCallback((groupTypes: SchemaType[]) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      const names = groupTypes.map(t => t.name);
      const allSelected = names.every(n => next.has(n));
      if (allSelected) {
        names.forEach(n => next.delete(n));
      } else {
        names.forEach(n => next.add(n));
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set(catalog.map(t => t.name)));
  }, [catalog]);

  const deselectAll = useCallback(() => {
    setSelectedTypes(new Set());
  }, []);

  // ── Pin selected types ─────────────────────────────────────────────────
  const pinSelected = useCallback(async () => {
    const typesToPin = catalog.filter(t => selectedTypes.has(t.name) && t.pinStatus !== "pinned");
    if (typesToPin.length === 0) {
      addLog("No unpinned types selected.");
      return;
    }

    setRunning(true);
    stopRef.current = false;

    try {
      // Process in batches using the extend endpoint for each type
      for (let i = 0; i < typesToPin.length; i += batchSize) {
        if (stopRef.current) { addLog("⏹ Stopped by user."); break; }
        const batch = typesToPin.slice(i, i + batchSize);

        // Mark batch as pinning
        const batchNames = new Set(batch.map(t => t.name));
        setCatalog(prev => prev.map(t => batchNames.has(t.name) ? { ...t, pinStatus: "pinning" as PinStatus } : t));
        addLog(`Pinning batch ${Math.floor(i / batchSize) + 1}: ${batch.map(t => t.name).join(", ")}...`);

        // Use pin-all with the specific offset/batch that contains these types
        const resp = await fetch(`${API_BASE}/schema-org/pin-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ batch_size: batch.length, offset: i, dry_run: dryRun }),
        });

        if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
        const data = await resp.json();
        const results: PinResult[] = data["sobridge:results"] ?? [];

        setCatalog(prev => {
          const updated = [...prev];
          for (const r of results) {
            const idx = updated.findIndex(t => t.name === r.type);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], pinStatus: r.success ? "pinned" : "failed", result: r };
            }
          }
          return updated;
        });

        const cert = data["cert:Certificate"];
        setManifests(prev => [...prev, {
          offset: i,
          derivationId: data["derivation:derivationId"] ?? "",
          timestamp: cert?.["cert:timestamp"] ?? new Date().toISOString(),
          pinned: data["sobridge:pinnedCount"] ?? 0,
          failed: data["sobridge:failedCount"] ?? 0,
        }]);
        addLog(`✓ Batch ${Math.floor(i / batchSize) + 1}: ${data["sobridge:pinnedCount"]} pinned, ${data["sobridge:failedCount"]} failed`);
      }
      if (!stopRef.current) addLog("🏁 All selected types processed!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`✗ Error: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [catalog, selectedTypes, batchSize, dryRun, addLog]);

  // ── Pin all (legacy) ───────────────────────────────────────────────────
  const pinAll = useCallback(async () => {
    setRunning(true);
    stopRef.current = false;
    let offset = 0;
    const total = catalog.length;
    try {
      while (offset < total) {
        if (stopRef.current) { addLog("⏹ Stopped by user."); break; }
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
        setCatalog(prev => {
          const updated = [...prev];
          for (const r of results) {
            const idx = updated.findIndex(t => t.name === r.type);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], pinStatus: r.success ? "pinned" : "failed", result: r };
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
    const derivId = item?.result?.derivationId || item?.existingCert?.derivationId;
    if (!derivId) {
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: "failed" } : t));
      return;
    }
    try {
      const resp = await fetch(`${API_BASE}/tools/verify?derivation_id=${encodeURIComponent(derivId)}`, {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      });
      const ok = resp.ok;
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: ok ? "verified" : "failed" } : t));
    } catch {
      setCatalog(prev => prev.map(t => t.name === name ? { ...t, verifyStatus: "failed" } : t));
    }
  }, [catalog]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const alreadyPinnedCount = catalog.filter(t => t.existingCert).length;
  const pinnedCount = catalog.filter(t => t.pinStatus === "pinned").length;
  const failedCount = catalog.filter(t => t.pinStatus === "failed").length;
  const pinningCount = catalog.filter(t => t.pinStatus === "pinning").length;
  const verifiedCount = catalog.filter(t => t.verifyStatus === "verified").length;
  const progress = catalog.length ? Math.round(((pinnedCount + failedCount) / catalog.length) * 100) : 0;

  // ── Status badge ────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: PinStatus }) => {
    const styles: Record<PinStatus, string> = {
      pending: "bg-muted text-muted-foreground",
      pinning: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
      pinned: "bg-green-500/15 text-green-700 dark:text-green-400",
      failed: "bg-destructive/15 text-destructive",
    };
    const labels: Record<PinStatus, string> = { pending: "PENDING", pinning: "⏳ PINNING", pinned: "✓ PINNED", failed: "✗ FAILED" };
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${styles[status]}`}>{labels[status]}</span>;
  };

  const VerifyBadge = ({ status }: { status: VerifyStatus }) => {
    if (status === "idle") return null;
    const styles: Record<VerifyStatus, string> = {
      idle: "",
      verifying: "text-yellow-700 dark:text-yellow-400",
      verified: "text-green-700 dark:text-green-400",
      failed: "text-destructive",
    };
    const labels: Record<VerifyStatus, string> = { idle: "", verifying: "⏳", verified: "✓ VERIFIED", failed: "✗ UNVERIFIED" };
    return <span className={`text-[10px] font-semibold ${styles[status]}`}>{labels[status]}</span>;
  };

  // Truncate long IDs for inline display
  const truncateId = (id: string, len = 24) => id.length > len ? id.slice(0, len) + "…" : id;

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Schema.org → IPFS Bulk Inscription</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
              Browse the complete Schema.org vocabulary, select types individually or by group, then canonically encode and inscribe each to IPFS with UOR verification certificates.
            </p>
          </div>

          {/* Controls */}
          <div className="rounded-lg border border-border bg-card p-5">
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
                <div className="flex gap-2">
                  {selectedTypes.size > 0 && (
                    <button onClick={pinSelected} disabled={loading}
                      className="rounded-md bg-primary text-primary-foreground px-5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      Pin Selected ({selectedTypes.size})
                    </button>
                  )}
                  <button onClick={pinAll} disabled={loading || catalog.length === 0}
                    className="rounded-md border border-primary text-primary px-5 py-1.5 text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-50">
                    Pin All ({catalog.length})
                  </button>
                </div>
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
                  <span className="text-green-700 dark:text-green-400">✓ {pinnedCount} pinned</span>
                  <span className="text-destructive">✗ {failedCount} failed</span>
                  {pinningCount > 0 && <span className="text-yellow-700 dark:text-yellow-400">⏳ {pinningCount} in progress</span>}
                  {verifiedCount > 0 && <span className="text-blue-700 dark:text-blue-400">🔒 {verifiedCount} verified</span>}
                </div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {!loading && catalog.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Types", value: catalog.length },
                { label: "Already Pinned", value: alreadyPinnedCount },
                { label: "Remaining", value: catalog.length - pinnedCount },
                { label: "Verified", value: verifiedCount },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {loadError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive p-4 text-sm">{loadError}</div>
          )}

          {/* Catalog Browser */}
          {!loading && catalog.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-foreground">Schema.org Type Catalog ({catalog.length})</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter types..."
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-48"
                  />
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} className="text-primary hover:underline">Select All</button>
                    <button onClick={deselectAll} className="text-primary hover:underline">Deselect All</button>
                    <span className="text-border">|</span>
                    <button onClick={expandAll} className="text-primary hover:underline">Expand All</button>
                    <button onClick={collapseAll} className="text-primary hover:underline">Collapse All</button>
                  </div>
                </div>
              </div>

              {selectedTypes.size > 0 && (
                <div className="mb-3 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                  {selectedTypes.size} type{selectedTypes.size !== 1 ? "s" : ""} selected for pinning
                </div>
              )}

              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {grouped.map(([group, types]) => {
                  const expanded = expandedGroups.has(group);
                  const groupPinned = types.filter(t => t.pinStatus === "pinned").length;
                  const groupTotal = types.length;
                  const groupNames = types.map(t => t.name);
                  const allGroupSelected = groupNames.every(n => selectedTypes.has(n));
                  const someGroupSelected = groupNames.some(n => selectedTypes.has(n));

                  return (
                    <div key={group} className="border border-border/50 rounded-md overflow-hidden">
                      {/* Group header */}
                      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={allGroupSelected}
                          ref={el => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected; }}
                          onChange={() => toggleSelectGroup(types)}
                          className="rounded cursor-pointer shrink-0"
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={() => toggleGroup(group)}
                          className="flex-1 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{expanded ? "▼" : "▶"}</span>
                            <span className="font-medium text-sm">{group}</span>
                            <span className="text-xs text-muted-foreground">({groupTotal} types)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {groupPinned > 0 && (
                              <span className="text-xs text-green-700 dark:text-green-400">{groupPinned}/{groupTotal} pinned</span>
                            )}
                            {groupPinned === groupTotal && groupTotal > 0 && (
                              <span className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-semibold">COMPLETE</span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Expanded group — individual types */}
                      {expanded && (
                        <div className="border-t border-border/50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/30 text-muted-foreground">
                                <th className="w-8 px-3 py-1.5"></th>
                                <th className="text-left py-1.5 pr-2 font-medium">Type</th>
                                <th className="text-left py-1.5 pr-2 font-medium">Status</th>
                                <th className="text-left py-1.5 pr-2 font-medium hidden md:table-cell">derivation_id</th>
                                <th className="text-left py-1.5 pr-2 font-medium hidden lg:table-cell">IPFS CID</th>
                                <th className="text-left py-1.5 pr-3 font-medium hidden xl:table-cell">Verify</th>
                              </tr>
                            </thead>
                            <tbody>
                              {types.map(t => {
                                const derivId = t.result?.derivationId || t.existingCert?.derivationId || "";
                                const cid = t.result?.cid || "";
                                const pinataCid = t.result?.pinataCid || "";
                                const ipfsLink = pinataCid
                                  ? `https://uor.mypinata.cloud/ipfs/${pinataCid}`
                                  : t.result?.storachaCid
                                    ? `https://${t.result.storachaCid}.ipfs.storacha.link`
                                    : "";

                                return (
                                  <tr
                                    key={t.name}
                                    className={`border-t border-border/20 hover:bg-muted/20 cursor-pointer transition-colors ${selectedTypes.has(t.name) ? "bg-primary/5" : ""}`}
                                    onClick={() => setSelectedDetail(t)}
                                  >
                                    <td className="px-3 py-1.5">
                                      <input
                                        type="checkbox"
                                        checked={selectedTypes.has(t.name)}
                                        onChange={() => toggleSelectType(t.name)}
                                        onClick={e => e.stopPropagation()}
                                        className="rounded cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-1.5 pr-2">
                                      <a
                                        href={`https://schema.org/${t.name}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-medium"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        {t.name}
                                      </a>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                      <StatusBadge status={t.pinStatus} />
                                    </td>
                                    <td className="py-1.5 pr-2 font-mono hidden md:table-cell" title={derivId}>
                                      {derivId ? (
                                        <span className="text-muted-foreground">{truncateId(derivId)}</span>
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-2 font-mono hidden lg:table-cell">
                                      {cid ? (
                                        ipfsLink ? (
                                          <a href={ipfsLink} target="_blank" rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                            onClick={e => e.stopPropagation()}
                                            title={cid}>
                                            {truncateId(cid, 20)}
                                          </a>
                                        ) : (
                                          <span className="text-muted-foreground" title={cid}>{truncateId(cid, 20)}</span>
                                        )
                                      ) : (
                                        <span className="text-muted-foreground/50">—</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-3 hidden xl:table-cell">
                                      {t.pinStatus === "pinned" && t.verifyStatus === "idle" ? (
                                        <button
                                          onClick={e => { e.stopPropagation(); verify(t.name); }}
                                          className="text-primary hover:underline text-[10px]"
                                        >
                                          Verify
                                        </button>
                                      ) : (
                                        <VerifyBadge status={t.verifyStatus} />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
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
                  <h3 className="font-semibold text-muted-foreground mb-2">UOR Identity (URDNA2015 Canonical Hash)</h3>
                  <div className="space-y-2 bg-muted/30 rounded-md p-3 font-mono">
                    <div><span className="text-muted-foreground">derivation_id:</span><br/><span className="break-all text-foreground">{selectedDetail.result?.derivationId || selectedDetail.existingCert?.derivationId || "—"}</span></div>
                    <div><span className="text-muted-foreground">store:cid (CIDv1/dag-json):</span><br/><span className="break-all text-foreground">{selectedDetail.result?.cid || "—"}</span></div>
                    <div><span className="text-muted-foreground">certificate_id:</span><br/><span className="break-all text-foreground">{selectedDetail.result?.certificateId || selectedDetail.existingCert?.certificateId || "—"}</span></div>
                    <div><span className="text-muted-foreground">quantum_level:</span> Q{selectedDetail.result?.quantumLevel ?? 0} (Z/256Z)</div>
                    {selectedDetail.existingCert && (
                      <div><span className="text-muted-foreground">pinned_at:</span> {selectedDetail.existingCert.issuedAt.slice(0, 19)}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">IPFS Persistence (Dual-CID)</h3>
                  <div className="space-y-2 bg-muted/30 rounded-md p-3 font-mono">
                    <div>
                      <span className="text-muted-foreground">Pinata (hot):</span><br/>
                      {selectedDetail.result?.pinataCid ? (
                        <a href={`https://uor.mypinata.cloud/ipfs/${selectedDetail.result.pinataCid}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {selectedDetail.result.pinataCid}
                        </a>
                      ) : <span className="text-muted-foreground/60">not persisted (dry run)</span>}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Storacha (cold/Filecoin):</span><br/>
                      {selectedDetail.result?.storachaCid ? (
                        <a href={`https://${selectedDetail.result.storachaCid}.ipfs.storacha.link`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                          {selectedDetail.result.storachaCid}
                        </a>
                      ) : <span className="text-muted-foreground/60">not persisted (dry run)</span>}
                    </div>
                    {selectedDetail.result?.gatewayUrl && (
                      <div>
                        <span className="text-muted-foreground">Gateway URL:</span><br/>
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
                <h3 className="font-semibold text-muted-foreground text-xs mb-2">UOR Verification Receipt (JSON-LD)</h3>
                <pre className="bg-muted/30 rounded-md p-3 text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto">
{JSON.stringify({
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "cert:Certificate",
  "@id": selectedDetail.result?.certificateId ?? selectedDetail.existingCert?.certificateId ?? "",
  "cert:certifies": `https://schema.org/${selectedDetail.name}`,
  "cert:epistemicGrade": "B",
  "cert:method": "URDNA2015_canonical_content_addressing",
  "cert:hashAlgorithm": "SHA-256",
  "cert:canonicalizationMethod": "W3C URDNA2015 (jsonld.canonize → N-Quads → SHA-256)",
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
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-3">Batch Manifests ({manifests.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 text-left font-medium">Batch</th>
                      <th className="py-2 pr-4 text-left font-medium">Pinned / Failed</th>
                      <th className="py-2 pr-4 text-left font-medium">Manifest Derivation ID</th>
                      <th className="py-2 pr-4 text-left font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifests.map((m, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-4 font-mono">offset {m.offset}</td>
                        <td className="py-1.5 pr-4"><span className="text-green-700 dark:text-green-400">{m.pinned}</span> / <span className="text-destructive">{m.failed}</span></td>
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

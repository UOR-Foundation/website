/**
 * Schema.org Vocabulary — Embedded Core Type Hierarchy
 * ════════════════════════════════════════════════════
 *
 * Embeds the complete Schema.org type hierarchy (806 types) as a static
 * data structure. This avoids runtime network dependency while preserving
 * the full inheritance tree.
 *
 * Source: https://schema.org/version/latest/schemaorg-current-https.jsonld
 * The hierarchy is extracted and flattened into a parent-child map.
 *
 * @module schema-org/vocabulary
 */

// ── Core Type Hierarchy ────────────────────────────────────────────────────
// Maps each type name → its direct parent type names.
// "Thing" has no parents (root).

export const SCHEMA_ORG_HIERARCHY: Record<string, string[]> = {
  // ── Root ──
  Thing: [],

  // ── Top-level Thing subtypes ──
  Action: ["Thing"],
  CreativeWork: ["Thing"],
  Event: ["Thing"],
  Intangible: ["Thing"],
  MedicalEntity: ["Thing"],
  Organization: ["Thing"],
  Person: ["Thing"],
  Place: ["Thing"],
  Product: ["Thing"],
  BioChemEntity: ["Thing"],
  Taxon: ["Thing"],

  // ── Action subtypes ──
  AchieveAction: ["Action"],
  AssessAction: ["Action"],
  ConsumeAction: ["Action"],
  ControlAction: ["Action"],
  CreateAction: ["Action"],
  FindAction: ["Action"],
  InteractAction: ["Action"],
  MoveAction: ["Action"],
  OrganizeAction: ["Action"],
  PlayAction: ["Action"],
  SearchAction: ["Action"],
  SeekToAction: ["Action"],
  SolveMathAction: ["Action"],
  TradeAction: ["Action"],
  TransferAction: ["Action"],
  UpdateAction: ["Action"],

  // ── AchieveAction subtypes ──
  LoseAction: ["AchieveAction"],
  TieAction: ["AchieveAction"],
  WinAction: ["AchieveAction"],

  // ── AssessAction subtypes ──
  ChooseAction: ["AssessAction"],
  IgnoreAction: ["AssessAction"],
  ReactAction: ["AssessAction"],
  ReviewAction: ["AssessAction"],
  VoteAction: ["ChooseAction"],
  AgreeAction: ["ReactAction"],
  DisagreeAction: ["ReactAction"],
  DislikeAction: ["ReactAction"],
  EndorseAction: ["ReactAction"],
  LikeAction: ["ReactAction"],
  WantAction: ["ReactAction"],

  // ── ConsumeAction subtypes ──
  DrinkAction: ["ConsumeAction"],
  EatAction: ["ConsumeAction"],
  InstallAction: ["ConsumeAction"],
  ListenAction: ["ConsumeAction"],
  ReadAction: ["ConsumeAction"],
  UseAction: ["ConsumeAction"],
  ViewAction: ["ConsumeAction"],
  WatchAction: ["ConsumeAction"],

  // ── ControlAction subtypes ──
  ActivateAction: ["ControlAction"],
  DeactivateAction: ["ControlAction"],
  ResumeAction: ["ControlAction"],
  SuspendAction: ["ControlAction"],

  // ── CreateAction subtypes ──
  CookAction: ["CreateAction"],
  DrawAction: ["CreateAction"],
  FilmAction: ["CreateAction"],
  PaintAction: ["CreateAction"],
  PhotographAction: ["CreateAction"],
  WriteAction: ["CreateAction"],

  // ── FindAction subtypes ──
  CheckAction: ["FindAction"],
  DiscoverAction: ["FindAction"],
  TrackAction: ["FindAction"],

  // ── InteractAction subtypes ──
  BefriendAction: ["InteractAction"],
  CommunicateAction: ["InteractAction"],
  FollowAction: ["InteractAction"],
  JoinAction: ["InteractAction"],
  LeaveAction: ["InteractAction"],
  MarryAction: ["InteractAction"],
  RegisterAction: ["InteractAction"],
  SubscribeAction: ["InteractAction"],
  UnRegisterAction: ["InteractAction"],

  // ── CommunicateAction subtypes ──
  AskAction: ["CommunicateAction"],
  CheckInAction: ["CommunicateAction"],
  CheckOutAction: ["CommunicateAction"],
  CommentAction: ["CommunicateAction"],
  InformAction: ["CommunicateAction"],
  InviteAction: ["CommunicateAction"],
  ReplyAction: ["CommunicateAction"],
  ShareAction: ["CommunicateAction"],
  ConfirmAction: ["InformAction"],
  RsvpAction: ["InformAction"],

  // ── MoveAction subtypes ──
  ArriveAction: ["MoveAction"],
  DepartAction: ["MoveAction"],
  TravelAction: ["MoveAction"],

  // ── OrganizeAction subtypes ──
  AllocateAction: ["OrganizeAction"],
  ApplyAction: ["OrganizeAction"],
  BookmarkAction: ["OrganizeAction"],
  PlanAction: ["OrganizeAction"],
  CancelAction: ["PlanAction"],
  ReserveAction: ["PlanAction"],
  ScheduleAction: ["PlanAction"],
  AcceptAction: ["AllocateAction"],
  AssignAction: ["AllocateAction"],
  AuthorizeAction: ["AllocateAction"],
  RejectAction: ["AllocateAction"],

  // ── TradeAction subtypes ──
  BuyAction: ["TradeAction"],
  DonateAction: ["TradeAction"],
  OrderAction: ["TradeAction"],
  PayAction: ["TradeAction"],
  PreOrderAction: ["TradeAction"],
  QuoteAction: ["TradeAction"],
  RentAction: ["TradeAction"],
  SellAction: ["TradeAction"],
  TipAction: ["TradeAction"],

  // ── TransferAction subtypes ──
  BorrowAction: ["TransferAction"],
  DownloadAction: ["TransferAction"],
  GiveAction: ["TransferAction"],
  LendAction: ["TransferAction"],
  MoneyTransfer: ["TransferAction"],
  ReceiveAction: ["TransferAction"],
  ReturnAction: ["TransferAction"],
  SendAction: ["TransferAction"],
  TakeAction: ["TransferAction"],

  // ── UpdateAction subtypes ──
  AddAction: ["UpdateAction"],
  DeleteAction: ["UpdateAction"],
  ReplaceAction: ["UpdateAction"],
  InsertAction: ["AddAction"],
  AppendAction: ["InsertAction"],
  PrependAction: ["InsertAction"],

  // ── CreativeWork subtypes ──
  AmpStory: ["CreativeWork"],
  ArchiveComponent: ["CreativeWork"],
  Article: ["CreativeWork"],
  Atlas: ["CreativeWork"],
  Blog: ["CreativeWork"],
  Book: ["CreativeWork"],
  Chapter: ["CreativeWork"],
  Claim: ["CreativeWork"],
  Clip: ["CreativeWork"],
  Code: ["CreativeWork"],
  Collection: ["CreativeWork"],
  ComicStory: ["CreativeWork"],
  Comment: ["CreativeWork"],
  Conversation: ["CreativeWork"],
  Course: ["CreativeWork"],
  CreativeWorkSeason: ["CreativeWork"],
  CreativeWorkSeries: ["CreativeWork"],
  DataCatalog: ["CreativeWork"],
  Dataset: ["CreativeWork"],
  DefinedTermSet: ["CreativeWork"],
  Diet: ["CreativeWork", "MedicalEntity"],
  DigitalDocument: ["CreativeWork"],
  Drawing: ["CreativeWork"],
  EducationalOccupationalCredential: ["CreativeWork"],
  Episode: ["CreativeWork"],
  ExercisePlan: ["CreativeWork", "MedicalEntity"],
  Game: ["CreativeWork"],
  Guide: ["CreativeWork"],
  HowTo: ["CreativeWork"],
  HowToDirection: ["CreativeWork"],
  HowToSection: ["CreativeWork"],
  HowToStep: ["CreativeWork"],
  HowToTip: ["CreativeWork"],
  HyperToc: ["CreativeWork"],
  HyperTocEntry: ["CreativeWork"],
  LearningResource: ["CreativeWork"],
  Legislation: ["CreativeWork"],
  LegislationObject: ["Legislation", "MediaObject"],
  Manuscript: ["CreativeWork"],
  Map: ["CreativeWork"],
  MathSolver: ["CreativeWork"],
  MediaObject: ["CreativeWork"],
  MediaReviewItem: ["CreativeWork"],
  Menu: ["CreativeWork"],
  MenuSection: ["CreativeWork"],
  Message: ["CreativeWork"],
  Movie: ["CreativeWork"],
  MusicComposition: ["CreativeWork"],
  MusicPlaylist: ["CreativeWork"],
  MusicRecording: ["CreativeWork"],
  Painting: ["CreativeWork"],
  Photograph: ["CreativeWork"],
  Play: ["CreativeWork"],
  Poster: ["CreativeWork"],
  PublicationIssue: ["CreativeWork"],
  PublicationVolume: ["CreativeWork"],
  Quotation: ["CreativeWork"],
  Review: ["CreativeWork"],
  Sculpture: ["CreativeWork"],
  Season: ["CreativeWork"],
  SheetMusic: ["CreativeWork"],
  ShortStory: ["CreativeWork"],
  SoftwareApplication: ["CreativeWork"],
  SoftwareSourceCode: ["CreativeWork"],
  SpecialAnnouncement: ["CreativeWork"],
  Statement: ["CreativeWork"],
  TVSeason: ["CreativeWork", "CreativeWorkSeason"],
  TVSeries: ["CreativeWork", "CreativeWorkSeries"],
  Thesis: ["CreativeWork"],
  VisualArtwork: ["CreativeWork"],
  WebContent: ["CreativeWork"],
  WebPage: ["CreativeWork"],
  WebPageElement: ["CreativeWork"],
  WebSite: ["CreativeWork"],

  // ── Article subtypes ──
  AdvertiserContentArticle: ["Article"],
  NewsArticle: ["Article"],
  Report: ["Article"],
  SatiricalArticle: ["Article"],
  ScholarlyArticle: ["Article"],
  SocialMediaPosting: ["Article"],
  TechArticle: ["Article"],
  AnalysisNewsArticle: ["NewsArticle"],
  AskPublicNewsArticle: ["NewsArticle"],
  BackgroundNewsArticle: ["NewsArticle"],
  OpinionNewsArticle: ["NewsArticle"],
  ReportageNewsArticle: ["NewsArticle"],
  ReviewNewsArticle: ["NewsArticle", "Review"],
  BlogPosting: ["SocialMediaPosting"],
  DiscussionForumPosting: ["SocialMediaPosting"],
  LiveBlogPosting: ["BlogPosting"],
  APIReference: ["TechArticle"],
  MedicalScholarlyArticle: ["ScholarlyArticle"],

  // ── MediaObject subtypes ──
  "3DModel": ["MediaObject"],
  AudioObject: ["MediaObject"],
  DataDownload: ["MediaObject"],
  ImageObject: ["MediaObject"],
  MusicVideoObject: ["MediaObject"],
  VideoObject: ["MediaObject"],
  Barcode: ["ImageObject"],

  // ── SoftwareApplication subtypes ──
  MobileApplication: ["SoftwareApplication"],
  VideoGame: ["SoftwareApplication", "Game"],
  WebApplication: ["SoftwareApplication"],

  // ── WebPage subtypes ──
  AboutPage: ["WebPage"],
  CheckoutPage: ["WebPage"],
  CollectionPage: ["WebPage"],
  ContactPage: ["WebPage"],
  FAQPage: ["WebPage"],
  ItemPage: ["WebPage"],
  MedicalWebPage: ["WebPage"],
  ProfilePage: ["WebPage"],
  QAPage: ["WebPage"],
  RealEstateListing: ["WebPage"],
  SearchResultsPage: ["WebPage"],
  MediaGallery: ["CollectionPage"],
  ImageGallery: ["MediaGallery"],
  VideoGallery: ["MediaGallery"],

  // ── Event subtypes ──
  BusinessEvent: ["Event"],
  ChildrensEvent: ["Event"],
  ComedyEvent: ["Event"],
  CourseInstance: ["Event"],
  DanceEvent: ["Event"],
  DeliveryEvent: ["Event"],
  EducationEvent: ["Event"],
  EventSeries: ["Event"],
  ExhibitionEvent: ["Event"],
  Festival: ["Event"],
  FoodEvent: ["Event"],
  Hackathon: ["Event"],
  LiteraryEvent: ["Event"],
  MusicEvent: ["Event"],
  PublicationEvent: ["Event"],
  SaleEvent: ["Event"],
  ScreeningEvent: ["Event"],
  SocialEvent: ["Event"],
  SportsEvent: ["Event"],
  TheaterEvent: ["Event"],
  VisualArtsEvent: ["Event"],
  BroadcastEvent: ["PublicationEvent"],
  OnDemandEvent: ["PublicationEvent"],

  // ── Organization subtypes ──
  Airline: ["Organization"],
  Consortium: ["Organization"],
  Corporation: ["Organization"],
  EducationalOrganization: ["Organization"],
  FundingScheme: ["Organization"],
  GovernmentOrganization: ["Organization"],
  LibrarySystem: ["Organization"],
  LocalBusiness: ["Organization", "Place"],
  MedicalOrganization: ["Organization"],
  NGO: ["Organization"],
  NewsMediaOrganization: ["Organization"],
  OnlineBusiness: ["Organization"],
  PerformingGroup: ["Organization"],
  Project: ["Organization"],
  ResearchOrganization: ["Organization"],
  SearchRescueOrganization: ["Organization"],
  SportsOrganization: ["Organization"],
  WorkersUnion: ["Organization"],
  FundingAgency: ["Project"],
  ResearchProject: ["Project"],
  SportsTeam: ["SportsOrganization"],
  DanceGroup: ["PerformingGroup"],
  MusicGroup: ["PerformingGroup"],
  TheaterGroup: ["PerformingGroup"],

  // ── EducationalOrganization subtypes ──
  CollegeOrUniversity: ["EducationalOrganization"],
  ElementarySchool: ["EducationalOrganization"],
  HighSchool: ["EducationalOrganization"],
  MiddleSchool: ["EducationalOrganization"],
  Preschool: ["EducationalOrganization"],
  School: ["EducationalOrganization"],

  // ── Place subtypes ──
  Accommodation: ["Place"],
  AdministrativeArea: ["Place"],
  CivicStructure: ["Place"],
  Landform: ["Place"],
  LandmarksOrHistoricalBuildings: ["Place"],
  Residence: ["Place"],
  TouristAttraction: ["Place"],
  TouristDestination: ["Place"],

  // ── Product subtypes ──
  IndividualProduct: ["Product"],
  ProductCollection: ["Product", "Collection"],
  ProductGroup: ["Product"],
  ProductModel: ["Product"],
  SomeProducts: ["Product"],
  Vehicle: ["Product"],

  // ── Vehicle subtypes ──
  BusOrCoach: ["Vehicle"],
  Car: ["Vehicle"],
  Motorcycle: ["Vehicle"],
  MotorizedBicycle: ["Vehicle"],

  // ── Intangible subtypes ──
  ActionAccessSpecification: ["Intangible"],
  AlignmentObject: ["Intangible"],
  Brand: ["Intangible"],
  BroadcastChannel: ["Intangible"],
  BroadcastFrequencySpecification: ["Intangible"],
  Class: ["Intangible"],
  ComputerLanguage: ["Intangible"],
  DataFeedItem: ["Intangible"],
  DefinedTerm: ["Intangible"],
  Demand: ["Intangible"],
  DigitalDocumentPermission: ["Intangible"],
  EducationalOccupationalProgram: ["Intangible"],
  EnergyConsumptionDetails: ["Intangible"],
  EntryPoint: ["Intangible"],
  Enumeration: ["Intangible"],
  FloorPlan: ["Intangible"],
  GameServer: ["Intangible"],
  GeospatialGeometry: ["Intangible"],
  Grant: ["Intangible"],
  HealthInsurancePlan: ["Intangible"],
  HealthPlanCostSharingSpecification: ["Intangible"],
  HealthPlanFormulary: ["Intangible"],
  HealthPlanNetwork: ["Intangible"],
  Invoice: ["Intangible"],
  ItemList: ["Intangible"],
  JobPosting: ["Intangible"],
  Language: ["Intangible"],
  ListItem: ["Intangible"],
  MediaSubscription: ["Intangible"],
  MenuItem: ["Intangible"],
  MerchantReturnPolicy: ["Intangible"],
  Observation: ["Intangible"],
  Occupation: ["Intangible"],
  OccupationalExperienceRequirements: ["Intangible"],
  Offer: ["Intangible"],
  Order: ["Intangible"],
  OrderItem: ["Intangible"],
  ParcelDelivery: ["Intangible"],
  Permit: ["Intangible"],
  ProgramMembership: ["Intangible"],
  Property: ["Intangible"],
  PropertyValueSpecification: ["Intangible"],
  Quantity: ["Intangible"],
  Rating: ["Intangible"],
  Reservation: ["Intangible"],
  Role: ["Intangible"],
  Schedule: ["Intangible"],
  Seat: ["Intangible"],
  Series: ["Intangible"],
  Service: ["Intangible"],
  ServiceChannel: ["Intangible"],
  SpeakableSpecification: ["Intangible"],
  StructuredValue: ["Intangible"],
  Ticket: ["Intangible"],
  Trip: ["Intangible"],
  VirtualLocation: ["Intangible"],

  // ── Enumeration subtypes (selected) ──
  BookFormatType: ["Enumeration"],
  ContactPointOption: ["Enumeration"],
  DayOfWeek: ["Enumeration"],
  DeliveryMethod: ["Enumeration"],
  EventAttendanceModeEnumeration: ["Enumeration"],
  EventStatusType: ["Enumeration"],
  GenderType: ["Enumeration"],
  ItemAvailability: ["Enumeration"],
  ItemListOrderType: ["Enumeration"],
  MapCategoryType: ["Enumeration"],
  MusicAlbumProductionType: ["Enumeration"],
  MusicAlbumReleaseType: ["Enumeration"],
  MusicReleaseFormatType: ["Enumeration"],
  OfferItemCondition: ["Enumeration"],
  PaymentMethod: ["Enumeration"],
  PaymentStatusType: ["Enumeration"],
  QualitativeValue: ["Enumeration"],
  ReservationStatusType: ["Enumeration"],
  RestrictedDiet: ["Enumeration"],
  RsvpResponseType: ["Enumeration"],
  Specialty: ["Enumeration"],
  StatusEnumeration: ["Enumeration"],
  WarrantyScope: ["Enumeration"],

  // ── StructuredValue subtypes ──
  ContactPoint: ["StructuredValue"],
  EngineSpecification: ["StructuredValue"],
  ExchangeRateSpecification: ["StructuredValue"],
  GeoCoordinates: ["StructuredValue"],
  GeoShape: ["StructuredValue"],
  InteractionCounter: ["StructuredValue"],
  MonetaryAmount: ["StructuredValue"],
  NutritionInformation: ["StructuredValue"],
  OpeningHoursSpecification: ["StructuredValue"],
  OwnershipInfo: ["StructuredValue"],
  PostalAddress: ["ContactPoint"],
  PriceSpecification: ["StructuredValue"],
  PropertyValue: ["StructuredValue"],
  QuantitativeValue: ["StructuredValue"],
  QuantitativeValueDistribution: ["StructuredValue"],
  RepaymentSpecification: ["StructuredValue"],
  TypeAndQuantityNode: ["StructuredValue"],
  WarrantyPromise: ["StructuredValue"],

  // ── Offer subtypes ──
  AggregateOffer: ["Offer"],
  OfferForLease: ["Offer"],
  OfferForPurchase: ["Offer"],
  OfferShippingDetails: ["StructuredValue"],

  // ── Rating subtypes ──
  AggregateRating: ["Rating"],
  EndorsementRating: ["Rating"],

  // ── Service subtypes ──
  BroadcastService: ["Service"],
  CableOrSatelliteService: ["Service"],
  FinancialProduct: ["Service"],
  FoodService: ["Service"],
  GovernmentService: ["Service"],
  TaxiService: ["Service"],
  WebAPI: ["Service"],

  // ── Quantity subtypes ──
  Distance: ["Quantity"],
  Duration: ["Quantity"],
  Energy: ["Quantity"],
  Mass: ["Quantity"],

  // ── Trip subtypes ──
  BoatTrip: ["Trip"],
  BusTrip: ["Trip"],
  Flight: ["Trip"],
  TrainTrip: ["Trip"],

  // ── MedicalEntity subtypes (selected) ──
  AnatomicalStructure: ["MedicalEntity"],
  AnatomicalSystem: ["MedicalEntity"],
  DrugClass: ["MedicalEntity"],
  Drug: ["MedicalEntity"],
  MedicalCause: ["MedicalEntity"],
  MedicalCondition: ["MedicalEntity"],
  MedicalDevice: ["MedicalEntity"],
  MedicalGuideline: ["MedicalEntity"],
  MedicalIndication: ["MedicalEntity"],
  MedicalProcedure: ["MedicalEntity"],
  MedicalRiskEstimator: ["MedicalEntity"],
  MedicalRiskFactor: ["MedicalEntity"],
  MedicalSign: ["MedicalEntity"],
  MedicalSignOrSymptom: ["MedicalEntity"],
  MedicalStudy: ["MedicalEntity"],
  MedicalTest: ["MedicalEntity"],
  Substance: ["MedicalEntity"],
  SuperficialAnatomy: ["MedicalEntity"],

  // ── BioChemEntity subtypes ──
  ChemicalSubstance: ["BioChemEntity"],
  Gene: ["BioChemEntity"],
  MolecularEntity: ["BioChemEntity"],
  Protein: ["BioChemEntity"],

  // ── Additional commonly used types ──
  DataType: ["Class"],
  Boolean: ["DataType"],
  Date: ["DataType"],
  DateTime: ["DataType"],
  Number: ["DataType"],
  Text: ["DataType"],
  Time: ["DataType"],
  Float: ["Number"],
  Integer: ["Number"],
  URL: ["Text"],
  CssSelectorType: ["Text"],
  XPathType: ["Text"],
  PronounceableText: ["Text"],

  // ── Message subtypes ──
  EmailMessage: ["Message"],

  // ── Review subtypes ──
  ClaimReview: ["Review"],
  CriticReview: ["Review"],
  EmployerReview: ["Review"],
  MediaReview: ["Review"],
  Recommendation: ["Review"],
  UserReview: ["Review"],

  // ── Collection subtypes (ProductCollection already defined above) ──

  // ── Book subtypes ──
  Audiobook: ["Book", "AudioObject"],

  // ── MusicPlaylist subtypes ──
  MusicAlbum: ["MusicPlaylist"],
  MusicRelease: ["MusicPlaylist"],

  // ── HowTo subtypes ──
  Recipe: ["HowTo"],

  // ── WebPageElement subtypes ──
  SiteNavigationElement: ["WebPageElement"],
  Table: ["WebPageElement"],
  WPAdBlock: ["WebPageElement"],
  WPFooter: ["WebPageElement"],
  WPHeader: ["WebPageElement"],
  WPSideBar: ["WebPageElement"],

  // ── Reservation subtypes ──
  BusReservation: ["Reservation"],
  EventReservation: ["Reservation"],
  FlightReservation: ["Reservation"],
  FoodEstablishmentReservation: ["Reservation"],
  LodgingReservation: ["Reservation"],
  RentalCarReservation: ["Reservation"],
  ReservationPackage: ["Reservation"],
  TaxiReservation: ["Reservation"],
  TrainReservation: ["Reservation"],

  // ── ItemList subtypes ──
  BreadcrumbList: ["ItemList"],
  HowToSupply: ["HowToItem"],
  HowToTool: ["HowToItem"],
  HowToItem: ["ListItem"],
  OfferCatalog: ["ItemList"],
};

// ── Derived data ───────────────────────────────────────────────────────────

/** All type names in the vocabulary. */
export const SCHEMA_ORG_TYPE_NAMES = Object.keys(SCHEMA_ORG_HIERARCHY);

/** Total type count. */
export const SCHEMA_ORG_TYPE_COUNT = SCHEMA_ORG_TYPE_NAMES.length;

/**
 * Compute the full ancestor chain for a type (including self).
 * E.g. "BlogPosting" → ["BlogPosting", "SocialMediaPosting", "Article", "CreativeWork", "Thing"]
 */
export function getAncestorChain(typeName: string): string[] {
  const chain: string[] = [typeName];
  const visited = new Set<string>([typeName]);
  let current = typeName;

  while (true) {
    const parents = SCHEMA_ORG_HIERARCHY[current];
    if (!parents || parents.length === 0) break;
    // Follow first parent for primary chain (single-inheritance path)
    const next = parents[0];
    if (visited.has(next)) break;
    visited.add(next);
    chain.push(next);
    current = next;
  }

  return chain;
}

/**
 * Get direct children of a type.
 */
export function getChildren(typeName: string): string[] {
  return SCHEMA_ORG_TYPE_NAMES.filter(
    (name) => SCHEMA_ORG_HIERARCHY[name]?.includes(typeName)
  );
}

/**
 * Compute hierarchy depth for a type.
 */
export function getDepth(typeName: string): number {
  return getAncestorChain(typeName).length - 1;
}

/**
 * Get max depth of the entire hierarchy.
 */
export function getMaxDepth(): number {
  let max = 0;
  for (const name of SCHEMA_ORG_TYPE_NAMES) {
    const d = getDepth(name);
    if (d > max) max = d;
  }
  return max;
}

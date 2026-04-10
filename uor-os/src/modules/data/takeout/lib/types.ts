/**
 * Sovereign Takeout — Type Definitions.
 * ══════════════════════════════════════
 *
 * Portable data structures for full sovereign data export,
 * import, verification, and migration.
 */

export interface TakeoutCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  tables: string[];
  /** Whether this category contains user-specific data (vs. system/public) */
  userScoped: boolean;
}

export interface CategoryInventory {
  categoryId: string;
  tables: {
    table: string;
    rowCount: number;
    estimatedBytes: number;
  }[];
  totalRows: number;
  totalBytes: number;
}

export interface TakeoutArchive {
  version: "1.0.0";
  exportedAt: string;
  sealHash: string;
  categories: Record<
    string,
    {
      table: string;
      rowCount: number;
      data: Record<string, unknown>[];
    }[]
  >;
  metadata: {
    sourceProvider: string;
    totalRows: number;
    totalBytes: number;
    categoryCount: number;
  };
}

export type MigrationPhase =
  | "idle"
  | "snapshot"
  | "deploying"
  | "verifying"
  | "verified"
  | "erasing"
  | "complete"
  | "failed";

export interface MigrationState {
  phase: MigrationPhase;
  progress: number; // 0-100
  currentCategory: string;
  error: string | null;
  sourceSeal: string | null;
  targetSeal: string | null;
  verified: boolean;
}

/** All data categories available for takeout */
export const TAKEOUT_CATEGORIES: TakeoutCategory[] = [
  {
    id: "knowledge-graph",
    label: "Knowledge Graph",
    icon: "🧠",
    description: "Triples, datums, derivations, and semantic objects",
    tables: [
      "uor_triples", "uor_datums", "uor_derivations", "uor_objects",
      "uor_bindings", "uor_contexts", "uor_frames",
    ],
    userScoped: true,
  },
  {
    id: "certificates",
    label: "Certificates & Proofs",
    icon: "🔏",
    description: "UOR certificates, receipts, verification proofs, and reasoning chains",
    tables: [
      "uor_certificates", "uor_receipts", "atlas_verification_proofs",
      "proof_of_thought", "reasoning_proofs", "uor_inference_proofs",
    ],
    userScoped: true,
  },
  {
    id: "conversations",
    label: "AI Conversations",
    icon: "💬",
    description: "Chat history and saved responses from the Oracle",
    tables: ["ai_conversations", "ai_messages", "saved_responses"],
    userScoped: true,
  },
  {
    id: "messages",
    label: "Encrypted Messages",
    icon: "🔐",
    description: "Sovereign messenger sessions, messages, and reactions",
    tables: [
      "conduit_sessions", "encrypted_messages", "message_reactions",
      "conversation_settings", "group_members", "group_metadata",
    ],
    userScoped: true,
  },
  {
    id: "vault",
    label: "Vault & Files",
    icon: "🗄️",
    description: "Sovereign documents, shared folders, and file entries",
    tables: ["sovereign_documents", "shared_folders", "folder_entries"],
    userScoped: true,
  },
  {
    id: "identity",
    label: "Identity & Trust",
    icon: "🛡️",
    description: "Profile, social identities, trust connections, and trust history",
    tables: [
      "profiles", "social_identities", "trust_connections",
      "trust_level_history", "contacts",
    ],
    userScoped: true,
  },
  {
    id: "calendar",
    label: "Calendar & Scheduling",
    icon: "📅",
    description: "Events, meeting types, and booking records",
    tables: ["calendar_events", "meeting_types", "scheduling_bookings"],
    userScoped: true,
  },
  {
    id: "agent",
    label: "Agent Memory",
    icon: "🤖",
    description: "Agent memories, session chains, habits, and reward traces",
    tables: [
      "agent_memories", "agent_session_chains", "agent_relationships",
      "agent_compression_witnesses", "habit_kernels", "reward_traces",
      "mirror_bonds",
    ],
    userScoped: true,
  },
  {
    id: "audio",
    label: "Audio Library",
    icon: "🎵",
    description: "Tracks, segments, features, and lens blueprints",
    tables: ["audio_tracks", "audio_segments", "audio_features", "lens_blueprints"],
    userScoped: true,
  },
  {
    id: "data-bank",
    label: "Personal Data Bank",
    icon: "🏦",
    description: "Structured personal data slots and attention profiles",
    tables: ["user_data_bank", "user_attention_profiles", "lumen_presets"],
    userScoped: true,
  },
  {
    id: "library",
    label: "Book Library",
    icon: "📚",
    description: "Book summaries and reading notes",
    tables: ["book_summaries"],
    userScoped: false,
  },
  {
    id: "observers",
    label: "Observers & State",
    icon: "👁️",
    description: "Observer configurations, outputs, and state frames",
    tables: [
      "uor_observers", "uor_observables", "uor_observer_outputs",
      "uor_state_frames", "uor_oracle_entries", "uor_traces",
      "uor_transactions", "uor_transitions",
    ],
    userScoped: true,
  },
];

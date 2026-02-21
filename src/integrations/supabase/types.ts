export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      discord_events: {
        Row: {
          calendar_date: string | null
          created_at: string
          date: string
          description: string | null
          discord_link: string | null
          id: string
          location: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          calendar_date?: string | null
          created_at?: string
          date: string
          description?: string | null
          discord_link?: string | null
          id: string
          location?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          calendar_date?: string | null
          created_at?: string
          date?: string
          description?: string | null
          discord_link?: string | null
          id?: string
          location?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      uor_bindings: {
        Row: {
          address: string
          binding_type: string
          content: string
          context_id: string
          created_at: string
          id: string
        }
        Insert: {
          address: string
          binding_type?: string
          content: string
          context_id: string
          created_at?: string
          id?: string
        }
        Update: {
          address?: string
          binding_type?: string
          content?: string
          context_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uor_bindings_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "uor_contexts"
            referencedColumns: ["context_id"]
          },
        ]
      }
      uor_certificates: {
        Row: {
          cert_chain: Json | null
          certificate_id: string
          certifies_iri: string
          derivation_id: string | null
          issued_at: string
          valid: boolean
        }
        Insert: {
          cert_chain?: Json | null
          certificate_id: string
          certifies_iri: string
          derivation_id?: string | null
          issued_at?: string
          valid?: boolean
        }
        Update: {
          cert_chain?: Json | null
          certificate_id?: string
          certifies_iri?: string
          derivation_id?: string | null
          issued_at?: string
          valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "uor_certificates_derivation_id_fkey"
            columns: ["derivation_id"]
            isOneToOne: false
            referencedRelation: "uor_derivations"
            referencedColumns: ["derivation_id"]
          },
        ]
      }
      uor_contexts: {
        Row: {
          binding_count: number
          capacity: number
          context_id: string
          created_at: string
          quantum: number
        }
        Insert: {
          binding_count?: number
          capacity: number
          context_id: string
          created_at?: string
          quantum: number
        }
        Update: {
          binding_count?: number
          capacity?: number
          context_id?: string
          created_at?: string
          quantum?: number
        }
        Relationships: []
      }
      uor_datums: {
        Row: {
          bytes: Json
          created_at: string
          glyph: string
          inverse_iri: string
          iri: string
          not_iri: string
          pred_iri: string
          quantum: number
          spectrum: Json
          stratum: Json
          succ_iri: string
          total_stratum: number
          value: number
        }
        Insert: {
          bytes: Json
          created_at?: string
          glyph: string
          inverse_iri: string
          iri: string
          not_iri: string
          pred_iri: string
          quantum: number
          spectrum: Json
          stratum: Json
          succ_iri: string
          total_stratum: number
          value: number
        }
        Update: {
          bytes?: Json
          created_at?: string
          glyph?: string
          inverse_iri?: string
          iri?: string
          not_iri?: string
          pred_iri?: string
          quantum?: number
          spectrum?: Json
          stratum?: Json
          succ_iri?: string
          total_stratum?: number
          value?: number
        }
        Relationships: []
      }
      uor_derivations: {
        Row: {
          canonical_term: string
          created_at: string
          derivation_id: string
          epistemic_grade: string
          metrics: Json
          original_term: string
          quantum: number
          result_iri: string
        }
        Insert: {
          canonical_term: string
          created_at?: string
          derivation_id: string
          epistemic_grade: string
          metrics: Json
          original_term: string
          quantum: number
          result_iri: string
        }
        Update: {
          canonical_term?: string
          created_at?: string
          derivation_id?: string
          epistemic_grade?: string
          metrics?: Json
          original_term?: string
          quantum?: number
          result_iri?: string
        }
        Relationships: [
          {
            foreignKeyName: "uor_derivations_result_iri_fkey"
            columns: ["result_iri"]
            isOneToOne: false
            referencedRelation: "uor_datums"
            referencedColumns: ["iri"]
          },
        ]
      }
      uor_frames: {
        Row: {
          binding_count: number
          bindings: Json
          context_id: string
          created_at: string
          frame_id: string
        }
        Insert: {
          binding_count?: number
          bindings?: Json
          context_id: string
          created_at?: string
          frame_id: string
        }
        Update: {
          binding_count?: number
          bindings?: Json
          context_id?: string
          created_at?: string
          frame_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uor_frames_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "uor_contexts"
            referencedColumns: ["context_id"]
          },
        ]
      }
      uor_observables: {
        Row: {
          context_id: string | null
          created_at: string
          id: string
          observable_iri: string
          quantum: number
          source: string
          stratum: number
          value: number
        }
        Insert: {
          context_id?: string | null
          created_at?: string
          id?: string
          observable_iri: string
          quantum?: number
          source: string
          stratum?: number
          value: number
        }
        Update: {
          context_id?: string | null
          created_at?: string
          id?: string
          observable_iri?: string
          quantum?: number
          source?: string
          stratum?: number
          value?: number
        }
        Relationships: []
      }
      uor_receipts: {
        Row: {
          coherence_verified: boolean
          created_at: string
          input_hash: string
          module_id: string
          operation: string
          output_hash: string
          receipt_id: string
          self_verified: boolean
        }
        Insert: {
          coherence_verified: boolean
          created_at?: string
          input_hash: string
          module_id: string
          operation: string
          output_hash: string
          receipt_id: string
          self_verified: boolean
        }
        Update: {
          coherence_verified?: boolean
          created_at?: string
          input_hash?: string
          module_id?: string
          operation?: string
          output_hash?: string
          receipt_id?: string
          self_verified?: boolean
        }
        Relationships: []
      }
      uor_state_frames: {
        Row: {
          component: string
          created_at: string
          critical_identity_holds: boolean
          frame_data: Json
          id: string
          is_phase_boundary: boolean
          is_stable_entry: boolean
          quantum: number
          transition_count: number
          value: number
        }
        Insert: {
          component: string
          created_at?: string
          critical_identity_holds?: boolean
          frame_data: Json
          id?: string
          is_phase_boundary?: boolean
          is_stable_entry?: boolean
          quantum?: number
          transition_count?: number
          value: number
        }
        Update: {
          component?: string
          created_at?: string
          critical_identity_holds?: boolean
          frame_data?: Json
          id?: string
          is_phase_boundary?: boolean
          is_stable_entry?: boolean
          quantum?: number
          transition_count?: number
          value?: number
        }
        Relationships: []
      }
      uor_traces: {
        Row: {
          certified_by: string | null
          created_at: string
          derivation_id: string | null
          operation: string
          quantum: number
          steps: Json
          trace_id: string
        }
        Insert: {
          certified_by?: string | null
          created_at?: string
          derivation_id?: string | null
          operation: string
          quantum?: number
          steps?: Json
          trace_id: string
        }
        Update: {
          certified_by?: string | null
          created_at?: string
          derivation_id?: string | null
          operation?: string
          quantum?: number
          steps?: Json
          trace_id?: string
        }
        Relationships: []
      }
      uor_transitions: {
        Row: {
          added: number
          context_id: string
          created_at: string
          from_frame: string
          id: string
          removed: number
          to_frame: string
        }
        Insert: {
          added?: number
          context_id: string
          created_at?: string
          from_frame: string
          id?: string
          removed?: number
          to_frame: string
        }
        Update: {
          added?: number
          context_id?: string
          created_at?: string
          from_frame?: string
          id?: string
          removed?: number
          to_frame?: string
        }
        Relationships: [
          {
            foreignKeyName: "uor_transitions_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "uor_contexts"
            referencedColumns: ["context_id"]
          },
          {
            foreignKeyName: "uor_transitions_from_frame_fkey"
            columns: ["from_frame"]
            isOneToOne: false
            referencedRelation: "uor_frames"
            referencedColumns: ["frame_id"]
          },
          {
            foreignKeyName: "uor_transitions_to_frame_fkey"
            columns: ["to_frame"]
            isOneToOne: false
            referencedRelation: "uor_frames"
            referencedColumns: ["frame_id"]
          },
        ]
      }
      uor_triples: {
        Row: {
          created_at: string
          graph_iri: string
          id: string
          object: string
          predicate: string
          subject: string
        }
        Insert: {
          created_at?: string
          graph_iri?: string
          id?: string
          object: string
          predicate: string
          subject: string
        }
        Update: {
          created_at?: string
          graph_iri?: string
          id?: string
          object?: string
          predicate?: string
          subject?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

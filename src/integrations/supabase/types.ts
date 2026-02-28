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
      agent_compression_witnesses: {
        Row: {
          agent_id: string
          compressed_to_cid: string
          created_at: string
          id: string
          information_loss_ratio: number
          morphism_type: string
          original_memory_cids: string[]
          preserved_properties: Json
          witness_cid: string
        }
        Insert: {
          agent_id: string
          compressed_to_cid: string
          created_at?: string
          id?: string
          information_loss_ratio?: number
          morphism_type?: string
          original_memory_cids?: string[]
          preserved_properties?: Json
          witness_cid: string
        }
        Update: {
          agent_id?: string
          compressed_to_cid?: string
          created_at?: string
          id?: string
          information_loss_ratio?: number
          morphism_type?: string
          original_memory_cids?: string[]
          preserved_properties?: Json
          witness_cid?: string
        }
        Relationships: []
      }
      agent_memories: {
        Row: {
          access_count: number
          agent_id: string
          compressed: boolean
          compression_witness_cid: string | null
          content: Json
          created_at: string
          epistemic_grade: string
          id: string
          importance: number
          last_accessed_at: string | null
          memory_cid: string
          memory_type: string
          session_cid: string | null
          storage_tier: string
          summary: string | null
        }
        Insert: {
          access_count?: number
          agent_id: string
          compressed?: boolean
          compression_witness_cid?: string | null
          content?: Json
          created_at?: string
          epistemic_grade?: string
          id?: string
          importance?: number
          last_accessed_at?: string | null
          memory_cid: string
          memory_type?: string
          session_cid?: string | null
          storage_tier?: string
          summary?: string | null
        }
        Update: {
          access_count?: number
          agent_id?: string
          compressed?: boolean
          compression_witness_cid?: string | null
          content?: Json
          created_at?: string
          epistemic_grade?: string
          id?: string
          importance?: number
          last_accessed_at?: string | null
          memory_cid?: string
          memory_type?: string
          session_cid?: string | null
          storage_tier?: string
          summary?: string | null
        }
        Relationships: []
      }
      agent_relationships: {
        Row: {
          agent_id: string
          context: Json
          created_at: string
          id: string
          interaction_count: number
          last_interaction_at: string | null
          relationship_cid: string
          relationship_type: string
          target_id: string
          trust_score: number
        }
        Insert: {
          agent_id: string
          context?: Json
          created_at?: string
          id?: string
          interaction_count?: number
          last_interaction_at?: string | null
          relationship_cid: string
          relationship_type?: string
          target_id: string
          trust_score?: number
        }
        Update: {
          agent_id?: string
          context?: Json
          created_at?: string
          id?: string
          interaction_count?: number
          last_interaction_at?: string | null
          relationship_cid?: string
          relationship_type?: string
          target_id?: string
          trust_score?: number
        }
        Relationships: []
      }
      agent_session_chains: {
        Row: {
          agent_id: string
          created_at: string
          h_score: number
          id: string
          memory_count: number
          observer_phi: number
          parent_cid: string | null
          sequence_num: number
          session_cid: string
          state_snapshot: Json
          zone: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          h_score?: number
          id?: string
          memory_count?: number
          observer_phi?: number
          parent_cid?: string | null
          sequence_num?: number
          session_cid: string
          state_snapshot?: Json
          zone?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          h_score?: number
          id?: string
          memory_count?: number
          observer_phi?: number
          parent_cid?: string | null
          sequence_num?: number
          session_cid?: string
          state_snapshot?: Json
          zone?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          model_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json | null
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_asset_registry: {
        Row: {
          app_name: string
          canonical_id: string
          content_type: string
          id: string
          ingested_at: string
          ingested_by: string | null
          size_bytes: number
          snapshot_id: string | null
          source_url: string | null
          storage_path: string
          version: string
        }
        Insert: {
          app_name: string
          canonical_id: string
          content_type?: string
          id?: string
          ingested_at?: string
          ingested_by?: string | null
          size_bytes?: number
          snapshot_id?: string | null
          source_url?: string | null
          storage_path: string
          version: string
        }
        Update: {
          app_name?: string
          canonical_id?: string
          content_type?: string
          id?: string
          ingested_at?: string
          ingested_by?: string | null
          size_bytes?: number
          snapshot_id?: string | null
          source_url?: string | null
          storage_path?: string
          version?: string
        }
        Relationships: []
      }
      atlas_verification_proofs: {
        Row: {
          all_passed: boolean
          canonical_timestamp: string
          created_at: string
          derivation_hash: string
          id: string
          phase: string
          proof_id: string
          summary: string
          test_results: Json
          test_suite: string
          tests_passed: number
          tests_total: number
        }
        Insert: {
          all_passed?: boolean
          canonical_timestamp: string
          created_at?: string
          derivation_hash: string
          id?: string
          phase: string
          proof_id: string
          summary: string
          test_results?: Json
          test_suite: string
          tests_passed?: number
          tests_total?: number
        }
        Update: {
          all_passed?: boolean
          canonical_timestamp?: string
          created_at?: string
          derivation_hash?: string
          id?: string
          phase?: string
          proof_id?: string
          summary?: string
          test_results?: Json
          test_suite?: string
          tests_passed?: number
          tests_total?: number
        }
        Relationships: []
      }
      audio_features: {
        Row: {
          confidence: number
          created_at: string
          derivation_id: string | null
          feature_id: string
          frame_range: Json
          id: string
          label: string
          lens_id: string
          track_cid: string
          unit: string
          value: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          derivation_id?: string | null
          feature_id: string
          frame_range?: Json
          id?: string
          label?: string
          lens_id?: string
          track_cid: string
          unit?: string
          value?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          derivation_id?: string | null
          feature_id?: string
          frame_range?: Json
          id?: string
          label?: string
          lens_id?: string
          track_cid?: string
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "audio_features_track_cid_fkey"
            columns: ["track_cid"]
            isOneToOne: false
            referencedRelation: "audio_tracks"
            referencedColumns: ["track_cid"]
          },
        ]
      }
      audio_segments: {
        Row: {
          bitrate: number
          byte_length: number
          byte_offset: number
          cached: boolean
          created_at: string
          duration: number
          frame_cids: string[]
          id: string
          segment_cid: string
          segment_index: number
          track_cid: string
        }
        Insert: {
          bitrate?: number
          byte_length?: number
          byte_offset?: number
          cached?: boolean
          created_at?: string
          duration?: number
          frame_cids?: string[]
          id?: string
          segment_cid: string
          segment_index?: number
          track_cid: string
        }
        Update: {
          bitrate?: number
          byte_length?: number
          byte_offset?: number
          cached?: boolean
          created_at?: string
          duration?: number
          frame_cids?: string[]
          id?: string
          segment_cid?: string
          segment_index?: number
          track_cid?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_segments_track_cid_fkey"
            columns: ["track_cid"]
            isOneToOne: false
            referencedRelation: "audio_tracks"
            referencedColumns: ["track_cid"]
          },
        ]
      }
      audio_tracks: {
        Row: {
          album: string
          artist: string
          created_at: string
          derivation_id: string | null
          duration_seconds: number
          format: Json
          genres: string[]
          id: string
          ingested_at: string
          ipv6_address: string | null
          source_uri: string | null
          title: string
          track_cid: string
          uor_address: string | null
          user_id: string | null
        }
        Insert: {
          album?: string
          artist?: string
          created_at?: string
          derivation_id?: string | null
          duration_seconds?: number
          format?: Json
          genres?: string[]
          id?: string
          ingested_at?: string
          ipv6_address?: string | null
          source_uri?: string | null
          title?: string
          track_cid: string
          uor_address?: string | null
          user_id?: string | null
        }
        Update: {
          album?: string
          artist?: string
          created_at?: string
          derivation_id?: string | null
          duration_seconds?: number
          format?: Json
          genres?: string[]
          id?: string
          ingested_at?: string
          ipv6_address?: string | null
          source_uri?: string | null
          title?: string
          track_cid?: string
          uor_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          attendees: Json | null
          color: string | null
          created_at: string
          description: string | null
          end_time: string
          external_calendar_id: string | null
          external_event_id: string | null
          id: string
          location: string | null
          recurrence: string | null
          source_message_id: string | null
          source_platform: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          attendees?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          external_calendar_id?: string | null
          external_event_id?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          source_message_id?: string | null
          source_platform?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          attendees?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          external_calendar_id?: string | null
          external_event_id?: string | null
          id?: string
          location?: string | null
          recurrence?: string | null
          source_message_id?: string | null
          source_platform?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      hologram_sessions: {
        Row: {
          blueprint: Json
          created_at: string
          envelope: Json
          id: string
          label: string
          session_cid: string
          session_hex: string
          status: string
          tick_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          blueprint: Json
          created_at?: string
          envelope: Json
          id?: string
          label?: string
          session_cid: string
          session_hex: string
          status?: string
          tick_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          blueprint?: Json
          created_at?: string
          envelope?: Json
          id?: string
          label?: string
          session_cid?: string
          session_hex?: string
          status?: string
          tick_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          click_count: number
          code: string
          created_at: string
          id: string
          signup_count: number
          user_id: string
        }
        Insert: {
          click_count?: number
          code: string
          created_at?: string
          id?: string
          signup_count?: number
          user_id: string
        }
        Update: {
          click_count?: number
          code?: string
          created_at?: string
          id?: string
          signup_count?: number
          user_id?: string
        }
        Relationships: []
      }
      lead_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          use_case: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          use_case?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          use_case?: string | null
        }
        Relationships: []
      }
      lens_blueprints: {
        Row: {
          author_id: string | null
          blueprint: Json
          created_at: string
          derivation_id: string
          description: string | null
          id: string
          morphism: string
          name: string
          problem_statement: string | null
          tags: string[] | null
          uor_address: string
          uor_cid: string
          updated_at: string
          version: string
        }
        Insert: {
          author_id?: string | null
          blueprint: Json
          created_at?: string
          derivation_id: string
          description?: string | null
          id?: string
          morphism?: string
          name: string
          problem_statement?: string | null
          tags?: string[] | null
          uor_address: string
          uor_cid: string
          updated_at?: string
          version?: string
        }
        Update: {
          author_id?: string | null
          blueprint?: Json
          created_at?: string
          derivation_id?: string
          description?: string | null
          id?: string
          morphism?: string
          name?: string
          problem_statement?: string | null
          tags?: string[] | null
          uor_address?: string
          uor_cid?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      meeting_types: {
        Row: {
          availability_windows: Json
          buffer_minutes: number | null
          color: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_detail: string | null
          location_type: string
          max_bookings_per_day: number | null
          questions: Json | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_windows?: Json
          buffer_minutes?: number | null
          color?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_detail?: string | null
          location_type?: string
          max_bookings_per_day?: number | null
          questions?: Json | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_windows?: Json
          buffer_minutes?: number | null
          color?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_detail?: string | null
          location_type?: string
          max_bookings_per_day?: number | null
          questions?: Json | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messenger_context_graph: {
        Row: {
          confidence: number
          created_at: string
          id: string
          source_id: string | null
          source_type: string
          triple_object: string
          triple_predicate: string
          triple_subject: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string
          triple_object: string
          triple_predicate: string
          triple_subject: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          source_id?: string | null
          source_type?: string
          triple_object?: string
          triple_predicate?: string
          triple_subject?: string
          user_id?: string
        }
        Relationships: []
      }
      messenger_introductions: {
        Row: {
          created_at: string
          id: string
          introducer_name: string
          person_a: string
          person_a_email: string | null
          person_b: string
          person_b_email: string | null
          reason: string | null
          status: string
          stay_in_group: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          introducer_name: string
          person_a: string
          person_a_email?: string | null
          person_b: string
          person_b_email?: string | null
          reason?: string | null
          status?: string
          stay_in_group?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          introducer_name?: string
          person_a?: string
          person_a_email?: string | null
          person_b?: string
          person_b_email?: string | null
          reason?: string | null
          status?: string
          stay_in_group?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          claimed_at: string
          display_name: string | null
          id: string
          privacy_rules: Json | null
          session_cid: string | null
          session_derivation_id: string | null
          session_issued_at: string | null
          uor_canonical_id: string | null
          uor_cid: string | null
          uor_glyph: string | null
          uor_ipv6: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          claimed_at?: string
          display_name?: string | null
          id?: string
          privacy_rules?: Json | null
          session_cid?: string | null
          session_derivation_id?: string | null
          session_issued_at?: string | null
          uor_canonical_id?: string | null
          uor_cid?: string | null
          uor_glyph?: string | null
          uor_ipv6?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          claimed_at?: string
          display_name?: string | null
          id?: string
          privacy_rules?: Json | null
          session_cid?: string | null
          session_derivation_id?: string | null
          session_issued_at?: string | null
          uor_canonical_id?: string | null
          uor_cid?: string | null
          uor_glyph?: string | null
          uor_ipv6?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          contact_email: string
          created_at: string
          description: string
          id: string
          problem_statement: string
          project_name: string
          repo_url: string
          status: string
        }
        Insert: {
          contact_email: string
          created_at?: string
          description: string
          id?: string
          problem_statement: string
          project_name: string
          repo_url: string
          status?: string
        }
        Update: {
          contact_email?: string
          created_at?: string
          description?: string
          id?: string
          problem_statement?: string
          project_name?: string
          repo_url?: string
          status?: string
        }
        Relationships: []
      }
      reasoning_proofs: {
        Row: {
          certificate: Json | null
          claims: Json
          conclusion: string | null
          converged: boolean
          conversation_id: string | null
          created_at: string
          final_curvature: number
          id: string
          is_complete: boolean
          iterations: number
          overall_grade: string
          premises: string[]
          proof_id: string
          quantum: number
          scaffold_summary: string | null
          state: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate?: Json | null
          claims?: Json
          conclusion?: string | null
          converged?: boolean
          conversation_id?: string | null
          created_at?: string
          final_curvature?: number
          id?: string
          is_complete?: boolean
          iterations?: number
          overall_grade?: string
          premises?: string[]
          proof_id: string
          quantum?: number
          scaffold_summary?: string | null
          state?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate?: Json | null
          claims?: Json
          conclusion?: string | null
          converged?: boolean
          conversation_id?: string | null
          created_at?: string
          final_curvature?: number
          id?: string
          is_complete?: boolean
          iterations?: number
          overall_grade?: string
          premises?: string[]
          proof_id?: string
          quantum?: number
          scaffold_summary?: string | null
          state?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reasoning_proofs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_responses: {
        Row: {
          claims: Json
          converged: boolean
          conversation_id: string | null
          created_at: string
          curvature: number
          epistemic_grade: string
          id: string
          iterations: number
          message_content: string
          note: string | null
          user_id: string
          user_query: string | null
        }
        Insert: {
          claims?: Json
          converged?: boolean
          conversation_id?: string | null
          created_at?: string
          curvature?: number
          epistemic_grade?: string
          id?: string
          iterations?: number
          message_content: string
          note?: string | null
          user_id: string
          user_query?: string | null
        }
        Update: {
          claims?: Json
          converged?: boolean
          conversation_id?: string | null
          created_at?: string
          curvature?: number
          epistemic_grade?: string
          id?: string
          iterations?: number
          message_content?: string
          note?: string | null
          user_id?: string
          user_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_responses_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_bookings: {
        Row: {
          answers: Json | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          end_time: string
          host_user_id: string
          id: string
          invitee_email: string
          invitee_name: string
          meeting_type_id: string
          notes: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_time: string
          host_user_id: string
          id?: string
          invitee_email: string
          invitee_name: string
          meeting_type_id: string
          notes?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          end_time?: string
          host_user_id?: string
          id?: string
          invitee_email?: string
          invitee_name?: string
          meeting_type_id?: string
          notes?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_bookings_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "meeting_types"
            referencedColumns: ["id"]
          },
        ]
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
      uor_inference_proofs: {
        Row: {
          created_at: string
          epistemic_grade: string
          hit_count: number
          id: string
          input_canonical: string
          input_hash: string
          last_hit_at: string | null
          output_cached: string
          output_hash: string
          proof_id: string
          tool_name: string
        }
        Insert: {
          created_at?: string
          epistemic_grade: string
          hit_count?: number
          id?: string
          input_canonical: string
          input_hash: string
          last_hit_at?: string | null
          output_cached: string
          output_hash: string
          proof_id: string
          tool_name: string
        }
        Update: {
          created_at?: string
          epistemic_grade?: string
          hit_count?: number
          id?: string
          input_canonical?: string
          input_hash?: string
          last_hit_at?: string | null
          output_cached?: string
          output_hash?: string
          proof_id?: string
          tool_name?: string
        }
        Relationships: []
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
      uor_observer_outputs: {
        Row: {
          agent_id: string
          created_at: string
          derivation_id: string | null
          epistemic_grade: string
          h_score: number
          id: string
          output_hash: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          derivation_id?: string | null
          epistemic_grade?: string
          h_score?: number
          id?: string
          output_hash: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          derivation_id?: string | null
          epistemic_grade?: string
          h_score?: number
          id?: string
          output_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "uor_observer_outputs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "uor_observers"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      uor_observers: {
        Row: {
          agent_id: string
          capacity: number
          created_at: string
          field_of_observation: string[]
          founding_derivation_id: string
          grade_a_rate: number
          h_score_mean: number
          persistence: number
          quantum_level: number
          updated_at: string
          zone: string
          zone_transition_at: string
        }
        Insert: {
          agent_id: string
          capacity?: number
          created_at?: string
          field_of_observation?: string[]
          founding_derivation_id: string
          grade_a_rate?: number
          h_score_mean?: number
          persistence?: number
          quantum_level?: number
          updated_at?: string
          zone?: string
          zone_transition_at?: string
        }
        Update: {
          agent_id?: string
          capacity?: number
          created_at?: string
          field_of_observation?: string[]
          founding_derivation_id?: string
          grade_a_rate?: number
          h_score_mean?: number
          persistence?: number
          quantum_level?: number
          updated_at?: string
          zone?: string
          zone_transition_at?: string
        }
        Relationships: []
      }
      uor_oracle_entries: {
        Row: {
          byte_length: number | null
          created_at: string
          derivation_id: string | null
          encoding_format: string | null
          entry_id: string
          epistemic_grade: string | null
          gateway_url: string | null
          id: string
          metadata: Json | null
          object_label: string | null
          object_type: string
          operation: string
          pinata_cid: string | null
          quantum_level: number | null
          sha256_hash: string | null
          source_endpoint: string
          storacha_cid: string | null
          storage_destination: string | null
          storage_source: string | null
          uor_cid: string | null
        }
        Insert: {
          byte_length?: number | null
          created_at?: string
          derivation_id?: string | null
          encoding_format?: string | null
          entry_id: string
          epistemic_grade?: string | null
          gateway_url?: string | null
          id?: string
          metadata?: Json | null
          object_label?: string | null
          object_type: string
          operation: string
          pinata_cid?: string | null
          quantum_level?: number | null
          sha256_hash?: string | null
          source_endpoint: string
          storacha_cid?: string | null
          storage_destination?: string | null
          storage_source?: string | null
          uor_cid?: string | null
        }
        Update: {
          byte_length?: number | null
          created_at?: string
          derivation_id?: string | null
          encoding_format?: string | null
          entry_id?: string
          epistemic_grade?: string | null
          gateway_url?: string | null
          id?: string
          metadata?: Json | null
          object_label?: string | null
          object_type?: string
          operation?: string
          pinata_cid?: string | null
          quantum_level?: number | null
          sha256_hash?: string | null
          source_endpoint?: string
          storacha_cid?: string | null
          storage_destination?: string | null
          storage_source?: string | null
          uor_cid?: string | null
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
      user_data_bank: {
        Row: {
          byte_length: number
          cid: string
          created_at: string
          encrypted_blob: string
          id: string
          iv: string
          slot_key: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          byte_length?: number
          cid: string
          created_at?: string
          encrypted_blob: string
          id?: string
          iv: string
          slot_key: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          byte_length?: number
          cid?: string
          created_at?: string
          encrypted_blob?: string
          id?: string
          iv?: string
          slot_key?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_referral_leaderboard: {
        Args: { result_limit?: number }
        Returns: {
          click_count: number
          conversion_rate: number
          display_name_masked: string
          rank: number
          signup_count: number
        }[]
      }
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

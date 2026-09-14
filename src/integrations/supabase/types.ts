export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      member_accumulators: {
        Row: {
          member_id: string;
          plan_year: number;
          organization_id: string | null;
          payload: Json;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          plan_year: number;
          organization_id?: string | null;
          payload: Json;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          plan_year?: number;
          organization_id?: string | null;
          payload?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      payer_contracts: {
        Row: {
          contract_id: string;
          organization_id: string | null;
          payer_name: string;
          provider_npi: string | null;
          version: string;
          effective_date: string;
          termination_date: string | null;
          reimbursement_method: string;
          percent_of_billed: number | null;
          created_at: string;
        };
        Insert: {
          contract_id?: string;
          organization_id?: string | null;
          payer_name: string;
          provider_npi?: string | null;
          version: string;
          effective_date: string;
          termination_date?: string | null;
          reimbursement_method: string;
          percent_of_billed?: number | null;
          created_at?: string;
        };
        Update: {
          contract_id?: string;
          organization_id?: string | null;
          payer_name?: string;
          provider_npi?: string | null;
          version?: string;
          effective_date?: string;
          termination_date?: string | null;
          reimbursement_method?: string;
          percent_of_billed?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      member_ohi: {
        Row: {
          member_id: string;
          payer_id: string;
          organization_id: string | null;
          payer_name: string;
          coverage_type: string;
          primacy_order: number | null;
          subscriber_id: string | null;
          group_number: string | null;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          payer_id: string;
          organization_id?: string | null;
          payer_name: string;
          coverage_type: string;
          primacy_order?: number | null;
          subscriber_id?: string | null;
          group_number?: string | null;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          payer_id?: string;
          organization_id?: string | null;
          payer_name?: string;
          coverage_type?: string;
          primacy_order?: number | null;
          subscriber_id?: string | null;
          group_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_benefits: {
        Row: {
          plan_id: string;
          organization_id: string | null;
          payer_name: string;
          plan_name: string;
          version: string;
          plan_year: number;
          effective_date: string;
          termination_date: string | null;
          deductible_individual: number;
          deductible_family: number;
          oop_max_individual: number;
          oop_max_family: number;
          coinsurance_rate: number;
          copay_amount: number | null;
          copay_applies_to: Json | null;
          cob_policy: string;
          covered_services: Json;
          created_at: string;
        };
        Insert: {
          plan_id?: string;
          organization_id?: string | null;
          payer_name: string;
          plan_name: string;
          version: string;
          plan_year: number;
          effective_date: string;
          termination_date?: string | null;
          deductible_individual?: number;
          deductible_family?: number;
          oop_max_individual?: number;
          oop_max_family?: number;
          coinsurance_rate?: number;
          copay_amount?: number | null;
          copay_applies_to?: Json | null;
          cob_policy?: string;
          covered_services?: Json;
          created_at?: string;
        };
        Update: {
          plan_id?: string;
          organization_id?: string | null;
          payer_name?: string;
          plan_name?: string;
          version?: string;
          plan_year?: number;
          effective_date?: string;
          termination_date?: string | null;
          deductible_individual?: number;
          deductible_family?: number;
          oop_max_individual?: number;
          oop_max_family?: number;
          coinsurance_rate?: number;
          copay_amount?: number | null;
          copay_applies_to?: Json | null;
          cob_policy?: string;
          covered_services?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      fee_schedules: {
        Row: {
          id: string;
          contract_id: string;
          procedure_code: string;
          contracted_amount_cents: number;
        };
        Insert: {
          id?: string;
          contract_id: string;
          procedure_code: string;
          contracted_amount_cents: number;
        };
        Update: {
          id?: string;
          contract_id?: string;
          procedure_code?: string;
          contracted_amount_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fee_schedules_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "payer_contracts";
            referencedColumns: ["contract_id"];
          },
        ];
      };
      edi_transactions: {
        Row: {
          transaction_id: string;
          org_id: string | null;
          transaction_type: string;
          file_name: string;
          sender_id: string | null;
          receiver_id: string | null;
          interchange_control_number: string | null;
          functional_group_number: string | null;
          transaction_set_number: string | null;
          status: string;
          validation_status: string;
          segment_count: number;
          error_count: number;
          raw_content: string;
          metadata: Json | null;
          received_at: string;
        };
        Insert: {
          transaction_id?: string;
          org_id?: string | null;
          transaction_type: string;
          file_name: string;
          sender_id?: string | null;
          receiver_id?: string | null;
          interchange_control_number?: string | null;
          functional_group_number?: string | null;
          transaction_set_number?: string | null;
          status?: string;
          validation_status?: string;
          segment_count?: number;
          error_count?: number;
          raw_content: string;
          metadata?: Json | null;
          received_at?: string;
        };
        Update: {
          transaction_id?: string;
          org_id?: string | null;
          transaction_type?: string;
          file_name?: string;
          sender_id?: string | null;
          receiver_id?: string | null;
          interchange_control_number?: string | null;
          functional_group_number?: string | null;
          transaction_set_number?: string | null;
          status?: string;
          validation_status?: string;
          segment_count?: number;
          error_count?: number;
          raw_content?: string;
          metadata?: Json | null;
          received_at?: string;
        };
        Relationships: [];
      };
      edi_segments: {
        Row: {
          id: string;
          transaction_id: string;
          segment_type: string;
          sequence_number: number;
          raw_segment: string;
          parsed_json: Json | null;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          segment_type: string;
          sequence_number: number;
          raw_segment: string;
          parsed_json?: Json | null;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          segment_type?: string;
          sequence_number?: number;
          raw_segment?: string;
          parsed_json?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "edi_segments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "edi_transactions";
            referencedColumns: ["transaction_id"];
          },
        ];
      };
      edi_errors: {
        Row: {
          error_id: string;
          transaction_id: string;
          severity: string;
          error_code: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          error_id?: string;
          transaction_id: string;
          severity: string;
          error_code?: string | null;
          message: string;
          created_at?: string;
        };
        Update: {
          error_id?: string;
          transaction_id?: string;
          severity?: string;
          error_code?: string | null;
          message?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "edi_errors_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "edi_transactions";
            referencedColumns: ["transaction_id"];
          },
        ];
      };
      claims: {
        Row: {
          claim_id: string;
          organization_id: string | null;
          case_id: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          claim_id: string;
          organization_id?: string | null;
          case_id?: string | null;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          claim_id?: string;
          organization_id?: string | null;
          case_id?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cases: {
        Row: {
          case_id: string;
          organization_id: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          case_id: string;
          organization_id?: string | null;
          payload: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          case_id?: string;
          organization_id?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      case_events: {
        Row: {
          event_id: string;
          case_id: string;
          organization_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          event_id: string;
          case_id: string;
          organization_id?: string | null;
          payload: Json;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          case_id?: string;
          organization_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["case_id"];
          },
        ];
      };
      adjudication_runs: {
        Row: {
          run_id: string;
          claim_id: string;
          organization_id: string | null;
          run: Json;
          trace: Json;
          is_seed: boolean;
          created_at: string;
        };
        Insert: {
          run_id: string;
          claim_id: string;
          organization_id?: string | null;
          run: Json;
          trace: Json;
          is_seed?: boolean;
          created_at?: string;
        };
        Update: {
          run_id?: string;
          claim_id?: string;
          organization_id?: string | null;
          run?: Json;
          trace?: Json;
          is_seed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      disputes: {
        Row: {
          dispute_id: string;
          claim_id: string;
          organization_id: string | null;
          payer_name: string;
          procedure_code: string | null;
          contract_id: string | null;
          allowed_cents: number;
          paid_cents: number;
          shortfall_cents: number;
          basis: string;
          confidence: number;
          status: string;
          created_at: string;
        };
        Insert: {
          dispute_id?: string;
          claim_id: string;
          organization_id?: string | null;
          payer_name: string;
          procedure_code?: string | null;
          contract_id?: string | null;
          allowed_cents: number;
          paid_cents: number;
          shortfall_cents: number;
          basis: string;
          confidence: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          dispute_id?: string;
          claim_id?: string;
          organization_id?: string | null;
          payer_name?: string;
          procedure_code?: string | null;
          contract_id?: string | null;
          allowed_cents?: number;
          paid_cents?: number;
          shortfall_cents?: number;
          basis?: string;
          confidence?: number;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disputes_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "payer_contracts";
            referencedColumns: ["contract_id"];
          },
        ];
      };
      ops_events: {
        Row: {
          id: string;
          organization_id: string | null;
          kind: string;
          summary: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          kind: string;
          summary: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          kind?: string;
          summary?: string;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          after_json: Json | null;
          before_json: Json | null;
          correlation_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          module: string;
          organization_id: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          after_json?: Json | null;
          before_json?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          module: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          after_json?: Json | null;
          before_json?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          module?: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_bindings: {
        Row: {
          connector_id: string;
          created_at: string;
          created_by: string;
          credential_id: string | null;
          environment_id: string | null;
          id: string;
          organization_id: string;
          project_id: string | null;
          status: Database["public"]["Enums"]["binding_status"];
          updated_at: string;
        };
        Insert: {
          connector_id: string;
          created_at?: string;
          created_by: string;
          credential_id?: string | null;
          environment_id?: string | null;
          id?: string;
          organization_id: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["binding_status"];
          updated_at?: string;
        };
        Update: {
          connector_id?: string;
          created_at?: string;
          created_by?: string;
          credential_id?: string | null;
          environment_id?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["binding_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connector_bindings_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connector_bindings_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_capabilities: {
        Row: {
          capability_key: string;
          capability_label: string;
          connector_id: string;
          id: string;
        };
        Insert: {
          capability_key: string;
          capability_label: string;
          connector_id: string;
          id?: string;
        };
        Update: {
          capability_key?: string;
          capability_label?: string;
          connector_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connector_capabilities_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_health_checks: {
        Row: {
          checked_at: string;
          connector_binding_id: string;
          health_status: Database["public"]["Enums"]["health_status"];
          id: string;
          latency_ms: number | null;
          message: string | null;
        };
        Insert: {
          checked_at?: string;
          connector_binding_id: string;
          health_status?: Database["public"]["Enums"]["health_status"];
          id?: string;
          latency_ms?: number | null;
          message?: string | null;
        };
        Update: {
          checked_at?: string;
          connector_binding_id?: string;
          health_status?: Database["public"]["Enums"]["health_status"];
          id?: string;
          latency_ms?: number | null;
          message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "connector_health_checks_connector_binding_id_fkey";
            columns: ["connector_binding_id"];
            isOneToOne: false;
            referencedRelation: "connector_bindings";
            referencedColumns: ["id"];
          },
        ];
      };
      connector_versions: {
        Row: {
          changelog: string | null;
          connector_id: string;
          created_at: string;
          id: string;
          schema_version: number;
          version: string;
        };
        Insert: {
          changelog?: string | null;
          connector_id: string;
          created_at?: string;
          id?: string;
          schema_version?: number;
          version: string;
        };
        Update: {
          changelog?: string | null;
          connector_id?: string;
          created_at?: string;
          id?: string;
          schema_version?: number;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connector_versions_connector_id_fkey";
            columns: ["connector_id"];
            isOneToOne: false;
            referencedRelation: "connectors";
            referencedColumns: ["id"];
          },
        ];
      };
      connectors: {
        Row: {
          category: Database["public"]["Enums"]["connector_category"];
          created_at: string;
          documentation_url: string | null;
          id: string;
          key: string;
          label: string;
          status: Database["public"]["Enums"]["connector_status"];
          supports_oauth: boolean;
          supports_webhooks: boolean;
        };
        Insert: {
          category?: Database["public"]["Enums"]["connector_category"];
          created_at?: string;
          documentation_url?: string | null;
          id?: string;
          key: string;
          label: string;
          status?: Database["public"]["Enums"]["connector_status"];
          supports_oauth?: boolean;
          supports_webhooks?: boolean;
        };
        Update: {
          category?: Database["public"]["Enums"]["connector_category"];
          created_at?: string;
          documentation_url?: string | null;
          id?: string;
          key?: string;
          label?: string;
          status?: Database["public"]["Enums"]["connector_status"];
          supports_oauth?: boolean;
          supports_webhooks?: boolean;
        };
        Relationships: [];
      };
      credential_providers: {
        Row: {
          category: Database["public"]["Enums"]["connector_category"];
          created_at: string;
          id: string;
          key: string;
          label: string;
          supports_oauth: boolean;
          supports_rotation: boolean;
        };
        Insert: {
          category?: Database["public"]["Enums"]["connector_category"];
          created_at?: string;
          id?: string;
          key: string;
          label: string;
          supports_oauth?: boolean;
          supports_rotation?: boolean;
        };
        Update: {
          category?: Database["public"]["Enums"]["connector_category"];
          created_at?: string;
          id?: string;
          key?: string;
          label?: string;
          supports_oauth?: boolean;
          supports_rotation?: boolean;
        };
        Relationships: [];
      };
      credential_rotation_events: {
        Row: {
          created_at: string;
          credential_id: string;
          id: string;
          next_version_id: string | null;
          previous_version_id: string | null;
          rotation_reason: Database["public"]["Enums"]["rotation_reason"];
          triggered_by: string;
        };
        Insert: {
          created_at?: string;
          credential_id: string;
          id?: string;
          next_version_id?: string | null;
          previous_version_id?: string | null;
          rotation_reason?: Database["public"]["Enums"]["rotation_reason"];
          triggered_by: string;
        };
        Update: {
          created_at?: string;
          credential_id?: string;
          id?: string;
          next_version_id?: string | null;
          previous_version_id?: string | null;
          rotation_reason?: Database["public"]["Enums"]["rotation_reason"];
          triggered_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credential_rotation_events_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_rotation_events_next_version_id_fkey";
            columns: ["next_version_id"];
            isOneToOne: false;
            referencedRelation: "credential_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credential_rotation_events_previous_version_id_fkey";
            columns: ["previous_version_id"];
            isOneToOne: false;
            referencedRelation: "credential_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_versions: {
        Row: {
          created_at: string;
          created_by: string;
          credential_id: string;
          encrypted_payload_ref: string;
          id: string;
          is_active: boolean;
          redacted_preview: string | null;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          credential_id: string;
          encrypted_payload_ref: string;
          id?: string;
          is_active?: boolean;
          redacted_preview?: string | null;
          version_number: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          credential_id?: string;
          encrypted_payload_ref?: string;
          id?: string;
          is_active?: boolean;
          redacted_preview?: string | null;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "credential_versions_credential_id_fkey";
            columns: ["credential_id"];
            isOneToOne: false;
            referencedRelation: "credentials";
            referencedColumns: ["id"];
          },
        ];
      };
      credentials: {
        Row: {
          created_at: string;
          created_by: string;
          environment_id: string | null;
          id: string;
          label: string;
          last_rotated_at: string | null;
          organization_id: string;
          project_id: string | null;
          provider_id: string;
          status: Database["public"]["Enums"]["credential_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          environment_id?: string | null;
          id?: string;
          label: string;
          last_rotated_at?: string | null;
          organization_id: string;
          project_id?: string | null;
          provider_id: string;
          status?: Database["public"]["Enums"]["credential_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          environment_id?: string | null;
          id?: string;
          label?: string;
          last_rotated_at?: string | null;
          organization_id?: string;
          project_id?: string | null;
          provider_id?: string;
          status?: Database["public"]["Enums"]["credential_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credentials_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "credential_providers";
            referencedColumns: ["id"];
          },
        ];
      };
      environments: {
        Row: {
          created_at: string;
          created_by: string;
          env_type: Database["public"]["Enums"]["env_type"];
          id: string;
          name: string;
          project_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          env_type?: Database["public"]["Enums"]["env_type"];
          id?: string;
          name: string;
          project_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          env_type?: Database["public"]["Enums"]["env_type"];
          id?: string;
          name?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "environments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["org_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["org_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          slug: string;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          slug: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      telemetry_events: {
        Row: {
          attributes_json: Json | null;
          correlation_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          message: string | null;
          module: string;
          organization_id: string | null;
          severity: Database["public"]["Enums"]["telemetry_severity"];
          span_id: string | null;
          trace_id: string | null;
          user_id: string | null;
        };
        Insert: {
          attributes_json?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          message?: string | null;
          module: string;
          organization_id?: string | null;
          severity?: Database["public"]["Enums"]["telemetry_severity"];
          span_id?: string | null;
          trace_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          attributes_json?: Json | null;
          correlation_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          message?: string | null;
          module?: string;
          organization_id?: string | null;
          severity?: Database["public"]["Enums"]["telemetry_severity"];
          span_id?: string | null;
          trace_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      telemetry_metrics: {
        Row: {
          attributes_json: Json | null;
          created_at: string;
          id: string;
          metric_name: string;
          metric_value: number;
          module: string;
          organization_id: string | null;
          unit: string | null;
          user_id: string | null;
        };
        Insert: {
          attributes_json?: Json | null;
          created_at?: string;
          id?: string;
          metric_name: string;
          metric_value: number;
          module: string;
          organization_id?: string | null;
          unit?: string | null;
          user_id?: string | null;
        };
        Update: {
          attributes_json?: Json | null;
          created_at?: string;
          id?: string;
          metric_name?: string;
          metric_value?: number;
          module?: string;
          organization_id?: string | null;
          unit?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      telemetry_traces: {
        Row: {
          attributes_json: Json | null;
          created_at: string;
          duration_ms: number | null;
          ended_at: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          parent_span_id: string | null;
          span_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["telemetry_span_status"];
          trace_id: string;
          user_id: string | null;
        };
        Insert: {
          attributes_json?: Json | null;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          parent_span_id?: string | null;
          span_id: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["telemetry_span_status"];
          trace_id: string;
          user_id?: string | null;
        };
        Update: {
          attributes_json?: Json | null;
          created_at?: string;
          duration_ms?: number | null;
          ended_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          parent_span_id?: string | null;
          span_id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["telemetry_span_status"];
          trace_id?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      workflow_audit_events: {
        Row: {
          actor_id: string | null;
          event_type: string;
          id: string;
          occurred_at: string;
          organization_id: string;
          payload: Json | null;
          run_id: string | null;
          workflow_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          event_type: string;
          id?: string;
          occurred_at?: string;
          organization_id: string;
          payload?: Json | null;
          run_id?: string | null;
          workflow_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          organization_id?: string;
          payload?: Json | null;
          run_id?: string | null;
          workflow_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_audit_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_audit_events_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_runs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string;
          error_json: Json | null;
          id: string;
          input_json: Json | null;
          organization_id: string;
          output_json: Json | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["workflow_run_status"];
          updated_at: string;
          version_id: string;
          workflow_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          error_json?: Json | null;
          id?: string;
          input_json?: Json | null;
          organization_id: string;
          output_json?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_run_status"];
          updated_at?: string;
          version_id: string;
          workflow_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          error_json?: Json | null;
          id?: string;
          input_json?: Json | null;
          organization_id?: string;
          output_json?: Json | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_run_status"];
          updated_at?: string;
          version_id?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_runs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_version_id_fkey";
            columns: ["version_id"];
            isOneToOne: false;
            referencedRelation: "workflow_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_steps: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_json: Json | null;
          id: string;
          input_json: Json | null;
          output_json: Json | null;
          run_id: string;
          started_at: string | null;
          status: Database["public"]["Enums"]["workflow_step_status"];
          step_key: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_json?: Json | null;
          id?: string;
          input_json?: Json | null;
          output_json?: Json | null;
          run_id: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_step_status"];
          step_key: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          error_json?: Json | null;
          id?: string;
          input_json?: Json | null;
          output_json?: Json | null;
          run_id?: string;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_step_status"];
          step_key?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_steps_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_versions: {
        Row: {
          created_at: string;
          created_by: string;
          definition_json: Json;
          id: string;
          published_at: string | null;
          status: Database["public"]["Enums"]["workflow_version_status"];
          version_number: number;
          workflow_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          definition_json?: Json;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_version_status"];
          version_number: number;
          workflow_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          definition_json?: Json;
          id?: string;
          published_at?: string | null;
          status?: Database["public"]["Enums"]["workflow_version_status"];
          version_number?: number;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflows: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          status: Database["public"]["Enums"]["workflow_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["workflow_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["workflow_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_org_role: {
        Args: {
          _org: string;
          _roles: Database["public"]["Enums"]["app_role"][];
          _user: string;
        };
        Returns: boolean;
      };
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean };
      project_org: { Args: { _project: string }; Returns: string };
    };
    Enums: {
      app_role: "owner" | "admin" | "manager" | "operator" | "viewer";
      binding_status: "active" | "paused" | "error";
      connector_category:
        "ai" | "payments" | "messaging" | "social" | "database" | "universal" | "other";
      connector_status: "available" | "beta" | "deprecated";
      credential_status: "active" | "rotating" | "deactivated";
      env_type: "development" | "staging" | "production";
      health_status: "healthy" | "degraded" | "failed" | "unknown";
      org_status: "active" | "suspended" | "archived";
      project_status: "active" | "paused" | "archived";
      rotation_reason: "scheduled" | "manual" | "compromised" | "policy" | "initial";
      telemetry_severity: "debug" | "info" | "warn" | "error" | "critical";
      telemetry_span_status: "ok" | "error" | "cancelled" | "unset";
      workflow_run_status: "pending" | "running" | "completed" | "failed" | "cancelled";
      workflow_status: "draft" | "active" | "archived";
      workflow_step_status: "pending" | "running" | "completed" | "failed" | "skipped";
      workflow_version_status: "draft" | "published" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "operator", "viewer"],
      binding_status: ["active", "paused", "error"],
      connector_category: [
        "ai",
        "payments",
        "messaging",
        "social",
        "database",
        "universal",
        "other",
      ],
      connector_status: ["available", "beta", "deprecated"],
      credential_status: ["active", "rotating", "deactivated"],
      env_type: ["development", "staging", "production"],
      health_status: ["healthy", "degraded", "failed", "unknown"],
      org_status: ["active", "suspended", "archived"],
      project_status: ["active", "paused", "archived"],
      rotation_reason: ["scheduled", "manual", "compromised", "policy", "initial"],
      telemetry_severity: ["debug", "info", "warn", "error", "critical"],
      telemetry_span_status: ["ok", "error", "cancelled", "unset"],
      workflow_run_status: ["pending", "running", "completed", "failed", "cancelled"],
      workflow_status: ["draft", "active", "archived"],
      workflow_step_status: ["pending", "running", "completed", "failed", "skipped"],
      workflow_version_status: ["draft", "published", "archived"],
    },
  },
} as const;

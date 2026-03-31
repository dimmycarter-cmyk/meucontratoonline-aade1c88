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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_decision_logs: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          decision_type: string
          entity_id: string | null
          entity_type: string | null
          id: string
          input_data: Json
          output_decision: Json
          overridden_at: string | null
          overridden_by: string | null
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          decision_type: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_data?: Json
          output_decision?: Json
          overridden_at?: string | null
          overridden_by?: string | null
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          decision_type?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          input_data?: Json
          output_decision?: Json
          overridden_at?: string | null
          overridden_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_decision_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          full_name: string
          id: string
          monthly_income: number | null
          notes: string | null
          occupation: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string
          contract_params: Json | null
          created_at: string
          id: string
          updated_at: string
          use_insurance: boolean
          workflow_rules: Json | null
        }
        Insert: {
          company_id: string
          contract_params?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          use_insurance?: boolean
          workflow_rules?: Json | null
        }
        Update: {
          company_id?: string
          contract_params?: Json | null
          created_at?: string
          id?: string
          updated_at?: string
          use_insurance?: boolean
          workflow_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_drafts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          notes: string | null
          precedence: string
          proposal_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          notes?: string | null
          precedence?: string
          proposal_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          notes?: string | null
          precedence?: string
          proposal_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_drafts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_drafts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          closing_status: Database["public"]["Enums"]["closing_status"] | null
          company_id: string
          created_at: string
          created_by: string | null
          draft_id: string | null
          end_date: string | null
          financial_status:
            | Database["public"]["Enums"]["financial_status"]
            | null
          id: string
          idempotency_key: string | null
          operation_status:
            | Database["public"]["Enums"]["operation_status"]
            | null
          property_id: string | null
          proposal_id: string | null
          rent_amount: number
          signed_at: string | null
          signing_external_id: string | null
          signing_provider: string | null
          sla_deadline: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          closing_status?: Database["public"]["Enums"]["closing_status"] | null
          company_id: string
          created_at?: string
          created_by?: string | null
          draft_id?: string | null
          end_date?: string | null
          financial_status?:
            | Database["public"]["Enums"]["financial_status"]
            | null
          id?: string
          idempotency_key?: string | null
          operation_status?:
            | Database["public"]["Enums"]["operation_status"]
            | null
          property_id?: string | null
          proposal_id?: string | null
          rent_amount?: number
          signed_at?: string | null
          signing_external_id?: string | null
          signing_provider?: string | null
          sla_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          closing_status?: Database["public"]["Enums"]["closing_status"] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          draft_id?: string | null
          end_date?: string | null
          financial_status?:
            | Database["public"]["Enums"]["financial_status"]
            | null
          id?: string
          idempotency_key?: string | null
          operation_status?:
            | Database["public"]["Enums"]["operation_status"]
            | null
          property_id?: string | null
          proposal_id?: string | null
          rent_amount?: number
          signed_at?: string | null
          signing_external_id?: string | null
          signing_provider?: string | null
          sla_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "contract_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          entity_id: string | null
          entity_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_sensitive: boolean | null
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          entity_id?: string | null
          entity_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_sensitive?: boolean | null
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_sensitive?: boolean | null
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          company_id: string
          contract_id: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          property_id: string | null
          reported_by: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          due_date: string
          external_id: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          due_date: string
          external_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          due_date?: string
          external_id?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          company_id: string
          condo_fee: number | null
          created_at: string
          created_by: string | null
          description: string | null
          external_id: string | null
          id: string
          iptu_amount: number | null
          neighborhood: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          parking_spots: number | null
          property_type: string | null
          rent_amount: number
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id: string
          condo_fee?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          iptu_amount?: number | null
          neighborhood?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking_spots?: number | null
          property_type?: string | null
          rent_amount?: number
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id?: string
          condo_fee?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          iptu_amount?: number | null
          neighborhood?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parking_spots?: number | null
          property_type?: string | null
          rent_amount?: number
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_id: string | null
          company_id: string
          contract_duration_months: number | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          guarantee_type: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          property_id: string | null
          rejection_reason: string | null
          rent_amount: number | null
          sla_deadline: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          contract_duration_months?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          guarantee_type?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          property_id?: string | null
          rejection_reason?: string | null
          rent_amount?: number | null
          sla_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          contract_duration_months?: number | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          guarantee_type?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          property_id?: string | null
          rejection_reason?: string | null
          rent_amount?: number | null
          sla_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          company_id: string
          created_at: string
          error: string | null
          event_type: string
          id: string
          idempotency_key: string
          payload: Json
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          idempotency_key?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "corretor"
        | "financeiro"
        | "atendimento"
        | "vistoria"
        | "super_admin"
      closing_status: "em_rescisao" | "encerrado"
      contract_status:
        | "draft"
        | "em_revisao"
        | "aguardando_resposta_externa"
        | "aguardando_assinatura"
        | "assinado"
        | "expirado"
      document_type:
        | "identidade"
        | "comprovante_renda"
        | "comprovante_residencia"
        | "contrato"
        | "vistoria"
        | "outro"
      financial_status: "adimplente" | "inadimplente"
      maintenance_priority: "baixa" | "media" | "alta" | "urgente"
      maintenance_status: "aberta" | "em_andamento" | "concluida" | "cancelada"
      operation_status:
        | "aguardando_vistoria"
        | "vistoria_reprovada"
        | "aguardando_entrega_chaves"
        | "ativo"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      property_status: "disponivel" | "reservado" | "locado" | "indisponivel"
      proposal_status:
        | "iniciada"
        | "enviada"
        | "aguardando_resposta_externa"
        | "pre_aprovada"
        | "recusada"
        | "cancelada"
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
    Enums: {
      app_role: [
        "admin",
        "gerente",
        "corretor",
        "financeiro",
        "atendimento",
        "vistoria",
        "super_admin",
      ],
      closing_status: ["em_rescisao", "encerrado"],
      contract_status: [
        "draft",
        "em_revisao",
        "aguardando_resposta_externa",
        "aguardando_assinatura",
        "assinado",
        "expirado",
      ],
      document_type: [
        "identidade",
        "comprovante_renda",
        "comprovante_residencia",
        "contrato",
        "vistoria",
        "outro",
      ],
      financial_status: ["adimplente", "inadimplente"],
      maintenance_priority: ["baixa", "media", "alta", "urgente"],
      maintenance_status: ["aberta", "em_andamento", "concluida", "cancelada"],
      operation_status: [
        "aguardando_vistoria",
        "vistoria_reprovada",
        "aguardando_entrega_chaves",
        "ativo",
      ],
      payment_status: ["pendente", "pago", "atrasado", "cancelado"],
      property_status: ["disponivel", "reservado", "locado", "indisponivel"],
      proposal_status: [
        "iniciada",
        "enviada",
        "aguardando_resposta_externa",
        "pre_aprovada",
        "recusada",
        "cancelada",
      ],
    },
  },
} as const

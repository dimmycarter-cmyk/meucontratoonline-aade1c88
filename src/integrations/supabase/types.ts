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
      clauses: {
        Row: {
          ativa: boolean
          categoria: string
          conteudo: string
          created_at: string
          id: string
          ordem: number
          tenant_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number
          tenant_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clauses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          conta: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          numero: string | null
          pix: string | null
          razao_social: string | null
          rua: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          numero?: string | null
          pix?: string | null
          razao_social?: string | null
          rua?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          numero?: string | null
          pix?: string | null
          razao_social?: string | null
          rua?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          conta: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          estado: string | null
          estado_civil: string | null
          genero: string | null
          id: string
          nacionalidade: string | null
          nome: string
          numero: string | null
          orgao_expedidor: string | null
          pix: string | null
          profissao: string | null
          rg: string | null
          rua: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          genero?: string | null
          id?: string
          nacionalidade?: string | null
          nome: string
          numero?: string | null
          orgao_expedidor?: string | null
          pix?: string | null
          profissao?: string | null
          rg?: string | null
          rua?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          genero?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          numero?: string | null
          orgao_expedidor?: string | null
          pix?: string | null
          profissao?: string | null
          rg?: string | null
          rua?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          conteudo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
          variaveis: Json
        }
        Insert: {
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          status?: string
          tenant_id: string
          tipo?: string
          updated_at?: string
          variaveis?: Json
        }
        Update: {
          conteudo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          variaveis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          nome?: string
          status?: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      template_clauses: {
        Row: {
          clause_id: string
          id: string
          ordem: number
          template_id: string
        }
        Insert: {
          clause_id: string
          id?: string
          ordem?: number
          template_id: string
        }
        Update: {
          clause_id?: string
          id?: string
          ordem?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_clauses_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_clauses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          nome: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_empresa"
        | "corretor"
        | "assistente"
        | "operacional"
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
        "super_admin",
        "admin_empresa",
        "corretor",
        "assistente",
        "operacional",
      ],
    },
  },
} as const

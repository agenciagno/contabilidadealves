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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          company_id: string
          device_info: string | null
          id: string
          last_seen_at: string | null
          logged_in_at: string | null
          session_uuid: string
          user_id: string
        }
        Insert: {
          company_id: string
          device_info?: string | null
          id?: string
          last_seen_at?: string | null
          logged_in_at?: string | null
          session_uuid: string
          user_id: string
        }
        Update: {
          company_id?: string
          device_info?: string | null
          id?: string
          last_seen_at?: string | null
          logged_in_at?: string | null
          session_uuid?: string
          user_id?: string
        }
        Relationships: []
      }
      banks: {
        Row: {
          account_number: string | null
          agency: string | null
          bank_code: string | null
          color: string | null
          company_id: string
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          is_active: boolean
          is_invisible: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          bank_code?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_invisible?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          bank_code?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          is_invisible?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      boleto_controls: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string
          generated_at: string | null
          id: string
          reference_month: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          reference_month: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          reference_month?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          display_order: number
          dre_section: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          show_in_dre: boolean
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          display_order?: number
          dre_section?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          show_in_dre?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          display_order?: number
          dre_section?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          show_in_dre?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan_modules: string[]
          status: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan_modules?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan_modules?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_documents: {
        Row: {
          category: string | null
          company_id: string
          contact_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          contact_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          contact_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_logs: {
        Row: {
          action: string
          company_id: string
          contact_id: string
          created_at: string
          description: string
          id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          company_id: string
          contact_id: string
          created_at?: string
          description: string
          id?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          contact_id?: string
          created_at?: string
          description?: string
          id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          channel: string
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          message: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          message: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          company_id: string
          contact_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_partners: {
        Row: {
          company_id: string
          contact_id: string
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          participation_percentage: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          participation_percentage?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          participation_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          address_number: string | null
          boleto_active: boolean
          boleto_due_day: number | null
          boleto_start_date: string | null
          boleto_value: number | null
          cep: string | null
          city: string | null
          company_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          neighborhood: string | null
          notes: string | null
          origin: string
          phone: string | null
          representative_legal: string | null
          responsible_id: string | null
          state: string | null
          tax_regime: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          boleto_active?: boolean
          boleto_due_day?: number | null
          boleto_start_date?: string | null
          boleto_value?: number | null
          cep?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          neighborhood?: string | null
          notes?: string | null
          origin?: string
          phone?: string | null
          representative_legal?: string | null
          responsible_id?: string | null
          state?: string | null
          tax_regime?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_number?: string | null
          boleto_active?: boolean
          boleto_due_day?: number | null
          boleto_start_date?: string | null
          boleto_value?: number | null
          cep?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          neighborhood?: string | null
          notes?: string | null
          origin?: string
          phone?: string | null
          representative_legal?: string | null
          responsible_id?: string | null
          state?: string | null
          tax_regime?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dre_budgets: {
        Row: {
          budget_value: number
          category_id: string
          company_id: string
          created_at: string
          id: string
          month_year: string
          updated_at: string
        }
        Insert: {
          budget_value?: number
          category_id: string
          company_id: string
          created_at?: string
          id?: string
          month_year: string
          updated_at?: string
        }
        Update: {
          budget_value?: number
          category_id?: string
          company_id?: string
          created_at?: string
          id?: string
          month_year?: string
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_tasks: {
        Row: {
          attachment_url: string | null
          company_id: string
          contact_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          notes: string | null
          responsible_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          responsible_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: string
          entity_id: string | null
          entity_name: string | null
          id: string
          module: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          module: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: string
          entity_id?: string | null
          entity_name?: string | null
          id?: string
          module?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allowed_modules: string[]
          avatar_url: string | null
          company_id: string
          created_at: string
          email: string
          force_password_change: boolean
          full_name: string | null
          id: string
          is_super_admin: boolean
          role: string
          status: string | null
          status_active: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          allowed_modules?: string[]
          avatar_url?: string | null
          company_id: string
          created_at?: string
          email: string
          force_password_change?: boolean
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          role?: string
          status?: string | null
          status_active?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          allowed_modules?: string[]
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          email?: string
          force_password_change?: boolean
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          role?: string
          status?: string | null
          status_active?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
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
      recurring_transactions: {
        Row: {
          amount: number
          bank_id: string | null
          category_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          day_of_month: number | null
          days_of_week: string | null
          description: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          notes: string | null
          start_date: string
          times_per_week: number | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: string | null
          description: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date?: string
          times_per_week?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: string | null
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          start_date?: string
          times_per_week?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          transaction_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          transaction_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_id: string | null
          category_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          date: string | null
          deleted_at: string | null
          description: string
          due_date: string | null
          expected_date: string | null
          id: string
          is_paid: boolean
          issue_date: string | null
          notes: string | null
          paid_amount: number | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          description: string
          due_date?: string | null
          expected_date?: string | null
          id?: string
          is_paid?: boolean
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          expected_date?: string | null
          id?: string
          is_paid?: boolean
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
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
      app_role: "admin" | "colaborador" | "cliente"
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
      app_role: ["admin", "colaborador", "cliente"],
    },
  },
} as const

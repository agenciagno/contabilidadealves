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
      acessos_portais: {
        Row: {
          anexo_url: string | null
          atualizado_por: string | null
          company_id: string
          contact_id: string
          created_at: string
          id: string
          login: string | null
          observacao: string | null
          portal: Database["public"]["Enums"]["portal_tipo"]
          portal_label: string | null
          senha_encrypted: string | null
          updated_at: string
          validade_certificado: string | null
        }
        Insert: {
          anexo_url?: string | null
          atualizado_por?: string | null
          company_id: string
          contact_id: string
          created_at?: string
          id?: string
          login?: string | null
          observacao?: string | null
          portal: Database["public"]["Enums"]["portal_tipo"]
          portal_label?: string | null
          senha_encrypted?: string | null
          updated_at?: string
          validade_certificado?: string | null
        }
        Update: {
          anexo_url?: string | null
          atualizado_por?: string | null
          company_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          login?: string | null
          observacao?: string | null
          portal?: Database["public"]["Enums"]["portal_tipo"]
          portal_label?: string | null
          senha_encrypted?: string | null
          updated_at?: string
          validade_certificado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acessos_portais_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_portais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_portais_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_portais_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
          },
        ]
      }
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
      cofre_acessos_log: {
        Row: {
          acao: string
          acesso_id: string
          created_at: string
          id: string
          ip_address: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          acesso_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          acesso_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cofre_acessos_log_acesso_id_fkey"
            columns: ["acesso_id"]
            isOneToOne: false
            referencedRelation: "acessos_portais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cofre_acessos_log_acesso_id_fkey"
            columns: ["acesso_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["acesso_id"]
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
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
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
          {
            foreignKeyName: "contact_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
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
          {
            foreignKeyName: "contact_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
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
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_partners: {
        Row: {
          ativo: boolean | null
          company_id: string
          contact_id: string
          cpf: string | null
          created_at: string
          created_by: string | null
          data_entrada: string | null
          data_saida: string | null
          email: string | null
          endereco: string | null
          id: string
          name: string
          participation_percentage: number | null
          rg: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          contact_id: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          name: string
          participation_percentage?: number | null
          rg?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          contact_id?: string
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_entrada?: string | null
          data_saida?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          name?: string
          participation_percentage?: number | null
          rg?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_partners_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "contact_partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          canal_entrega: string | null
          categorias: string[] | null
          cep: string | null
          city: string | null
          cnae_principal: Json | null
          cnaes_secundarios: Json | null
          company_id: string
          complemento: string | null
          created_at: string
          data_abertura_estado: string | null
          data_abertura_junta: string | null
          data_abertura_prefeitura: string | null
          data_abertura_receita: string | null
          data_abertura_rf: string | null
          data_encerramento_estado: string | null
          data_encerramento_junta: string | null
          data_encerramento_prefeitura: string | null
          data_encerramento_rf: string | null
          data_inicio_contrato: string | null
          document: string | null
          email: string | null
          enviar_cobranca_auto: boolean
          grupo_cipa: string | null
          grupo_escritorio: string | null
          id: string
          ie: string | null
          im: string | null
          inventario: boolean | null
          is_active: boolean
          medicina_trabalho: boolean | null
          name: string
          natureza_juridica: string | null
          neighborhood: string | null
          nome_fantasia: string | null
          notes: string | null
          numero_alvara: string | null
          numero_cliente_sicoob: number | null
          numero_funcionarios: number | null
          origin: string
          phone: string | null
          porte: string | null
          possui_funcionarios: boolean | null
          razao_social: string | null
          regime_apuracao: string | null
          registro_entradas: boolean | null
          registro_icms: boolean | null
          registro_saidas: boolean | null
          representative_legal: string | null
          responsible_id: string | null
          segundo_email_contato: string | null
          siare_senha_encrypted: string | null
          situacao_cadastral: string | null
          state: string | null
          status_cliente: string | null
          tax_regime: string | null
          tipo_cartao_ponto: string | null
          tipo_cliente: string | null
          tipo_estabelecimento: string | null
          type: string
          updated_at: string
          validade_alvara: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          boleto_active?: boolean
          boleto_due_day?: number | null
          boleto_start_date?: string | null
          boleto_value?: number | null
          canal_entrega?: string | null
          categorias?: string[] | null
          cep?: string | null
          city?: string | null
          cnae_principal?: Json | null
          cnaes_secundarios?: Json | null
          company_id: string
          complemento?: string | null
          created_at?: string
          data_abertura_estado?: string | null
          data_abertura_junta?: string | null
          data_abertura_prefeitura?: string | null
          data_abertura_receita?: string | null
          data_abertura_rf?: string | null
          data_encerramento_estado?: string | null
          data_encerramento_junta?: string | null
          data_encerramento_prefeitura?: string | null
          data_encerramento_rf?: string | null
          data_inicio_contrato?: string | null
          document?: string | null
          email?: string | null
          enviar_cobranca_auto?: boolean
          grupo_cipa?: string | null
          grupo_escritorio?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          inventario?: boolean | null
          is_active?: boolean
          medicina_trabalho?: boolean | null
          name: string
          natureza_juridica?: string | null
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          numero_alvara?: string | null
          numero_cliente_sicoob?: number | null
          numero_funcionarios?: number | null
          origin?: string
          phone?: string | null
          porte?: string | null
          possui_funcionarios?: boolean | null
          razao_social?: string | null
          regime_apuracao?: string | null
          registro_entradas?: boolean | null
          registro_icms?: boolean | null
          registro_saidas?: boolean | null
          representative_legal?: string | null
          responsible_id?: string | null
          segundo_email_contato?: string | null
          siare_senha_encrypted?: string | null
          situacao_cadastral?: string | null
          state?: string | null
          status_cliente?: string | null
          tax_regime?: string | null
          tipo_cartao_ponto?: string | null
          tipo_cliente?: string | null
          tipo_estabelecimento?: string | null
          type: string
          updated_at?: string
          validade_alvara?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          boleto_active?: boolean
          boleto_due_day?: number | null
          boleto_start_date?: string | null
          boleto_value?: number | null
          canal_entrega?: string | null
          categorias?: string[] | null
          cep?: string | null
          city?: string | null
          cnae_principal?: Json | null
          cnaes_secundarios?: Json | null
          company_id?: string
          complemento?: string | null
          created_at?: string
          data_abertura_estado?: string | null
          data_abertura_junta?: string | null
          data_abertura_prefeitura?: string | null
          data_abertura_receita?: string | null
          data_abertura_rf?: string | null
          data_encerramento_estado?: string | null
          data_encerramento_junta?: string | null
          data_encerramento_prefeitura?: string | null
          data_encerramento_rf?: string | null
          data_inicio_contrato?: string | null
          document?: string | null
          email?: string | null
          enviar_cobranca_auto?: boolean
          grupo_cipa?: string | null
          grupo_escritorio?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          inventario?: boolean | null
          is_active?: boolean
          medicina_trabalho?: boolean | null
          name?: string
          natureza_juridica?: string | null
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          numero_alvara?: string | null
          numero_cliente_sicoob?: number | null
          numero_funcionarios?: number | null
          origin?: string
          phone?: string | null
          porte?: string | null
          possui_funcionarios?: boolean | null
          razao_social?: string | null
          regime_apuracao?: string | null
          registro_entradas?: boolean | null
          registro_icms?: boolean | null
          registro_saidas?: boolean | null
          representative_legal?: string | null
          responsible_id?: string | null
          segundo_email_contato?: string | null
          siare_senha_encrypted?: string | null
          situacao_cadastral?: string | null
          state?: string | null
          status_cliente?: string | null
          tax_regime?: string | null
          tipo_cartao_ponto?: string | null
          tipo_cliente?: string | null
          tipo_estabelecimento?: string | null
          type?: string
          updated_at?: string
          validade_alvara?: string | null
          whatsapp?: string | null
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
      historico_eventos: {
        Row: {
          campos_alterados: string[] | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          campos_alterados?: string[] | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          operacao?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          company_id: string | null
          created_at: string
          id: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          task_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
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
          password_changed_at: string | null
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
          password_changed_at?: string | null
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
          password_changed_at?: string | null
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
          {
            foreignKeyName: "recurring_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
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
          is_cash: boolean
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
          is_cash?: boolean
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
          is_cash?: boolean
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
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "vw_cofre_global"
            referencedColumns: ["contact_id"]
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
      vw_cofre_global: {
        Row: {
          acesso_id: string | null
          alerta_vencimento: boolean | null
          company_id: string | null
          contact_id: string | null
          login: string | null
          nome_cliente: string | null
          observacao: string | null
          portal: Database["public"]["Enums"]["portal_tipo"] | null
          portal_label: string | null
          senha_atualizada_em: string | null
          validade_certificado: string | null
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
    }
    Functions: {
      cofre_decrypt_internal: {
        Args: { p_encrypted: string; p_key: string }
        Returns: string
      }
      cofre_encrypt_internal: {
        Args: { p_key: string; p_plaintext: string }
        Returns: string
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: never; Returns: string }
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
      portal_tipo:
        | "gov_br"
        | "siare"
        | "certificado_digital"
        | "ecac"
        | "prefeitura_nfse"
        | "sefaz_estadual"
        | "esocial"
        | "conectividade_social"
        | "outros"
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
      portal_tipo: [
        "gov_br",
        "siare",
        "certificado_digital",
        "ecac",
        "prefeitura_nfse",
        "sefaz_estadual",
        "esocial",
        "conectividade_social",
        "outros",
      ],
    },
  },
} as const

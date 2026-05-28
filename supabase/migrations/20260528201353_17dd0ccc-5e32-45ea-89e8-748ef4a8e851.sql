-- ============================================================
-- MIGRATION: super_perfil_schema_completo (com 2 correções)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE portal_tipo AS ENUM (
    'gov_br','siare','certificado_digital','ecac',
    'prefeitura_nfse','sefaz_estadual','esocial',
    'conectividade_social','outros'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS categorias          text[]  DEFAULT ARRAY['outros']::text[],
  ADD COLUMN IF NOT EXISTS razao_social         text,
  ADD COLUMN IF NOT EXISTS nome_fantasia        text,
  ADD COLUMN IF NOT EXISTS cnae_principal       jsonb,
  ADD COLUMN IF NOT EXISTS cnaes_secundarios    jsonb,
  ADD COLUMN IF NOT EXISTS natureza_juridica    text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral   text,
  ADD COLUMN IF NOT EXISTS data_abertura_receita date,
  ADD COLUMN IF NOT EXISTS complemento          text,
  ADD COLUMN IF NOT EXISTS segundo_email_contato text,
  ADD COLUMN IF NOT EXISTS ie                   text,
  ADD COLUMN IF NOT EXISTS im                   text,
  ADD COLUMN IF NOT EXISTS regime_apuracao      text,
  ADD COLUMN IF NOT EXISTS numero_alvara        text,
  ADD COLUMN IF NOT EXISTS validade_alvara      date,
  ADD COLUMN IF NOT EXISTS status_cliente       text    DEFAULT 'Prospect',
  ADD COLUMN IF NOT EXISTS tipo_cliente         text,
  ADD COLUMN IF NOT EXISTS tipo_estabelecimento text,
  ADD COLUMN IF NOT EXISTS grupo_escritorio     text,
  ADD COLUMN IF NOT EXISTS data_inicio_contrato date,
  ADD COLUMN IF NOT EXISTS data_abertura_junta       date,
  ADD COLUMN IF NOT EXISTS data_abertura_rf          date,
  ADD COLUMN IF NOT EXISTS data_abertura_prefeitura  date,
  ADD COLUMN IF NOT EXISTS data_abertura_estado      date,
  ADD COLUMN IF NOT EXISTS data_encerramento_junta       date,
  ADD COLUMN IF NOT EXISTS data_encerramento_rf          date,
  ADD COLUMN IF NOT EXISTS data_encerramento_prefeitura  date,
  ADD COLUMN IF NOT EXISTS data_encerramento_estado      date,
  ADD COLUMN IF NOT EXISTS possui_funcionarios  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS numero_funcionarios  integer,
  ADD COLUMN IF NOT EXISTS tipo_cartao_ponto    text,
  ADD COLUMN IF NOT EXISTS medicina_trabalho    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS grupo_cipa           text,
  ADD COLUMN IF NOT EXISTS registro_entradas    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registro_saidas      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registro_icms        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventario           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS siare_senha_encrypted bytea;

DO $$ BEGIN
  ALTER TABLE public.contacts ADD CONSTRAINT contacts_categorias_check
    CHECK (categorias <@ ARRAY['cliente','colaborador','outros']::text[]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_categorias ON public.contacts USING GIN (categorias);

UPDATE public.contacts SET categorias = ARRAY['cliente']::text[]  WHERE type = 'cliente'    AND categorias = ARRAY['outros']::text[];
UPDATE public.contacts SET categorias = ARRAY['outros']::text[]   WHERE type = 'fornecedor' AND categorias = ARRAY['outros']::text[];
UPDATE public.contacts SET categorias = ARRAY['cliente','outros']::text[] WHERE type = 'ambos' AND categorias = ARRAY['outros']::text[];

ALTER TABLE public.contact_partners
  ADD COLUMN IF NOT EXISTS rg          text,
  ADD COLUMN IF NOT EXISTS whatsapp    text,
  ADD COLUMN IF NOT EXISTS endereco    text,
  ADD COLUMN IF NOT EXISTS data_entrada date,
  ADD COLUMN IF NOT EXISTS data_saida  date,
  ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES public.profiles(id);

DO $$ BEGIN
  ALTER TABLE public.contact_partners
    ADD COLUMN ativo boolean GENERATED ALWAYS AS (data_saida IS NULL) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

COMMENT ON COLUMN public.contact_partners.data_saida IS
  'Soft delete. NUNCA usar DELETE — apenas UPDATE SET data_saida = now()';

CREATE TABLE IF NOT EXISTS public.historico_eventos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela           text NOT NULL,
  registro_id      uuid NOT NULL,
  operacao         text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE','ACESSO_SENHA')),
  dados_anteriores jsonb,
  dados_novos      jsonb,
  campos_alterados text[],
  usuario_id       uuid REFERENCES auth.users(id),
  usuario_nome     text,
  created_at       timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.historico_eventos TO authenticated;
GRANT ALL ON public.historico_eventos TO service_role;

ALTER TABLE public.historico_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin vê historico" ON public.historico_eventos;
CREATE POLICY "Admin vê historico"
  ON public.historico_eventos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.role = 'admin')
  ));

DROP POLICY IF EXISTS "Apenas trigger insere historico" ON public.historico_eventos;
CREATE POLICY "Apenas trigger insere historico"
  ON public.historico_eventos FOR INSERT WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_usuario_id   uuid;
  v_usuario_nome text;
  v_campos       text[] := '{}';
  v_key          text;
BEGIN
  BEGIN v_usuario_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_usuario_id := NULL; END;
  IF v_usuario_id IS NOT NULL THEN
    SELECT email INTO v_usuario_nome FROM auth.users WHERE id = v_usuario_id;
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_eventos(tabela,registro_id,operacao,dados_novos,usuario_id,usuario_nome)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), v_usuario_id, v_usuario_nome);
  ELSIF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT key FROM jsonb_each(to_jsonb(NEW)) LOOP
      IF v_key = 'updated_at' THEN CONTINUE; END IF;
      IF (to_jsonb(OLD) -> v_key) IS DISTINCT FROM (to_jsonb(NEW) -> v_key) THEN
        v_campos := array_append(v_campos, v_key);
      END IF;
    END LOOP;
    IF array_length(v_campos, 1) > 0 THEN
      INSERT INTO public.historico_eventos(tabela,registro_id,operacao,dados_anteriores,dados_novos,campos_alterados,usuario_id,usuario_nome)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_campos, v_usuario_id, v_usuario_nome);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_eventos(tabela,registro_id,operacao,dados_anteriores,usuario_id,usuario_nome)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), v_usuario_id, v_usuario_nome);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_audit_contacts ON public.contacts;
CREATE TRIGGER trg_audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_contact_partners ON public.contact_partners;
CREATE TRIGGER trg_audit_contact_partners
  AFTER INSERT OR UPDATE OR DELETE ON public.contact_partners
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

CREATE TABLE IF NOT EXISTS public.acessos_portais (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid REFERENCES public.companies(id) NOT NULL,
  contact_id           uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  portal               portal_tipo NOT NULL,
  portal_label         text,
  login                text,
  senha_encrypted      bytea,
  observacao           text,
  validade_certificado date,
  atualizado_por       uuid REFERENCES public.profiles(id),
  created_at           timestamptz DEFAULT now() NOT NULL,
  updated_at           timestamptz DEFAULT now() NOT NULL,
  UNIQUE (contact_id, portal)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessos_portais TO authenticated;
GRANT ALL ON public.acessos_portais TO service_role;

ALTER TABLE public.acessos_portais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia acessos_portais" ON public.acessos_portais;
CREATE POLICY "Admin gerencia acessos_portais"
  ON public.acessos_portais FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id = acessos_portais.company_id
      AND (p.is_super_admin = true OR p.role = 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id = acessos_portais.company_id
      AND (p.is_super_admin = true OR p.role = 'admin')
  ));

DROP POLICY IF EXISTS "Colaborador vê metadados acessos_portais" ON public.acessos_portais;
CREATE POLICY "Colaborador vê metadados acessos_portais"
  ON public.acessos_portais FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id = acessos_portais.company_id
  ));

CREATE TABLE IF NOT EXISTS public.cofre_acessos_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_id    uuid REFERENCES public.acessos_portais(id) ON DELETE CASCADE NOT NULL,
  usuario_id   uuid REFERENCES auth.users(id),
  usuario_nome text,
  acao         text NOT NULL CHECK (acao IN ('REVELAR','COPIAR')),
  ip_address   text,
  created_at   timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT ON public.cofre_acessos_log TO authenticated;
GRANT ALL ON public.cofre_acessos_log TO service_role;

ALTER TABLE public.cofre_acessos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin vê log cofre" ON public.cofre_acessos_log;
CREATE POLICY "Admin vê log cofre"
  ON public.cofre_acessos_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.role = 'admin')
  ));

CREATE OR REPLACE VIEW public.vw_cofre_global AS
SELECT
  c.id            AS contact_id,
  c.name          AS nome_cliente,
  c.company_id,
  ap.id           AS acesso_id,
  ap.portal,
  ap.portal_label,
  ap.login,
  ap.observacao,
  ap.validade_certificado,
  ap.updated_at   AS senha_atualizada_em,
  CASE
    WHEN ap.portal = 'certificado_digital'
     AND ap.validade_certificado IS NOT NULL
     AND ap.validade_certificado <= (CURRENT_DATE + INTERVAL '30 days')
    THEN true ELSE false
  END AS alerta_vencimento
FROM public.contacts c
JOIN public.acessos_portais ap ON ap.contact_id = c.id
WHERE 'cliente' = ANY(COALESCE(c.categorias, ARRAY['outros']::text[]))
  AND c.is_active = true;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- CORREÇÃO 2: dropar policy permissiva antiga para a nova restritiva ter efeito
DROP POLICY IF EXISTS "Users can view contacts from their company" ON public.contacts;
DROP POLICY IF EXISTS "Contacts visibilidade por categoria e empresa" ON public.contacts;
CREATE POLICY "Contacts visibilidade por categoria e empresa"
  ON public.contacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.company_id = contacts.company_id
      AND (
        p.is_super_admin = true
        OR p.role = 'admin'
        OR NOT ('colaborador' = ANY(COALESCE(contacts.categorias, ARRAY['outros']::text[])))
      )
  ));

CREATE OR REPLACE FUNCTION public.fn_block_email_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND (is_super_admin = true OR role = 'admin')
    ) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar o e-mail de acesso.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_email_change ON public.profiles;
CREATE TRIGGER trg_block_email_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_email_change();

CREATE OR REPLACE FUNCTION public.cofre_decrypt_internal(p_encrypted bytea, p_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN pgp_sym_decrypt(p_encrypted, p_key);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Falha ao descriptografar senha do cofre.';
END; $$;

REVOKE ALL ON FUNCTION public.cofre_decrypt_internal(bytea, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cofre_decrypt_internal(bytea, text) TO service_role;
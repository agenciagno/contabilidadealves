
# Reestruturação SaaS Multi-Tenant — Painel Super Admin (Plano Revisado)

## Mudança Central em Relação ao Plano Anterior

As antigas **Aba 3 (Empresas Clientes)** e **Aba 4 (Usuários Clientes)** são **unificadas em uma única aba** chamada **"Empresas Clientes"**, com layout de painel expandível (accordion ou cards expandidos). Dentro do modal de **"Nova Empresa"**, há uma seção para vincular um cliente já cadastrado no CRM (tabela `contacts`), puxando Nome, CNPJ e Email automaticamente.

A estrutura final de abas no Settings será:

```text
Configurações
├── Aba 1: Perfil & Conta
├── Aba 2: Minha Equipe
├── Aba 3: Empresas Clientes  ← Abas 3+4 unificadas (só Super Admin)
└── Aba 4: Logs Globais
```

---

## Parte 1 — Banco de Dados (Migrations)

### Migration: Adicionar colunas nas tabelas existentes

```sql
-- companies: status e módulos do plano
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_modules text[] NOT NULL DEFAULT ARRAY['financeiro','crm','relatorios'];

-- profiles: super admin e módulos permitidos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_modules text[] NOT NULL DEFAULT ARRAY['financeiro','crm','relatorios'];

-- Promover Gabriel Alves a Super Admin
UPDATE public.profiles
  SET is_super_admin = true
  WHERE email = 'gwalves13@gmail.com';
```

### Migration: Função `is_super_admin` + RLS atualizado

Criar função `is_super_admin(uuid)` como `SECURITY DEFINER` que lê da tabela `profiles`. Em seguida, adicionar `OR is_super_admin(auth.uid())` em todas as políticas RLS de SELECT, INSERT, UPDATE e DELETE das tabelas: `contacts`, `transactions`, `banks`, `categories`, `recurring_transactions`, `contact_documents`, `contact_notes`, `contact_logs`, `contact_messages`, `transaction_attachments`, `boleto_controls`, `global_logs`, `companies`.

**RLS para bloquear empresas inativas** — usuários de empresas com `status = 'inactive'` perdem acesso:
```sql
-- Exemplo para contacts:
USING (
  (company_id = get_user_company_id(auth.uid())
    AND EXISTS (SELECT 1 FROM companies WHERE id = company_id AND status = 'active'))
  OR is_super_admin(auth.uid())
)
```

**RLS de `profiles`** — Super Admin pode ver e inserir profiles em qualquer empresa:
```sql
-- SELECT
USING (company_id = get_user_company_id(auth.uid()) OR is_super_admin(auth.uid()))
-- INSERT
WITH CHECK (is_super_admin(auth.uid()) OR company_id = get_user_company_id(auth.uid()))
```

---

## Parte 2 — Edge Function `create-user-v2`

**Arquivo:** `supabase/functions/create-user-v2/index.ts`

Usa `SUPABASE_SERVICE_ROLE_KEY` para criar usuários no sistema de autenticação do backend com email já confirmado (`email_confirm: true`), sem expor a chave no cliente.

**Fluxo da função:**
1. Recebe via POST: `{ email, password, fullName, companyId, allowedModules }`
2. Valida o JWT do caller — verifica `is_super_admin = true` no banco
3. Chama `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
4. Insere profile em `profiles` com `company_id`, `allowed_modules`, `is_super_admin: false`
5. Insere role em `user_roles` com `role: 'admin'`
6. Retorna `{ success: true, userId }`

A função é chamada tanto para criar membros da equipe interna (Aba 2) quanto para criar usuários de clientes (Aba 3 expandida).

---

## Parte 3 — Hook `useSuperAdmin`

**Arquivo novo:** `src/hooks/useSuperAdmin.ts`

```typescript
export function useSuperAdmin() {
  // lê is_super_admin e allowed_modules do profile atual
  return { isSuperAdmin, allowedModules };
}
```

Usado na SettingsPage para mostrar/ocultar abas e na Sidebar para filtrar módulos.

---

## Parte 4 — Refatoração de `SettingsPage.tsx`

### Aba 1: Perfil & Conta

Reorganiza o conteúdo atual em cards mais limpos:

- **Card Perfil Pessoal**: campos `full_name` (editável, salva via `supabase.from('profiles').update`) e email atual (read-only)
- **Card Alterar Email**: Input para novo email + botão → `supabase.auth.updateUser({ email })` → banner amarelo "Verifique seu novo email para confirmar"
- **Card Segurança**: Alterar senha (já existe)
- **Card Aparência**: Tema (já existe)
- **Card Dados da Empresa**: Nome, CNPJ, Logo, Telefone (já existe)

### Aba 2: Minha Equipe

Reutiliza o `UsersTab` atual com pequenas melhorias:

- Lista usuários da empresa da Contabilidade Alves
- Botão "Novo Membro" agora chama a edge function `create-user-v2` (em vez de `supabase.auth.signUp` diretamente), garantindo que o email seja confirmado automaticamente
- Colunas extras: Módulos de Acesso (chips coloridos)

### Aba 3: Empresas Clientes (Unificada) — Apenas Super Admin

Componente novo: `src/components/settings/ClientCompaniesTab.tsx`

Layout em dois painéis lado a lado (ou empilhados em mobile):

**Painel esquerdo — Lista de Empresas:**
- Cards de cada empresa com: Nome, CNPJ, badge de Status (Verde "Ativo" / Vermelho "Inativo")
- Contador de usuários vinculados
- Switch Ativo/Inativo que atualiza `companies.status`
- Ao clicar em uma empresa, o painel direito se atualiza

**Painel direito — Usuários da Empresa Selecionada:**
- Tabela de usuários filtrada pela empresa clicada
- Botão "Adicionar Usuário" abre modal de criação
- Colunas: Nome, Email, Módulos, Data de Criação, Excluir

**Botão "Nova Empresa"** abre um modal com 2 seções:

**Seção A — Dados da Empresa (manual OU importado do CRM):**
- Toggle: "Criar nova" / "Vincular cliente existente do CRM"
- Quando "Vincular cliente existente": Searchable Select listando todos os `contacts` onde `type IN ('cliente', 'ambos')`. Ao selecionar, preenche automaticamente: Nome, CNPJ (`document`), Email
- Campos editáveis: Nome, CNPJ, Email da Empresa
- Módulos do Plano (checkboxes): Financeiro, CRM, Relatórios

**Seção B — Criar Primeiro Usuário para esta Empresa (opcional):**
- Toggle "Criar usuário administrador agora?"
- Se ativado, exibe: Nome completo, Email, Senha provisória
- Ao salvar: cria a empresa em `companies` E (se toggle ativo) chama `create-user-v2`

### Aba 4: Logs Globais

Mantida como está (apenas renumerada).

---

## Parte 5 — Sidebar Dinâmica

**Arquivo:** `src/components/layout/AppSidebar.tsx`

```typescript
const { isSuperAdmin, allowedModules } = useSuperAdmin();
const { company } = useCompany();

const planModules = company?.plan_modules ?? ['financeiro', 'crm', 'relatorios'];

const moduleKeys: Record<string, string> = {
  'Financeiro': 'financeiro',
  'CRM / Clientes': 'crm',
  'Relatórios': 'relatorios',
};

const filteredModules = isSuperAdmin
  ? menuModules
  : menuModules.filter(m => {
      const key = moduleKeys[m.title];
      if (!key) return true; // Home, Configurações — sempre visível
      return planModules.includes(key) && allowedModules.includes(key);
    });
```

Super Admin vê todos os módulos sempre, sem filtro.

---

## Resumo de Arquivos

| Ação | Arquivo |
|---|---|
| Criar (migration 1) | Schema: colunas em `companies` e `profiles`, UPDATE super admin |
| Criar (migration 2) | Função `is_super_admin` + RLS atualizado em todas as tabelas |
| Criar | `supabase/functions/create-user-v2/index.ts` |
| Criar | `src/hooks/useSuperAdmin.ts` |
| Modificar | `src/pages/SettingsPage.tsx` — 4 abas reestruturadas |
| Modificar | `src/components/users/UsersTab.tsx` — integrar `create-user-v2` + mostrar módulos |
| Criar | `src/components/settings/ClientCompaniesTab.tsx` — abas 3 unificada |
| Modificar | `src/components/layout/AppSidebar.tsx` — sidebar dinâmica |

---

## Ordem de Implementação

1. Migrations (schema + RLS)
2. Edge Function `create-user-v2`
3. Hook `useSuperAdmin`
4. `ClientCompaniesTab.tsx` (componente mais complexo, com busca de contacts do CRM)
5. `SettingsPage.tsx` refatorado
6. `UsersTab.tsx` atualizado
7. `AppSidebar.tsx` dinâmico

Nenhum dado existente será perdido. Gabriel Alves continuará com acesso total como Super Admin.

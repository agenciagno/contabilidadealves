

## Plano: Sistema RBAC + Refatoração Sidebar + Fluxo de Criação de Usuários

### Resumo

Adicionar colunas `role`, `status_active`, `force_password_change` e `avatar_url` à tabela `profiles`. Reestruturar a sidebar (perfil no rodapé, configurações condicionais por role). Refatorar o modal de criação de usuários (sem senha/username, senha padrão automática). Criar AuthGuard para forçar troca de senha no primeiro login. Separar "Meu Perfil" (modal) de "Configurações" (tela).

### Mudanças

| # | Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Adicionar `role`, `status_active`, `force_password_change`, `avatar_url` em `profiles`; remover `relatorios` do default de `allowed_modules` |
| 2 | `src/hooks/useSuperAdmin.ts` | Refatorar para `useUserRole.ts` — retornar `role`, `isSuperAdmin`, `isAdmin`, `isColaborador`, `allowedModules` |
| 3 | `src/components/layout/AppSidebar.tsx` | Reestruturar footer: avatar+nome+sair; condicionar "Configurações" a Admin/SuperAdmin; remover "Sair" avulso |
| 4 | `src/components/profile/ProfileModal.tsx` | Novo modal: upload avatar, nome, email atual, alterar email, alterar senha, link lixeira |
| 5 | `src/pages/SettingsPage.tsx` | Remover aba "Perfil & Conta" e "Aparência"; adicionar "Dados da Empresa" como aba; condicionar abas por role |
| 6 | `src/components/users/UserFormDialog.tsx` | Remover campos senha/username; adicionar dropdown role + multi-select módulos condicional; senha padrão `Mudar@123` |
| 7 | `src/components/users/UsersTab.tsx` | Atualizar tabela: mostrar email, role, status em vez de username |
| 8 | `supabase/functions/create-user-v2/index.ts` | Aceitar `role`, `status_active`, `force_password_change`; gravar no profile |
| 9 | `src/components/auth/ForcePasswordChange.tsx` | Nova tela bloqueada para troca de senha obrigatória |
| 10 | `src/components/layout/AppLayout.tsx` | Integrar AuthGuard: verificar `force_password_change` antes de renderizar conteúdo |

---

### 1. Migration SQL

```sql
-- Adicionar novas colunas
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'colaborador',
  ADD COLUMN IF NOT EXISTS status_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS force_password_change boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Atualizar usuários existentes: admin por padrão (não forçar troca)
UPDATE public.profiles SET role = 'admin', force_password_change = false WHERE role = 'colaborador';

-- Marcar super admins
UPDATE public.profiles SET role = 'super_admin' WHERE is_super_admin = true;

-- Remover 'relatorios' do default de allowed_modules
ALTER TABLE public.profiles 
  ALTER COLUMN allowed_modules SET DEFAULT ARRAY['financeiro','crm'];
```

### 2. `useUserRole.ts` (substituir `useSuperAdmin.ts`)

- Query `profiles` buscando `role, is_super_admin, allowed_modules, force_password_change, avatar_url, status_active`
- Retornar: `role`, `isSuperAdmin` (role === 'super_admin'), `isAdmin` (role === 'admin'), `isColaborador` (role === 'colaborador'), `allowedModules`, `forcePasswordChange`, `avatarUrl`
- Atualizar TODAS as importações de `useSuperAdmin` para `useUserRole`

### 3. Sidebar — Reestruturação do Footer

**Lógica de visibilidade do botão Configurações:**
- `Colaborador` → NÃO vê "Configurações"
- `Admin` / `Super Admin` → Vê "Configurações"

**Footer layout:**
```
[Configurações]  (condicional)
─────────────────
[Avatar] Nome do Usuário    [Sair]
         clique → abre ProfileModal
```

### 4. `ProfileModal.tsx` — Novo componente

Modal/Sheet contendo:
- Upload de avatar (storage bucket `company-logos` ou novo bucket)
- Nome completo (editável)
- Email atual (readonly) + botão Alterar Email
- Alterar Senha (nova + confirmar)
- Link para Lixeira (navegar para `/configuracoes?tab=lixeira` ou renderizar TrashTab inline)
- **SEM** configuração de Aparência

### 5. `SettingsPage.tsx` — Reestruturar abas

Abas por role:

| Aba | Colaborador | Admin | Super Admin |
|-----|:-----------:|:-----:|:-----------:|
| Dados da Empresa | - | Sim | Sim |
| Minha Equipe | - | Sim | Sim |
| Empresas Clientes | - | - | Sim |
| Logs Globais | - | - | Sim |
| Lixeira | - | Sim | Sim |
| Backup | - | - | Sim |

Remover: "Perfil & Conta" e "Aparência" (migram para ProfileModal).

### 6. `UserFormDialog.tsx` — Simplificação

Campos do formulário:
- Nome Completo (input)
- E-mail (input, obrigatório)
- Status (toggle Ativo/Inativo)
- Nível de Acesso (Select: Colaborador, Admin, Super Admin)
- Módulos de Acesso (multi-select, **visível apenas se role === 'colaborador'**)

**Remover:** campos Senha, Confirmar Senha, Nome de Usuário.

**Criar:** ao salvar, enviar para `create-user-v2` com `password: 'Mudar@123'` e `force_password_change: true`.

**Editar:** enviar `role`, `status_active`, `allowedModules`. Senha não é editável pelo admin.

### 7. `UsersTab.tsx` — Atualizar tabela

Colunas: Nome | E-mail | Nível de Acesso | Status | Módulos | Ações

### 8. Edge Function `create-user-v2`

- Aceitar novos campos: `role`, `statusActive`, `forcePasswordChange`
- No INSERT/UPDATE de profile, gravar `role`, `status_active`, `force_password_change`
- Manter `is_super_admin` sincronizado: `is_super_admin = (role === 'super_admin')`

### 9. `ForcePasswordChange.tsx`

Tela bloqueada full-screen:
- Título: "Cadastre sua nova senha definitiva"
- Campos: Nova Senha + Confirmar + PasswordStrength
- Ao salvar: `supabase.auth.updateUser({ password })` + update `profiles.force_password_change = false`
- Não permite navegar para nenhuma outra rota

### 10. `AppLayout.tsx` — AuthGuard

```typescript
const { forcePasswordChange, isLoading: roleLoading } = useUserRole();

if (forcePasswordChange) {
  return <ForcePasswordChange />;
}
// ... render normal layout
```

### Resumo
- 1 migration
- 3 arquivos novos (`useUserRole.ts`, `ProfileModal.tsx`, `ForcePasswordChange.tsx`)
- 7 arquivos editados
- 1 edge function atualizada


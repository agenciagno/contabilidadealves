
## Overview

Add login status verification, pending/blocked screens, a pending-users badge for super admins, module-based route guards, and a "no access" page. No visual changes to the existing login form.

---

## 1. Login status verification (`src/contexts/AuthContext.tsx`)

After `signInWithPassword` succeeds, fetch the user's profile and check `status`:

- `'pending'` → sign out, return a custom error with code `STATUS_PENDING`
- `'blocked'` → sign out, return a custom error with code `STATUS_BLOCKED`
- `'active'` (or null for legacy) → proceed normally

The `Auth.tsx` page will read the error code and show the appropriate UI.

## 2. Status screens (`src/pages/Auth.tsx`)

Add local state for `statusBlock: 'pending' | 'blocked' | null`.

- **pending**: Render `PendingApprovalScreen` (new component) — Clock icon, "Acesso em análise" title, explanation text, "Voltar ao login" button. Glassmorphism style matching login card.
- **blocked**: Show inline alert below the login form — ShieldX icon, red text, "Seu acesso foi bloqueado."

No changes to existing login layout, inputs, or styling.

### New file: `src/components/auth/PendingApprovalScreen.tsx`

## 3. Pending approvals badge (`src/components/layout/AppSidebar.tsx`)

For super_admin users, query `profiles` where `status = 'pending'` and `company_id` matches. Display a red badge with the count on the "Configurações" menu item.

### New hook: `src/hooks/usePendingApprovals.ts`

Returns `{ pendingCount }` — only queries when `isSuperAdmin` is true.

## 4. Approve/Reject in UsersTab (`src/components/users/UsersTab.tsx`)

For users with `status = 'pending'`:
- Show yellow "Aguardando aprovação" badge instead of Ativo/Inativo
- Add "Aprovar" button (sets `status = 'active'`) and "Recusar" button (sets `status = 'blocked'`)

These buttons call `supabase.from('profiles').update({ status }).eq('user_id', userId)`.

Note: The UPDATE policy on profiles only allows `user_id = auth.uid()`. A new RLS policy is needed to let admins update profiles in their company.

### Database migration

Add an RLS policy allowing admins/super_admins to update profiles within their company:

```sql
CREATE POLICY "Admins can update profiles in their company"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  (company_id = get_user_company_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'admin')
    OR is_super_admin(auth.uid())
  )
);
```

## 5. Module route guard

### New component: `src/components/auth/ModuleGuard.tsx`

Props: `moduleName: string`, `children: ReactNode`.

Logic:
- If `isSuperAdmin` → render children
- If `moduleName` is in `allowedModules` AND in company `plan_modules` → render children
- Otherwise → redirect to `/sem-acesso`

### New page: `src/pages/NoAccess.tsx`

Lock icon, "Módulo não disponível" title, explanation, "Ir para Home" button.

### Route updates (`src/App.tsx`)

Wrap each route's element with `<ModuleGuard moduleName="...">`:

| Route | Module key |
|---|---|
| `/` | `home` |
| `/legalizacao` | `legalizacao` |
| `/fiscal/*` | `fiscal` |
| `/pessoal-rh` | `pessoal_rh` |
| `/painel-financeiro`, `/movimentacoes`, `/financeiro/*`, `/boletos`, `/bancos`, `/categorias`, `/dre` | `financeiro` |
| `/contatos`, `/crm/*`, `/disparos`, `/relatorio-clientes` | `clientes` |
| `/configuracoes` | `configuracoes` |

Add route: `/sem-acesso` → `NoAccess` (no guard, no AppLayout).

## 6. Fiscal task visibility

Already implemented — `useFiscalTasks.ts` filters by `responsible_id` when `isColaborador`. The request says "if super_admin, no filter; otherwise filter by assigned_to." Current code already does this (colaborador = filtered, admin/super_admin = unfiltered). No changes needed.

---

## Files to create
- `src/components/auth/PendingApprovalScreen.tsx`
- `src/components/auth/ModuleGuard.tsx`
- `src/pages/NoAccess.tsx`
- `src/hooks/usePendingApprovals.ts`

## Files to modify
- `src/contexts/AuthContext.tsx` — status check after login
- `src/pages/Auth.tsx` — handle pending/blocked states
- `src/components/layout/AppSidebar.tsx` — pending badge on Configurações
- `src/components/users/UsersTab.tsx` — approve/reject buttons for pending users
- `src/App.tsx` — wrap routes with ModuleGuard, add `/sem-acesso`

## Migration
- Add admin UPDATE policy on profiles

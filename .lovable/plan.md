## Escopo

Aplicar 6 ajustes no módulo Fiscal num único build. Esta é uma exceção autorizada à regra de reskin (envolve lógica/RBAC/queries/UX).

---

## 1. RBAC nas rotas e no menu

**`src/components/auth/ModuleGuard.tsx`** — adicionar prop opcional `requireAdmin?: boolean`. Se `true` e o usuário não for `admin`/`isSuperAdmin`, redirecionar para `/fiscal/tarefas`.

**`src/App.tsx`** — aplicar `requireAdmin` nas rotas `/fiscal/dashboard`, `/fiscal/calendario`, `/fiscal/colaboradores`. `/fiscal/tarefas` permanece liberada.

**`src/components/layout/AppSidebar.tsx`** — o filtro de itens fiscais admin-only já existe (linha 280); mantido. Garantir que `Tarefas Fiscais` continue visível para colaborador.

---

## 2. Fluxo de geração em 2 etapas — `/fiscal/calendario`

**`src/hooks/useFiscalCalendar.ts`**

- Dividir `useGenerateMonthlyTasks` em dois hooks:
  - `useCalculateCalendar({ year, month })` → chama apenas a edge function `calculate-fiscal-calendar`; invalida `['fiscal-calendar', year, month]`; toast "Calendário calculado".
  - `useConfirmMonthlyTasks({ year, month })` → chama apenas `supabase.rpc('generate_monthly_fiscal_tasks', { p_year, p_month })`; toasts conforme `tasks_created`.

**`src/pages/FiscalCalendar.tsx`**

- Estado local `phase: 'idle' | 'calculated' | 'launched'` (persistido em `sessionStorage` chaveado por `year-month` para sobreviver à navegação).
- Botão "Calcular Calendário" (visível em `idle`) → ao sucesso muda para `calculated`.
- Banner azul "Calendário calculado. Revise as datas e confirme para lançar as tarefas." (em `calculated`).
- Botão "Confirmar e Lançar Tarefas" (em `calculated`) → ao sucesso muda para `launched`.
- Em `launched`: esconder ambos botões e exibir badge verde "Tarefas lançadas ✓".
- Trocar mês/ano reinicia `phase` segundo o `sessionStorage` daquele período.

---

## 3. Kanban — `/fiscal/tarefas`

**`src/components/fiscal/KanbanBoard.tsx`**

- Reordenar `COLUMNS`: `a_fazer` (azul) → `em_progresso` (laranja) → `aguardando_cliente` (amarelo) → `concluido` (verde).
- Remover a validação que bloqueia mover para `concluido` sem `attachment_url` (não consta no requisito; mantém só o mapeamento). Confirmar antes de remover? — manter por enquanto, é regra existente; só reordenar colunas.

**`src/hooks/useFiscalTasks.ts`**

- Para admin/super: query atual já não filtra por `responsible_id` (ok). Adicionar `JOIN` em `profiles!fiscal_tasks_responsible_id_fkey(id, full_name, email)` para popular nome do responsável diretamente no card (hoje vem de `profilesMap` do `companyProfiles`; manter, é suficiente).
- Para colaborador: já filtra por `currentProfile.id` (ok). Manter.

**`src/pages/FiscalTasks.tsx`**

- Os filtros admin (datas, cliente, obrigação, colaborador) já existem; trocar o `Input "Buscar obrigação..."` por um `Select` "Obrigação" populando de `fiscal_obligations_catalog` (nova query). O filtro continua via `ilike` no `title` (catálogo retorna `name`).
- Para colaborador (`isColaborador`): esconder Select de Responsável (já), esconder botão "Nova Tarefa" (já via `canDelete`). Manter datas, cliente, obrigação.

---

## 4. Fix da query do Dashboard — `/fiscal/dashboard`

**`src/hooks/useFiscalDashboard.ts`**

- `useFiscalTasksOfMonth`: remover `.is('deleted_at', null)` (coluna não existe em `fiscal_tasks`) — é provavelmente a causa dos zeros. Manter `.eq('company_id')`, `.eq('competence_year')`, `.eq('competence_month')`.
- Para colaborador: buscar `profiles.id` por `user_id = auth.uid()` e aplicar `.eq('responsible_id', profile.id)`. Adicionar `useUserRole` + `useAuth` no hook.
- `useFiscalCollaborators`: trocar filtro para `role IN ('admin','colaborador') OR 'fiscal' = ANY(allowed_modules)`. Como PostgREST não suporta OR entre `.in()` e `.contains()` trivialmente, usar `.or("role.in.(admin,colaborador),allowed_modules.cs.{fiscal}")`.
- `useUpcomingFiscalTasks`: também aplicar filtro de colaborador quando aplicável.

**`src/pages/FiscalDashboard.tsx`**

- Lógica de "Atrasadas" já usa `status !== 'concluido' && due_date < today` — manter.
- Substituir guarda `isAdmin/isSuperAdmin` por permitir colaborador também (já que requisito diz colaborador vê o próprio escopo). **Aguardar confirmação** — requisito #1 diz Dashboard é admin-only. **Manter admin-only**; o branch colaborador no hook fica como código defensivo.

---

## 5. Colaboradores — filtro de módulo + accordion — `/fiscal/colaboradores`

**`src/hooks/useCollaboratorCoverage.ts`**

- `useCollaborators`: trocar filtro para `.or("role.in.(admin,super_admin),allowed_modules.cs.{fiscal}")` e `status_active = true`.
- Novo hook `useCollaboratorDetails(profileId, year, month)`:
  - Progresso do mês (total/concluídas para o `profileId`).
  - Próximas 5 tarefas pendentes (`status != 'concluido'`, ordenado por `due_date ASC`, limit 5) com JOIN em `contacts(name)` e `fiscal_obligations_catalog(name)`.

**`src/pages/FiscalCollaborators.tsx`**

- Tornar cada `Card` clicável (toggle de expansão); estado `expandedId: string | null`.
- Quando expandido, renderizar abaixo do card (`col-span-full` ou em layout próprio) um painel com: `<Progress>` concluídas/total, lista das 5 próximas tarefas e botão "Ver todas as tarefas" → `navigate('/fiscal/tarefas?responsible=' + profileId)`.
- Em `FiscalTasks.tsx`: ler `searchParams.responsible` no mount e pré-popular `filterResponsible`.

---

## 6. Dashboard — Exportar Relatório

**Dependência:** instalar `xlsx` (SheetJS) com `bun add xlsx`.

**Novo arquivo `src/lib/fiscal-exports.ts`** com 4 funções:

- `exportProductivity(tasks, profiles, ym)` → 1 aba.
- `exportCompliance(tasks, contacts, catalog, ym)` → 1 aba.
- `exportCriticalDueDates(tasks, contacts, catalog, today)` → filtra `due_date BETWEEN hoje e hoje+15` e `status != 'concluido'`.
- `exportExecutive(tasks, profiles, contacts, catalog, ym)` → 2 abas (Resumo + Detalhamento).

Cada função monta `worksheet` com `XLSX.utils.json_to_sheet`, cria workbook e dispara download via `XLSX.writeFile(wb, 'relatorio-xxx-MMYYYY.xlsx')`.

**`src/pages/FiscalDashboard.tsx`**

- Adicionar `DropdownMenu` no header (ao lado de "Atualizar") com botão "Exportar" (ícone `Download`) e 4 itens chamando os exports.
- Buscar dados auxiliares (catálogo de obrigações, contatos) via novas queries simples reutilizando `useContacts` e uma query nova para o catálogo.

---

## Detalhes técnicos

- **`allowed_modules` array cast no PostgREST:** usar `allowed_modules.cs.{fiscal}` (contains array literal).
- **`fiscal_obligations_catalog` e `fiscal_calendar_effective`** já são acessados via `(supabase as any)` por não estarem em `types.ts` — manter padrão.
- **Tipos:** novos status já estão no tipo `FiscalTask` (`'a_fazer' | 'aguardando_cliente' | 'em_progresso' | 'concluido'`).
- **Realtime/migrations:** não há mudanças de schema.

---

## Arquivos afetados

Criar:
- `src/lib/fiscal-exports.ts`

Editar:
- `src/components/auth/ModuleGuard.tsx`
- `src/App.tsx`
- `src/hooks/useFiscalCalendar.ts`
- `src/pages/FiscalCalendar.tsx`
- `src/components/fiscal/KanbanBoard.tsx`
- `src/pages/FiscalTasks.tsx`
- `src/hooks/useFiscalDashboard.ts`
- `src/pages/FiscalDashboard.tsx`
- `src/hooks/useCollaboratorCoverage.ts`
- `src/pages/FiscalCollaborators.tsx`

Dependência nova: `xlsx`.
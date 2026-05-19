## Implementação (3 features)

### Premissa
Você confirmou que as tabelas/colunas já existem manualmente no Supabase:
- `notifications` (id, user_id, company_id, type, message, related_id?, read_at, created_at)
- `collaborator_coverage` (id, company_id, absent_profile_id, covering_profile_id, start_date, end_date, reason, is_active, created_by, created_at)
- `fiscal_tasks` estendida (competence_year, competence_month, fiscal_due_date) — já usada nos pedidos anteriores

Acesso ao schema feito via `from('notifications').select(...) as any` (types.ts não inclui ainda).

---

### Feature 1 — Sino de Notificações (substitui o atual)

O `AppHeader.tsx` já tem um sino, mas alimentado pelo `NotificationContext` legado (calculado client-side de transações). Vou **trocar a fonte para a tabela `notifications`**, mantendo o mesmo slot visual.

**Arquivos novos:**
- `src/hooks/useNotifications.ts` — query (`notifications` filtrado por `user_id = auth.uid()`, order `created_at DESC` limit 20) + mutation `markAsRead(id)` + `markAllAsRead()` + subscription Realtime (`supabase.channel('notifications-' + userId).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: \`user_id=eq.${userId}\` }, ...)`). Invalida queryClient no evento.
- `src/components/notifications/NotificationBellDropdown.tsx` — UI do dropdown 380px / max-h 400px com:
  - Header "Notificações" + botão "Marcar todas como lidas"
  - Lista (item com ícone por `type`, mensagem, data relativa via `date-fns/formatDistanceToNow` ptBR, fundo `bg-muted/50` se `read_at IS NULL`)
  - Empty state "Nenhuma notificação"
  - Ao clicar item: `markAsRead(id)`
  - Mapa de ícones: `due_alert` 🔔, `overdue` ⚠️, `task_assigned` 📋, `task_completed` ✅, `coverage_started`/`coverage_ended` 🔄

**Arquivo editado:**
- `src/components/layout/AppHeader.tsx` — substituir `useNotifications()` (do contexto) por `useNotifications()` (novo hook) e trocar `<NotificationPanel/>` por `<NotificationBellDropdown/>`. Badge "9+" já existe; só ligar ao novo `unreadCount`. (NotificationContext legado preservado por compatibilidade; não removo.)

---

### Feature 2 — Página `/fiscal/colaboradores`

**Arquivos novos:**
- `src/hooks/useCollaboratorCoverage.ts`:
  - `useCollaborators()` — `profiles` WHERE `company_id` AND `status_active = true`
  - `useActiveCoverages()` — `collaborator_coverage` da empresa com joins via duas queries (ou select com `absent:profiles!absent_profile_id(...)`); fallback: 2 queries + merge client-side se FK explícita não existir.
  - `usePendingTasksByProfile(month, year)` — agrupa `fiscal_tasks` do mês por `responsible_id` com status != concluido para o contador dos cards
  - `createCoverage`, `endCoverage` (UPDATE is_active=false, end_date=today) — mutations TanStack
- `src/components/fiscal/CoverageCreateModal.tsx` — Dialog (90vh max) com selects (ausente / cobertura — excluir o ausente), 2 DatePickers shadcn (`pointer-events-auto`), select de motivo (`Férias|Licença médica|Licença maternidade|Outros`), submit chama `createCoverage`.
- `src/pages/FiscalCollaborators.tsx`:
  - Guard local: redireciona não-admin/super_admin para `/fiscal/tarefas`
  - Header: título + botão "Nova Cobertura"
  - Seção 1: grid de Cards com avatar (iniciais), nome, badge ("Ativo" / "Em férias" / "Cobrindo {nome}"), contagem de tarefas pendentes do mês
  - Seção 2: tabela `Colaborador Ausente | Coberto por | Período (start–end ou "indefinido") | Motivo | Status badge | Ações`
    - status derivado: `is_active=false` → "encerrada"; `is_active=true && start_date>hoje` → "agendada"; senão "ativa"
    - botão "Encerrar" (destructive ghost) só se `is_active`

**Routing / sidebar:**
- `src/App.tsx` — adicionar rota `/fiscal/colaboradores` com `ModuleGuard module="fiscal"`
- `src/components/layout/AppSidebar.tsx` — adicionar item "Colaboradores" no módulo Fiscal, oculto para `colaborador`. Ordem final: **Dashboard → Tarefas Fiscais → Calendário Fiscal → Colaboradores**.

---

### Feature 3 — Transferência de Responsabilidade (FiscalTasks)

O filtro por responsável **já existe** em `FiscalTasks.tsx` (linhas 162–175). Não duplico.

**Edições em `src/components/fiscal/TaskListView.tsx`:**
- Adicionar coluna checkbox por linha
- Estado `selectedIds: Set<string>` levantado via prop `selected`/`onSelectionChange` para o page
- Tornar a coluna "Responsável" um Popover com select inline: ao trocar, chama `onReassign(taskId, newResponsibleId)` (passa pro page → `updateTask.mutate({ id, responsible_id })`) + toast

**Edições em `src/pages/FiscalTasks.tsx`:**
- Estado `selectedTaskIds`
- Barra sticky (aparece quando `selectedTaskIds.size > 0`) acima das views: "{N} tarefa(s) selecionada(s)" + "Transferir Responsabilidade" + "Desmarcar tudo"
- Modal `BulkReassignModal` (novo arquivo) com:
  - Select novo responsável (profiles ativos)
  - Checkbox "Aplicar a todas as tarefas pendentes destes clientes no mês atual" — ao confirmar com flag ligada: expandir IDs via query extra `fiscal_tasks WHERE company_id AND contact_id IN (...) AND competence_year/month = atual AND status IN ('pendente','em_andamento','a_fazer')`
  - Confirmar → `supabase.from('fiscal_tasks').update({ responsible_id }).in('id', expandedIds)` + invalidate + toast "✅ {N} tarefas transferidas para {nome}"
- Passar handlers para `TaskListView` e (opcional/se trivial) `KanbanBoard` — o spec menciona "linha da tabela", então restringe à view **list**. Checkbox/seleção só visível em viewMode='list'.

**Arquivo novo:**
- `src/components/fiscal/BulkReassignModal.tsx`

---

### Considerações técnicas

- **Tipagem**: tabelas novas via `(supabase.from('notifications') as any)` até regenerar `types.ts`.
- **RLS**: assumida correta nas tabelas criadas manualmente (`user_id = auth.uid()` em notifications; `company_id = get_user_company_id(...)` nas demais).
- **Realtime**: assumido `ALTER PUBLICATION supabase_realtime ADD TABLE notifications` já executado por você.
- **Datas relativas**: `date-fns/formatDistanceToNow` com `locale: ptBR, addSuffix: true`.
- **Acessibilidade**: DatePicker do Calendar shadcn com `pointer-events-auto` (regra do projeto).
- **Sem alterar** schema, `types.ts`, `client.ts`, `KanbanBoard.tsx`, lógica do `useFiscalTasks` existente, nem o `NotificationContext` legado.

---

### Resumo de arquivos
**Criar (7):** `useNotifications.ts`, `NotificationBellDropdown.tsx`, `useCollaboratorCoverage.ts`, `CoverageCreateModal.tsx`, `FiscalCollaborators.tsx`, `BulkReassignModal.tsx`, (opcional) tipos locais em hooks.

**Editar (4):** `AppHeader.tsx`, `App.tsx`, `AppSidebar.tsx`, `FiscalTasks.tsx`, `TaskListView.tsx`.
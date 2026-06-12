
## Plano — Triggers automáticos de notificações no módulo Fiscal

Aproveita a tabela `notifications` e o hook `useNotifications` (já existentes). Sem migrations, sem alteração de RLS.

### Novo arquivo: `src/lib/fiscal-notifications.ts`
Helpers reutilizáveis que inserem linhas em `public.notifications`:

- `notifyTaskCompleted({ task, contactName, completedByProfileId, completedByName, companyId })`
  - Query: `profiles` onde `company_id = companyId AND role = 'admin' AND user_id IS NOT NULL`.
  - Filtra `profile.id !== completedByProfileId` (não notifica quem concluiu).
  - Insert em lote: `type='task_completed'`, `title='Tarefa concluída'`, `body='${task.title} — ${contactName} foi concluída por ${completedByName}'`, `reference_type='fiscal_task'`, `reference_id=task.id`, `action_url='/fiscal/tarefas'`, `company_id`, `user_id` = `profile.user_id`.

- `notifyTaskAssigned({ task, contactName, newResponsibleProfileId, companyId })`
  - Lookup `user_id` do profile destino. Se igual ao usuário autenticado, ignora (evita notificar a si mesmo).
  - Insert: `type='task_assigned'`, `title='Nova tarefa atribuída'`, `body='${task.title} — ${contactName} foi atribuída a você'`, `reference_type='fiscal_task'`, `reference_id=task.id`, `action_url='/fiscal/tarefas'`.

- `notifyCalendarLaunched({ companyId, year, month, taskIds })`
  - Carrega `fiscal_tasks` por `taskIds` (id, responsible_id, title).
  - Agrupa por `responsible_id` (ignora nulos).
  - Lookup `profiles` para obter `user_id`.
  - Insert um registro por colaborador com `type='calendar_generated'`, `title='Calendário fiscal lançado'`, `body='Você recebeu ${count} novas tarefas para ${MM/YYYY}'`, `action_url='/fiscal/tarefas'`.

Todos os inserts: try/catch silencioso (falha não bloqueia a ação principal — apenas `console.warn`).

### `src/hooks/useFiscalTasks.ts` — gatilhos no `updateTask`
- Em `onMutate`, capturar `prevTask` do cache antes do otimismo (já temos `snapshots`; basta achar o item pelo id).
- Em `onSuccess` (novo callback ao lado de `onSettled`), comparar `prevTask` × `data`:
  - Se `prev.status !== 'concluido' && next.status === 'concluido'` → buscar `contact.name` (uma query rápida) e `currentProfile.full_name` → chamar `notifyTaskCompleted`. Usar `companyId` do hook.
  - Se `prev.responsible_id !== next.responsible_id && next.responsible_id` → buscar `contact.name` → `notifyTaskAssigned`.

Passar `companyId` e o profile atual (já disponível no hook).

### `src/pages/FiscalTasks.tsx` — quick e bulk reassign
Substituir os dois updates diretos (linhas 336 e 368) por loops usando `updateTask.mutateAsync({ id, responsible_id: newId })` para que os triggers acima se apliquem. Mantém os toasts atuais. Para bulk, um `Promise.all` pelos ids.

### `src/hooks/useFiscalCalendar.ts` — `useConfirmMonthlyTasks`
Após salvar `launchMeta` e antes do return, chamar `notifyCalendarLaunched({ companyId, year, month, taskIds })`. Erro silencioso.

### Sidebar — badge de Notificações (`src/components/layout/AppSidebar.tsx`)
- Adicionar item dentro do módulo `fiscal` (após "Calendário Fiscal", admin-only — o filtro já existe na linha 281): `{ title: 'Notificações', url: '/fiscal/notificacoes', icon: Bell }`.
- Importar `useNotifications` e exibir um `Badge` numérico ao lado do label quando `unreadCount > 0` (oculto quando colapsado, ou usar dot mini).
- O badge usa as classes do design system (variante `destructive` discreta, `text-[10px]`).

### O que NÃO muda
- Schema, RLS, edge functions, `useNotifications` hook, NotificationBell.
- Rotas, permissões, tipos do FiscalTask.
- Comportamento de toasts existentes.

### Riscos
- Quick/bulk reassign passam a usar o mutation otimista — o snapshot já cobre rollback; toasts duplicados evitados desativando o toast genérico do `updateTask` por `meta: { silent: true }` se necessário (avalio durante implementação; se gerar ruído, mantenho a chamada direta e adiciono o trigger inline).

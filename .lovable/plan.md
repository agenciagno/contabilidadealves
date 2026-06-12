# Transferência Temporária de Clientes Fiscais

## Pré-requisito: tabela `collaborator_coverage`

Confirmei via `information_schema` que a tabela **não existe** neste projeto Supabase (nem `transfer_log`). Como você pediu para não criar tabelas, mas a feature inteira depende dela, vou criá-la como **passo 0 obrigatório** com exatamente o schema que você descreveu — nada além. Se preferir criar manualmente antes, me avise e pulo o passo 0.

### Passo 0 — Migration única

`collaborator_coverage`:
- `id` uuid PK, `company_id` uuid (FK companies), `absent_profile_id` uuid (FK profiles), `covering_profile_id` uuid (FK profiles)
- `start_date` date, `end_date` date
- `reason` text default `'ferias'`, `notes` text
- `is_active` boolean default true, `tasks_transferred` int default 0
- `clients_transferred` jsonb default `'[]'` — array de contact_ids
- `auto_reverted_at` timestamptz, `reverted_by` uuid (FK profiles), `revert_reason` text
- `created_by` uuid, `created_at`/`updated_at` timestamptz
- GRANTs para `authenticated` e `service_role`
- RLS: SELECT/INSERT/UPDATE quando `company_id = get_user_company_id(auth.uid())`
- Trigger `updated_at`

## Passo 1 — Edge function `auto-revert-coverages` + cron diário

Edge function que:
1. Busca `collaborator_coverage` WHERE `is_active = true AND end_date <= current_date`
2. Para cada uma:
   - `UPDATE fiscal_tasks SET responsible_id = absent_profile_id` WHERE `responsible_id = covering_profile_id AND contact_id = ANY(clients_transferred) AND status IN ('a_fazer','em_progresso','aguardando_cliente')`
   - `UPDATE collaborator_coverage SET is_active=false, auto_reverted_at=now()`
   - INSERT 2 notificações (`type='transfer_end'`) — uma para cada profile envolvido com `company_id` correto
3. Retorna resumo

Cron via `pg_cron` + `pg_net`, agendado 1×/dia às 03:00 BRT. Usa o anon key (já disponível).

## Passo 2 — Novos componentes frontend

### `src/components/fiscal/TransferTemporaryModal.tsx`
Modal multi-step com `Tabs` interno controlado por estado (`step: 1|2|3`), rodapé com "Voltar" / "Próximo" / "Confirmar". Padrão visual igual aos modais fiscais existentes (`max-w-2xl max-h-[90vh] overflow-y-auto`).

**Step 1 — Configuração** (`Select` shadcn + `Popover`+`Calendar` para datepicker com `pointer-events-auto`):
- Colaborador ausente → `useCollaborators()` (já filtra com clientes ativos)
- Colaborador substituto → `useAllFiscalProfiles()` filtrado != ausente
- Motivo: `ferias | licenca_medica | afastamento | redistribuicao | outro` (label PT-BR). Se `outro`, mostrar `Input` "Descreva o motivo"
- `start_date` (default hoje), `end_date` (obrigatória, > start_date)
- `notes` textarea opcional
- Validação inline antes de habilitar "Próximo"

**Step 2 — Seleção de clientes**:
- Query nova `useAbsentProfileClients(absent_profile_id)`: busca `contacts` distinct via `fiscal_tasks` WHERE `responsible_id = absent_profile_id AND status != 'concluido'`, join `contacts(id, name, tax_regime)` + COUNT de obrigações ativas por cliente
- `Input` de busca por nome (filtro client-side)
- Checkbox "Selecionar todos" no topo
- Linha por cliente: nome em negrito, `Badge` outline com `tax_regime`, contagem de obrigações ativas como `text-xs text-muted-foreground`
- Estado vazio: "Este colaborador não possui clientes ativos."

**Step 3 — Confirmação**:
- Card resumo: "Transferir **X clientes** de **[nome]** para **[nome]**"
- Linhas com `Motivo: …`, `Período: dd/MM/yyyy → dd/MM/yyyy`
- Texto descritivo: "As tarefas pendentes e em andamento serão reassignadas automaticamente."
- `Alert` amarelo (`border-yellow-500/30 bg-yellow-500/10`): "Na data de expiração, os clientes e tarefas voltarão automaticamente para **[nome]**."
- Botão "Confirmar Transferência" no rodapé

**Submit** (transação client-side):
1. INSERT em `collaborator_coverage` com `clients_transferred` = array de contact_ids selecionados, `tasks_transferred` = count, `is_active=true`, `created_by`=profile atual
2. UPDATE `fiscal_tasks` SET `responsible_id = covering_profile_id` WHERE filtros descritos
3. INSERT 2 linhas em `notifications` (`type='transfer_start'`, ambos `company_id` e `reference_type='coverage'`, `reference_id`=coverage.id)
4. Invalida queries: `coverages`, `collaborators-with-clients`, `client-count-by-profile`, `fiscal-tasks`, `fiscal-dashboard`, `contacts`, `temporary-transfers-by-contact`

### `src/components/fiscal/TransferHistoryPanel.tsx`
Substitui `TransferHistory`. Lista todas as `collaborator_coverage` da empresa via novo hook `useTransferHistory()`:
- Ordenação: `is_active DESC, created_at DESC`
- Card por linha (mesmo estilo do Card de colaborador, `border-border/50 bg-card`):
  - Header: nome (De → Para) com seta `ArrowRightLeft`
  - Badge de status:
    - `is_active=true`: green com `animate-pulse` "Ativa"
    - `is_active=false AND auto_reverted_at IS NOT NULL AND revert_reason IS NULL`: gray "Expirada"
    - `is_active=false AND revert_reason IS NOT NULL`: amber "Revertida manualmente"
  - Linhas meta: motivo (PT-BR), período, X clientes
  - Se ativa: countdown "Expira em N dias" (calculado de `end_date`) + botão outline `Reverter agora`
  - Se revertida manualmente: "Revertida em DD/MM por [nome] — Motivo: [revert_reason]"
  - Se expirada automaticamente: "Revertida automaticamente em DD/MM"

### `RevertCoverageDialog` (interno ao painel)
`AlertDialog` com `Textarea` "Motivo da reversão antecipada" obrigatório. Ao confirmar:
1. UPDATE `collaborator_coverage` SET `is_active=false, reverted_by=profile_atual, revert_reason=motivo, auto_reverted_at=now()` (sim, esse campo carrega "quando voltou", independente de manual/auto)
2. UPDATE `fiscal_tasks` reverso (responsible_id ← absent_profile_id) com os mesmos filtros de status
3. 2 notificações `type='transfer_end'`
4. Invalida mesmas queries

## Passo 3 — Hook `useTemporaryTransfers`

Novo arquivo `src/hooks/useTemporaryTransfers.ts` (não toco em `useCollaboratorCoverage.ts` para não quebrar nada):
- `useTransferHistory()` — lista por `company_id` com joins em `profiles` (absent/covering/reverted_by)
- `useAbsentProfileClients(profileId)` — busca distinct contacts via fiscal_tasks
- `useCreateTemporaryTransfer()` — mutation com os 4 passos do submit
- `useRevertTransfer()` — mutation da reversão manual
- `useActiveCoverageByContact()` — retorna `Record<contact_id, { end_date, covering_profile_id, absent_profile_id }>` para os clientes em coverage ativa (alimenta o badge "Temporário")

## Passo 4 — Badge "Temporário" nos cards e Kanban

- `FiscalCollaborators.tsx`: ao listar clientes (se em algum lugar), olhar `useActiveCoverageByContact` e renderizar `Badge` purple `bg-purple-500/15 text-purple-600 border-purple-500/30` com "Temporário até dd/MM"
- `TaskCard.tsx`: ao lado de `contactName` (linha 68), se `task.contact_id` está em `activeCoverageByContact`, mostrar o mesmo badge. Hook chamado uma vez por board e passado via context ou prop drilling no `KanbanBoard`.
  - Para evitar N hooks, exponho `useActiveCoverageByContact` no nível do `KanbanBoard`/`TaskListView` e passo o map para o `TaskCard` via prop opcional `temporaryCoverage?: { endDate: string } | null`.

## Passo 5 — Reescrever `FiscalCollaborators.tsx`

- Remover imports e uso de `TransferClientsModal` e `TransferHistory`
- Trocar botão "Transferir Clientes" para abrir `TransferTemporaryModal`
- Em cada card de colaborador, adicionar indicadores baseados no histórico ativo:
  - Se `covering_profile_id == c.id` em alguma ativa: `Badge` info "Cobrindo X clientes de [nome] até dd/MM"
  - Se `absent_profile_id == c.id` em alguma ativa: `Badge` amber "Ausente — X clientes com [nome] até dd/MM"
- Abaixo dos cards: seção `<h2>Transferências</h2>` + `<TransferHistoryPanel />`

## Passo 6 — Limpeza

- `TransferClientsModal.tsx` e `TransferHistory.tsx`: deletados (substituição completa, conforme escolha).
- `useCollaboratorCoverage.ts`: mantenho funções genuinamente reutilizáveis (`useCollaborators`, `useAllFiscalProfiles`, `useClientCountByProfile`, `useCollaboratorDetails`). Removo apenas `useCoverages`/`usePendingTasksByProfile` se ficarem órfãos — checo usos antes.

## Arquivos afetados

```text
+ supabase/migrations/<ts>_collaborator_coverage.sql              (passo 0)
+ supabase/functions/auto-revert-coverages/index.ts               (passo 1)
+ supabase/migrations/<ts>_schedule_auto_revert.sql               (cron — via insert tool, não migration)
+ src/components/fiscal/TransferTemporaryModal.tsx                (passo 2)
+ src/components/fiscal/TransferHistoryPanel.tsx                  (passo 2)
+ src/hooks/useTemporaryTransfers.ts                              (passo 3)
M src/components/fiscal/TaskCard.tsx                              (badge — prop opcional)
M src/components/fiscal/KanbanBoard.tsx                           (passar coverage map)
M src/components/fiscal/TaskListView.tsx                          (idem)
M src/pages/FiscalCollaborators.tsx                               (passo 5)
- src/components/fiscal/TransferClientsModal.tsx                  (deletado)
- src/components/fiscal/TransferHistory.tsx                       (deletado)
M src/hooks/useCollaboratorCoverage.ts                            (limpeza condicional)
```

## O que NÃO mexo

Rotas, auth, RBAC (`ModuleGuard requireAdmin` continua o mesmo na página), tabelas existentes (`fiscal_tasks`, `contacts`, `notifications`, `profiles`), nem qualquer outro componente fiscal.

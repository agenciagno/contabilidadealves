
## Correção 1 — Colaboradores apenas com clientes atribuídos

Criar um hook compartilhado `useCollaboratorsWithClients()` em `src/hooks/useCollaboratorCoverage.ts` (ou novo arquivo) que retorna apenas profiles cujo `id` aparece em `contacts.responsible_id` com `is_active = true`.

Implementação:
1. Buscar `distinct responsible_id` de `contacts` (where `is_active = true` and `responsible_id is not null` and `company_id = X`).
2. Buscar `profiles` `.in('id', distinctIds)` com `status_active = true`.
3. Se a lista de IDs for vazia, retornar `[]` sem chamar o segundo query.

Aplicar em:
- **`useCollaborators()`** (`src/hooks/useCollaboratorCoverage.ts`) — trocar implementação para usar o novo filtro. Reflete automaticamente em `FiscalCollaborators` (cards e modal) e em qualquer consumidor.
- **`useFiscalCollaborators()`** (`src/hooks/useFiscalDashboard.ts`) — mesma lógica para gráfico "Tarefas por Colaborador" e cards "Progresso por Colaborador".
- **`FiscalTasks.tsx`** — substituir a query `company-profiles-fiscal` pelo novo hook, alimentando o dropdown "Responsável" e o `BulkReassignModal`.

Observação: o filtro `or(role.in.(...),allowed_modules.cs.{fiscal})` deixa de ser usado nesses pontos — o critério passa a ser "ter cliente atribuído".

---

## Correção 2 — "Nova Cobertura" → "Transferir Clientes"

### `src/pages/FiscalCollaborators.tsx`
- Renomear botão para **"Transferir Clientes"** (manter ícone Plus ou trocar por `ArrowRightLeft`).
- Remover toda a seção `<section>` "Coberturas Programadas / Ativas" (tabela + uso de `useCoverages`, `endCoverage`, `REASON_LABELS`, `coverageStatus`, `statusByProfile`). Manter `useCoverages` removido do import.
- Substituir `<CoverageCreateModal>` por novo `<TransferClientsModal>`.
- Após confirmar, invalidar queries: `['collaborators']`, `['pending-tasks-by-profile']`, `['fiscal-tasks']`, `['fiscal-dashboard']`, `['contacts']`.
- Os badges "Em férias"/"Cobrindo X" deixam de existir (sem coverages na UI) — todos os cards exibem "Ativo".

### Novo `src/components/fiscal/TransferClientsModal.tsx`
Campos:
- **De:** Select de colaboradores com `responsible_id` atribuído em `contacts` (usar `useCollaboratorsWithClients`).
- **Para:** Select de colaboradores ativos (usar a mesma fonte, ou todos ativos com módulo fiscal — confirmar abaixo), excluindo o "De:".
- Texto: `Todos os clientes e tarefas pendentes de {nomeDe} serão transferidos para {nomePara}.`
- Botões: **Confirmar Transferência** (primário) + **Cancelar**.

Ação ao confirmar (sequencial):
1. `UPDATE contacts SET responsible_id = para WHERE responsible_id = de AND is_active = true AND company_id = X`
2. `UPDATE fiscal_tasks SET responsible_id = para WHERE responsible_id = de AND status != 'concluido' AND company_id = X`

Toast: `✅ Clientes e tarefas transferidos de {de} para {para}.`
Invalidar queries listadas acima (efeito equivalente a recarregar a página).

### Manter intocado
- `CoverageCreateModal.tsx` e `useCoverages` permanecem no código (não removidos), apenas deixam de ser referenciados pela página.

---

## Correção 3 — KPIs do Dashboard

Em `src/pages/FiscalDashboard.tsx`, ajustar o cálculo de `kpis` e do `chartData` para usar os status reais (`a_fazer`, `em_progresso`, `aguardando_cliente`, `concluido`):

```ts
const isLate = (t) => t.status !== 'concluido' && t.due_date && t.due_date < today;
const atrasadas   = tasks.filter(isLate).length;
const pendentes   = tasks.filter(t => t.status === 'a_fazer' && (!t.due_date || t.due_date >= today)).length;
const emAndamento = tasks.filter(t => t.status === 'em_progresso').length;
const concluidas  = tasks.filter(t => t.status === 'concluido').length;
```

Mudanças visuais nos KPIs:
- Trocar o KPI **"Total de Tarefas"** por **"Em andamento"** (laranja) — assim ficam os 4 status pedidos: Pendentes / Em andamento / Atrasadas / Concluídas. **Confirmar abaixo** se prefere manter "Total" e exibir os 5.

No `chartData` (gráfico empilhado por colaborador), classificar cada tarefa em exatamente um bucket usando a mesma regra (late tem prioridade; senão segue o status), adicionando série "Em andamento".

`StatusBadge` da tabela "Próximos Vencimentos" passa a reconhecer os status reais (`a_fazer`, `em_progresso`, `aguardando_cliente`) em vez de `pendente`/`em_andamento`.

---

## Perguntas antes de aplicar

1. **Correção 1 — escopo do "Para:"**: o select destino deve listar **(a)** apenas colaboradores que já têm clientes atribuídos, ou **(b)** todos os colaboradores ativos com módulo fiscal (permitindo transferir para alguém que ainda não tem clientes)? O enunciado diz "todos os colaboradores ativos", então tendo a usar (b) — confirmar.
2. **Correção 3 — KPI "Total"**: remover o card "Total de Tarefas" para dar lugar a "Em andamento", ou manter os 5 cards lado a lado?

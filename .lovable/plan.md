

## Plano: Sistema de Lixeira (Soft Delete) para Transações

### 1. Migration — Coluna `deleted_at` + Cron de limpeza

**SQL:**
```sql
ALTER TABLE transactions ADD COLUMN deleted_at timestamptz DEFAULT NULL;
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at) WHERE deleted_at IS NOT NULL;
```

**Cron automático (30 dias)** — via `pg_cron` + `pg_net`, executado como INSERT no cron.schedule (não migration):
```sql
SELECT cron.schedule('purge-trash-30d', '0 3 * * *', $$
  DELETE FROM transactions WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
$$);
```

**Atualizar trigger `update_bank_balance`**: já usa `is_paid = true`, então soft-deleted records que são `is_paid=true` ainda afetariam o saldo. Precisamos adicionar `AND deleted_at IS NULL` nas subqueries do trigger.

### 2. Soft Delete — Mudar `deleteTransaction` em `useTransactions.ts`

Trocar o `DELETE` real por `UPDATE ... SET deleted_at = now()`:
```typescript
// Antes: .delete().eq('id', id)
// Depois: .update({ deleted_at: new Date().toISOString() }).eq('id', id)
```

Log continua registrando como "EXCLUSAO" (movido para lixeira).

### 3. Ocultação Global — Adicionar `.is('deleted_at', null)` em TODAS as queries

**8 arquivos** que fazem `from('transactions')`:

| Arquivo | Queries afetadas |
|---|---|
| `useTransactions.ts` | Query principal (linha 59), togglePaid selects, bulkTogglePaid select |
| `useServerTransactions.ts` | `applyFilters` (adicionar no início), KPI query |
| `useBankTransactions.ts` | Prior query + Period query |
| `useContactTransactions.ts` | Query por contactId |
| `useReportData.ts` | Query de relatórios |
| `useCashFlowForecast.ts` | Query de pendentes |
| `NotificationContext.tsx` | Query de inadimplentes |
| `useContactDependencies.ts` | Count de transações |

**Abordagem centralizada**: Em `applyFilters` do `useServerTransactions.ts`, adicionar `query = query.is('deleted_at', null)` como primeiro filtro. Para os demais hooks, adicionar `.is('deleted_at', null)` individualmente em cada query.

### 4. Interface da Lixeira — Nova aba em Configurações

**Novo componente: `src/components/settings/TrashTab.tsx`**

- Tabela listando transações onde `deleted_at IS NOT NULL`
- Colunas: Descrição, Tipo, Valor, Data Vencimento, Excluído em (deleted_at formatado), Ações
- **Filtros no topo**: campo de busca (description/contact name) + filtro de período (por deleted_at)
- **Botão Restaurar**: `UPDATE deleted_at = null` → invalida queries
- **Botão Excluir Permanentemente**: `DELETE` real com confirmação AlertDialog
- Aviso visual: "Itens são excluídos permanentemente após 30 dias"

**Novo hook: `src/hooks/useTrash.ts`**
- Query: `from('transactions').select(...).not('deleted_at', 'is', null).order('deleted_at', desc)`
- Mutations: `restoreTransaction` (set deleted_at=null), `permanentDelete` (real DELETE)

**Integrar em `SettingsPage.tsx`**: Adicionar aba "Lixeira" com ícone Trash2, entre "Logs Globais" e as demais.

### 5. Atualizar tipo TypeScript

Adicionar `deleted_at` ao interface `Transaction` em `useTransactions.ts`:
```typescript
deleted_at?: string | null;
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | ADD COLUMN `deleted_at`, index |
| **pg_cron SQL** (insert tool) | Schedule purge every day at 3am |
| **Trigger `update_bank_balance`** | Adicionar `AND deleted_at IS NULL` |
| `src/hooks/useTransactions.ts` | Soft delete, tipo Transaction, filtro `.is('deleted_at', null)` |
| `src/hooks/useServerTransactions.ts` | Filtro em applyFilters + KPI |
| `src/hooks/useBankTransactions.ts` | Filtro em ambas queries |
| `src/hooks/useContactTransactions.ts` | Filtro |
| `src/hooks/useReportData.ts` | Filtro |
| `src/hooks/useCashFlowForecast.ts` | Filtro |
| `src/contexts/NotificationContext.tsx` | Filtro |
| `src/hooks/useContactDependencies.ts` | Filtro |
| `src/hooks/useTrash.ts` | **Novo** — hook para lixeira |
| `src/components/settings/TrashTab.tsx` | **Novo** — UI da lixeira |
| `src/pages/SettingsPage.tsx` | Adicionar aba Lixeira |


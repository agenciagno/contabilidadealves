

## Correção de 2 Bugs

### Bug 1: Cache não atualiza após liquidar transação

**Causa raiz**: `updateTransaction.onSuccess` e `togglePaid.onSuccess` em `useTransactions.ts` invalidam apenas `['transactions']`, mas a tabela de Movimentações usa `['server-transactions']` e `['transaction-kpis']`. O extrato bancário usa `['bank-transactions-prior']` e `['bank-transactions-period']`.

**Solução em `src/hooks/useTransactions.ts`**: Adicionar invalidação das query keys faltantes nos callbacks `onSuccess` de `updateTransaction`, `togglePaid`, `bulkTogglePaid`, `deleteTransaction` e `createTransaction`:
- `queryClient.invalidateQueries({ queryKey: ['server-transactions'] })`
- `queryClient.invalidateQueries({ queryKey: ['transaction-kpis'] })`
- `queryClient.invalidateQueries({ queryKey: ['bank-transactions-prior'] })`
- `queryClient.invalidateQueries({ queryKey: ['bank-transactions-period'] })`

### Bug 2: Extrato bancário pode incluir transações não efetivamente pagas

**Causa raiz**: O hook `useBankTransactions.ts` filtra `is_paid: true` mas não verifica `paid_amount IS NOT NULL` (regra de `isEffectivelyPaid`). Transações marcadas como pagas mas sem `paid_amount` passam pelo filtro.

**Solução em `src/hooks/useBankTransactions.ts`**: Nas duas queries (prior e period), adicionar `.not('paid_amount', 'is', null)` após o `.eq('is_paid', true)` para garantir que apenas transações efetivamente liquidadas apareçam. O filtro por `date` (Data de Pagamento) já está correto.

### Arquivos alterados
- `src/hooks/useTransactions.ts` — invalidação de cache
- `src/hooks/useBankTransactions.ts` — filtro `paid_amount IS NOT NULL`




## Plano: Corrigir divergência de saldo na Conta Corrente

### Causa raiz

O hook `useBankTransactions.ts` aplica `.not('paid_amount', 'is', null)` nas queries, excluindo transações que são `is_paid = true` mas têm `paid_amount = null`. Porém, a trigger do banco (`update_bank_balance`) usa `COALESCE(paid_amount, amount)`, incluindo essas mesmas transações no cálculo do `current_balance` dos cards.

Resultado: os cards mostram um saldo, os relatórios mostram outro.

### Correção

**Arquivo**: `src/hooks/useBankTransactions.ts`

Remover `.not('paid_amount', 'is', null)` das duas queries (linhas 59 e 87). O código JS já faz o fallback correto com `t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount)`, alinhando-se à lógica `COALESCE` da trigger.

Isso garante que **somente transações liquidadas** (`is_paid = true`) apareçam, mas sem excluir indevidamente as que têm `paid_amount` nulo (usando `amount` como fallback).

### Impacto

Todos os componentes que usam `useBankTransactions` serão corrigidos automaticamente:
- `BankDetailSheet` (extrato individual)
- `UnifiedStatementAccordion` (extrato unificado)
- `BankReportModal` (relatórios PDF/XLS/CSV/OFX)

| Arquivo | Mudança |
|---|---|
| `src/hooks/useBankTransactions.ts` | Remover `.not('paid_amount', 'is', null)` das queries prior (linha 59) e period (linha 87) |


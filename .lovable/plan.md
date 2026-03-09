

## Plano: Usar paid_amount no Extrato Bancário

### Problema
O hook `useBankTransactions.ts` já filtra corretamente apenas transações pagas (`is_paid: true`), mas usa o campo `amount` (valor original) em vez de `paid_amount` (valor efetivamente pago/recebido). Conforme a regra de negócio, transações pagas devem usar exclusivamente o `paid_amount`.

### Alteração

**Arquivo: `src/hooks/useBankTransactions.ts`**

1. **Query 1 (prior)**: Adicionar `paid_amount` ao select e usar `paid_amount ?? amount` no cálculo do `priorBalance`.

2. **Query 2 (period)**: Adicionar `paid_amount` ao select e usar `paid_amount ?? amount` ao construir as rows e calcular `signed_amount`, `running_balance`, `totalIncome` e `totalExpense`.

A lógica: `const effectiveAmount = t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);`

### Impacto
- Extrato por banco (BankDetailSheet) — corrigido automaticamente
- Extrato unificado (UnifiedStatementAccordion) — corrigido automaticamente
- Relatório/exportações PDF/XLS/CSV/OFX (BankReportModal) — corrigido automaticamente

Todos consomem o mesmo hook, então a correção é centralizada.


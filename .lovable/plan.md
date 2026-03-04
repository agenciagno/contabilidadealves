

## Plano: Remover Toggle "Recebido/Pago" e derivar is_paid automaticamente de paid_amount

A logica e simples: `is_paid = paid_amount > 0`. O toggle manual sera removido do modal e da tabela.

---

### 1. Modal TransactionFormDialog.tsx

- **Remover** o state `isPaid` e o `Switch` toggle (linhas 62, 296-301).
- **Remover** import de `Switch`.
- No `handleSubmit`, derivar `is_paid` automaticamente: `is_paid: parseCurrencyInput(paidAmount) > 0`.
- Ao carregar transacao existente (useEffect linha 105), remover `setIsPaid`.

### 2. useTransactions.ts — togglePaid

- **Atualizar `togglePaid`** para que, ao marcar como pago, tambem copie `amount` para `paid_amount` (se `paid_amount` for null). Ao desmarcar, limpe `paid_amount` para null.
- Isso garante compatibilidade com o botao de status na tabela e no CashFlowTab.
- Ajustar: `togglePaid.mutate({ id, is_paid: true })` → internamente faz `update({ is_paid: true, paid_amount: COALESCE(paid_amount, amount) })`.
- Para `is_paid: false` → `update({ is_paid: false, paid_amount: null })`.

### 3. Tabela Transactions.tsx — Botao Status (linha 726-733)

- **Manter** o botao de status na tabela (Pago/Pendente) pois e util para alternar rapidamente.
- Ao clicar para marcar como pago, o togglePaid ja cuida de popular `paid_amount`.
- Ao clicar para desmarcar, limpa `paid_amount`.

### 4. CashFlowTab.tsx — Botao Status (linhas 382-441)

- Mesma logica: o togglePaid atualizado ja gerencia `paid_amount` junto com `is_paid`.
- O modal de confirmacao de honorarios com juros/multa tambem usa togglePaid — sem mudanca de interface, apenas o hook atualizado faz o trabalho.

### 5. bulkTogglePaid

- Atualizar para tambem gerenciar `paid_amount` em lote.

---

### Arquivos impactados

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/TransactionFormDialog.tsx` | Remover Switch, derivar is_paid de paid_amount |
| `src/hooks/useTransactions.ts` | togglePaid e bulkTogglePaid populam/limpam paid_amount |

Nenhuma migration necessaria — o trigger `update_bank_balance` ja usa `COALESCE(paid_amount, amount)` com `is_paid = true`.


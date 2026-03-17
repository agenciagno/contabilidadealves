

## Correção: Stale State no Campo "Valor Pago" para Transações Pendentes

### Diagnóstico

**Linha 109** em `TransactionFormDialog.tsx`:
```typescript
setPaidAmount(transaction.paid_amount != null ? formatCurrencyInput(...) : '');
```

Quando uma transação pendente tem um `paid_amount` residual no banco (ex: valor antigo que ficou salvo mesmo com `is_paid = false`), o campo é preenchido com esse valor. O usuário vê um "Valor Pago" fantasma em uma transação que é pendente.

### Correção (1 arquivo)

**`src/components/transactions/TransactionFormDialog.tsx`**

**Mudança 1 — Inicialização condicional (linha 109):**
Aplicar a regra estrita `isEffectivelyPaid` para decidir se exibe o `paid_amount`:

```typescript
import { isEffectivelyPaid } from '@/lib/financial-utils';

// linha 109 — dentro do useEffect que carrega a transaction:
const isPaid = isEffectivelyPaid(transaction);
setPaidAmount(isPaid && transaction.paid_amount != null
  ? formatCurrencyInput(String(Math.round(Number(transaction.paid_amount) * 100)))
  : '');
setDate(isPaid ? (transaction.date || '') : '');
```

Se a transação não é efetivamente paga (pendente), `paidAmount` e `date` são forçados para vazio, ignorando qualquer valor residual do banco.

**Mudança 2 — Reset completo ao fechar modal:**
Adicionar um `useEffect` que limpa todo o estado quando `open` muda para `false`:

```typescript
useEffect(() => {
  if (!open) {
    resetForm();
  }
}, [open]);
```

Isso garante que ao fechar o modal (cancelar ou após salvar), nenhum valor da transação anterior vaze para a próxima abertura.

### Resultado

- Transações pendentes: campo "Valor Pago" sempre vazio ao abrir para edição
- Transações pagas: campo preenchido normalmente com o valor do banco
- Troca de transação: estado completamente limpo entre aberturas




## Diagnóstico do Bug

**Causa raiz:** No modo **Editar** (não Liquidar), o campo "Valor Pago" é exibido com o valor carregado do banco (linha 109) e fica **desabilitado** (disabled, linha 385). O usuário não consegue limpar esse campo. Na hora do submit (linhas 265-273), o código calcula `derivedIsPaid = paidAmountValue > 0` — se o banco tinha qualquer `paid_amount` residual (mesmo com `is_paid = false`), essa variável será `true`, e a validação da linha 267 bloqueia o salvamento por falta de "Data de Pagamento".

O problema: **o modo Editar não deveria derivar `is_paid` nem validar liquidação.** Ele deve preservar o estado original de pagamento da transação.

## Correção

**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`

**Mudança na lógica de submit (linhas 264-294):** Quando `isEditing && !isSettleMode`:
- Preservar o `is_paid` original da transação (`transaction.is_paid`)
- Preservar o `paid_amount` e `date` originais da transação
- Não executar a validação de liquidação (`derivedIsPaid && !date`)
- Enviar apenas os campos estruturais editados (tipo, valor, datas de emissão/vencimento/prevista, categoria, banco, contato, notas)

```typescript
// Em modo edição (não liquidar), preservar estado de pagamento original
if (isEditing && !isSettleMode) {
  const payload = {
    type,
    description: autoDescription,
    amount: parseCurrencyInput(amount),
    paid_amount: transaction?.paid_amount ?? null,  // preservar original
    date: transaction?.date || undefined,            // preservar original
    issue_date: issueDate || null,
    due_date: dueDate || null,
    expected_date: expectedDate || null,
    category_id: categoryId || null,
    bank_id: bankId || null,
    contact_id: contactId || null,
    is_paid: transaction?.is_paid ?? false,          // preservar original
    notes: notes || null,
  } as TransactionInsert;
  checkYearAndSubmit(payload, pendingFiles, shouldClose);
  return;
}
```

A lógica existente de `derivedIsPaid` continua válida apenas para **novas transações** (modo À Vista).

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/TransactionFormDialog.tsx` | Separar lógica de submit para modo Editar: preservar is_paid/paid_amount/date originais, sem validação de liquidação |

Nenhuma migration necessária.




## Plano: Refatorar Regras de Negócio — Modais de Transação, DRE e Importação

### Análise do Estado Atual vs. Regras Solicitadas

| Regra | Estado Atual | Mudança Necessária |
|-------|-------------|-------------------|
| À Vista salva como Liquidado | Salva como pendente se paid_amount=0 | Tornar Valor Recebido, Conta/Banco e Pagamento **obrigatórios**; salvar com `is_paid: true` |
| À Prazo salva como Pendente | Já funciona assim | Nenhuma — apenas confirmar que campos de liquidação ficam ocultos |
| Liquidar exige 3 campos | Já valida paid_amount + bank_id + date | Nenhuma — regra já implementada na linha 348 |
| DRE Realizado usa paid_amount | Já usa `paid_amount ?? amount` (linha 159) | Nenhuma — já correto |
| Dashboard usa paid_amount | `isEffectivelyPaid` + `getEffectiveAmount` já fazem isso | Nenhuma — já correto |
| Import auto-classifica Liquidado | Usa coluna "Status" da planilha | Adicionar regra: se `Data Pagamento` preenchida → `is_paid: true` |

### Arquivos a Editar

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/components/transactions/TransactionFormDialog.tsx` | **À Vista**: tornar `paidAmount`, `bankId` e `date` obrigatórios (required + validação); ajustar labels com asterisco; salvar com `is_paid: true`. **Valor (R$)** passa a ser opcional (remover asterisco). Ajustar `isFormValid` para refletir as novas regras por condição de pagamento. |
| 2 | `src/components/transactions/ImportSpreadsheetDialog.tsx` | Na lógica de parsing (linha ~317): se `paymentDateStr` estiver preenchido, forçar `is_paid = true` e garantir `paid_amount` (fallback para `amount`). |

### Detalhes Técnicos

**1. TransactionFormDialog — À Vista (novo)**

Validação `isFormValid` para "À Vista" (nova transação):
```typescript
// À Vista: exige valor recebido, banco e data pagamento
const isAVistaValid = parseCurrencyInput(paidAmount) > 0 && !!bankId && !!date 
  && !!categoryId && !!contactId && !!issueDate;

// À Prazo: exige valor original e datas de projeção  
const isAPrazoValid = parseCurrencyInput(amount) > 0 && !!categoryId && !!contactId 
  && !!issueDate && !!dueDate && !!expectedDate;
```

No `handleSubmit` para "À Vista" (nova transação):
- `is_paid: true` (sempre)
- `paid_amount`: valor do campo Valor Recebido/Pago
- `amount`: se vazio, herda o valor do `paid_amount`
- `date`: obrigatório (data de pagamento)
- `bank_id`: obrigatório

Labels com asterisco: Valor Recebido/Pago *, Conta/Banco *, Pagamento *
Labels sem asterisco: Valor (R$) (opcional), Vencimento, Prevista

**2. ImportSpreadsheetDialog — Auto-classificação**

Linha ~317, após determinar `isPaid`:
```typescript
const hasPaymentDate = !!paymentDateStr;
const finalIsPaid = isPaid || hasPaymentDate;
```

Usar `finalIsPaid` no resto da lógica. Se `finalIsPaid` e `paid_amount` é null, fazer fallback para `amount`.

### Partes que NÃO serão alteradas

- `isEffectivelyPaid` e `getEffectiveAmount` — já corretos
- `useDREData` — Previsto já usa `amount` + `expected_date`, Realizado já usa `paid_amount` + `date`
- Dashboard — já usa `isEffectivelyPaid` para totais
- Saldos bancários — trigger `update_bank_balance` já usa `paid_amount` para transações pagas
- Modal de Liquidar — validação dos 3 campos já existe
- Modal de Edição — preserva estado original de pagamento

### Resumo
- 2 arquivos editados
- 0 migrations
- 0 alterações de schema
- Regras 3 e 4 já estão implementadas corretamente


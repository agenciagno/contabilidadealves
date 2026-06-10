# Correções de Lançamentos

## 1. Planilha modelo de importação — sem alteração

Após revisar `ImportSpreadsheetDialog.tsx`, o cabeçalho atual já contempla todos os campos exigidos pelas regras recentes (À Vista virou apenas visual; PREVISTO da DRE usa `expected_date` + `date` no mesmo mês — ambos já existem no modelo). **Nenhuma alteração na planilha modelo será feita.**

Cabeçalho atual (mantido):
`Data Emissão | Cliente/Fornecedor | Tipo (Receita ou Despesa) | Valor | Status (Pendente ou Pago) | Valor Pago/Recebido | Data Vencimento | Data Prevista | Data Pagamento | Conta Bancária | Evento Contábil | Histórico`

---

## 2. Evento Contábil "some" ao salvar (À Vista e À Prazo)

### Diagnóstico

Em `src/components/transactions/TransactionFormDialog.tsx` há um `useEffect` que zera `categoryId` e `contactId` sempre que o `type` (Receita/Despesa) muda em transações novas:

```ts
useEffect(() => {
  if (!transaction) { setCategoryId(''); setContactId(''); }
}, [type, transaction]);
```

Esse efeito também roda no **mount inicial** do dialog. Em certos fluxos de re-render do React (ex.: o `categories` prop sendo recomputado pelo pai logo após o usuário escolher o evento, ou um leve atraso no `setState` de `type` em relação a `defaultType`), o efeito dispara *depois* do usuário preencher o evento e zera o estado pouco antes do submit. Resultado: o `payload.category_id` vira `null`.

### Correção

Substituir o efeito por uma lógica não destrutiva: em vez de zerar cego, **só limpa** se o `categoryId`/`contactId` atualmente selecionado **não pertence mais** ao `type` atual (regra real — categorias são filtradas por tipo).

```ts
useEffect(() => {
  if (transaction) return;
  // Limpa categoria apenas se a selecionada não pertence ao tipo atual
  if (categoryId && !categories.some(c => c.id === categoryId && c.type === type)) {
    setCategoryId('');
  }
}, [type, transaction, categories, categoryId]);
```

Contatos não dependem de `type`, então o `setContactId('')` é removido desse efeito (contatos só são limpos no reset explícito do form).

Isso preserva o evento quando o usuário escolhe corretamente e ainda limpa quando ele troca a aba Receita↔Despesa e a categoria não é mais válida.

### Verificação
- Criar transação À Vista com evento selecionado → salvar → reabrir → evento deve estar lá.
- Criar À Prazo com evento → salvar → idem.
- Trocar aba Receita/Despesa após selecionar evento daquela aba antiga → evento limpa (correto).

---

## 3. Liquidação em massa — pedir Data de Pagamento única

### Diagnóstico

Em `useTransactions.ts → bulkTogglePaid`: hoje, para cada transação selecionada sem `date`, o sistema marca como "bloqueada" e pula. Se todas (ou quase todas) são À Prazo, só liquida as raras que já tinham `date`, dando a sensação de "uma por vez".

### Correção (UX nova)

Criar um pequeno modal `BulkSettleDialog` que:
1. Lista quantidade selecionada.
2. Pede **Data de Pagamento** única (default = hoje).
3. Ao confirmar, aplica em todas: `is_paid = true`, `date = <data informada>`, `paid_amount = paid_amount ?? amount`.

Fluxo:
- Em `Transactions.tsx`, o botão "Liquidar selecionadas" abre o `BulkSettleDialog` em vez de chamar `bulkTogglePaid` direto.
- O dialog chama uma nova mutation `bulkSettleWithDate({ ids, paymentDate })` em `useTransactions.ts` que:
  - Faz um único `UPDATE` filtrado por `.in('id', ids)` setando `is_paid=true`, `date=paymentDate`, e usa subquery/loop apenas para `paid_amount` (uma `select` antes, um `update` por chunk).
  - Invalida as queries normais (transactions, server-transactions, kpis, bank-transactions, banks, dre-previsto, dre-realizado).
- Mantém `bulkTogglePaid` para o caso de **desmarcar em massa** (is_paid=false), que continua funcionando como hoje.

### Verificação
- Selecionar 5 À Prazo, clicar Liquidar → modal pede data → confirma → todas 5 ficam pagas com a mesma data.
- Selecionar mistas (algumas já pagas, outras pendentes) → todas recebem a data informada (sobrescreve), is_paid=true.
- Desmarcar em massa continua funcionando (sem prompt).

---

## Arquivos afetados

- `src/components/transactions/TransactionFormDialog.tsx` — ajuste do `useEffect` de limpeza.
- `src/hooks/useTransactions.ts` — adicionar mutation `bulkSettleWithDate`.
- `src/components/transactions/BulkSettleDialog.tsx` — **novo** (modal com input de data).
- `src/pages/Transactions.tsx` — trocar `handleBulkPay` para abrir o `BulkSettleDialog`.

## Fora de escopo

- Planilha modelo: sem mudança (item 1).
- Nenhuma alteração em DRE, Conciliação, Fluxo de Caixa, banco de dados ou regras de cálculo.

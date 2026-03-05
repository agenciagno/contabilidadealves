

## Plano de Implementação — 2 Blocos

### BLOCO 1: Filtro "Cliente/Evento" com Busca e Multi-select

**Estado atual:** O filtro é um Popover com lista simples de botões, single-select por `contactId` ou `eventName`.

**Alterações em `src/pages/Transactions.tsx`:**

1. **Mudar tipo do estado** de `contactId?: string` para `contactIds?: string[]` no `ColumnFilters` interface.

2. **Substituir o Popover interno** por um componente com:
   - Campo `<Input>` de busca no topo (filtra a lista de contatos/eventos por digitação).
   - Lista de contatos com `<Checkbox>` ao lado de cada nome (multi-select).
   - Seção separada para "Eventos (sem contato)" com mesma lógica de checkboxes.
   - Botões "Limpar" e "Aplicar" no rodapé.
   - Tags/badges mostrando quantos itens selecionados no header da coluna.

3. **Atualizar lógica de filtragem:**
   ```typescript
   // De:
   if (cf.contactId) result = result.filter(t => t.contact_id === cf.contactId);
   // Para:
   if (cf.contactIds?.length) result = result.filter(t => cf.contactIds!.includes(t.contact_id!));
   ```
   Mesma lógica para `eventNames?: string[]` (array).

4. **Indicador visual:** Se 1+ itens selecionados, mostrar badge com contagem no ícone do filtro.

---

### BLOCO 2: Regra Estrita de Liquidação (is_paid)

**Regra:** `is_paid = true` somente se `date` (Data Pagamento) preenchido **E** `paid_amount` preenchido (>= 0).

**Alterações:**

**A) `src/hooks/useTransactions.ts` — `togglePaid` mutation (linha 189-218):**
- Ao marcar como pago (`is_paid: true`): buscar a transação, verificar se `date` existe. Se não, rejeitar com erro toast: _"Para liquidar, a Data de Pagamento e o Valor Recebido são obrigatórios."_
- Preencher `paid_amount` com `amount` se não existir (mantém comportamento atual).

**B) `src/hooks/useTransactions.ts` — `bulkTogglePaid` mutation (linha 220-252):**
- Para cada transação no bulk, verificar a mesma regra. Pular as que não atendem e notificar quantas foram ignoradas.

**C) `src/components/transactions/TransactionFormDialog.tsx` — `handleSubmit`:**
- Se `paidAmountValue > 0` (derivedIsPaid = true) mas `date` está vazio, bloquear salvamento e exibir toast de erro.
- Se `date` está preenchido mas `paidAmount` está vazio/zero, `is_paid` permanece `false`.

**D) `src/pages/Transactions.tsx` — KPIs e exibição:**
- No cálculo de KPIs e no status visual da tabela, aplicar a regra defensiva:
  ```typescript
  const isEffectivelyPaid = t.is_paid && !!t.date && t.paid_amount != null;
  ```
  Transações com `is_paid = true` no banco mas sem `date` ou `paid_amount` devem ser tratadas como "Pendente" na UI.

**E) `src/lib/financial-utils.ts` — `getEffectiveAmount`:**
- Atualizar para considerar a regra dupla:
  ```typescript
  export function isEffectivelyPaid(t: { is_paid: boolean; date: string | null; paid_amount: number | null }): boolean {
    return t.is_paid && !!t.date && t.paid_amount != null;
  }
  ```

**F) Trigger do banco de dados (update_bank_balance):** A trigger já usa `is_paid = true`, então desde que o frontend impeça `is_paid = true` sem as condições, o banco fica consistente.

**Arquivos impactados:**
- `src/pages/Transactions.tsx`
- `src/hooks/useTransactions.ts`
- `src/components/transactions/TransactionFormDialog.tsx`
- `src/lib/financial-utils.ts`


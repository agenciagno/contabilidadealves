

# Renomear e Adicionar Campos de Data nas Movimentações

## Resumo

Renomear "Data de Transação" para "Data Pagamento", adicionar "Data Emissão" (com default hoje) e "Data Prevista" (auto +2 dias úteis da Data Vencimento). Atualizar importação de planilha.

## Mudança no Banco de Dados

Adicionar coluna `expected_date` (date, nullable) à tabela `transactions` para armazenar a "Data Prevista".

```sql
ALTER TABLE transactions ADD COLUMN expected_date date;
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useTransactions.ts` | Adicionar `expected_date` nos tipos `Transaction` e `TransactionInsert` |
| `src/components/transactions/TransactionFormDialog.tsx` | Renomear label, adicionar campos `issueDate` e `expectedDate`, lógica de dias úteis |
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Atualizar headers do template e mapeamento para novos campos |

## Detalhes

### TransactionFormDialog.tsx

- **Label "Data da Transação" → "Data Pagamento"** (campo `date`)
- **Novo campo "Data Emissão"** (`issue_date`): default `new Date().toISOString().split('T')[0]`, editável
- **Novo campo "Data Prevista"** (`expected_date`): calculado automaticamente como `due_date + 2 dias úteis`, editável
- Layout: reorganizar a linha de datas em grid de 4 colunas (Data Emissão, Data Vencimento, Data Prevista, Data Pagamento), mover Anexo para linha separada ou manter compacto
- **Lógica de dias úteis**: função `addBusinessDays(date, days)` que pula sábados, domingos e feriados nacionais brasileiros fixos (Ano Novo, Tiradentes, Trabalho, Independência, N.S.Aparecida, Finados, Proclamação, Natal) + Carnaval e Corpus Christi calculados dinamicamente

### ImportSpreadsheetDialog.tsx

- Atualizar `TEMPLATE_HEADERS`: renomear "Data Pagamento" para manter, adicionar "Data Emissão" e "Data Prevista" como colunas
- Headers finais: `Data Emissão`, `Data Vencimento`, `Data Prevista`, `Data Pagamento`, `Cliente/Fornecedor`, `Tipo`, `Valor`, `Status`, `Conta Bancária`, `Evento Contábil`, `Histórico`
- Mapeamento: `Data Pagamento` → `date`, `Data Emissão` → `issue_date`, `Data Prevista` → `expected_date`, `Data Vencimento` → `due_date`
- Preview table: adicionar colunas Emissão e Prevista

### useTransactions.ts

- `Transaction`: adicionar `expected_date: string | null`
- `TransactionInsert`: adicionar `expected_date?: string | null`

## Seção Técnica

### Cálculo de Dias Úteis

```typescript
function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // weekend
  return !isBrazilianHoliday(date);
}

function addBusinessDays(from: Date, days: number): Date {
  let result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}
```

Feriados brasileiros fixos + Carnaval/Corpus Christi via cálculo da Páscoa (algoritmo de Meeus).


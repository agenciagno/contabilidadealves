

# Plano: Correções de Importação, Layout de Cards e Seleção em Massa

## Problemas Identificados

### 1. Datas erradas (emissão e vencimento off by 1 day)
A função `excelDateToString` converte serial Excel para `Date` em UTC, mas `format()` do date-fns usa timezone local (UTC-3 Brasil). Resultado: todas as datas ficam 1 dia antes. Correção: ajustar para meia-noite local.

### 2. Data de pagamento preenchida indevidamente
Linha 296: `date: paymentDateStr || new Date().toISOString().split('T')[0]` preenche a data de pagamento com "hoje" se vazia na planilha. A coluna `date` é NOT NULL no banco. Precisamos torná-la nullable via migration e omitir o campo quando vazio.

### 3. Contatos duplicados (10 vs 12)
Possível problema de whitespace/encoding (espaços extras, non-breaking spaces). Normalizar o nome do contato removendo espaços múltiplos antes da comparação.

### 4. Layout do card de transação
Reestruturar completamente a linha de transação na view "list".

### 5. Seleção em massa para pagar
Adicionar checkboxes e botão "Marcar como Pago".

## Alterações

| # | Arquivo | Mudança |
|---|---|---|
| 1 | Migration SQL | Tornar coluna `date` nullable (DROP NOT NULL, manter DEFAULT) |
| 2 | `ImportSpreadsheetDialog.tsx` | Fix `excelDateToString` timezone; omitir `date` quando vazio; normalizar nomes (trim + collapse espaços) |
| 3 | `Transactions.tsx` | Redesenhar card list view com novo layout de colunas; adicionar seleção múltipla com checkboxes e botão "Pagar Selecionados" |
| 4 | `useTransactions.ts` | Adicionar mutation `bulkTogglePaid` para marcar múltiplas transações como pagas |

## Detalhes Técnicos

### Migration
```sql
ALTER TABLE transactions ALTER COLUMN date DROP NOT NULL;
```

### Fix excelDateToString
```typescript
function excelDateToString(value: unknown): string | null {
  if (typeof value === 'number') {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    // Use UTC to avoid timezone shift
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // ... rest unchanged
}
```

### Import: omitir date quando vazio
```typescript
const txn: TransactionInsert = {
  // date omitido se paymentDateStr é null → DB usa DEFAULT ou NULL
  ...(paymentDateStr ? { date: paymentDateStr } : {}),
  issue_date: issueDateStr || null,
  // ...
};
```

### Normalização de nomes
```typescript
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
```

### Novo layout do card (list view)
```
| ☐ | Col1: Nome + Evento/Banco/Tipo | Vencimento | Prevista | Pagamento | Status | Valor | ✏️🗑️ |
```

### Seleção em massa
- State `selectedIds: Set<string>` no componente
- Checkbox "Selecionar todos" no header
- Checkbox individual por linha
- Barra de ação fixa quando há seleção: "Pagar X selecionados"
- Mutation `bulkTogglePaid` faz UPDATE em batch


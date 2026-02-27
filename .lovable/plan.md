

# Remover Obrigatoriedade do Campo "Data de Transação"

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/TransactionFormDialog.tsx` | Remover `required` e asterisco do campo de data; usar `date \|\| null` no submit |
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Permitir importacao de linhas sem "Data Prevista" (nao pular linha se data vazia) |
| `src/hooks/useTransactions.ts` | Tornar `date` opcional no tipo `TransactionInsert` |

## Mudancas no Banco de Dados

A coluna `transactions.date` tem `DEFAULT: CURRENT_DATE` e e `NOT NULL`. Duas opcoes:

1. **Manter NOT NULL com DEFAULT** (recomendado): o campo continua obrigatorio no banco, mas se o usuario nao preencher, o backend usa `CURRENT_DATE` automaticamente. Nenhuma migracao necessaria.
2. Tornar nullable: requer migracao SQL.

**Abordagem recomendada: opcao 1** — remover obrigatoriedade apenas no frontend, enviando `date` vazio como `undefined` e deixando o `DEFAULT CURRENT_DATE` do banco preencher automaticamente.

## Detalhes por Arquivo

### TransactionFormDialog.tsx
- Linha 316: remover `<span className="text-destructive">*</span>` do label "Data da Transação"
- Linha 322: remover atributo `required`
- Linha 133: mudar `date` para `date: date || undefined` (para o DEFAULT do banco atuar)

### ImportSpreadsheetDialog.tsx
- Linha 150: remover `!dateStr` da condicao de skip — se nao houver data, deixar `date` como `undefined`
- Linha 161: mudar para `date: dateStr || new Date().toISOString().split('T')[0]` (fallback para hoje)

### useTransactions.ts
- No tipo `TransactionInsert`, tornar `date` opcional: `date?: string`


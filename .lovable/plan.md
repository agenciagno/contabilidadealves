

## Plano: Edição em Lote de Transações

### Resumo

Adicionar um botão "Editar X selecionados" na barra de ações em lote existente (linha 924 de `Transactions.tsx`) que abre um modal com select dinâmico para alterar Cliente/Fornecedor, Evento Contábil ou Conta/Banco em todas as transações selecionadas de uma vez.

### 1. Novo componente: `src/components/transactions/BulkEditDialog.tsx`

- Dialog com título "Editar {count} transação(ões)"
- Select "Qual campo deseja alterar?" com opções: `contact_id` (Cliente/Fornecedor), `category_id` (Evento Contábil), `bank_id` (Conta/Banco)
- Renderização condicional do input correspondente:
  - **contact_id**: Select com busca listando `contacts` ativos
  - **category_id**: Select com busca listando `categories`
  - **bank_id**: Select listando `banks` ativos
- Botão "Salvar Alterações" executa update em lote no Supabase
- Props: `open`, `onOpenChange`, `selectedIds: string[]`, `contacts`, `categories`, `banks`, `onSuccess` (callback para limpar seleção)

### 2. Mutação Supabase (dentro do componente)

```typescript
const { error } = await supabase
  .from('transactions')
  .update({ [field]: newValue })
  .in('id', selectedIds);
```

Pós-sucesso: toast, fechar modal, `onSuccess()` (limpa seleção), invalidar queries `['transactions']`, `['server-transactions']`, `['transaction-kpis']`, `['banks']`.

### 3. Integração em `Transactions.tsx`

- Importar `BulkEditDialog`
- Estado `bulkEditOpen` (boolean)
- Botão "Editar {selectedIds.size}" na barra de ações existente (entre "Pagar" e "Excluir", linha ~926)
- Passar `contacts`, `categories`, `banks` e `selectedIds` como props

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/BulkEditDialog.tsx` | **Novo** — modal de edição em lote |
| `src/pages/Transactions.tsx` | Adicionar botão + estado + renderização do dialog |


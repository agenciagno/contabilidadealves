

## Plano: Alinhar planilha de importação com o estado atual do sistema

### Problema identificado

A planilha modelo e a lógica de processamento estão desatualizadas em relação ao sistema de categorias. O sistema separa Eventos Contábeis por tipo (`receita` / `despesa`), mas:

1. **Auto-criação de categorias** sempre usa `type: 'receita'` (hardcoded na linha 1181 de `Transactions.tsx`)
2. **Busca de categorias** ignora o `type` — uma categoria "Honorários" de despesa pode ser vinculada a uma receita
3. **Interface `Category`** no dialog só tem `id` e `name`, faltando `type`

A soberania de datas já está correta — campos vazios permanecem `null`.

### Mudanças

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `ImportSpreadsheetDialog.tsx` | Expandir interface `Category` para incluir `type` |
| 2 | `ImportSpreadsheetDialog.tsx` | Alterar `onCreateCategory` prop para aceitar `(name: string, type: 'receita' \| 'despesa')` |
| 3 | `ImportSpreadsheetDialog.tsx` | Na coleta de categorias únicas, agrupar por `(nome, tipo)` usando o tipo da linha |
| 4 | `ImportSpreadsheetDialog.tsx` | Alterar `findCategoryId` para receber e filtrar por `type` |
| 5 | `Transactions.tsx` | Atualizar callback `onCreateCategory` para usar o `type` recebido em vez de `'receita'` hardcoded |

### Detalhes técnicos

**Interface atualizada**:
```typescript
interface Category { id: string; name: string; type: 'receita' | 'despesa'; }
onCreateCategory?: (name: string, type: 'receita' | 'despesa') => Promise<{ id: string }>;
```

**Coleta de categorias únicas**: Em vez de `Set<string>`, usar `Map<string, 'receita' | 'despesa'>` com chave `nome::tipo` para diferenciar categorias com mesmo nome mas tipos diferentes.

**Busca**: `findCategoryId(name, type)` → `categories.find(c => c.name.toLowerCase() === lower && c.type === type)`

**Nenhuma alteração na planilha modelo** — as 12 colunas atuais já contêm a coluna "Tipo (Receita ou Despesa)" que fornece o tipo necessário para vincular à categoria correta.


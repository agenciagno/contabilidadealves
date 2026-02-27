

# Auto-criar Eventos Contábeis na Importação de Planilha

## Resumo

Durante o processamento da planilha, se um nome de "Evento Contábil" não existir no banco de dados, ele será criado automaticamente antes de associar o `category_id` à transação.

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Adicionar callback `onCreateCategory` nas props; durante `processFile`, coletar nomes únicos sem match, criar via callback, e usar os IDs retornados |
| `src/pages/Transactions.tsx` | Passar nova prop `onCreateCategory` ao `ImportSpreadsheetDialog` usando `createCategory` do `useCategories` |

## Detalhes

### ImportSpreadsheetDialog.tsx

1. Adicionar prop `onCreateCategory: (name: string) => Promise<{ id: string }>` na interface
2. No `processFile`, antes de montar as transações:
   - Coletar todos os nomes únicos da coluna "Evento Contábil" que não existem em `categories`
   - Para cada nome novo, chamar `onCreateCategory(name)` e armazenar o ID retornado
   - Manter um mapa local `newCategoriesMap: Map<string, string>` (nome lowercase → id)
3. No `findByName` para categoria, consultar primeiro a lista existente, depois o mapa de novos
4. Atualizar `categoryName` no preview para também consultar o mapa de novos

### Transactions.tsx

1. Passar prop `onCreateCategory` que chama `createCategory.mutateAsync({ name, type: 'receita', color: '#3B82F6', icon: 'tag' })` e retorna `{ id: data.id }`
2. Após importação, `invalidateQueries(['categories'])` já é chamado pelo `createCategory`

### Fluxo

```text
Planilha → Extrai nomes "Evento Contábil"
         → Filtra os que NÃO existem em categories[]
         → Cria cada um via onCreateCategory()
         → Usa IDs (existentes + novos) no category_id
         → Monta transações → Preview → Confirma
```

## Seção Técnica

A criação usa `type: 'receita'` como default (campo obrigatório na tabela `categories`). Os eventos criados herdam cor e ícone padrão (`#3B82F6`, `tag`). A invalidação do cache de categorias acontece automaticamente via `onSuccess` do `createCategory` mutation.


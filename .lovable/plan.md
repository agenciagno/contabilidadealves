

## Plano: Persistência de Estado no Salvar + Separação de Eventos Contábeis por Tipo

### 1. Persistência de Estado no Botão "Salvar" (`TransactionFormDialog.tsx`)

**Problema:** `resetForm()` (linha 138) reseta `type` para `defaultType` e `paymentCondition` para `'a_vista'`.

**Solução:** Alterar `resetForm()` para NÃO resetar `type` nem `paymentCondition`. Limpar apenas dados (amount, dates, category, bank, contact, notes, files). Também ajustar o `useEffect` do `resetKey` (linha 127) para não resetar esses dois campos quando `resetKey` muda sem `transaction`.

### 2. Separação de Eventos Contábeis por Tipo

**Migration:** A coluna `type` já existe na tabela `categories`. Criar migration que:
- Duplica cada registro existente: para cada categoria, criar uma cópia com `type = 'despesa'` (o original fica como `'receita'`).

**`CategoryFormDialog.tsx`:** Adicionar prop `defaultType` para pré-selecionar o tipo ao criar. Adicionar campo de seleção Receita/Despesa no formulário (tabs ou select).

**`Categories.tsx`:** Separar a lista em duas seções ou abas: "Eventos de Receita" e "Eventos de Despesa", cada uma com seu botão "Novo".

**`useCategories.ts`:** Sem alterações estruturais — já retorna `type` do banco.

### 3. Filtro Dinâmico no Modal de Lançamentos (`TransactionFormDialog.tsx`)

**Linha 87:** Trocar `const filteredCategories = categories;` por:
```typescript
const filteredCategories = categories.filter(c => c.type === type);
```

Também limpar `categoryId` quando `type` muda (já existe no useEffect linha 129-131).

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/TransactionFormDialog.tsx` | resetForm preserva type/paymentCondition; filteredCategories filtra por type |
| `src/components/categories/CategoryFormDialog.tsx` | Adicionar seletor de tipo (receita/despesa) |
| `src/pages/Categories.tsx` | Separar visualização em duas seções por tipo |
| Migration SQL | Duplicar categorias existentes com type='despesa' |


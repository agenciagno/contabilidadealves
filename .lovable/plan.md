

## Plano: Corrigir ordenação, ícones de sort e destaque de seleção

### 1. Ícones de ordenação sempre visíveis em todas as colunas de data

**Problema:** Os ícones `ChevronUp`/`ChevronDown` só aparecem na coluna ativa de ordenação. O usuário quer ver um ícone em todas as 4 colunas de data, sempre.

**Solução:** Mostrar em cada coluna de data um ícone padrão (`ArrowUpDown` do lucide-react) quando a coluna NÃO é a coluna ativa, e `ChevronUp`/`ChevronDown` quando é a coluna ativa. Isso dá feedback visual de que todas são clicáveis.

**Arquivo:** `src/pages/Transactions.tsx` (linhas 699-711)

Exemplo para cada header:
```tsx
<button onClick={() => handleSort('due_date')} className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors">
  Vencimento
  {sortField === 'due_date' 
    ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ArrowUpDown className="w-3 h-3 opacity-40" />}
</button>
```

Repetir para Emissão, Prevista e Pagamento.

Importar `ArrowUpDown` do lucide-react.

### 2. Corrigir ordenação

**Problema:** A ordenação compara strings vazias (`''`) quando o campo é `null`, o que mistura transações sem data no meio. Além disso, strings ISO se comparam corretamente com `localeCompare`, mas os nulls devem ir para o final.

**Solução:** Ajustar o sort para empurrar valores nulos/vazios para o final, independente da direção:

```typescript
result.sort((a, b) => {
  const dateA = a[sortField] || '';
  const dateB = b[sortField] || '';
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;  // nulos vão pro final
  if (!dateB) return -1;
  const cmp = dateA.localeCompare(dateB);
  return sortOrder === 'asc' ? cmp : -cmp;
});
```

**Arquivo:** `src/pages/Transactions.tsx` (linhas 177-181)

### 3. Melhorar visualização de linhas selecionadas

**Problema:** A linha selecionada tem apenas `bg-primary/5` que é quase imperceptível.

**Solução:** Aumentar o destaque visual com borda lateral e fundo mais forte:

```tsx
className={`... ${
  selectedIds.has(transaction.id) 
    ? 'bg-primary/10 border-l-2 border-l-primary' 
    : ''
}`}
```

**Arquivo:** `src/pages/Transactions.tsx` (linha 720)

---

### Resumo das alterações

| Arquivo | Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Importar `ArrowUpDown`; ícones sempre visíveis nos 4 headers de data; corrigir sort para nulls; melhorar estilo de seleção |


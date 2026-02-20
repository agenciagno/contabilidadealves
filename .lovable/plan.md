

# Unificar Colunas Receber/Pagar em "Valor"

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Substituir colunas "Receber" e "Pagar" por uma unica coluna "Valor" |

---

## Mudancas

### 1. Header da Tabela (linha ~186-187)

Remover as duas colunas:
```
<TableHead className="text-xs whitespace-nowrap text-right">Receber</TableHead>
<TableHead className="text-xs whitespace-nowrap text-right">Pagar</TableHead>
```

Substituir por uma unica:
```
<TableHead className="text-xs whitespace-nowrap text-right">Valor</TableHead>
```

### 2. Corpo da Tabela (linhas ~200-224)

Remover os dois `TableCell` separados (Receber e Pagar) e substituir por um unico `TableCell` que:

- Exibe o valor em **verde** (`text-emerald-500`) se `row.type === 'receita'`
- Exibe o valor em **vermelho** (`text-red-500`) se `row.type === 'despesa'`
- Mantem a logica de juros/multa (linha tachada + tooltip) para receitas com `hasJuros`

### 3. Ajuste do colSpan

Atualizar o `colSpan` da linha vazia de 10 para 9.


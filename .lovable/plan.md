

## Plano: Ajustes no PDF e Filtro de Tipo no Modal de Relatório

### 1. Centralizar colunas no PDF e remover traços

**Arquivo**: `src/components/transactions/CashFlowReportModal.tsx`

- Na função `exportPDF` (autoTable `columnStyles`), trocar `halign: 'right'` por `halign: 'center'` em todas as colunas (0-8). Adicionar `styles: { halign: 'center' }` global.
- Substituir todos os `'—'` por `''` (string vazia) no body do autoTable, XLS e CSV — linhas 228-234, 270-276, 310-318.

### 2. Adicionar filtro de Tipo no modal

- Novo estado: `const [typeFilter, setTypeFilter] = useState('all');`
- Inicializar no `useEffect` como `'all'` ao abrir.
- Adicionar Select com opções: "Todos", "A Receber" (`receita`), "A Pagar" (`despesa`).
- Posicionar na UI entre os filtros de Categoria/Contato e o Separator — como uma terceira coluna ou nova linha.
- Aplicar no `filteredRows` useMemo: `if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);`
- Adicionar label no cabeçalho do PDF: `Tipo: ${typeLabel}`.
- Atualizar `periodLabel`/preview para refletir o filtro de tipo.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/transactions/CashFlowReportModal.tsx` | Centralizar colunas PDF, remover traços, adicionar filtro de Tipo |


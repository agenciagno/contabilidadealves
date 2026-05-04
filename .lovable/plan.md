## Correção da tipografia dos Eventos Filho no PDF

### Arquivo: `src/components/transactions/CashFlowReportModal.tsx`

### Mudanças

1. **Remover espaços antes do `↳` no texto das células filhas** (linha ~855): trocar `"  ↳ ${c.name}"` por `"↳ ${c.name}"` — os espaços causam letter-spacing excessivo no jsPDF.

2. **Adicionar flag `isChild` no `rowMeta`** para identificar linhas filhas (linha ~856): `rowMeta.push({ isChild: true })`.

3. **Expandir `didDrawCell`** (linhas ~890-902) para também tratar linhas filhas:
   - Quando `isChild === true` e `column.index === 0`: renderizar o texto com `cellPadding` esquerdo aumentado (ex: `x + 6`) para criar a indentação visual sem usar espaços no texto.
   - Usar `doc.setFont('helvetica', 'normal')` e `doc.setTextColor(100, 100, 100)` para diferenciar visualmente dos macros (texto cinza, peso normal).
   - Manter os valores numéricos (colunas > 0) sem alteração de estilo.

4. **Aplicar mesma correção no XLS** (linha ~932): trocar `"  ↳ "` por `"&nbsp;&nbsp;&nbsp;↳ "` ou usar `padding-left` inline no `<td>` para manter indentação visual no Excel sem espaços extras.

Nenhuma lógica de dados, filtro ou cálculo será alterada — apenas a tipografia/layout das linhas filhas nos exports.

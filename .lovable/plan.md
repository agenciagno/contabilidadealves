## Objetivo

No modal de "Gerar Relatório" do **Pagar/Receber**, modo **Consulta Mensal**:

1. Permitir **selecionar vários Eventos Contábeis** ao mesmo tempo (em vez de apenas um ou "Todas").
2. Corrigir o PDF da Consulta Mensal para que **valores monetários (centavos) não quebrem para a linha de baixo**.

Arquivo único afetado: `src/components/transactions/CashFlowReportModal.tsx`.

---

## 1. Multi-seleção de Eventos Contábeis

### UI
- Substituir o `Select` simples (linha ~927) por um **dropdown com checkboxes** (Popover + Command/Checkbox, padrão já usado no projeto), exibindo:
  - Item "Todas as categorias" (atalho: marca/desmarca todas).
  - Lista de categorias com bolinha colorida + nome (mantém o visual atual).
- Trigger mostra: "Todas as categorias" quando vazio/todas, nome único quando 1, ou "N eventos selecionados" quando vários.
- Multi-seleção mantém o estado entre interações; mês/ano/status continuam funcionando igual.

### Estado
- Trocar `monthlyCategoryId: string` por `monthlySelectedCategories: Set<string>` (vazio = todas).

### Lógica de filtragem (linha 232)
- `if (monthlySelectedCategories.size > 0 && !monthlySelectedCategories.has(t.category_id)) return false;`

### Label exibida no PDF/XLS/CSV (`monthlyCategoryLabel`)
- Vazio/todas → "Todas"
- 1 selecionada → nome
- 2+ → "N eventos: Nome1, Nome2, …" (truncar se muito longo na linha do cabeçalho do PDF, com `splitTextToSize`).

Nada muda no modo "Relatório" padrão.

---

## 2. Correção dos centavos quebrando no PDF

Causa: no `exportMonthlyPDF` (linhas 636–643), quando há muitos meses selecionados, `monthW` fica pequeno (mín. 14mm) e `formatCurrency` (ex.: "R$ 1.234,56") não cabe em uma linha — `overflow: 'linebreak'` então quebra os centavos para a próxima linha.

### Ajustes (somente visuais no PDF, sem mudar valores nem lógica)
- **Largura mínima de coluna** subir de `14mm` para um valor calculado a partir do maior valor formatado da coluna, garantindo caber em 1 linha:
  - Calcular `requiredMonthW = max(textWidth(formatCurrency(v)) for v in coluna) + padding` usando `doc.getTextWidth` na fonte 7.5.
  - `monthW = max(requiredMonthW, basePerMonth)`.
- **Reduzir fonte automaticamente** quando muitos meses: se a soma das larguras requeridas exceder a largura útil (`pageW - eventW - totalW`), diminuir `fontSize` em passos (7.5 → 7 → 6.5 → 6, mínimo 5.5) e recalcular, até caber.
- **Coluna TOTAL** também recalculada com a mesma regra (substitui o fixo `28mm`).
- **Coluna Evento** ganha um teto menor (ex.: 60mm) liberando espaço quando há muitos meses; texto longo continua com `overflow: 'linebreak'` (apenas o nome do evento pode quebrar — valores nunca).
- **Por coluna numérica**: adicionar `noWrap: true` (via `cellWidth` suficiente) e `overflow: 'visible'` apenas nas células de valores, mantendo `'linebreak'` na coluna 0 (Evento).
- Se mesmo no menor `fontSize` não couber tudo, aplicar formato compacto **somente no PDF da Consulta Mensal** (ex.: "1.234,56" sem prefixo "R$ " nas colunas de mês — o cabeçalho indica que são valores em R$). Coluna TOTAL mantém "R$".

### Resultado esperado
- Valores monetários sempre em **uma única linha** no PDF.
- Layout continua legível mesmo com 12 meses selecionados.

XLS, CSV e Imagem: **não mudam** (já não quebram centavos).

---

## Garantias (reskin/lógica)
- Nenhuma alteração em hooks, queries, banco, RLS, rotas ou no modo "Relatório" padrão.
- Nenhuma alteração em valores, totais, fórmulas ou critérios de filtragem além da troca de "1 categoria" para "N categorias".
- Nenhum componente fora deste modal é tocado.

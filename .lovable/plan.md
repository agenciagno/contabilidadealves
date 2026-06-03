## Objetivo

Alinhar ao centro **todas as colunas** (cabeçalho, conteúdo e linha TOTAL) em todas as tabelas dos PDFs gerados na rota Pagar/Receber, eliminando o desalinhamento da linha de totais.

## Escopo

Arquivo único: `src/components/transactions/CashFlowReportModal.tsx`

Aplica-se a:
- **Relatório Geral** (`exportPDF`) — tabela principal de lançamentos + "Resumo por Evento Contábil"
- **Consulta Mensal — Versão Resumida** (`exportMonthlyPDF`)
- **Consulta Mensal — Versão Completa** (`exportMonthlyPDF` com Macro → Sub Eventos)

Sem alteração em XLS, CSV, JPEG, lógica, cálculos, colunas, ordem ou dados.

## Alterações

### 1. exportPDF — Tabela principal (linhas ~483-493)
Já está com `halign: 'center'` em todas as colunas. Sem mudança.

### 2. exportPDF — "Resumo por Evento Contábil" (linhas ~544-563)
- `foot[]`: trocar `halign` de cada célula para `'center'` (TOTAL, Qtd, A Receber, A Pagar, Saldo).
- `columnStyles`: trocar `halign: 'left'` (col 0) e `halign: 'right'` (cols 2,3,4) para `'center'`. Coluna 1 já é center. Manter cores (verde/vermelho) e `fontStyle: 'bold'` da coluna Saldo.

### 3. exportMonthlyPDF (linhas ~827-833 e didDrawCell ~845-874)
- `colStyles[0]` (Evento): `halign: 'left'` → `'center'`.
- `colStyles[1..monthsCount]` (meses): `halign: 'right'` → `'center'`.
- `colStyles[monthsCount+1]` (TOTAL): `halign: 'right'` → `'center'` (mantém `fontStyle: 'bold'`).
- `didDrawCell` (versão Completa, linhas Macro e Child): trocar posicionamento manual do texto para centralizado (`textX = data.cell.x + data.cell.width / 2`, `align: 'center'`) em todas as colunas. Manter cores, negrito do Macro, recuo via fonte menor do Child, fundo cinza do Macro.

## Garantias

- Nenhuma mudança em queries, hooks, filtros, totais calculados, ordem das linhas/colunas, ou tamanhos de coluna.
- Cabeçalhos já estão centralizados; apenas conteúdo e rodapé passam a herdar o mesmo alinhamento.
- "Imprimir" (`window.print()`) usa a renderização HTML da modal, que não é alterada por este plano. Se desejar, posso aplicar o mesmo `text-align: center` ao bloco impresso em uma rodada separada.

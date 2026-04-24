## Plano: Toggle Relatório | Consulta Mensal no modal de "Gerar Relatório" (Pagar/Receber)

### Objetivo
Adicionar um segundo modo de geração de relatório no `CashFlowReportModal.tsx` chamado **Consulta Mensal**, que produz uma matriz onde cada coluna é um mês selecionado e cada linha é um Evento Contábil, com valores agregados.

### Arquivo afetado
- `src/components/transactions/CashFlowReportModal.tsx` (único arquivo editado)

### Mudanças visuais/UI no modal

1. **Toggle no topo do modal** (logo abaixo do título), usando `ToggleGroup` (já disponível em `src/components/ui/toggle-group.tsx`):
   - **Relatório** (default — mantém 100% do comportamento atual: filtros de período, KPIs, exportações PDF/XLS/CSV/Imagem inalteradas).
   - **Consulta Mensal** (novo modo — substitui o painel de filtros e gera relatório matricial).

2. **Painel de filtros do modo Consulta Mensal** (aparece somente quando o toggle está em "Consulta Mensal"):
   - **Ano** — botões pill (estilo botão, igual ao toggle), listando os anos disponíveis (anos com transações + ano atual). Seleção única. Default: ano corrente.
   - **Status** — 2 botões pill (seleção única, obrigatória):
     - `Pago/Recebido` (transações com `is_paid = true`)
     - `Pagar/Receber` (transações com `is_paid = false`)
   - **Meses** — 12 botões pill (Jan…Dez) com multi-seleção manual. Comportamento automático ao trocar Status:
     - `Pago/Recebido` → seleciona Jan até o mês atual (inclusive).
     - `Pagar/Receber` → seleciona o mês atual + meses sucessores até Dez.
     - O usuário pode adicionar/remover meses manualmente após o auto-preenchimento.
     - Se o ano selecionado for diferente do ano atual: `Pago/Recebido` seleciona todos os 12 meses; `Pagar/Receber` também seleciona todos os 12 (apenas se ano > atual). Para ano < atual: ambos selecionam todos os 12.
   - **Evento Contábil** — dropdown `Select` idêntico ao usado em `TransactionFilters.tsx` (lista todas as categorias com bolinha colorida + opção "Todas as categorias"). Seleção única.

3. **Botões de exportação** (mesmos do modo Relatório): PDF, XLS, CSV, Imagem.

### Lógica do relatório matricial (modo Consulta Mensal)

**Filtragem das transações:**
- Filtra `transactions` do ano selecionado, com `is_paid` correspondente ao Status escolhido.
- Data de referência: `date` (data de pagamento) quando `is_paid = true`; `expected_date` quando `is_paid = false`.
- Se Evento Contábil ≠ "Todas", filtra `category_id`.

**Agregação:**
- Linhas: cada Evento Contábil distinto encontrado nas transações filtradas.
- Colunas: um mês para cada mês selecionado (na ordem cronológica).
- Célula = soma dos `amount` (ou `paid_amount` quando pago e disponível — mantendo a regra de `effective-value-calculation` já memorizada) das transações daquele evento naquele mês. Receitas como positivo, despesas como negativo (ou exibir em colunas separadas? — seguiremos uma única coluna por mês com sinal, igual ao saldo do Resumo por Evento atual).
- **Linha TOTAL** ao final somando todos os eventos por mês.
- **Coluna TOTAL** ao final somando os meses selecionados por evento.

**Ocultação de zerados:**
- Eventos cuja soma total (linha) seja 0 são ocultados do relatório (PDF/XLS/CSV/Imagem).

### Exportações (Consulta Mensal)

- **PDF** (landscape, jspdf + autoTable): cabeçalho com nome da empresa, CNPJ, título "Consulta Mensal — Pagar/Receber", linha com Ano, Status, Evento Contábil e Meses selecionados. Tabela com cabeçalho `Evento | Jan | Fev | … | TOTAL`. Largura de coluna proporcional. Rodapé com `Emitido em` e paginação.
- **XLS / CSV**: mesma matriz, separadores e formato monetário pt-BR já usados no arquivo.
- **Imagem (JPEG)**: snapshot do `summaryRef` (mesma técnica já existente).

### Defaults ao abrir o modal
- Toggle em **Relatório** (preserva fluxo atual; nada muda para quem já usa).
- Ao alternar para **Consulta Mensal** pela primeira vez na sessão: Ano = atual, Status = `Pagar/Receber`, Meses = mês atual → Dez, Evento = "Todas".

### Garantias
- Modo "Relatório" permanece 100% igual (mesmos filtros, KPIs, layout PDF/XLS/CSV/Imagem com `Resumo por Evento Contábil`).
- Nenhuma alteração de lógica em `useTransactions`, `useCategories`, banco de dados, RLS ou rotas.
- Nenhuma alteração visual fora do modal.

### Detalhes técnicos
- Estado novo no componente: `mode: 'report' | 'monthly'`, `selectedYear: number`, `selectedMonths: Set<number>` (0–11), `monthlyStatus: 'paid' | 'pending'`, `monthlyCategoryId: string`.
- Helper `getAvailableYears(transactions)` — extrai anos únicos de `date` e `expected_date`.
- Helper `buildMonthlyMatrix(rows, months, categoryId)` — retorna `{ events: Array<{name, color, monthly: number[], total: number}>, totals: number[], grandTotal: number }`, já com filtro de zerados aplicado.
- Reutiliza `formatCurrency`, `pad2`, `formatDateBR` existentes.
- Reusa imports já presentes (`jsPDF`, `autoTable`, `ToggleGroup` precisa ser importado).

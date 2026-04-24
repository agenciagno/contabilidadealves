## Plano: Resumo por Evento + padronização de relatórios (Conta Corrente, Pagar/Receber, DRE)

### Objetivo
1. **Conta Corrente** → adicionar bloco "Resumo por Evento" no fim do relatório.
2. **Pagar/Receber** → padronizar layout com o de Conta Corrente e incluir o mesmo "Resumo por Evento".
3. **DRE** → adicionar botão **Gerar Relatório** seguindo o padrão de Conta Corrente.

Nada de lógica de negócio é alterado — apenas saída visual de relatórios e adição de um botão.

---

### 1. Conta Corrente — `src/components/banks/BankReportModal.tsx`

Adicionar, ao final do PDF (após `autoTable` principal) e também no XLS/CSV, um bloco **Resumo por Evento Contábil**:

- Agrupar `filteredRows` por `category_name` (vazio = "Sem evento").
- Para cada grupo: somar `Entradas` (receita), `Saídas` (despesa), `Saldo` (entradas − saídas) e `Qtd. lançamentos`.
- Ordenar pelo maior volume (|entradas|+|saídas|) desc.
- No PDF: novo `autoTable` logo após o existente, com cabeçalho "Resumo por Evento" e colunas: Evento | Qtd | Entradas | Saídas | Saldo. Linha total no rodapé.
- No XLS e CSV: anexar bloco equivalente abaixo da tabela principal, com linha em branco de separação.

Sem alteração na tela do modal nem na tabela principal.

---

### 2. Pagar/Receber — `src/components/transactions/CashFlowReportModal.tsx`

Reescrever o **layout do PDF** seguindo o padrão visual do `BankReportModal`:

- Cabeçalho: Empresa + CNPJ + Título + Período + filtros (Evento, Cliente/Fornecedor, Tipo).
- Mesma faixa de 4 KPI cards arredondados (Capital de Giro, Entradas, Saídas, Saldos Atuais) com as mesmas cores e tipografia do extrato bancário.
- Linha separadora cinza + texto "X lançamentos • Gerado em…".
- Tabela principal com `theme: 'striped'`, `headStyles fillColor [40,40,40]`, `alternateRowStyles [248,248,248]` — mantendo as 9 colunas atuais (Prevista | Cliente | Receber | Pagar | Vencimento | Evento | Histórico | Saldo Atual | Status).
- Rodapé com "Emitido em…" + "Página X de Y" idêntico ao Conta Corrente.

Adicionar **Resumo por Evento Contábil** ao final, igual ao item 1, com colunas: Evento | Qtd | A Receber | A Pagar | Saldo (receber − pagar). Replicar também em XLS e CSV.

Não mudar filtros, KPIs, fórmulas, dados, regras de filtragem (`!is_paid && expected_date`) nem componentes da tela.

---

### 3. DRE — `src/pages/DRE.tsx` + novo `src/components/reports/DREReportModal.tsx`

**3.1 Botão "Gerar Relatório"** na barra de filtros do DRE (ao lado do botão de limpar), usando o mesmo estilo dos botões de relatório do Conta Corrente (ícone `FileText`, variant outline).

**3.2 Novo modal `DREReportModal.tsx`** seguindo o padrão visual de `BankReportModal`:

- Filtro de período (Data Início / Data Fim) já vindo do DRE.
- Botões: Gerar PDF, Gerar Excel (XLS), Gerar CSV, Gerar Imagem (JPEG).
- Mesmo cabeçalho (empresa, CNPJ, título "DRE - Demonstração do Resultado do Exercício", período).
- Faixa de 5 KPI cards com os mesmos valores dos `SummaryCard` da tela (Receita Líquida, Custo c/ Pessoal, Desp. Operacionais, Lucro/Prejuízo, Fluxo de Caixa) — mostrando Previsto / Realizado / RxP.
- Tabela principal replicando a DRE da tela: 6 colunas (Evento Contábil | Previsto | Realizado | RXP | % Prev. | % Real.), com linhas de Macro destacadas e subeventos indentados com "↳".
- Aplicar a regra atual de visibilidade: Macros sempre visíveis; subeventos zerados ocultos.
- Rodapé com "Emitido em…" + paginação.

Os dados vêm do mesmo `useDREData(startDate, endDate)` — zero alteração de cálculo.

---

### Resumo de mudanças
- **Editado**: `BankReportModal.tsx`, `CashFlowReportModal.tsx`, `DRE.tsx`
- **Criado**: `src/components/reports/DREReportModal.tsx`
- **0 migrations**, **0 mudanças em hooks/queries/regras**, **0 alteração de cálculos**

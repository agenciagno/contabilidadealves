

## Relatório de Pagar/Receber — Novo Modal + Limpeza de Filtros

### Visão Geral

Criar um novo componente `CashFlowReportModal` baseado no `BankReportModal`, adaptado para transações pendentes (Pagar/Receber). Remover os filtros nativos do `CashFlowTab`.

### Arquivos

**1. Criar `src/components/transactions/CashFlowReportModal.tsx`**

Duplicar a estrutura do `BankReportModal` com estas diferenças:
- **Remover**: Seção "Contas Bancárias" (checkboxes de bancos), estado `selectedBankIds`, lógica `filteredRows` por banco
- **Manter**: Filtros de Período (Data Início/Fim), Evento Contábil (Select)
- **Adicionar**: Filtro de Cliente/Fornecedor (Select com `contacts` list, mesmo padrão do Evento Contábil)
- **Dados**: Buscar transações pendentes (`!is_paid`) filtradas por período (usando `due_date` ou `issue_date`), evento contábil e contato. Calcular KPIs (Entradas Pendentes, Saídas Pendentes, Saldo Projetado)
- **Título**: "Relatório de Contas a Pagar/Receber"
- **PDF**: Cabeçalho com empresa, período, evento contábil, cliente/fornecedor. Cards compactos 3 colunas (Entradas, Saídas, Saldo Projetado). Tabela com colunas: Data Prevista, Cliente/Fornecedor, Evento, Valor, Vencimento, Status
- **Exportações**: PDF, XLS, CSV (sem OFX que é específico bancário)
- Props: `open`, `onOpenChange`, `transactions`, `categories`, `contacts`, `banks` (para saldo)

**2. Editar `src/components/transactions/CashFlowTab.tsx`**

- Remover o bloco `Collapsible` de filtros (linhas 190-233) e estados associados (`filtersOpen`, `bankFilter`, `categoryFilter`, `contactFilter`, `paymentStatusFilter`, `searchTerm`)
- Manter os filtros `period`, `customStartDate`, `customEndDate` internamente para a tabela (o período base continua funcionando para os KPIs e a listagem)
- Adicionar botão "Gerar Relatório" no header que abre o `CashFlowReportModal`
- Adicionar estado `reportOpen` e importar `CashFlowReportModal`

**3. Editar `src/pages/PagarReceber.tsx`**

- Sem alterações necessárias (o modal é gerenciado dentro do `CashFlowTab`)

### Fluxo de Dados do Modal

O modal recebe `transactions` (todas) como prop e filtra internamente por:
- `!is_paid` (apenas pendentes)
- Período via `due_date`
- `category_id` e `contact_id`

Não precisa de hook separado — usa os dados já carregados.




# Refatorar Movimentacoes com Tabs + Nova Aba "Fluxo de Caixa"

## Visao Geral

Envolver o conteudo atual da pagina `Transactions.tsx` em um sistema de abas (Tabs), mantendo tudo que existe na Aba 1 ("Dashboard") e criando uma nova Aba 2 ("Fluxo de Caixa") com tabela estilo planilha, KPIs compactos e logica de saldo projetado (running balance).

---

## Arquivos a Modificar/Criar

| Arquivo | Acao |
|---|---|
| `src/pages/Transactions.tsx` | Modificar — envolver conteudo existente em `Tabs` + `TabsContent`, adicionar segunda aba |
| `src/components/transactions/CashFlowTab.tsx` | Criar — componente da Aba 2 com KPIs, tabela e logica de running balance |

Nenhuma mudanca em `App.tsx`, `AppSidebar.tsx` ou rotas — tudo continua na mesma pagina `/movimentacoes`.

---

## Mudancas em `src/pages/Transactions.tsx`

- Importar `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` de `@/components/ui/tabs`
- Importar o novo componente `CashFlowTab`
- Envolver todo o JSX atual (do header ate o AlertDialog) dentro de `TabsContent value="dashboard"`
- Adicionar `TabsContent value="cashflow"` com o componente `CashFlowTab`
- Passar para `CashFlowTab` os dados ja disponiveis: `allTransactions`, `banks`, `categories`, `contacts`, estados de filtro e handlers existentes
- O `TabsList` fica logo abaixo do titulo "Movimentacoes", com duas abas:
  - "Dashboard" (aba ativa padrao)
  - "Fluxo de Caixa (A Pagar e Receber)"

Estrutura simplificada:

```text
<Tabs defaultValue="dashboard">
  <TabsList>
    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
    <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
  </TabsList>

  <TabsContent value="dashboard">
    {/* Todo o conteudo atual: KPIs, ticker, filtros, listagem */}
  </TabsContent>

  <TabsContent value="cashflow">
    <CashFlowTab ... />
  </TabsContent>
</Tabs>
```

---

## Novo Componente: `CashFlowTab.tsx`

### Props recebidas

- `transactions: Transaction[]` (todas, sem filtro)
- `banks: Bank[]`
- `categories: Category[]`
- `contacts: Contact[]`
- `togglePaid` mutation

### Filtros internos

O componente tera seus proprios filtros de periodo (reutilizando `UnifiedFilterBox`), independentes da Aba 1. As transacoes sao filtradas internamente via `useMemo`.

### KPIs de Topo (3 cards compactos, 1 linha)

| KPI | Calculo |
|---|---|
| Capital de Giro (Hoje) | Saldo Total Bancario + Receitas com due_date == hoje - Despesas com due_date == hoje |
| Necessidade de Caixa | Soma Receitas do periodo - Soma Despesas do periodo. Vermelho se negativo |
| Saldos Atuais | Lista cada banco ativo com nome, cor e saldo + "Disponivel Total" |

### Tabela (Data Grid denso)

Colunas:

| # | Coluna | Origem | Formato |
|---|---|---|---|
| 1 | Data Prevista | `transaction.date` | DD/MM/YYYY |
| 2 | Cliente/Fornecedor | `transaction.contact?.name` ou `description` | Texto |
| 3 | Receber | `amount` se `type === 'receita'` | Verde, R$ |
| 4 | Pagar | `amount` se `type === 'despesa'` | Vermelho, R$ |
| 5 | Vencimento | `transaction.due_date` | DD/MM/YYYY |
| 6 | Evento Contabil | `transaction.category?.name` | Texto |
| 7 | Historico | `transaction.notes` | Texto truncado |
| 8 | Dia da Semana | derivado de `due_date` | ex: "quinta-feira" |
| 9 | Status | `is_paid` + logica de vencido | Badge |
| 10 | Saldo Atual | running balance calculado | R$, vermelho se negativo |

Ordenacao padrao: `date` ASC (cronologica para projecao de caixa).

### Logica do Running Balance (coluna "Saldo Atual")

Calculado via `useMemo` sobre as transacoes filtradas e ordenadas:

```text
saldoTotalBancario = soma de current_balance de todos os bancos ativos

Para cada linha i (ordenada por date ASC):
  acumuladoReceitas += amount se tipo === 'receita'
  acumuladoDespesas += amount se tipo === 'despesa'
  saldoAtual[i] = saldoTotalBancario + acumuladoReceitas - acumuladoDespesas
```

Valores negativos exibidos em vermelho bold.

### Juros e Multa (Coluna Virtual — apenas visual)

Aplicada somente na coluna "Receber":

```text
SE category.name === "Honorarios Contabeis" E status visual === "Vencido":
  diasAtraso = diferenca em dias entre due_date e hoje
  multa = valorOriginal * 0.02
  juros = valorOriginal * 0.0015 * diasAtraso
  valorAtualizado = valorOriginal + multa + juros
```

Na celula "Receber":
- Valor original em texto menor, riscado (line-through), cinza
- Valor atualizado em verde bold
- Icone `AlertTriangle` com tooltip "+ Juros e Multa"
- Nenhuma alteracao no banco de dados

### Status Visual (Badges)

| Condicao | Badge |
|---|---|
| `is_paid === true` | "Pago" — fundo verde |
| `is_paid === false` e `due_date >= hoje` | "Pendente" — fundo amarelo/outline |
| `is_paid === false` e `due_date < hoje` | "Vencido" — fundo vermelho, texto branco |

---

## Detalhes Tecnicos

- `date-fns` para formatar datas (`format`), calcular diferenca de dias (`differenceInDays`) e obter dia da semana (`format(date, 'EEEE', { locale: ptBR })`) — sera necessario importar `ptBR` de `date-fns/locale/pt-BR`
- Componentes UI: `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell`, `TableBody` do shadcn/ui + `Card`, `Badge`, `Tooltip`
- Nenhuma migration de banco de dados necessaria
- Nenhuma mudanca de rota ou sidebar


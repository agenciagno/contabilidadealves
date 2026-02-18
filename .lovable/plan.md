
# Transformação Completa da Tela de Lançamentos — Business Intelligence

## Diagnóstico do Estado Atual

A tela `src/pages/Transactions.tsx` hoje possui:
- 3 cards KPI mostrando totais simples (Receitas, Despesas, Saldo do Período) sem distinção entre pago/a receber
- Filtros `UnifiedFilterBox` sempre visíveis (ocupa espaço permanente)
- Listagem em tabela/grid com Checkbox para alternar status
- Nenhuma barra de métricas ou indicadores de BI

O hook `useBanks` já retorna `current_balance` e `is_caixa_geral` — aproveitaremos esses dados para o card de Saldo Bancário Real e para o ticker.

---

## Mudança 1 — Refatoração dos Cards KPI

### Lógica dos Cálculos

Os 3 cards usarão `filteredTransactions` (respeitando os filtros da tela), exceto o Saldo Bancário Real:

| Card | Destaque (Grande) | Rodapé (Discreto) |
|---|---|---|
| Receitas | A Receber = soma de receitas com `is_paid = false` | Recebido: soma de receitas com `is_paid = true` |
| Despesas | A Pagar = soma de despesas com `is_paid = false` | Pago: soma de despesas com `is_paid = true` |
| Saldo Bancário | Soma de `current_balance` de todos os bancos ativos (global, ignora filtro) | Caixa Geral: saldo do banco marcado como `is_caixa_geral = true` |

O cálculo do `totals` em `useMemo` será expandido para incluir `receitasPendentes`, `receitasPagas`, `despesasPendentes` e `despesasPagas`.

O saldo bancário real virá diretamente de `banks` (já carregado via `useBanks`), somando `current_balance` de todos os bancos ativos.

---

## Mudança 2 — Nova Barra de Métricas (Ticker Financeiro)

Uma nova seção horizontal com 4 colunas, posicionada logo abaixo dos 3 cards KPI.

Os valores são calculados via `useMemo` a partir de `allTransactions` (não filtrado), com as seguintes fórmulas:

| Métrica | Fonte | Fórmula |
|---|---|---|
| Contas em Atraso | `allTransactions` | Soma de despesas com `due_date < hoje` E `is_paid = false` |
| Capital de Giro Hoje | `allTransactions` + `banks` | (Saldo Total Bancos) + (receitas vencendo hoje) - (despesas vencendo hoje) |
| Lucro Previsto (Mês) | `allTransactions` | (Total Receitas do mês corrente) - (Total Despesas do mês corrente) |
| Acumulado do Mês | `allTransactions` | Receitas pagas no mês corrente vs Despesas pagas no mês corrente |

A seção usará cards compactos com ícone colorido, valor em `font-bold` e label em `text-xs text-muted-foreground`.

---

## Mudança 3 — Filtros em Accordion Colapsável + Novo Design de Linha

### 3a — Filtros Recolhíveis

O `UnifiedFilterBox` será envolto num `Collapsible` do Radix UI (já instalado e disponível em `src/components/ui/collapsible.tsx`).

- Estado padrão: **fechado**
- O trigger será um botão "Filtros Avançados" com ícone `SlidersHorizontal` (Lucide), posicionado na linha do cabeçalho, ao lado do botão "Nova Movimentação"
- Um badge mostrará quantos filtros estão ativos quando o painel estiver fechado
- O `UnifiedFilterBox` existente não precisa ser modificado — apenas envolto no Collapsible

### 3b — Novo Design de Linha (Card Horizontal)

O modo de listagem padrão (`viewMode === 'list'`) será redesenhado. Cada transação será um card horizontal com:

**Estrutura Visual:**
```
┌────────────────────────────────────────────────────────┐
│ [Ícone]  DD/MM • Nome do Contato (Truncado)   [VALOR]  │
│          Badge Evento • Banco • Rec/Desp      [STATUS] │
└────────────────────────────────────────────────────────┘
```

- **Coluna Esquerda:** ícone de tipo (receita/despesa)
- **Coluna Central — Linha 1 (Destaque):** Data formatada `DD/MM` + separador `•` + nome do contato (ou a descrição, se sem contato). Font: `font-medium`
- **Coluna Central — Linha 2 (Subtext):** Badge do Evento Contábil + `•` Nome do Banco + `•` tipo (Receita/Despesa). Font: `text-xs text-muted-foreground`
- **Coluna Direita — Valor:** em destaque verde/vermelho, `font-bold`
- **Coluna Direita — Status Badge (Pill Interativo):**
  - Pago: `bg-emerald-500 text-white` (sólido)
  - Pendente: `border border-amber-500 text-amber-500` (outline)
  - Clique chama `togglePaid.mutate(...)` diretamente
- **Ações (Editar/Excluir):** mantidas como ícones discretos à direita

O modo grid (`viewMode === 'grid'`) permanece inalterado.

---

## Arquitetura Técnica — Independência das Queries

| Dado | Fonte | Filtrado? |
|---|---|---|
| KPI Receitas/Despesas | `filteredTransactions` | Sim (segue filtros da tela) |
| Saldo Bancário Real | `banks` (via `useBanks`) | Não (global) |
| Contas em Atraso | `allTransactions` | Não (global) |
| Capital de Giro | `allTransactions` + `banks` | Não (global) |
| Lucro Previsto do Mês | `allTransactions` | Não (mês corrente fixo) |
| Acumulado do Mês | `allTransactions` | Não (mês corrente fixo) |

Isso garante que os indicadores de BI reflitam a realidade financeira, não o recorte de visualização atual.

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---|---|
| `src/pages/Transactions.tsx` | Principal — todos os 4 pontos acima implementados aqui |

Nenhuma mudança de banco de dados. Nenhum novo arquivo criado. Nenhum hook novo necessário — todos os dados já são carregados (`useBanks`, `useTransactions`). O componente `Collapsible` já existe em `src/components/ui/collapsible.tsx`.

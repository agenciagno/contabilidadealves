
# Padronizar Design do Dashboard com Lancamentos + Novos Cards Anuais

## Resumo

Transferir o design visual dos cards de KPI e o estilo de filtros colapsaveis (accordion/sanfona) da pagina Lancamentos para o Dashboard. Adicionar 4 novos cards anuais: Lucro Previsto do Ano, Lucro Realizado do Ano, Receitas Acumuladas do Ano e Despesas Acumuladas do Ano.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/Dashboard.tsx` | Refatorar layout dos cards, adicionar accordion nos filtros, adicionar 4 novos cards anuais |

---

## 1. Filtros Colapsaveis (Accordion/Sanfona)

Copiar o padrao usado em Lancamentos:

- Importar `Collapsible`, `CollapsibleContent` de `@/components/ui/collapsible`
- Importar icone `SlidersHorizontal`, `ChevronUp`, `ChevronDown`
- Adicionar estado `filtersOpen` (default `false`)
- Envolver o `UnifiedFilterBox` com `Collapsible > CollapsibleContent`
- Adicionar botao "Filtros Avancados" com badge de contagem de filtros ativos e seta direcional

---

## 2. Padronizar Design dos Cards Existentes

Substituir o estilo atual dos 6 cards (gradient + texto 2xl) pelo padrao de Lancamentos:

**Padrao Lancamentos (3 cards grandes + ticker):**

- Cards grandes: fundo `bg-card border-border/50`, padding `p-5`, titulo `text-xs font-medium text-muted-foreground uppercase tracking-wider`, valor `text-4xl font-extrabold tracking-tight`, icone em circulo `w-10 h-10 rounded-full`, subtitulo discreto `text-xs text-muted-foreground`
- Cards ticker: `border-l-2 border-l-[cor]`, padding `p-3`, icone `w-3.5 h-3.5`, titulo `text-xs`, valor `text-base font-bold`, rodape `text-[10px]`

**Linha 1 (3 colunas grandes):**
- Receitas Recebidas / A Receber (estilo KPI grande, cor emerald)
- Contas Pagas / A Pagar (estilo KPI grande, cor red)
- Saldo Bancario / Caixa Geral (estilo KPI grande, cor primary)

Os cards "Receitas a Receber" e "Contas a Pagar" serao agrupados como subtitulos discretos dentro dos cards "Receitas Recebidas" e "Contas Pagas", exatamente como funciona em Lancamentos (valor principal + rodape com o complemento).

---

## 3. Novos Cards Anuais (Ticker - 4 colunas)

Adicionar uma nova linha de 4 cards pequenos (estilo BI Ticker) logo abaixo dos 3 cards grandes:

### Card 1: Lucro Previsto do Ano
- `border-l-2 border-l-emerald-500`
- Titulo: `Lucro Previsto — {ano atual}`
- Calculo: `(Todas receitas do ano) - (Todas despesas do ano)` (pagas + pendentes)
- Cor do valor: emerald se >= 0, red se < 0
- Rodape: `Receitas - Despesas (ano)`

### Card 2: Lucro Realizado do Ano
- `border-l-2 border-l-amber-500`
- Titulo: `Lucro Realizado — {ano atual}`
- Calculo: `(Receitas pagas do ano) - (Despesas pagas do ano)` (somente `is_paid === true`)
- Cor do valor: emerald se >= 0, red se < 0
- Rodape: `Realizado no ano corrente`

### Card 3: Receitas Acumuladas do Ano
- `border-l-2 border-l-green-500`
- Titulo: `Receitas Acumuladas — {ano atual}`
- Calculo: Soma de todas as receitas com `is_paid === true` e `date` dentro do ano vigente
- Cor: emerald
- Rodape: `Receitas ja realizadas`

### Card 4: Despesas Acumuladas do Ano
- `border-l-2 border-l-red-500`
- Titulo: `Despesas Acumuladas — {ano atual}`
- Calculo: Soma de todas as despesas com `is_paid === true` e `date` dentro do ano vigente
- Cor: red
- Rodape: `Despesas ja realizadas`

---

## 4. Logica de Calculo (novo useMemo)

Adicionar um `useMemo` chamado `annualMetrics` que itera `allTransactions` uma unica vez:

```text
const yearStr = format(new Date(), 'yyyy');
const yearStart = startOfYear(new Date());  // '2026-01-01'
const yearEnd = endOfYear(new Date());      // '2026-12-31'

Para cada transacao com date dentro do ano:
  - Se receita: soma em receitasAno
  - Se despesa: soma em despesasAno
  - Se receita E is_paid: soma em receitasPagasAno
  - Se despesa E is_paid: soma em despesasPagasAno

Retorno:
  lucroPrevisto = receitasAno - despesasAno
  lucroRealizado = receitasPagasAno - despesasPagasAno
  receitasAcumuladas = receitasPagasAno
  despesasAcumuladas = despesasPagasAno
```

---

## 5. Estrutura Final do Layout

```text
[Header + Quick Actions]
[Botao "Filtros Avancados" com badge]
  [UnifiedFilterBox colapsavel - inicia fechado]
[Card Receitas] [Card Despesas] [Card Saldo]    <-- 3 cols, estilo KPI grande
[Lucro Previsto Ano] [Lucro Realizado Ano] [Receitas Acum.] [Despesas Acum.]  <-- 4 cols, estilo ticker
[Grafico Evolucao Mensal]
[Graficos de Categorias]
[Contas Pendentes]
[Ultimas Movimentacoes]
```

---

## Detalhes Tecnicos

- Importar `Collapsible`, `CollapsibleContent`, `SlidersHorizontal`, `ChevronUp`, `ChevronDown`, `BarChart3`, `CalendarCheck`, `AlertTriangle`
- O ano no titulo dos cards usa `format(new Date(), 'yyyy')` do `date-fns`
- Atualiza automaticamente ao virar o ano
- Os cards de Caixa Geral e Receitas a Receber / Contas a Pagar ficam como rodapes discretos dentro dos cards principais (igual Lancamentos)
- Nenhuma mudanca na logica de filtragem existente (`summary`, `monthlyEvolution`, etc.)
- Os novos cards anuais operam sobre `allTransactions` (independente dos filtros de periodo)

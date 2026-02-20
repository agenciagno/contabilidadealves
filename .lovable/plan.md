
# Refatorar KPI "Capital de Giro" na Pagina Lancamentos

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/pages/Transactions.tsx` | Refatorar calculo e renderizacao do card Capital de Giro |

---

## 1. Refatorar Logica de Calculo (useMemo `biMetrics`, linhas ~200-250)

A logica atual do `capitalDeGiro` considera TODAS as transacoes do dia (`due_date === todayStr`), incluindo as ja pagas. A nova logica filtra apenas transacoes **nao pagas** (`is_paid === false`).

### Nova Variavel `capitalDeGiroMes` (Variavel A)

```text
bankTotals.totalBalance
+ Receitas NAO pagas com due_date no mes atual (01 ao ultimo dia)
- Despesas NAO pagas com due_date no mes atual
```

Adicionar contadores `receitasPendentesMes` e `despesasPendentesMes` no loop, com condicao: `!t.is_paid && t.due_date >= monthStartStr && t.due_date <= monthEndStr`.

### Nova Variavel `capitalDeGiroHoje` (Variavel B)

```text
bankTotals.totalBalance
+ Receitas NAO pagas com due_date <= hoje
- Despesas NAO pagas com due_date <= hoje
```

Adicionar contadores `receitasPendentesAteHoje` e `despesasPendentesAteHoje` no loop, com condicao: `!t.is_paid && t.due_date && t.due_date <= todayStr`.

### Retorno do useMemo

Substituir `capitalDeGiro` por `capitalDeGiroMes` e `capitalDeGiroHoje` no objeto retornado. Remover variaveis `receitasHoje`/`despesasHoje` que nao serao mais necessarias.

---

## 2. Atualizacao da Renderizacao do Card (linhas ~523-534)

- **Titulo**: Manter "Capital de Giro" com icone Building2
- **Valor principal** (text-base font-bold): Exibir `capitalDeGiroMes` com cor azul se positivo, vermelho se negativo
- **Rodape** (text-[10px] text-muted-foreground): Trocar "Bancos +/- vencimentos hoje" por "Ate hoje: R$ X.XXX,XX" usando `capitalDeGiroHoje`

---

## Resumo das Mudancas no Codigo

1. No loop `for (const t of allTransactions)`: adicionar 4 novos contadores com filtro `!t.is_paid`
2. Na linha 244: substituir `capitalDeGiro = bankTotals.totalBalance + receitasHoje - despesasHoje` pelas duas novas formulas
3. Na linha 529-532: trocar referencia de `biMetrics.capitalDeGiro` para `biMetrics.capitalDeGiroMes`
4. Na linha 532: trocar texto do rodape para exibir `biMetrics.capitalDeGiroHoje`

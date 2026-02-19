
# Ajustar KPIs da Pagina Pagar/Receber

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Refatorar calculo dos KPIs e renderizacao dos 2 primeiros cards |

---

## 1. Card "Capital de Giro" — Dupla Visao

**Calculo (useMemo `kpis`):**

Adicionar duas novas metricas ao objeto retornado:

- `capitalDeGiroMes`: `totalBankBalance + (soma de TODAS as receitas do mes atual, independente do filtro de periodo) - (soma de TODAS as despesas do mes atual)`
- `capitalDeGiroHoje`: manter a formula atual `totalBankBalance + receitasHoje - despesasHoje`

Para calcular o "mes atual", sera necessario filtrar `transactions` (o array completo, nao o `filtered`) pelas transacoes cujo `due_date` cai no mes corrente (usando `startOfMonth` e `endOfMonth` do `date-fns`).

**Renderizacao:**

- Titulo principal: "Capital de Giro (Mes)"
- Valor em destaque (text-2xl font-extrabold): `capitalDeGiroMes`
- Rodape discreto (text-xs text-muted-foreground): "Hoje: R$ X.XXX,XX" usando `capitalDeGiroHoje`

---

## 2. Card "Necessidade de Caixa" — Titulo Dinamico

**Calculo:** Sem mudanca na formula (`totalReceitas - totalDespesas` do periodo filtrado).

**Renderizacao:**

- SE `necessidadeCaixa >= 0`:
  - Titulo: "Geracao de Caixa"
  - Cor do valor: verde (`text-emerald-500`)
  - Icone: `TrendingUp` com fundo verde
- SE `necessidadeCaixa < 0`:
  - Titulo: "Necessidade de Caixa"
  - Cor do valor: vermelho (`text-red-500`)
  - Icone: `TrendingDown` com fundo vermelho

---

## Detalhes Tecnicos

- Importar `startOfMonth`, `endOfMonth` de `date-fns` para delimitar o mes corrente
- O calculo de "Capital de Giro (Mes)" usa o array `transactions` original (props), nao o `filtered`, para garantir que sempre reflita o mes inteiro independente dos filtros de periodo selecionados
- O calculo de "Capital de Giro (Hoje)" permanece identico ao atual
- Nenhuma mudanca no terceiro card (Saldos Atuais) nem na tabela



# Corrigir Logica do Saldo Atual (Running Balance) — Apenas Pendentes

## Problema

A logica atual soma **todas** as transacoes (pagas e pendentes) ao saldo acumulado. Isso gera valores incorretos porque o saldo bancario atual (`totalBankBalance`) ja reflete as transacoes pagas. Somar novamente causa duplicacao.

## Correcao

Alterar o `useMemo` de `rows` em `CashFlowTab.tsx` (linhas ~120-150) para seguir o algoritmo contabil iterativo:

1. Inicializar `let saldoAcumulado = totalBankBalance`
2. Para cada transacao (ja ordenada por `date` ASC):
   - Calcular o status (`pago`, `pendente`, `vencido`)
   - Manter a logica de juros/multa virtual (sem alteracao)
   - **SE status for `pago`**: nao alterar `saldoAcumulado` (o banco ja reflete)
   - **SE status for `pendente` ou `vencido`**:
     - Receita: `saldoAcumulado += amount`
     - Despesa: `saldoAcumulado -= amount`
   - Atribuir `saldoAcumulado` como `saldoAtual` da linha

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Refatorar bloco `useMemo` de `rows` (~linhas 120-150) |

## Antes vs Depois (pseudocodigo)

**Antes (incorreto):**
```text
acumReceitas += amt   // sempre soma, mesmo se pago
acumDespesas += amt   // sempre soma, mesmo se pago
saldoAtual = totalBank + acumReceitas - acumDespesas
```

**Depois (correto):**
```text
saldoAcumulado = totalBankBalance  // ponto de partida

Para cada linha:
  SE status != 'pago':
    SE receita: saldoAcumulado += amt
    SE despesa: saldoAcumulado -= amt
  linha.saldoAtual = saldoAcumulado  // iterativo
```

## Impacto

- Apenas a coluna "Saldo Atual" muda de comportamento
- KPIs permanecem inalterados
- Juros/multa virtual permanece inalterado
- Nenhuma alteracao visual ou de layout


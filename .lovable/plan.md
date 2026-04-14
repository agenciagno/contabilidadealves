

## Plano: Refatorar Motor de Cálculo e Renderização da DRE

### Problemas Identificados no Código Atual

1. **Ordem errada no `DRE_STRUCTURE`**: O breakpoint `despesas_receitas_nao_op` aparece **antes** das seções `Empréstimos Recebidos PF/PJ` e `Despesas Empréstimos` que ele depende
2. **Fluxo de Caixa usa saldo bancário** em vez da variação real (entradas - saídas) no período
3. **Sem ocultação de linhas zeradas** — seções com R$ 0,00 em previsto e realizado ainda aparecem

### Mudanças (2 arquivos)

#### 1. `src/hooks/useDREData.ts`

**A. Corrigir ordem do `DRE_STRUCTURE`:**
```
Empréstimos Recebidos PF/PJ  ← mover para ANTES de despesas_receitas_nao_op
Despesas Empréstimos          ← mover para ANTES de despesas_receitas_nao_op
DESPESAS/RECEITAS NÃO OP.    ← agora vem depois
LUCRO/PREJUÍZO LÍQUIDO
FLUXO DE CAIXA
```

**B. Fluxo de Caixa — nova fórmula:**
Substituir o cálculo atual (soma de `current_balance` dos bancos) por:
- **Entradas** = soma de `paid_amount` de todas transações `is_paid=true` + `type='receita'` no período
- **Saídas** = soma de `paid_amount` de todas transações `is_paid=true` + `type='despesa'` no período
- **Fluxo de Caixa** = Entradas - Saídas (variação real de caixa, incluindo não-operacionais)

Essa query já existe (`realizadoTxns`), mas inclui apenas categorias com `show_in_dre`. Será necessária uma query adicional ou usar os dados brutos sem filtro de `show_in_dre` para o fluxo de caixa.

**C. Summary `fluxoCaixa`**: atualizar para usar a nova fórmula ao invés de saldo bancário.

#### 2. `src/pages/DRE.tsx`

**Ocultação inteligente**: No loop de renderização, ao encontrar uma `SectionRow` com `previsto === 0` E `realizado === 0`, não renderizar. BreakPoints sempre renderizados.

### Matemática — Confirmação

As fórmulas dos breakpoints no código atual já estão corretas conforme solicitado. Apenas a ordem de renderização e o fluxo de caixa precisam de correção.

### Resumo

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/hooks/useDREData.ts` | Reordenar estrutura, nova query fluxo de caixa |
| 2 | `src/pages/DRE.tsx` | Ocultar seções zeradas |

- 0 migrations
- 2 arquivos editados
- Fórmulas contábeis preservadas


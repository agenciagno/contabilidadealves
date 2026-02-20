
# Refatorar KPIs da Pagina Pagar/Receber

## Resumo

Substituir os 3 cards atuais (Capital de Giro, Geracao de Caixa, Saldos Atuais) por 4 cards: Capital de Giro (logica igual a Lancamentos), Entradas (A Receber), Saidas (A Pagar) e Saldos Atuais. O card "Geracao de Caixa" sera excluido.

---

## Arquivo Modificado

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/CashFlowTab.tsx` | Refatorar KPIs e layout dos cards |

---

## 1. Atualizar Calculo dos KPIs (useMemo `kpis`)

Substituir o calculo atual para usar a mesma logica de Capital de Giro da pagina Lancamentos:

- **Capital de Giro (Mes)**: `Saldo Bancario + Receitas Pendentes do Mes - Despesas Pendentes do Mes` (apenas `!is_paid` com `due_date` dentro do mes corrente, iterando sobre `transactions` completas, nao filtradas)
- **Capital de Giro (Hoje)**: `Saldo Bancario + Receitas Pendentes ate Hoje - Despesas Pendentes ate Hoje` (apenas `!is_paid` com `due_date <= hoje`)
- **Entradas (A Receber)**: Soma de receitas pendentes (`!is_paid`) do periodo filtrado
- **Saidas (A Pagar)**: Soma de despesas pendentes (`!is_paid`) do periodo filtrado

Remover o calculo de `necessidadeCaixa`.

---

## 2. Novo Layout dos Cards (4 cards em grid `sm:grid-cols-4`)

### Card 1: Capital de Giro (Mes)
- Mesmo estilo do card de Capital de Giro em Lancamentos (ticker com `border-l-2 border-l-blue-500`)
- Icone: `Building2` em circulo azul
- Titulo: "Capital de Giro"
- Valor principal: `capitalDeGiroMes` (azul se >= 0, vermelho se < 0)
- Rodape: `Ate hoje: {capitalDeGiroHoje}`

### Card 2: Entradas (A Receber)
- Estilo card com `border-l-2 border-l-emerald-500`
- Icone: `TrendingUp` verde
- Titulo: "Entradas"
- Valor principal: soma de receitas pendentes do periodo (verde)
- Rodape: `Recebido: {receitasPagas}` (valor ja pago no periodo)

### Card 3: Saidas (A Pagar)
- Estilo card com `border-l-2 border-l-red-500`
- Icone: `TrendingDown` vermelho
- Titulo: "Saidas"
- Valor principal: soma de despesas pendentes do periodo (vermelho)
- Rodape: `Pago: {despesasPagas}` (valor ja pago no periodo)

### Card 4: Saldos Atuais
- Manter o card existente com listagem de bancos ativos e total

---

## 3. Ajustes no KPIs useMemo

Adicionar ao retorno do `kpis`:
- `receitasPendentes`: receitas com `!is_paid` do periodo filtrado
- `receitasPagas`: receitas com `is_paid` do periodo filtrado
- `despesasPendentes`: despesas com `!is_paid` do periodo filtrado
- `despesasPagas`: despesas com `is_paid` do periodo filtrado

Substituir logica de Capital de Giro para iterar `transactions` (nao filtradas) buscando apenas pendentes (`!is_paid`) com `due_date` no mes corrente e ate hoje.

---

## 4. Imports

Adicionar `Building2` aos imports de lucide-react (para icone do Capital de Giro).
Remover referencias nao utilizadas se necessario.

---

## Estrutura Final dos Cards

```text
[Capital de Giro] [Entradas] [Saidas] [Saldos Atuais]  <-- 4 cols
[Tabela de Fluxo de Caixa]
```

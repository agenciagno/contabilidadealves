
# Refinamentos Visuais e de Conteúdo — Tela de Lançamentos

## Estado Atual (Diagnóstico)

Após a transformação BI, o arquivo `src/pages/Transactions.tsx` (797 linhas) tem:

- Cards KPI com `text-2xl font-bold` — valores financeiros com pouco destaque visual
- Card "Em Atraso" mostrando apenas um valor somado (`biMetrics.contasEmAtraso` = somente despesas)
- Card "Acumulado (Mês)" como título — terminologia informal
- Textos secundários nas linhas usando `text-muted-foreground` (baixo contraste para telas com brilho reduzido)
- Valor da transação na linha com `font-bold text-sm` — pouco destaque frente ao nome
- `filtersOpen` inicializado como `false` — já correto

---

## Mudança 1 — Super Destaque nos Cards Principais (KPIs Superiores)

**Linhas alvo:** 478, 496, 514

**De:** `text-2xl font-bold`
**Para:** `text-4xl font-extrabold tracking-tight`

Aplicado nos 3 cards: A Receber (verde), A Pagar (vermelho) e Saldo Bancário (primário/vermelho condicional).

O ícone circular à direita será mantido. O espaçamento interno do card pode crescer ligeiramente (`p-5` em vez de `p-4`) para acomodar os números maiores sem comprimir.

---

## Mudança 2 — Refinamento da Barra de Métricas (BI Ticker)

### 2a — Card "Em Atraso": Split em duas linhas

**Problema:** o cálculo atual em `biMetrics` só computa `contasEmAtraso` para **despesas**. Precisamos adicionar `receitasEmAtraso` (receitas não recebidas com `due_date < hoje`).

**Mudança no `useMemo` de `biMetrics`** (linhas 199–244):
- Adicionar variável `receitasEmAtraso` dentro do loop `for (const t of allTransactions)`
- Condição: `t.type === 'receita' && !t.is_paid && t.due_date && t.due_date < todayStr`
- Retornar `receitasEmAtraso` junto com os demais valores

**Mudança visual no card "Em Atraso"** (linhas 534–543):
- Remover o valor único `{formatCurrency(biMetrics.contasEmAtraso)}`
- Exibir duas linhas:
  - `⬇ Receber: R$ X` — cor `text-orange-400` (inadimplência a receber)
  - `⬆ Pagar: R$ Y` — cor `text-red-500` (dívida vencida)

### 2b — Card "Acumulado": Renomear para "Resultado Realizado"

**Linhas 574–586:**
- Título: `text-xs text-muted-foreground` → trocar texto de `"Acumulado (Mês)"` para `"Resultado Realizado"`
- Subtexto: de `"Rec. pagas — Desp. pagas: ..."` para `"Realizado no mês corrente"` (mais limpo)
- Mostrar o resultado líquido em destaque: `receitasPagasMes - despesasPagasMes` com cor condicional (verde se positivo, vermelho se negativo)

---

## Mudança 3 — Melhoria nas Linhas de Transação

### 3a — Contraste nos textos secundários

**Linhas 714–721** (subtext da linha): `text-muted-foreground` → `text-zinc-400`

Afeta: nome do banco, separadores `•`, e o texto "Receita"/"Despesa".

### 3b — Peso da fonte do valor na linha

**Linha 727:** `font-bold text-sm` → `font-bold text-base`

Isso faz o valor monetário (`+R$ 1.500,00`) se destacar mais do que o nome do contato ao lado.

---

## Mudança 4 — Verificação do Estado do Accordion

**Linha 87:** `const [filtersOpen, setFiltersOpen] = useState(false);`

Já está `false`. Nenhuma alteração necessária aqui.

---

## Resumo de Todos os Pontos de Mudança

| # | Mudança | Linhas |
|---|---|---|
| 1 | `text-2xl font-bold` → `text-4xl font-extrabold tracking-tight` nos 3 KPIs | 478, 496, 514 |
| 1b | `p-4` → `p-5` nos cards KPI para acomodar fonte maior | 474, 492, 510 |
| 2a | Adicionar `receitasEmAtraso` ao `useMemo` biMetrics | 207–236 |
| 2a | Split visual do card "Em Atraso" em duas linhas coloridas | 534–543 |
| 2b | Renomear "Acumulado (Mês)" para "Resultado Realizado" + lógica de resultado líquido | 574–586 |
| 3a | `text-muted-foreground` → `text-zinc-400` nos subtextos das linhas | 714–721 |
| 3b | `font-bold text-sm` → `font-bold text-base` no valor da linha | 727 |

**Arquivo único modificado:** `src/pages/Transactions.tsx`

Sem mudanças de banco de dados, hooks ou novos arquivos.

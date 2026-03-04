

## Plano: Reformulacao Completa da Pagina Lancamentos

Este e um projeto grande com 4 areas de mudanca. Vou detalhar cada uma.

---

### 1. Reestruturacao do Header e Cards

**Arquivo:** `src/pages/Transactions.tsx`

- **Titulo + Acoes na mesma linha:** Mover o titulo "Movimentacoes" para a esquerda e os botoes (Nova Movimentacao, Importar, Exportar) para a direita, tudo na mesma `div` com `flex justify-between`.
- **Cards uniformes:** Remover o estilo `text-4xl font-extrabold` dos 3 KPI cards (A Receber, A Pagar, Saldo Bancario). Usar o mesmo tamanho dos cards do BI Ticker (`text-base font-bold`, `p-3`). Unificar todos os 7 cards em um unico grid de 7 colunas (ou 4+3), todos com mesma altura e padding.

---

### 2. Novo Sistema de Filtros Minimalista

**Arquivo:** `src/pages/Transactions.tsx`

- **Remover:** Seletor lista/grid (linhas 417-424), botao "Filtros Avancados" (linhas 426-435), bloco `Collapsible` com `UnifiedFilterBox` (linhas 491-519). O `viewMode` state e toda logica grid podem ser removidos.
- **Nova barra de filtros:** Criar uma barra horizontal com 4 icones (tooltips apenas):
  - `Search` (pesquisa geral) - abre input inline
  - `Landmark` (Conta Bancaria) - abre popover com select de bancos
  - `Receipt` (Evento Contabil) - abre popover com select de categorias
  - `TrendingUp`/`TrendingDown` (Tipo) - abre popover com opcoes Receita/Despesa/Todos
- Posicionar logo acima da tabela, alinhada a esquerda.

---

### 3. Filtros Interativos no Cabecalho da Tabela (Estilo Excel)

**Arquivo:** `src/pages/Transactions.tsx`

- Adicionar um icone de funil (`Filter` ou `ChevronDown`) ao lado de cada titulo de coluna no header da tabela.
- **Colunas de data** (Emissao, Vencimento, Prevista, Pagamento): Ao clicar, abrir `Popover` com dois inputs `date` (Data Inicial / Data Final). Filtrar as transacoes pelo range.
- **Colunas texto** (Cliente/Evento, Status): Ao clicar, abrir `Popover` com lista de valores unicos extraidos das transacoes filtradas. Selecionar aplica filtro imediato.
- Criar states para cada filtro de coluna: `columnFilters` como objeto `{ issue_date?: {start, end}, due_date?: {start, end}, contact?: string, status?: string, ... }`.
- Aplicar esses filtros no `useMemo` de `filteredTransactions`.

---

### 4. Otimizacao do Modal de Transacao

**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`

- **Novo campo "Valor Recebido/Pago":** Adicionar ao lado do campo "Valor (R$)". Mesmo formato de input monetario. Campo opcional, nao obrigatorio para submit.
  - Nota: Este campo NAO existe no banco. Sera adicionado via migration: `ALTER TABLE transactions ADD COLUMN paid_amount numeric DEFAULT NULL`.
- **Layout compacto multi-colunas:**
  - Linha 1: Toggle Receita/Despesa (compacto)
  - Linha 2: Cliente/Fornecedor | Valor | Valor Recebido/Pago (3 colunas)
  - Linha 3: Evento Contabil | Conta/Banco (2 colunas)
  - Linha 4: Emissao | Vencimento | Prevista | Pagamento (4 colunas, compacto)
  - Linha 5: Anexo | Observacoes (2 colunas, lado a lado)
  - Linha 6: Toggle Pago + Botoes (mesma linha)
- Reduzir padding, gaps e heights dos inputs (`h-8` ou `h-9`, `gap-2`, `space-y-2`).
- Dialog max-width `sm:max-w-2xl` (ja esta).

---

### Migration SQL Necessaria

```sql
ALTER TABLE transactions ADD COLUMN paid_amount numeric DEFAULT NULL;
```

---

### Arquivos Impactados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Transactions.tsx` | Header, cards, filtros, cabecalho tabela, remocao grid view |
| `src/components/transactions/TransactionFormDialog.tsx` | Layout compacto, novo campo paid_amount |
| `src/hooks/useTransactions.ts` | Incluir `paid_amount` nos tipos |
| Migration SQL | Adicionar coluna `paid_amount` |

### Estimativa de Complexidade

Alto. Envolve reescrita significativa de ~400 linhas de JSX em `Transactions.tsx`, refatoracao do modal, e nova logica de filtros por coluna.


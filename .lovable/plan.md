

## Plano: Espaçamento de Colunas e Ordenação nos Popovers

### 1. Aumentar espaçamento entre colunas

**Arquivo:** `src/pages/Transactions.tsx`

Alterar o grid template das colunas (header linha 604 e rows linha 680) de:
```
grid-cols-[40px_80px_1fr_90px_90px_90px_80px_120px_80px]
```
Para:
```
grid-cols-[40px_100px_1fr_110px_110px_110px_90px_130px_90px]
```
Aumentar tambem o `gap` de `gap-2` para `gap-3`.

### 2. Remover ordenacao do cabecalho, mover para os popovers

**Cabecalhos de data (Emissao, Vencimento, Prevista, Pagamento):**
- Remover o `<button onClick={handleSort}>` que envolve o titulo e os icones `ChevronUp/ChevronDown/ArrowUpDown`.
- O titulo fica como `<span>` simples, mantendo apenas o icone de filtro (funil).

**Componente `DateColumnFilter`:**
- Adicionar dois botoes de ordenacao no topo do popover: "Mais antigo primeiro" (asc) e "Mais recente primeiro" (desc).
- Receber props `sortField`, `currentSortField`, `currentSortOrder`, `onSort` para controlar o estado.

**Remover imports nao utilizados:** `ArrowUpDown` (se nao usado em outro lugar).

### Arquivos impactados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Transactions.tsx` | Grid sizing, remover sorting dos headers, adicionar sorting nos popovers de data |


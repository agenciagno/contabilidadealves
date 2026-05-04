
## Objetivo

Adicionar um toggle "Versão Resumida | Versão Completa" dentro da aba **Consulta Mensal** do modal `CashFlowReportModal`. A versão resumida mantém o comportamento atual (flat por categoria). A versão completa agrupa as categorias por hierarquia macro→filho, similar à visualização da DRE.

## Arquivo alterado

**`src/components/transactions/CashFlowReportModal.tsx`**

## Mudanças

### 1. Novo estado `monthlyVersion`

Adicionar estado `monthlyVersion: 'resumida' | 'completa'` (default: `'resumida'`). Reset ao abrir o modal.

### 2. Toggle na UI (dentro da seção `mode === 'monthly'`)

Adicionar um `ToggleGroup` com as opções "Versão Resumida" e "Versão Completa", posicionado logo abaixo do seletor de Evento Contábil.

### 3. Dados hierárquicos (`monthlyMatrix`)

Quando `monthlyVersion === 'completa'`, o `monthlyMatrix` será recalculado para agrupar por macro-evento (categorias com `parent_id === null`) e sub-eventos (categorias com `parent_id`). Cada entrada terá:
- `name`: nome do macro-evento
- `children`: array de sub-eventos com seus valores mensais
- `monthly[]` e `total`: soma dos filhos

Categorias filtradas: se o usuário selecionou eventos específicos, mostrar apenas os macros que contêm esses sub-eventos selecionados (e apenas os sub-eventos filtrados dentro deles).

A prop `categories` já está disponível no componente e contém `parent_id` para montar a hierarquia.

### 4. Preview summary na UI

Na versão completa, o bloco de preview mostrará a contagem de macro-eventos e sub-eventos, em vez da contagem flat.

### 5. Exportação PDF (`exportMonthlyPDF`)

Na versão completa:
- Linhas de macro-evento em negrito com fundo cinza claro
- Sub-eventos indentados com prefixo "↳" (similar à DRE)
- Totais por macro antes do próximo grupo
- Linha final TOTAL GERAL

### 6. Exportação XLS e CSV (`exportMonthlyXLS`, `exportMonthlyCSV`)

Na versão completa:
- Linhas de macro-evento em negrito
- Sub-eventos com indentação textual ("  ↳ Nome")
- Mesma estrutura hierárquica

### Detalhes técnicos

- A hierarquia é derivada de `categories[].parent_id`. Categorias sem `parent_id` são macros; as com `parent_id` são filhas.
- Categorias que não têm pai e não são pais de ninguém aparecem como macros standalone.
- Nenhuma rota, hook, query, tabela ou lógica de negócio será alterada.
- Nenhuma tela existente será modificada fora deste modal.


# Auditoria de Responsividade

## Resumo
Ajustes visuais globais de layout para garantir que nenhum elemento cause scroll horizontal na pagina, com regras de responsividade por breakpoint. Inclui mudancas de cor na sidebar e background.

---

## 1. CSS Global (`src/index.css`)

Adicionar bloco de regras globais de responsividade:

- `html, body, #root`: `overflow-x: hidden; max-width: 100vw;` (ja existe parcial, reforcar no `#root`)
- Tabelas: garantir que `.relative.w-full.overflow-auto` tenha `-webkit-overflow-scrolling: touch` (ja existe) e adicionar `table { min-width: max-content; }` dentro desse container
- Imagens/SVG: `img, svg { max-width: 100%; height: auto; }`
- Titulos: `h1, h2 { overflow-wrap: break-word; word-break: break-word; max-width: 100%; }`

**Cores solicitadas:**
- `.dark` sidebar: `--apple-mat-sidebar: rgba(28,28,28,0.94);`
- `.dark` background: `--apple-bg-base: #0f0f0f;` e `--background: 0 0% 5.9%;` (equivalente HSL de #0f0f0f)

## 2. Layout principal (`src/components/layout/AppLayout.tsx`)

- Adicionar `max-w-[100vw]` ao container principal alem do `overflow-x-hidden` existente

## 3. KPI Grids — Dashboard (`src/pages/Dashboard.tsx`)

Atualizar grids de cards KPI:
- `grid-cols-1 sm:grid-cols-3` → `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
- `grid-cols-2 sm:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`

## 4. KPI Grids — Transactions (`src/pages/Transactions.tsx`)

- `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7`
- A grid fixa de colunas `grid-cols-[40px_1fr_...]` (usada como tabela custom) sera envolvida num container com `overflow-x: auto` se nao estiver ja

## 5. KPI Grids — PagarReceber (`src/pages/PagarReceber.tsx`)

- `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## 6. Banks grid (`src/pages/Banks.tsx`)

- `md:grid-cols-2 lg:grid-cols-3` — ja responsivo, manter

## 7. Kanban (`src/components/fiscal/KanbanBoard.tsx`)

- O container `flex gap-4 overflow-x-auto` ja permite scroll interno — adicionar `flex-shrink-0` nas colunas e garantir `min-w-[260px]` (ja existe)
- Adicionar um fade gradient visual a direita como indicador de scroll

## 8. Modais e Drawers

Adicionar regra CSS global:
```css
[role="dialog"] {
  max-width: min(480px, calc(100vw - 32px));
}
```
Com excecao para Sheet (sidebar mobile), que ja usa largura propria.

## 9. Sidebar — cor atualizada

Ja mencionado no item 1: atualizar `--apple-mat-sidebar` no `.dark` para `rgba(28,28,28,0.94)`.

---

## Arquivos modificados

| Arquivo | Tipo de mudanca |
|---------|----------------|
| `src/index.css` | Regras globais de overflow, tipografia, imagens, cores dark |
| `src/components/layout/AppLayout.tsx` | max-w-[100vw] |
| `src/pages/Dashboard.tsx` | Grid breakpoints |
| `src/pages/Transactions.tsx` | Grid breakpoints + overflow container |
| `src/pages/PagarReceber.tsx` | Grid breakpoints |
| `src/components/fiscal/KanbanBoard.tsx` | flex-shrink-0, fade gradient |

Nenhuma logica, dado, texto ou funcionalidade sera alterada.

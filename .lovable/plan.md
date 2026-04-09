

## Plano: Reskin Visual Premium — Estética Apple-Inspired

### Interpretação da Referência

A referência (Grounddesk) apresenta: sidebar escura com ícones-only, cards com tipografia grande e limpa, gráfico de linha suave com gradiente, fundo muito escuro (dark) ou branco puro (light), espaçamento generoso, cantos arredondados grandes, sombras mínimas e superfícies com separação sutil. O objetivo é trazer essa sensação de "produto nativo premium" sem copiar literalmente.

### Elementos Visuais que Serão Alterados

| Elemento | Estado Atual | Direção Premium |
|----------|-------------|-----------------|
| Fonte | Sora | SF Pro Display (system -apple-system fallback) |
| Paleta Light | bg `0 0% 98%`, card white, primary blue forte | bg `0 0% 99%`, card white puro, primary indigo suave `228 76% 52%` |
| Paleta Dark | bg `0 0% 14%` (#232323) | bg `228 15% 10%` (azul-escuro sutil, não cinza puro) |
| Cards | `shadow-sm`, `border-border/50`, `rounded-lg` | `shadow-none` (light) / `shadow-none` (dark), `border-border/30`, `rounded-2xl` |
| Bordas | `border-border` visíveis | Mais sutis, `border/20-30` opacity |
| Spacing | `p-5` nos cards, `gap-4` | `p-6` nos cards, `gap-5` — mais respiro |
| Tipografia KPIs | `text-4xl font-extrabold` | `text-3xl font-semibold tracking-tight` — mais elegante |
| Header | `h-16`, `border-b`, `backdrop-blur` | `h-14`, sem borda, apenas sombra sutil `shadow-[0_1px_0_0_hsl(var(--border)/0.5)]` |
| Sidebar | `border-r`, ícones Lucide padrão | Sem borda visível, separação por sombra sutil, ícones com `strokeWidth={1.5}` |
| Botões | `rounded-md` | `rounded-xl` |
| Radius global | `0.75rem` | `1rem` |
| Gráficos | Cores saturadas | Mesmas cores com 80% opacity, stroke mais fino |

### Partes que Permanecem 100% Intactas

- Toda lógica de negócio, hooks, queries, mutations
- Todos os dados, valores, métricas, cálculos
- Quantidade, ordem e estrutura dos cards
- Tabelas, colunas, filtros, ordenação, paginação
- Rotas, navegação, autenticação, permissões
- Textos, labels, nomenclaturas
- Componentes de diálogo/modal (apenas herdarão a nova paleta via CSS vars)

### Arquivos Editados (somente visual)

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/index.css` | Nova paleta CSS vars (light + dark), fonte SF Pro, radius global `1rem`, refinamento de scrollbar |
| 2 | `tailwind.config.ts` | `fontFamily` atualizado para SF Pro stack, sem mudança de lógica |
| 3 | `src/components/layout/AppHeader.tsx` | Classes visuais: remover `border-b`, adicionar `shadow-sm`, ajustar `h-14` |
| 4 | `src/components/layout/AppSidebar.tsx` | Classes visuais: suavizar bordas, espaçamento mais generoso, ícones `w-[18px]`, opacidades |
| 5 | `src/components/ui/button.tsx` | `rounded-md` → `rounded-xl`, transição mais suave |
| 6 | `src/components/ui/card.tsx` | `rounded-lg` → `rounded-2xl`, `shadow-sm` → sombra condicional mais sutil |
| 7 | `src/pages/Dashboard.tsx` | Apenas classes CSS: tipografia dos KPIs (`text-3xl font-semibold`), espaçamento (`gap-5`, `p-6`), bordas mais suaves nos cards de pendentes |
| 8 | `src/components/layout/AppLayout.tsx` | `p-6` → `p-8` no main (mais respiro) |

### Paleta Proposta

**Light Mode** (inspirada na referência Light):
- Background: `220 20% 97%` (off-white com toque azulado)
- Card: `0 0% 100%` (branco puro)
- Primary: `228 76% 52%` (indigo sofisticado)
- Muted: `220 14% 94%`
- Border: `220 14% 90%` (quase invisível)

**Dark Mode** (inspirada na referência Dark):
- Background: `228 20% 10%` (azul-escuro profundo, não cinza)
- Card: `228 18% 14%` (elevação sutil)
- Primary: `228 76% 58%` (indigo mais brilhante)
- Border: `228 14% 20%` (muito sutil)

### Fonte SF Pro

Será carregada via `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, sans-serif` — stack nativa que usa SF Pro em dispositivos Apple e fallbacks premium em outros.

### Resumo
- 0 migrations
- 0 alterações de lógica
- 8 arquivos editados (somente classes CSS e variáveis visuais)
- Resultado: interface premium, minimalista e sofisticada


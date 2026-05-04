
## 1. DRE — Fix text contrast on highlighted rows

**File:** `src/pages/DRE.tsx`

In the `CalculatedRow` component (lines 99-124), the rows with `isFinal=true` (lucro_liquido, fluxo_caixa) use `bg-primary/10` background with `text-primary` text — blue on blue.

**Change:** When `isFinal` is true, force all text in those cells to `text-white` and use a solid `bg-primary` background instead of the translucent `bg-primary/10`. This ensures white text on a solid blue row.

Specifically:
- Row className: `bg-primary text-white` (instead of `bg-primary/10 text-primary`)
- Label span: `text-white` (instead of `text-primary`)
- Value cells: `text-white` for all values (previsto, realizado, rxp, percentages) — override the `valueColor()` function for these rows
- Dark mode variant: `dark:bg-primary` (same solid background)

## 2. Compact page headers — consistent layout

Apply a uniform header structure across all pages that have title + action buttons. The pattern:

```
Row 1: [Title + subtitle (left)]  [Action buttons (right, gap-8px)]
Row 2: [Filters / search / quick actions] (when present)
Mobile: title full-width, actions wrap below at w-full
```

**Pages to update:**

| Page | File | Current state | Changes needed |
|------|------|--------------|----------------|
| Dashboard | Dashboard.tsx | Already correct pattern (lines 455-488) | Add `py-4` to header, ensure mobile wrap |
| Movimentações | Transactions.tsx | Already correct (814-838) | Add `py-4`, mobile wrap |
| Pagar/Receber | PagarReceber.tsx | h1 is `text-3xl`, no actions | Reduce to `text-2xl`, add `py-4`, wrap in flex row |
| Boletos | Boletos.tsx | Has `p-6 pb-4` padding | Normalize to `py-4`, keep flex layout |
| Conta Corrente | Banks.tsx | Already correct (165-180) | Add `py-4` |
| Eventos Contábeis | Categories.tsx | Already correct (119-125) | Add `py-4` |
| DRE | DRE.tsx | Already correct (149-170) | Add `py-4` |
| Cliente/Fornecedor | Contacts.tsx | Title alone on row, actions separated below | Move action buttons (view toggle + "Novo Cliente") to same row as title |
| Tarefas Fiscais | FiscalTasks.tsx | Already correct (112-120) | Add `py-4` |
| Contas Recorrentes | RecurringBills.tsx | Already correct (181-190) | Add `py-4` |
| Centro de Disparos | CrmDispatches.tsx | `text-3xl` with icon block | Reduce to `text-2xl`, simplify icon |
| Relatório de Clientes | ClientReport.tsx | `text-3xl` | Reduce to `text-2xl` |

For each header container, the standard classes will be:
```
flex items-center justify-between py-4 flex-wrap gap-4
```
With mobile responsive classes:
```
md:flex-nowrap (title and actions same line on desktop)
```
Action buttons group: `flex items-center gap-2`

No logic, data, routes, or functional behavior will be changed. Only visual spacing, font sizes, and flex alignment.

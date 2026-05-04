
## Plan: Apple-Inspired Design System Variables

### What changes

**Single file edit: `src/index.css`**

1. **Add new Apple design tokens** inside the existing `@layer base` block:
   - Custom CSS variables for backgrounds, text, borders, system colors, badges, nav, and modal overlay -- all with light/dark variants
   - `--font-system` and `--spring` transition variables
   - Radius tokens (`--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill`)

2. **Bridge shadcn variables** to the new Apple tokens at the end of each `:root` / `.dark` block:
   - Map `--background` to the HSL equivalent of `--apple-bg-base`
   - Map `--card` to match `--apple-bg-surface`
   - Map `--border` to match `--apple-border-hair`
   - Map `--sidebar-background` to match `--apple-mat-sidebar`
   - Existing shadcn variables like `--primary`, `--destructive`, `--success`, etc. remain untouched

3. **Add global utility styles** outside `@layer base` (after the utilities layer):
   - Sidebar glass effect (`backdrop-filter: blur(20px) saturate(180%)`)
   - Navigation item states using the new `--nav-*` variables
   - Card styling with `--apple-mat-card` and `--apple-border-hair`
   - Badge utility classes (`.badge-success`, `.badge-danger`, `.badge-warning`)
   - Monetary value classes (`.value-positive`, `.value-negative`)
   - Global transition on interactive elements

### What stays the same

- All existing shadcn/ui component variables (`--primary`, `--destructive`, `--muted`, etc.) keep their current HSL values
- All existing `@layer utilities` (scrollbar) and `@media print` blocks unchanged
- No logic, data, routes, or component files modified
- The existing `font-family` on `body` stays as-is (already Apple system fonts)

### Verification after implementation

I will use browser tools to check:
1. Light mode: white/light-gray backgrounds, dark text, legible badges
2. Dark mode: black/dark backgrounds, light text, vibrant badges  
3. Sidebar glass blur effect in both modes
4. Pages `/painel-financeiro`, `/movimentacoes`, `/dre` render correctly

## Problem

When a user without `home` in their `allowed_modules` logs in, they land on `/` which triggers `ModuleGuard` to redirect to `/sem-acesso`, even if they have access to other modules.

## Solution

Update `ModuleGuard.tsx` to find the first accessible module and redirect there instead of `/sem-acesso`.

### Changes to `src/components/auth/ModuleGuard.tsx`

Add a module-to-route mapping and a priority list:

```typescript
const MODULE_ROUTE_MAP: Record<string, string> = {
  home: '/',
  financeiro: '/painel-financeiro',
  fiscal: '/fiscal/tarefas',
  clientes: '/contatos',
  legalizacao: '/legalizacao',
  pessoal_rh: '/pessoal-rh',
  configuracoes: '/configuracoes',
};

const MODULE_PRIORITY = ['home', 'financeiro', 'fiscal', 'clientes', 'legalizacao', 'pessoal_rh', 'configuracoes'];
```

When access is denied, instead of immediately redirecting to `/sem-acesso`, find the first module the user can access (intersecting `planModules` and `allowedModules`) and redirect there. Only redirect to `/sem-acesso` if no modules are accessible at all.

### Files modified
- `src/components/auth/ModuleGuard.tsx`

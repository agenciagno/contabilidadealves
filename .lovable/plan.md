
## Padronização de Tamanho de Fonte nos Cards de Contato

### Diagnóstico

No componente `ContactCard` em `src/pages/Contacts.tsx`, os três campos do card possuem tamanhos de fonte diferentes:

| Campo | Classes do `<span>` | Tamanho efetivo |
|---|---|---|
| CNPJ (`contact.document`) | `font-mono text-xs` | **12px** (explicitamente menor) |
| Telefone (`contact.phone`) | *(nenhuma)* | **14px** (herda `text-sm` do `div` pai na linha 155) |
| E-mail (`contact.email`) | *(nenhuma)* | **14px** (herda `text-sm` do `div` pai na linha 155) |

O campo de CNPJ usa `text-xs` (12px) para imitar o estilo monoespaçado de documentos, enquanto Telefone e E-mail herdam `text-sm` (14px) — gerando a inconsistência visual percebida.

### Solução

Padronizar todos os três campos para `text-xs` dentro do card, que é o tamanho mais adequado para informações secundárias em cards compactos. O `font-mono` no CNPJ pode ser mantido (é uma convenção visual para documentos), mas o tamanho deve ser igual para os três.

Também padronizar os placeholders `—` (que já usam `text-xs` corretamente).

### Mudança em `src/pages/Contacts.tsx`

**Linha 180 — Telefone:** Adicionar `text-xs` ao `<span>`:
```tsx
// Antes
<span className="flex-1">{contact.phone}</span>

// Depois
<span className="flex-1 text-xs">{contact.phone}</span>
```

**Linha 196 — E-mail:** Adicionar `text-xs` ao `<span>`:
```tsx
// Antes
<span className="truncate flex-1">{contact.email}</span>

// Depois
<span className="truncate flex-1 text-xs">{contact.email}</span>
```

O CNPJ na linha 164 já tem `text-xs` e permanece inalterado.

### Resultado Visual

Antes:
```
📄 12.345.678/0001-90   ← text-xs (12px)
📞 (11) 99999-9999      ← text-sm (14px) — maior
✉  contato@email.com   ← text-sm (14px) — maior
```

Depois:
```
📄 12.345.678/0001-90   ← text-xs (12px)
📞 (11) 99999-9999      ← text-xs (12px) ✓
✉  contato@email.com   ← text-xs (12px) ✓
```

### Arquivo Modificado

| Arquivo | Linhas alteradas |
|---|---|
| `src/pages/Contacts.tsx` | 180 (Telefone) e 196 (E-mail) — adicionar `text-xs` |

Nenhuma migração de banco de dados. Nenhum outro arquivo alterado.

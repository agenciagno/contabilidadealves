
## Melhorias na Página de Controle de Boletos

### Resumo das 4 Alterações

Todas as mudanças são exclusivamente na página `src/pages/Boletos.tsx`. Nenhuma alteração de banco de dados ou outros arquivos é necessária.

---

### Alteração 1 — Remover botão "Mês atual"

Remover o `<Button>` com texto "Mês atual" (linhas 141–148) da seção de filtros. O usuário ainda consegue navegar pelo seletor de mês com as setas, sem precisar do atalho.

---

### Alteração 2 — Filtro de status como botões (Toggle Group)

Substituir o `<Select>` de status por um grupo de 3 botões visuais lado a lado:

```
[ Todos (12) ]  [ Pendentes (8) ]  [ Gerados (4) ]
```

- **Estilo inativo**: `variant="outline"` com texto neutro
- **Estilo ativo — Todos**: borda + fundo primário  
- **Estilo ativo — Pendentes**: borda âmbar + fundo âmbar claro + texto âmbar  
- **Estilo ativo — Gerados**: borda verde + fundo verde claro + texto verde  

Ao clicar em qualquer botão, o `statusFilter` muda e a lista é filtrada instantaneamente.

---

### Alteração 3 — Card em linha única, sem Badge de tipo

Reestruturar o layout interno do card de múltiplas linhas para **uma linha horizontal compacta**:

```
[👤] Nome do Cliente  |  CNPJ: 00.000... [📋]  Email: email@... [📋]  Tel: (11)... [📋]  |  R$ 1.500,00  Venc. dia 10  |  [Badge Status]
```

Mudanças específicas:
- **Remover** o `<Badge>` de tipo (Cliente/Fornecedor/Cliente/Forn.)
- **Col 2 (contato)**: mudar de `space-y-0.5` (vertical) para `flex items-center gap-3 flex-wrap` (horizontal), colocando CNPJ, Email e Tel na mesma linha com separadores visuais
- **Ajustar altura do card**: `p-3` para ficar mais compacto
- O ícone de avatar (`<User>`) permanece para identificação visual

---

### Alteração 4 — Badge "Pendente" mais legível

O problema atual: o badge Pendente usa `text-warning-foreground` sobre `bg-background`, que em modo claro resulta em texto quase invisível.

Novo estilo para o estado PENDING:

```tsx
// Antes (difícil de ler)
'bg-background border border-warning/60 text-warning-foreground'

// Depois (legível e contrastado)
'bg-amber-100 border border-amber-400 text-amber-800 hover:bg-amber-200'
// Em dark mode: 'dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300'
```

O badge GENERATED permanece como está (verde, já legível).

---

### Arquivo modificado

| Arquivo | Tipo de mudança |
|---|---|
| `src/pages/Boletos.tsx` | Remoção + Refatoração de layout + Correção de estilo |

**Nenhuma migração de banco de dados necessária.**

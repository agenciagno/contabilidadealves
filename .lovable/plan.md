
## Plano: Correção de Modais Cortados no Sistema

### Problema Identificado

Os modais do sistema estão sendo cortados porque o componente base `DialogContent` em `src/components/ui/dialog.tsx` usa posicionamento fixo centralizado (`top-[50%] translate-y-[-50%]`) sem:
- Margens superiores/inferiores de segurança
- Altura máxima limitada à viewport
- Scroll interno para conteúdo extenso

Isso faz com que modais com muito conteúdo (como TransactionFormDialog e RecurringFormDialog) ultrapassem os limites da tela, cortando o botão "Salvar".

---

### Solução

Modificar o componente base `DialogContent` para garantir que todos os modais do sistema:
1. Tenham margens superior e inferior de 5% da viewport (my-[5vh])
2. Respeitem uma altura máxima de 90% da viewport (max-h-[90vh])
3. Permitam scroll interno quando o conteúdo exceder o espaço disponível (overflow-y-auto)

---

### Arquivos a Modificar

#### 1. `src/components/ui/dialog.tsx` - Componente Base

**Alteração no `DialogContent`:**

```tsx
// ANTES (linha 38-40):
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ...",
  className,
)}

// DEPOIS:
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 max-h-[90vh] overflow-y-auto my-[5vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  className,
)}
```

**Classes adicionadas:**
- `max-h-[90vh]` - Limita altura a 90% da viewport
- `overflow-y-auto` - Permite scroll vertical quando necessário

---

#### 2. `src/components/contacts/DocumentPreviewDialog.tsx` - Caso Especial

Este modal já usa `h-[90vh]` e precisa de ajuste específico para evitar conflito com a nova regra base:

```tsx
// ANTES (linha 43):
<DialogContent className="max-w-4xl h-[90vh] flex flex-col">

// DEPOIS:
<DialogContent className="max-w-4xl h-[85vh] max-h-[85vh] flex flex-col">
```

---

### Benefícios da Solução

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Margem superior | 0 | 5vh |
| Margem inferior | 0 | 5vh |
| Altura máxima | Sem limite | 90vh |
| Overflow de conteúdo | Cortado | Scroll automático |
| Botão Salvar | Inacessível em telas pequenas | Sempre visível via scroll |

---

### Modais Beneficiados Automaticamente

Como a correção é no componente base, todos os modais serão corrigidos:

- `TransactionFormDialog.tsx` (sm:max-w-3xl)
- `ContactFormDialog.tsx` (sm:max-w-3xl)
- `RecurringFormDialog.tsx` (sm:max-w-3xl)
- `BankFormDialog.tsx` (sm:max-w-md)
- `CategoryFormDialog.tsx` (sm:max-w-md)
- `PartnerFormDialog.tsx` (sm:max-w-md)
- `UserFormDialog.tsx` (sm:max-w-[500px])
- `GenerateFeesDialog.tsx` (sm:max-w-lg)
- `DashboardWidgets.tsx` (sm:max-w-md)
- `ContactDocumentsTab.tsx` (dialog de upload)

---

### Detalhes Técnicos

A solução usa CSS puro via Tailwind, sem necessidade de JavaScript adicional:

1. **`max-h-[90vh]`**: Garante que o modal nunca ultrapasse 90% da altura da janela
2. **`overflow-y-auto`**: Adiciona barra de rolagem somente quando necessário
3. **Posicionamento mantido**: O `top-[50%] translate-y-[-50%]` continua centralizando, mas agora respeitando os limites

O scroll interno garante que:
- O cabeçalho (DialogHeader) permanece visível no topo
- O conteúdo do formulário rola normalmente
- Os botões de ação ficam acessíveis via scroll

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/dialog.tsx` | Adicionar `max-h-[90vh] overflow-y-auto` ao DialogContent |
| `src/components/contacts/DocumentPreviewDialog.tsx` | Ajustar altura para `h-[85vh] max-h-[85vh]` |

**Total**: 2 arquivos, correção global para todos os ~10+ modais do sistema.

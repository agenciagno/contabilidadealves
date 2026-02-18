
## Botão de Atualização Manual na Página de Boletos

### Diagnóstico do Problema

Quando um novo contato é habilitado para boleto (`boleto_active = true`) e o mês atual já possui registros gerados, o sistema NÃO adiciona automaticamente esse novo contato à listagem por dois motivos:

1. **`staleTime: 1000 * 30`** nas queries — o cache não expira por 30 segundos.
2. **Lazy Generation só funciona quando `boletoControls.length === 0`** — se o mês já tem registros, o efeito não dispara para contatos novos.

A solução mais direta e robusta é expor uma função `refetch` do hook e adicionar um botão de atualização manual visível na interface.

---

### Mudanças Planejadas

#### 1. `src/hooks/useBoletoControls.ts`

Exportar a função `refetch` de ambas as queries (`boleto-controls` e `contacts-boleto-active`) e combiná-las em uma única função `refreshAll` que invalida os dois caches simultaneamente:

```typescript
// Extrair refetch das queries
const { data: boletoControls, isLoading: isLoadingControls, refetch: refetchControls } = useQuery(...)
const { data: activeContacts, isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery(...)

// Função combinada exportada
const refreshAll = async () => {
  await Promise.all([refetchControls(), refetchContacts()]);
};

return {
  boletoList,
  isLoading,
  isGenerating: generateMonth.isPending,
  toggleStatus,
  refresh: refreshAll,          // ← novo
  isRefreshing: isLoadingControls || isLoadingContacts,  // ← novo
};
```

#### 2. `src/pages/Boletos.tsx`

Adicionar um botão de ícone `RefreshCw` (já disponível no `lucide-react`) no cabeçalho, ao lado do botão "Imprimir Lista". O ícone gira enquanto o recarregamento está em andamento:

```tsx
import { RefreshCw } from 'lucide-react';

// No cabeçalho, ao lado do botão de impressão:
<Button
  variant="outline"
  size="icon"
  onClick={refresh}
  disabled={isLoading || isGenerating}
  title="Atualizar listagem"
>
  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
</Button>
```

---

### Layout do Cabeçalho Após a Mudança

```text
[ ⊕ Controle de Boletos ]                    [ ↺ ] [ 🖨 Imprimir Lista ]
  Geração e controle mensal de cobranças
```

O ícone `↺` fica discreto (apenas ícone, `size="icon"`) para não ocupar espaço, mas claramente identificável com o tooltip "Atualizar listagem" ao passar o mouse.

---

### Comportamento Resultante

| Situação | Comportamento |
|---|---|
| Clica em `↺` | Recarrega contatos ativos + boleto_controls do mês |
| Novo contato adicionado com boleto ativo | Aparece na lista após clicar em `↺` |
| Clique durante carregamento | Botão fica desabilitado (não dispara dupla requisição) |
| Ícone durante recarregamento | Gira (feedback visual) |

---

### Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---|---|
| `src/hooks/useBoletoControls.ts` | Expor `refresh` e `isRefreshing` |
| `src/pages/Boletos.tsx` | Importar `RefreshCw`, adicionar botão no cabeçalho |

Nenhuma migração de banco de dados necessária.

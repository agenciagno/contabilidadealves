## Novo Módulo: Controle de Boletos

### Visão Geral

Este módulo envolve: alterações no banco de dados (2 migrações), extensão do formulário de clientes, criação de um hook dedicado, uma nova página, e integração na sidebar e no roteador.

---

### Arquivos Envolvidos

```text
src/
├── App.tsx                                      (adicionar rota /boletos)
├── components/layout/AppSidebar.tsx             (adicionar item no menu Financeiro)
├── components/contacts/ContactFormDialog.tsx    (adicionar seção de configuração de boletos)
├── hooks/useContacts.ts                         (estender Contact interface + ContactInsert)
├── hooks/useBoletoControls.ts                   (NOVO - hook central do módulo)
├── pages/Boletos.tsx                            (NOVO - página principal)
└── index.css                                    (adicionar @media print styles)
```

---

### Frente 1: Banco de Dados (2 migrações)

#### Migração 1 — Adicionar campos à tabela `contacts`

```sql
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS boleto_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boleto_value NUMERIC,
  ADD COLUMN IF NOT EXISTS boleto_due_day INTEGER,
  ADD COLUMN IF NOT EXISTS boleto_start_date DATE;
```

#### Migração 2 — Criar tabela `boleto_controls`

```sql
CREATE TABLE public.boleto_controls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  reference_month DATE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'PENDING',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.boleto_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view boleto_controls from their company"
  ON public.boleto_controls FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create boleto_controls for their company"
  ON public.boleto_controls FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update boleto_controls from their company"
  ON public.boleto_controls FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete boleto_controls from their company"
  ON public.boleto_controls FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));
```

**Nota técnica:** `reference_month` armazenará sempre o dia 1 do mês (ex: `2026-02-01`) para facilitar comparações de mês.

---

### Frente 2: Extensão do `useContacts.ts`

A interface `Contact` recebe 4 novos campos opcionais:

```tsx
export interface Contact {
  // ... campos existentes
  boleto_active: boolean;
  boleto_value: number | null;
  boleto_due_day: number | null;
  boleto_start_date: string | null;
}

export type ContactInsert = Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
```

Nenhuma lógica de query precisa mudar — o `SELECT *` já trará os novos campos automaticamente.

---

### Frente 3: Formulário de Clientes (`ContactFormDialog.tsx`)

Adiciona-se uma seção visualmente separada abaixo das Observações, com um divisor e ícone de boleto:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧾 Configuração de Boletos
━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Switch] Gerar Boleto Mensal?

↓ (se Switch ATIVO, exibe condicionalmente:)

[Valor R$]  [Dia Vencimento (1-31)]  [Data Início (Datepicker)]
```

**Novos estados:**

```tsx
const [boletoActive, setBoletoActive] = useState(false);
const [boletoValue, setBoletoValue] = useState('');
const [boletoDueDay, setBoletoDueDay] = useState('');
const [boletoStartDate, setBoletoStartDate] = useState('');
```

**useEffect atualizado** para preencher ao editar:

```tsx
setBoletoActive(contact.boleto_active || false);
setBoletoValue(contact.boleto_value?.toString() || '');
setBoletoDueDay(contact.boleto_due_day?.toString() || '');
setBoletoStartDate(contact.boleto_start_date || '');
```

**handleSubmit atualizado:**

```tsx
onSubmit({
  ...existingFields,
  boleto_active: boletoActive,
  boleto_value: boletoActive && boletoValue ? parseFloat(boletoValue) : null,
  boleto_due_day: boletoActive && boletoDueDay ? parseInt(boletoDueDay) : null,
  boleto_start_date: boletoActive ? boletoStartDate || null : null,
});
```

O `DialogContent` terá `max-h-[90vh] overflow-y-auto` para não cortar o conteúdo expandido.

---

### Frente 4: Hook Dedicado (`useBoletoControls.ts`) — NOVO

Este hook centraliza toda a lógica do módulo:

```tsx
// Queries
const useBoletoControls = (referenceMonth: string) => {
  // 1. Busca todos os boleto_controls do mês
  // 2. Busca todos os contacts com boleto_active = true
  // 3. Lógica de Lazy Generation: se boleto_controls estiver vazio para o mês,
  //    cria automaticamente os registros PENDING
  // 4. Retorna a lista mesclada (boleto_controls JOIN contacts)
  // 5. Mutação para toggle de status (PENDING ↔ GENERATED)
}
```

**Lazy Generation (lógica no hook):**

```tsx
// Após carregar os dados, useEffect verifica:
useEffect(() => {
  if (!isLoading && boletoControls.length === 0 && activeContacts.length > 0) {
    // Cria registros PENDING para todos os contacts com boleto_active=true
    generateMonthBoletos(referenceMonth, activeContacts);
  }
}, [boletoControls, activeContacts, isLoading]);
```

**Mutação de toggle de status:**

```tsx
const toggleStatus = useMutation({
  mutationFn: async ({ id, currentStatus }) => {
    const newStatus = currentStatus === 'PENDING' ? 'GENERATED' : 'PENDING';
    const { error } = await supabase
      .from('boleto_controls')
      .update({ 
        status: newStatus,
        generated_at: newStatus === 'GENERATED' ? new Date().toISOString() : null
      })
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boleto-controls'] })
});
```

---

### Frente 5: Página Principal (`src/pages/Boletos.tsx`) — NOVO

**Cabeçalho com filtros:**

```text
[Título: Controle de Boletos]          [Imprimir Lista]
[Mês de Referência ▼] [Status: Todos/Pendentes/Gerados ▼] [Limpar]
```

**Filtro de mês:** Um botão com o mês atual que abre um popover com navegação de mês (anterior/próximo), exibindo `MM/AAAA`.

**Lista de Cards (cada linha é um boleto):**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [👤] Nome do Cliente                                                   │
│      (•) CNPJ: 00.000...    [📋]    E-mail: nome@email.com [📋]        │
│           Tel: (11) 99999   [📋]                                       │
│                                    R$ 1.500,00  •  Venc. dia 10        │
│                                    [Badge clicável: PENDENTE/GERADO]   │
└────────────────────────────────────────────────────────────────────────┘
```

**Grid Layout da linha:**

- Col 1 (flex-1): Ícone + Nome 
- Col 2 (flex-1): CNPJ, E-mail, Telefone (cada um com ícone Copy)
- Col 3 (auto): Valor + Dia de vencimento  
- Col 4 (auto): Badge de status clicável

**Badge de status:**

```tsx
// PENDING: variant="outline" com classe text-amber-600 border-amber-300
// GENERATED: variant="default" com classe bg-emerald-600
// Ao clicar: chama toggleStatus.mutate({ id, currentStatus })
```

**Copy to clipboard:** Mesmo padrão já usado em `Contacts.tsx` — `navigator.clipboard.writeText()` com toast de confirmação.

---

### Frente 6: CSS de Impressão (`index.css`)

Adicionar ao final do arquivo:

```css
@media print {
  /* Ocultar elementos de navegação */
  [data-sidebar],
  nav,
  header,
  .print-hidden {
    display: none !important;
  }

  /* Garantir fundo branco e cor preta */
  * {
    background: white !important;
    color: black !important;
    box-shadow: none !important;
  }

  /* Cards com borda simples */
  .card, [class*="border"] {
    border: 1px solid #ddd !important;
  }

  /* Quebra de página controlada */
  .boleto-card {
    page-break-inside: avoid;
  }
}
```

Os botões de filtro, o cabeçalho da página e botões de ação terão a classe `print-hidden` para sumir na impressão. O layout de impressão exibe apenas as cards da lista.

---

### Frente 7: Sidebar e Roteador

`**AppSidebar.tsx**` — adicionar ao array `items` do módulo "Financeiro":

```tsx
import { FileCheck } from 'lucide-react';
// iconMap: 'file-check': FileCheck
{ title: 'Boletos', url: '/boletos', icon: FileCheck, iconName: 'file-check' }
```

`**App.tsx**` — adicionar a rota:

```tsx
import Boletos from "@/pages/Boletos";
// ...
<Route path="/boletos" element={<AppLayout><Boletos /></AppLayout>} />
```

---

### Resumo dos Arquivos


| Arquivo                 | Ação                                        |
| ----------------------- | ------------------------------------------- |
| Migração DB 1           | ALTER TABLE contacts — 4 novos campos       |
| Migração DB 2           | CREATE TABLE boleto_controls + RLS          |
| `useContacts.ts`        | Estender interface Contact + ContactInsert  |
| `ContactFormDialog.tsx` | Adicionar seção "Configuração de Boletos"   |
| `useBoletoControls.ts`  | NOVO — hook completo do módulo              |
| `Boletos.tsx`           | NOVO — página principal                     |
| `index.css`             | Adicionar @media print                      |
| `AppSidebar.tsx`        | Adicionar item "Boletos" no menu Financeiro |
| `App.tsx`               | Adicionar rota /boletos                     |


**Total: 2 migrações + 2 arquivos novos + 5 arquivos editados**
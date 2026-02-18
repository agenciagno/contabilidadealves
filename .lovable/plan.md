
# Atualização do Perfil do Cliente — 4 Melhorias

## Visão Geral das Mudanças

São 4 áreas de modificação independentes. Cada uma afeta arquivos específicos sem sobrepor as demais.

---

## Item 1 — Aba Financeiro: Card "Total Vencido"

**Arquivo:** `src/components/contacts/ContactFinancialTab.tsx`

**Lógica atual:** O componente já possui `transactions` com os campos `is_paid`, `due_date` e `type`. Basta adicionar um novo cálculo no objeto `summary`.

**Nova métrica:**
```
totalVencido = receitas onde is_paid = false E due_date < hoje
```

**Mudança no objeto `summary`** (onde estão `totalPago` e `totalPendente`):
- Adicionar `totalVencido` filtrando `t.type === 'receita' && !t.is_paid && t.due_date && t.due_date < today`

**Novo card visual** — inserido após o card "Total Pendente", na mesma grid:
- Ícone: `AlertTriangle` com fundo `bg-red-500/10` e cor `text-red-500`
- Valor: `text-2xl font-bold text-red-500`
- Título: "Total Vencido"
- A grid passará de `sm:grid-cols-2` para `sm:grid-cols-3` para acomodar os 3 cards

---

## Item 2 — Aba Documentos: Feedback Visual de Upload

**Arquivo:** `src/components/contacts/ContactDocumentsTab.tsx`

**Estado atual:** O botão de upload chama `uploadDocument.mutateAsync` sem feedback visual. A flag `uploadDocument.isPending` já existe via TanStack Query mas não é utilizada na UI.

**Mudanças:**

**Estado "Enviando":** Quando `uploadDocument.isPending === true`, substituir o conteúdo da zona de drop por:
- Spinner (`Loader2` com `animate-spin`)
- Texto "Realizando upload..."
- Botão de Upload desabilitado

**Estado "Concluído":** Adicionar estado local `uploadSuccess: boolean` que é setado para `true` no `onSuccess` do `uploadDocument` e volta para `false` após 2 segundos via `setTimeout`. Quando `uploadSuccess === true`, exibir na zona de drop:
- Ícone `CheckCircle2` em verde com classe `animate-bounce` (CSS nativo, sem dependência extra)
- Texto "Upload concluído!" em `text-emerald-500`

**A transição** ocorre por CSS usando `transition-all duration-300` na zona de drop, fazendo a mudança de cor suave.

---

## Item 3 — Nova Aba "Certificados e Alvarás"

**Arquivos afetados:**
- `src/pages/ContactProfile.tsx` — adicionar TabsTrigger + TabsContent
- Novo arquivo: `src/components/contacts/ContactCertificatesTab.tsx`

**Posição na navegação:** Logo após a aba "Documentos" (entre "Documentos" e "Cadastro"), conforme o design definido em memória.

**Ordem final das abas:**
1. Financeiro
2. Comunicação
3. Documentos
4. **Certificados e Alvarás** ← nova
5. Cadastro
6. Logs

**Tab trigger:** Ícone `ShieldCheck` de `lucide-react` + texto "Certificados" (visível apenas em `sm:`)

**Conteúdo do placeholder** (`ContactCertificatesTab.tsx`):
```
ícone: ShieldCheck (h-20 w-20 text-muted-foreground/30)
texto grande: "EM BREVE" (text-4xl font-black tracking-widest)
subtítulo: "Gestão de CNDs e Alvarás digitais" (text-muted-foreground)
```
Centralizado verticalmente com `min-h-[300px]` usando flexbox.

**Nota:** A TabsList terá agora 6 colunas — ajuste de `grid-cols-5` para `grid-cols-6`.

---

## Item 4 — Aba Cadastro: Remoção de Sócios + Edição com Sheet

**Arquivos afetados:**
- `src/components/contacts/ContactDetailsTab.tsx` — remover seção Sócios, adicionar botões de edição em cada card
- Novo arquivo: `src/components/contacts/ContactEditSheet.tsx` — Sheet de edição genérico

### 4a — Remoção da seção "Sócios"

Remover completamente o Card "Sócios" (linhas 154–214 do arquivo atual), incluindo:
- O import de `useContactPartners` e `PartnerFormDialog`
- O import de `Users`, `Plus`, `Percent`
- O AlertDialog de confirmação de exclusão de sócio
- Todos os handlers: `handlePartnerSubmit`, `handleEditPartner`, `handleNewPartner`, `handleDeletePartner`
- Os estados: `partnerDialogOpen`, `editingPartner`, `deletePartnerId`

### 4b — Botão de edição em cada Card

Cada um dos 4 cards existentes terá um ícone `Pencil` discreto no `CardHeader`, alinhado à direita:

| Card | Campos editáveis no Sheet |
|---|---|
| Informações de Contato | email, phone, document, representative_legal |
| Endereço | cep, address, address_number, neighborhood, city, state |
| Dados Fiscais | tax_regime, is_active |
| Observações | notes |

### 4c — Novo componente `ContactEditSheet.tsx`

Um único Sheet genérico que recebe:
- `contact: Contact` — dados atuais
- `section: 'contato' | 'endereco' | 'fiscal' | 'observacoes'` — qual seção está sendo editada
- `open: boolean` e `onOpenChange`

O Sheet usa o componente `Sheet` existente em `src/components/ui/sheet.tsx`.

**Dentro do Sheet:**
- Título dinâmico conforme a seção
- Campos pré-preenchidos com os dados atuais do contato
- Botão "Salvar" que chama `useContacts().updateContact` (mutation já existente no hook)
- Botão "Cancelar"

**Campos por seção:**
- **Contato:** `Input` para email, phone, document; `Input` para representative_legal
- **Endereço:** `Input` para CEP (com busca automática via ViaCEP, já implementada em `ContactFormDialog`), address, address_number, neighborhood, city; `Select` para state
- **Fiscal:** `Select` para tax_regime; `Switch` para is_active
- **Observações:** `Textarea` para notes

**Mutation de update:** Usar `useContacts()` que já expõe `updateContact`. Após sucesso, chamar `onOpenChange(false)` e invalidar a query `['contacts']`.

---

## Resumo de Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `src/components/contacts/ContactFinancialTab.tsx` |
| Modificar | `src/components/contacts/ContactDocumentsTab.tsx` |
| Modificar | `src/pages/ContactProfile.tsx` |
| Modificar | `src/components/contacts/ContactDetailsTab.tsx` |
| Criar | `src/components/contacts/ContactCertificatesTab.tsx` |
| Criar | `src/components/contacts/ContactEditSheet.tsx` |

Nenhuma mudança de banco de dados ou hooks principais é necessária — toda a lógica de update já existe em `useContacts`.

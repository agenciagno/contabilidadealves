## Card "Configurações de Cobrança" no perfil do cliente

### Banco
Migração na tabela `contacts`:
- `canal_entrega` TEXT NULL
- `numero_cliente_sicoob` INTEGER NULL
- `enviar_cobranca_auto` BOOLEAN NOT NULL DEFAULT false

(`boleto_value`, `boleto_due_day`, `boleto_active` já existem.)

### Tipagem (`src/hooks/useContacts.ts`)
Adicionar à interface `Contact`:
- `canal_entrega: string | null`
- `numero_cliente_sicoob: number | null`
- `enviar_cobranca_auto: boolean`

E permitir esses campos em `ContactInsert` (opcionais).

### Novo componente
`src/components/contacts/ContactBillingCard.tsx` — card autônomo, recebe `contact: Contact`. Usa `useContacts().updateContact` para todas as alterações.

Conteúdo:
- Header padrão (mesma estética dos demais cards): `<Card className="bg-card border-border/50">`, título "Configurações de Cobrança" com ícone `FileText`, botão lápis no canto que abre o sheet de edição.
- **Grupo A (display)** — leitura, com botão lápis no header do card (padrão da aba):
  - Valor mensal de honorários: `R$ X,XX` ou "Não configurado"
  - Dia de vencimento: `5 / 10 / 15 / 20` ou "Não configurado"
  - Canal de entrega: label legível (WhatsApp / E-mail / Impresso / WhatsApp + E-mail) ou "Não configurado"
  - Nº cliente Sicoob: número ou "Não configurado", em `text-muted-foreground`
- **Divisor** `border-t border-border/50 pt-4 mt-4` + título "Automações" (`text-sm font-medium text-muted-foreground`)
- **Grupo B (toggles inline, sem sheet)**:
  - Switch "Gerar boleto automaticamente" + descrição. Optimistic update via `updateContact.mutateAsync`. Em erro, reverte estado local; toast sucesso "Configuração salva" e erro "Erro ao salvar. Tente novamente."
  - Switch "Enviar cobrança automaticamente" + descrição. `disabled` quando `boleto_active === false`, com `Tooltip` "Ative a geração automática primeiro". Mesmo padrão optimistic.

### Edição inline do Grupo A
Estender `ContactEditSheet.tsx` com nova seção `'cobranca'`:
- Input numérico (R$) → `boleto_value`
- Select 5/10/15/20 → `boleto_due_day` (sentinel `"none"` → null)
- Select de canal → `canal_entrega`
- Input numérico → `numero_cliente_sicoob`

Adicionar `'cobranca'` ao type `Section`, ao `sectionTitles`, aos states/reset/handleSave. Botão lápis do novo card chama `setEditSection('cobranca')`.

### Integração
`ContactDetailsTab.tsx`: renderizar `<ContactBillingCard contact={contact} />` logo após o card "Dados Fiscais", dentro do mesmo grid (col-span se necessário para ficar visualmente "abaixo" — sigo o grid `md:grid-cols-2` atual; o card cai naturalmente na próxima linha).

### Fora de escopo
- Lógica real de geração/envio de boleto (apenas persiste a flag).
- Outros cards, abas, listagens.

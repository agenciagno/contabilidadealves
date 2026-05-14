## Adicionar "Colaborador Responsável" ao card Dados Fiscais

### Arquivos afetados
- `src/components/contacts/ContactDetailsTab.tsx` — exibição do campo no card Dados Fiscais
- `src/components/contacts/ContactEditSheet.tsx` — edição inline (seção `fiscal`)

### Banco
Sem mudanças. Coluna `responsible_id` já existe em `contacts`.

### Mudanças

**ContactDetailsTab.tsx — card "Dados Fiscais"**
Adicionar após o bloco "Status" um terceiro item:
- Label: "Colaborador Responsável"
- Valor: nome (`full_name`) do profile referenciado por `contact.responsible_id`, ou `"Não atribuído"` em `text-muted-foreground` se vazio
- Buscar profiles via `useQuery` (`profiles` onde `status_active = true`, ordenado por `full_name`) — reaproveitado para resolver o nome
- Sem ícone novo: o lápis de edição já está no header do card e abre a seção `fiscal`

**ContactEditSheet.tsx — seção `fiscal`**
Adicionar campo após o bloco Status:
- Estado novo `responsibleId` inicializado de `contact.responsible_id`
- `Select` com opção "Não atribuído" (mapeada para `null`, usando o padrão de Radix com sentinel `"none"`) + lista de profiles ativos (`full_name`)
- Persistir em `responsible_id` no `handleSave` quando `section === 'fiscal'`

### Fora de escopo
- Outros cards, abas, validações, layout, ou listagem de contatos.
- Tipagem: `responsible_id` já existe em `Contact`.

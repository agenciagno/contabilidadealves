## Ajustes no modal de cadastro de Cliente/Fornecedor

Arquivo afetado: `src/components/contacts/ContactFormDialog.tsx`
Tabela afetada: `contacts` (a tabela "clientes" do projeto)

### 1. Banco de dados
Criar nova coluna na tabela `contacts`:
- `whatsapp` — texto, opcional (nullable), sem default

(Sem alterações em RLS, triggers ou outros campos.)

### 2. Remover do modal
- Toda a seção **"Configuração de Boletos"** (separator, título, toggle "Gerar Boleto Mensal?" e os campos Valor / Dia de Vencimento / Data de Início).
- Toda a seção **"Colaborador Responsável"** (separator, label e Select).
- Estados, efeitos e payload relacionados: `boletoActive`, `boletoValue`, `boletoDueDay`, `boletoStartDate`, `responsibleId`, a query `company-profiles-form`, imports não utilizados (`Switch`, `Separator`, `FileCheck`, `useQuery`, `supabase`, `useCompany`).
- Os campos `boleto_active`, `boleto_value`, `boleto_due_day`, `boleto_start_date` e `responsible_id` deixam de ser enviados pelo `onSubmit` deste modal (continuam existindo no banco e em outros lugares — apenas este modal não os define mais; novos cadastros assumirão os defaults da coluna).

### 3. Adicionar ao modal
Logo após o campo **Telefone**, na mesma linha em grid de 2 colunas (Telefone vira coluna esquerda, WhatsApp coluna direita — ajusto o grid para acomodar):

- Label: **WhatsApp**
- Input texto, opcional
- Placeholder: `(00) 00000-0000`
- Máscara: mesma do telefone (`maskPhone`), `maxLength={15}`
- Estado novo: `whatsapp`
- Persiste no campo `whatsapp` da tabela `contacts`

### 4. Tipagem
Adicionar `whatsapp: string | null` à interface `Contact` e ao tipo `ContactInsert` em `src/hooks/useContacts.ts` para refletir a nova coluna.

### Fora de escopo
- Nenhuma outra alteração visual, de validação, de submit, de rotas ou de outros componentes (ContactEditSheet, perfil etc.) será feita neste passo.
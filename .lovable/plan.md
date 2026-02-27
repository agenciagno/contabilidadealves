

# Auto-criar Clientes/Fornecedores e Contas Bancárias na Importação

## Arquivos a Modificar

| Arquivo | Mudanca |
|---|---|
| `src/components/transactions/ImportSpreadsheetDialog.tsx` | Adicionar props `onCreateContact` e `onCreateBank`; no `processFile`, coletar nomes unicos inexistentes e criar antes de montar transacoes; atualizar helpers de nome no preview |
| `src/pages/Transactions.tsx` | Passar `onCreateContact` e `onCreateBank` ao dialog, usando `createContact` e `createBank` dos hooks |

## Detalhes

### ImportSpreadsheetDialog.tsx

1. Novas props opcionais:
   - `onCreateContact?: (name: string) => Promise<{ id: string }>`
   - `onCreateBank?: (name: string) => Promise<{ id: string }>`

2. Novos estados: `createdContacts` e `createdBanks` (ambos `Map<string, string>`)

3. No `processFile`, apos criar categorias, repetir o mesmo padrao:
   - Coletar nomes unicos da coluna "Cliente/Fornecedor" sem match em `contacts`
   - Criar via `onCreateContact(name)`, armazenar no mapa
   - Coletar nomes unicos da coluna "Conta Bancaria" sem match em `banks`
   - Criar via `onCreateBank(name)`, armazenar no mapa

4. Atualizar resolucao de `contact_id` e `bank_id` para consultar mapas de novos alem das listas existentes

5. Atualizar `contactName` e `bankName` no preview para consultar os mapas

6. Resetar mapas no `resetState`

### Transactions.tsx

Passar as novas props:
- `onCreateContact`: chama `createContact.mutateAsync({ name, type: 'cliente', is_active: true, ... campos obrigatorios com defaults })` e retorna `{ id }`
- `onCreateBank`: chama `createBank.mutateAsync({ name, initial_balance: 0, color: '#10B981', is_active: true })` e retorna `{ id }`

Campos obrigatorios para `ContactInsert`: `name`, `type`, `is_active`, `boleto_active` — restante nullable.


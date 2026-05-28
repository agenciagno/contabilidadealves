
## ⚠️ Aviso importante

Este pedido vai além de reskin visual (regra do projeto). Envolve **reorganização estrutural de UI**, fusão de telas e nova feature (Alvarás com anexo). Vou tratá-lo como exceção explícita autorizada por você. **Nenhum dado, coluna, hook, RLS ou Edge Function existente será removido** — apenas reorganização da UI + 1 mini-extensão para anexos.

## Nova estrutura de abas (`src/pages/ContactProfile.tsx`)

```text
1. Cadastro          (fusão de "Cadastro" + "Cadastro Completo")
2. Alvarás e Certificados   (renomeia "Certificados", adiciona conteúdo)
3. Acessos           (inalterado)
4. Documentos        (inalterado)
5. Financeiro        (sem botão "Gerar Recorrência")
6. Logs              (recebe sub-aba "Comunicação")
```

Remover do `TabsList`: `comunicacao`, `super-perfil`, `dados` (substituídos por `cadastro` único). Atualizar `grid-cols-*` conforme visibilidade de Acessos.

## Aba 1 — Cadastro (novo `ContactCadastroTab.tsx`)

Componente novo com `<Tabs>` internas em 5 sub-abas. Cada sub-aba é um formulário próprio com seu botão **Salvar** independente, reutilizando o hook `useSuperPerfil` (já cobre quase todos os campos via `contacts`).

| Sub-aba | Campos (todos já existentes em `contacts`) | Comportamento |
|---|---|---|
| Identificação & Contatos | `document`, `razao_social`, `nome_fantasia`, `type` (PF/PJ), `natureza_juridica`, `data_abertura_receita`, `situacao_cadastral` (read-only), `email`, `phone`, `whatsapp`, `notes` | Botão buscar CNPJ (BrasilAPI) preenche campos com badge "Receita Federal". **Sem `representative_legal`** (movido p/ Sócios). **Sem 2º e-mail.** *Porte* e *Site*: não existem na tabela hoje — exibir como campos desabilitados com tooltip "Disponível em breve" para não exigir migration. |
| Endereço | `cep`, `address`, `address_number`, `complemento`, `neighborhood`, `city`, `state` | ViaCEP no blur do CEP (lógica de `ContactEditSheet` reaproveitada). |
| Fiscal | `tax_regime` (único), `im`, `ie`, `cnae_principal` (read-only), `cnaes_secundarios` (read-only), `situacao_cadastral` (read-only), Obrigações Fiscais (reaproveitar `ContactObligationsSelector` + `client_obligations`), `status_cliente` | Opções de `tax_regime` conforme o pedido (incl. Imune/Isento — adicionar na lista da UI; coluna aceita texto livre). |
| Operacional | `responsible_id`, `categorias`, **Configurações de Cobrança** (reaproveitar `ContactBillingCard` inteiro), `data_inicio_contrato`, `data_encerramento_*` (escolher Receita como "saída" principal) | RLS de `categorias` preservada. |
| Sócios | `<PartnersSection>` extraído de `SuperPerfilTab` (sem mudança funcional) | "Representante Legal" deve ser marcado no quadro societário (campo já existe em `contact_partners`? — usar o sócio principal; **se não existir flag, mantenho o campo `contacts.representative_legal` apenas oculto na UI, sem apagar dado**). |

`ContactDetailsTab.tsx` e `SuperPerfilTab.tsx` ficam **não-referenciados** (arquivos preservados, sem importação). `ContactEditSheet` é mantido (ainda usado em outros lugares).

## Aba 2 — Alvarás e Certificados (novo `AlvarasCertificadosTab.tsx`)

Aba com 2 seções (cards empilhados): **Certificados Digitais** e **Alvarás**.

- **Certificados**: filtra `acessos_portais` por `portal = 'certificado_digital'`. Reaproveita 100% `AcessosTable` + `AcessoFormDialog`.
- **Alvarás**: precisa de **anexo de arquivo**, que `acessos_portais` não suporta hoje.

**Decisão técnica para Alvarás** — duas opções, ambas mínimas:

```text
Opção A (recomendada — sem migration):
  Usar campos já existentes em contacts: numero_alvara + validade_alvara,
  e armazenar PDF via contact_documents (category = 'alvara'), que já existe.
  Lista mostra cada documento da categoria 'alvara' como um "alvará".
  
Opção B (com micro-migration):
  Adicionar coluna anexo_url text em acessos_portais e novo valor
  'alvara' no enum portal_tipo. Mantém UI idêntica a Certificados.
```

→ Vou implementar **Opção A** por padrão (zero alteração de schema, respeita a restrição "não alterar banco"). Se você preferir B, me avise.

A renomeação da aba (Certificados → Alvarás e Certificados) substitui `ContactCertificatesTab` (que hoje é só placeholder "EM BREVE").

## Aba 3 — Acessos

Sem mudança. Mover `AcessosTab` para fora do bloco condicional `canViewAcessos` **não** — preservar a checagem de permissão atual (admin/super_admin).

## Aba 4 — Documentos

Sem mudança.

## Aba 5 — Financeiro

Em `ContactFinancialTab.tsx`:
- Remover botão **Gerar Recorrência** (linhas 154-157) e o `<RecurringFormDialog>` (linhas 242-248) + estado `recurringDialogOpen` + `handleRecurringSubmit`. Restante (KPIs, contratos, tabela) inalterado.

## Aba 6 — Logs (novo wrapper `ContactLogsWithComunicacaoTab.tsx`)

Wrapper com `<Tabs>` em 2 sub-abas:
- **Auditoria** → `ContactLogsTab` atual, sem mudança.
- **Comunicação** → apenas o **Log de Disparos** (tabela de `contact_messages`) extraído de `ContactCommunicationTab`. Sem composição, sem notas internas.

`ContactCommunicationTab` deixa de ser usado (arquivo preservado). Notas internas (`contact_notes`) deixam de aparecer em qualquer aba — hook e tabela permanecem intactos no banco.

## Resumo de arquivos

**Criar:**
- `src/components/contacts/cadastro/ContactCadastroTab.tsx`
- `src/components/contacts/cadastro/IdentificacaoSubTab.tsx`
- `src/components/contacts/cadastro/EnderecoSubTab.tsx`
- `src/components/contacts/cadastro/FiscalSubTab.tsx`
- `src/components/contacts/cadastro/OperacionalSubTab.tsx`
- `src/components/contacts/cadastro/SociosSubTab.tsx`
- `src/components/contacts/AlvarasCertificadosTab.tsx`
- `src/components/contacts/ContactLogsWithComunicacaoTab.tsx`

**Editar:**
- `src/pages/ContactProfile.tsx` — nova ordem/ícones de abas, novas referências.
- `src/components/contacts/ContactFinancialTab.tsx` — remover botão "Gerar Recorrência".

**Preservar (sem importação, sem deletar):**
- `ContactDetailsTab.tsx`, `SuperPerfilTab.tsx`, `ContactCommunicationTab.tsx`, `ContactCertificatesTab.tsx`.

**Não tocar:** schema, RLS, edge functions, hooks (`useContacts`, `useSuperPerfil`, `useContactNotes`, `useContactMessages`, `useAcessosCliente`, etc.), `client.ts`, `types.ts`.

## Confirmação necessária

1. Confirma **Opção A** para Alvarás (sem migration, usa `contact_documents`)?
2. Confirma que os campos **Porte** e **Site** podem ficar como "Em breve" (não existem em `contacts`)?
3. Posso prosseguir mesmo violando a regra de "apenas reskin"?

## Objetivo
Reorganizar `src/components/contacts/ContactDetailsTab.tsx` de 4 cards para 7 cards, exibindo todos os campos novos da interface `Contact`. Nenhum outro arquivo será alterado.

## Estrutura final

| # | Card | Ícone | Campos |
|---|---|---|---|
| 1 | Dados Empresariais | `Building2` | razao_social, nome_fantasia, document, cnae_principal, natureza_juridica, situacao_cadastral, data_abertura_receita, tipo_estabelecimento, status_cliente (badge), tipo_cliente, grupo_escritorio, data_inicio_contrato, categorias (badges) |
| 2 | Contato | `Mail` | name, email, segundo_email_contato, phone, whatsapp, representative_legal |
| 3 | Endereço | `MapPin` | cep, address, address_number, complemento, neighborhood, city, state |
| 4 | Dados Fiscais | `FileText` | tax_regime, ie, im, regime_apuracao, numero_alvara, validade_alvara, registro_entradas, registro_saidas, registro_icms, inventario |
| 5 | Datas por Esfera | `Calendar` | tabela 4 linhas × 3 colunas (Esfera / Abertura / Encerramento) — Junta, RF, Prefeitura, Estado |
| 6 | Departamento Pessoal | `Users` | possui_funcionarios, numero_funcionarios (condicional), tipo_cartao_ponto, medicina_trabalho, grupo_cipa |
| 7 | Observações | `FileText` | notes |

Layout: mantém `grid md:grid-cols-2 gap-6`. Card 5 (tabela) e Card 7 (observações) podem usar `md:col-span-2` para melhor leitura.

## Helpers locais (dentro do componente)

```ts
const fmt = (v: any) => (v === null || v === undefined || v === '') ? '—' : v;
const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
const fmtBool = (b: boolean | null | undefined) => b ? 'Sim' : 'Não';
const fmtCnae = (c: any) => !c ? '—' : typeof c === 'string' ? c : `${c.codigo ?? ''} ${c.descricao ?? ''}`.trim() || '—';
```

Badge de `status_cliente`:
- Ativo → `bg-green-500/15 text-green-600`
- Inativo → `bg-red-500/15 text-red-600`
- Prospect → `bg-yellow-500/15 text-yellow-600`
- Em Processo de Abertura → `bg-blue-500/15 text-blue-600`

`categorias`: render via `Badge` shadcn em linha.

## Botões de edição
`ContactEditSheet` só aceita as 4 sections atuais (`contato`, `endereco`, `fiscal`, `observacoes`) e o usuário pediu para não alterar outros arquivos. Solução:
- Cards 2, 3, 4, 7 mantêm o ícone `Pencil` mapeado para as sections existentes.
- Cards 1, 5, 6 (sem section equivalente) ficam **sem botão de edição** nesta entrega — read-only. Quando o sheet ganhar novas seções, plugamos os botões.

## Manter sem alterar
- `responsibleName` lookup (movido para o Card 1 ou 4? → fica no Card 4 "Dados Fiscais" como já está).
- `<ContactBillingCard />` continua sendo renderizado, posicionado após o Card 4 ou 6 (mantém grid de 2 colunas).
- Não tocar em `ContactEditSheet`, `useContacts`, ou tipos.

## Arquivo alterado
`src/components/contacts/ContactDetailsTab.tsx` (reescrita completa do JSX e adição dos helpers).

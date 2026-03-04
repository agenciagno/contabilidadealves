
Objetivo: eliminar definitivamente o vazamento no filtro da coluna “Cliente / Evento” e estabilizar os popovers de filtro (há warning de ref no console que pode afetar interação/estado do filtro).

Diagnóstico já verificado
- No código atual (`src/pages/Transactions.tsx`), o filtro de contato está em `t.contact_id === cf.contact` (estrito).
- No banco, “ACADEMIA NUTRIVIDA LTDA” e “DENIO SILVA” possuem `contact_id` distintos (não é problema de dados iguais).
- Há warning ativo: `Function components cannot be given refs` apontando para `DateColumnFilter`, indicando problema estrutural nos componentes de filtro/popover.
- Conclusão prática: o bug residual é de comportamento do filtro na UI/estado (não de regra SQL), então vamos reforçar tipagem/estado e remover ambiguidade da coluna mista Cliente/Evento.

Plano de correção (implementação)
1) Refatorar o estado dos filtros de coluna para remover ambiguidade
- Em vez de um único `contact` genérico na coluna “Cliente / Evento”, separar explicitamente:
  - `contactId` (UUID exato)
  - `eventName` (descrição exata, quando o usuário quiser filtrar por evento)
- Regra de aplicação:
  - Se `contactId` selecionado: `t.contact_id === contactId` (strict)
  - Se `eventName` selecionado: `t.description === eventName` (strict)
- Se ambos não estiverem preenchidos, sem filtro da coluna.

2) Refatorar o popover da coluna “Cliente / Evento”
- Criar UI com 2 grupos claros no mesmo popover:
  - “Clientes/Fornecedores” (lista por `id`)
  - “Eventos” (lista por `description` exata)
- Ao selecionar um grupo, limpar o outro (evita OR implícito e estado inválido).
- Exibir indicação visual do filtro ativo no cabeçalho (sem depender de estado ambíguo).

3) Blindagem de estado do filtro
- Se o valor selecionado não existir mais na lista (dados mudaram), limpar automaticamente o filtro inválido.
- Garantir que “Limpar filtros de coluna” zere também todos os subestados internos dos popovers.

4) Corrigir warning de ref dos componentes de filtro
- Ajustar `DateColumnFilter` (e componentes de popover similares) para não receber ref indevido:
  - converter para `forwardRef` no container raiz **ou**
  - envolver com elemento DOM quando necessário no `PopoverContent`.
- Sincronizar estado interno de data (`start/end`) com `value` via `useEffect` para evitar estado antigo ao reabrir.

5) Auditoria rápida dos demais filtros (na mesma tela)
- Confirmar que permanecem strict-match:
  - `type ===`
  - `category_id ===`
  - `bank_id ===`
  - `status (is_paid) ===`
- Manter busca textual (`searchTerm`) como parcial, separada dos filtros de coluna.

Arquivos alvo
- `src/pages/Transactions.tsx` (principal: estado, lógica e popovers de coluna)
- (Opcional para organização) extrair componentes de filtro de coluna para `src/components/transactions/...` mantendo o mesmo comportamento visual.

Validação (aceite)
- Selecionar “ACADEMIA NUTRIVIDA LTDA” em Cliente/Evento deve mostrar apenas transações com `contact_id` da ACADEMIA.
- “DENIO SILVA” não pode aparecer nesse cenário.
- Limpar filtro deve restaurar lista completa sem resíduos.
- Warning de ref no console deve desaparecer ao abrir/usar filtros de data.

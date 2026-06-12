
## Plano — Melhorias TaskDetailModal

Arquivo único alterado: `src/components/fiscal/TaskDetailModal.tsx` (+ um helper novo).

### 1. Indicador SLA no header
Novo bloco logo abaixo do título com cor/ícone/texto conforme dias restantes:
- Concluída → Verde `CheckCircle2`: "Concluída em DD/MM" + sufixo "✓ No prazo" se `completed_at <= due_date`, ou "Entregue com X dias de atraso".
- Atrasada → Vermelho escuro com classe `animate-pulse`, `AlertTriangle`: "Atrasada há X dias".
- 1-2 dias → Vermelho, `AlertTriangle`.
- 3-5 dias → Amarelo, `Clock`.
- >5 dias → Verde, `CheckCircle`.

Helper `getSlaInfo(task)` calcula via `differenceInCalendarDays(parseISO(due_date), today)`.

### 2. Histórico de responsáveis
Se `original_responsible_id && original_responsible_id !== responsible_id`:
- Badge amber abaixo do header: "Originalmente atribuída a [nome original]".
- Tooltip no campo Responsável: "Transferida de [original] em DD/MM" (data = `updated_at` como melhor proxy disponível).

(Confirmar que `original_responsible_id` existe em `FiscalTask`; senão, ignorar a parte e usar apenas o que existir.)

### 3. Link para portal da obrigação
Função `getObligationPortal(title, description)` faz match por keywords:
- DAS/PGDAS-D → SimplesNacional
- DCTFWeb/eSocial/EFD-Reinf → cav.receita
- FGTS → conectividadesocial.caixa
- DCTF/ECF/EFD/SPED → gov.br/receitafederal/sped
- ISS/ISSQN → omitido (sem config por município por enquanto)
- Default → null (não renderiza o botão)

Botão `variant="outline"` com `ExternalLink`, `target="_blank" rel="noopener"`, posicionado ao lado de "Salvar alterações".

### 4. Timeline de Atividade (nova seção/aba)
Adicionar seção "Histórico" entre Notas e Footer. Implementação como lista (sem tabs, mais leve).

Eventos derivados (sem nova tabela):
- `created_at` → "Tarefa criada automaticamente" se `is_auto_generated`, senão "Tarefa criada".
- `original_responsible_id` ≠ `responsible_id` → "Responsável alterado de A para B" (data = `updated_at`).
- `attachment_url` presente → "Arquivo anexado" (data = `updated_at` como proxy).
- `status === 'concluido' && completed_at` → "Tarefa concluída" (data = `completed_at`).

Ordenação DESC por data. Cada item: ícone colorido + texto + `formatDistanceToNow` em ptBR + data absoluta em tooltip.

Ícones/cores:
- Criação: `Plus` cinza
- Status: `ArrowRight` azul
- Responsável: `UserCog` roxo
- Anexo: `Paperclip` âmbar
- Conclusão: `CheckCircle2` verde

### 5. Quick Notes — manter funcionamento atual
A estrutura JSON multi-nota já existe (`parseNotes`, `handleAddNote`). Apenas:
- Garantir que nota legada apareça destacada no topo (já tem badge "legado").
- Manter input atual.

Nenhuma mudança funcional aqui — o requisito já está atendido. Apenas confirmar no plano que não há regressão.

### Detalhes técnicos
- Novos imports: `differenceInCalendarDays`, `formatDistanceToNow` (date-fns), ícones `Clock`, `AlertTriangle`, `CheckCircle2`, `ExternalLink`, `Plus`, `ArrowRight`, `UserCog`, `Tooltip` shadcn.
- Sem mudanças no banco, hooks, ou outros componentes.
- Sem mudanças em `FiscalTask` type — apenas leitura de campos já existentes (`completed_at`, `original_responsible_id`, `updated_at`, `is_auto_generated`, `attachment_url`, `created_at`).
- Se algum campo não existir no tipo, faço fallback com optional chaining sem alterar o tipo.

### O que NÃO muda
- Rotas, permissões, RLS, schema.
- Lógica de upload, salvar, concluir, excluir.
- Outros componentes do Kanban / Lista / Calendário.

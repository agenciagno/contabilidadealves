## Adicionar busca por texto no dropdown de Eventos Contábeis (Consulta Mensal)

Arquivo único: `src/components/transactions/CashFlowReportModal.tsx`.

### Mudanças
- Adicionar estado local `monthlyCategorySearch: string` no componente.
- Dentro do `PopoverContent` do Evento Contábil (modo Consulta Mensal), adicionar acima da lista um `Input` com ícone de lupa (`Search` do lucide-react) e placeholder "Pesquisar evento…".
- Filtrar a lista renderizada de `categories` por `name` (case-insensitive, sem acento) conforme o texto digitado.
- Resetar `monthlyCategorySearch` ao fechar o popover (ou ao abrir o modal).
- Manter checkbox "Todas as categorias" no topo (não filtrado pela busca).
- Manter a multi-seleção, cores, scroll e largura atuais.

### Garantias
- Nenhuma alteração de lógica/dados.
- Nada muda fora deste dropdown.

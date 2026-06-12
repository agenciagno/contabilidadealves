# Plano — Melhorias no Dashboard Fiscal

Tudo será implementado no **frontend**, sem migrations. As colunas `fiscal_due_date`, `completed_at`, `competence_year` e `competence_month` já existem no Supabase externo conectado ao projeto.

## Arquivos alterados

1. **`src/hooks/useFiscalDashboard.ts`** — estender hooks existentes
2. **`src/pages/FiscalDashboard.tsx`** — reescrever a UI (preservando o existente)
3. **`src/index.css`** — adicionar regras `@media print` para layout A4
4. **(opcional)** `src/hooks/useFiscalTasks48h.ts` — novo hook isolado para o widget 48h

Nenhuma rota, nenhuma permissão, nenhum schema é alterado.

## 1. Hook layer (`useFiscalDashboard.ts`)

- `useFiscalTasksOfMonth` passa a selecionar também: `completed_at`, `created_at`, `contact_id` e fazer join `contacts(tax_regime)`. O tipo `FiscalTaskRow` ganha esses campos.
- Novo hook `useFiscalTasks48h(companyId, taxRegime)`: tasks com `fiscal_due_date BETWEEN now AND now+48h`, `status != 'concluido'`, com joins `contacts(name, tax_regime)`, `responsible:profiles(full_name)`, `fiscal_obligations_catalog(name)`. Filtra cliente-side por regime quando aplicável. Ordena por `fiscal_due_date ASC`, limita a 10.
- Novo hook `useFiscalTasksPrevMonth(year, month)`: mesma estrutura do current month, mas calculando ano/mês anterior. Usado só para o comparativo de taxa de cumprimento.

## 2. UI (`FiscalDashboard.tsx`)

Mantém todo o conteúdo atual. Acrescenta, na ordem visual:

```text
[Header: título + ToggleGroup regime + mês/ano + Atualizar + Exportar PDF]
[Banner amarelo: tarefas sem responsável]    ← condicional
[KPIs row 1: Pendentes | Em andamento | Atrasadas | Concluídas]
[KPIs row 2: Taxa de Cumprimento | Comparativo Mês Anterior]
[Card "Vencendo nas Próximas 48h"]
[Gráfico de barras existente]
[Cards de Progresso por Colaborador — incrementados]
[Tabela "Próximos Vencimentos (7 dias)" — existente]
```

### 2.1 ToggleGroup de Regime Tributário
- shadcn `ToggleGroup` (single, default `'todos'`) com opções: Todos / Simples Nacional / Lucro Presumido / Lucro Real. Estado local (sempre volta a "Todos" ao entrar).
- Filtragem cliente-side: `tasks.filter(t => t.contacts?.tax_regime === regime)` aplicada a todos os derivados (kpis, chart, progressList, 48h, semResponsavel, upcoming).

### 2.2 KPIs novos
- **Taxa de Cumprimento**: `concluidasNoPrazo / concluidasTotal * 100`, considerando "no prazo" quando `completed_at <= fiscal_due_date` (ambos truncados para data). Cores: verde ≥90, amarelo 70-89, vermelho <70. Ícone `TrendingUp`. Reaproveita `KpiCard` com prop opcional `valueLabel` para mostrar `"85%"` em vez de fração; ou cria pequeno `RateKpiCard`.
- **Comparativo Mês Anterior**: `taxaAtual - taxaAnterior`. Seta `ArrowUp`/`ArrowDown` (verde/vermelha), formato `+5%` / `-3%` / `0%`. Ícone do card: `ArrowUpDown`.

### 2.3 Widget "Vencendo nas Próximas 48h"
Card próprio acima do gráfico. Título com `Badge` mostrando a contagem.
- Lista (até 10): nome do cliente, obrigação, hora formatada `HH:mm` de `fiscal_due_date`, avatar mini do responsável (`AvatarFallback` com inicial), `StatusBadge`.
- Ordenado por `fiscal_due_date ASC`.
- Empty: ícone `CheckCircle` verde + "Nenhuma obrigação vencendo nas próximas 48 horas".
- Link "Ver todas" → `navigate('/fiscal/tarefas?filter=48h')` (sem implementar o filtro do destino — só repassa a querystring; o Kanban pode reconhecer depois).

### 2.4 Score por colaborador
Em `progressList`, calcular adicionalmente:
- `noPrazoPct` = `(tasksConcluidasNoPrazo / tasksConcluidas) * 100` para esse colaborador.
- `mediaDias` = média de `(completed_at - created_at)` em dias para tasks concluídas no mês.
- Cor da borda do `Card` via `cn('border-l-4', noPrazoPct>=90?'border-l-green-500':noPrazoPct>=70?'border-l-yellow-500':'border-l-red-500')`. Quando não houver concluídas, sem borda colorida.
- Exibir duas linhas extras no card: `Entregas no prazo: X%` e `Média de dias para conclusão: X dias`.

### 2.5 Banner sem responsável
Se `tasks.filter(t => !t.responsible_id && t.status !== 'concluido').length > 0`, mostrar `Alert` amarelo (variant custom usando `bg-yellow-500/10 border-yellow-500/30`) com `AlertTriangle`, contagem e botão `Ver tarefas` → `navigate('/fiscal/tarefas?responsavel=none')`.

### 2.6 Botão Exportar PDF
`Button` outline com ícone `Download` ao lado do Atualizar. `onClick = () => window.print()`.

## 3. Print CSS (`src/index.css`)

```css
@media print {
  @page { size: A4; margin: 12mm; }
  body { background: white !important; }
  /* esconder shell de aplicação */
  aside, header.app-header, [data-sidebar], .no-print { display: none !important; }
  /* expandir conteúdo */
  main { padding: 0 !important; }
  /* evitar quebra dentro de cards */
  .card, [data-card] { break-inside: avoid; page-break-inside: avoid; }
  /* esconder controles interativos */
  button, [role="combobox"] { display: none !important; }
}
```

Aplicar classe `no-print` no header de controles (Select mês/ano, botões) e nada mais — assim KPIs, gráfico, progresso e tabela ficam visíveis na impressão. Verificar se o `AppLayout` tem `aside` para sidebar (esconder via seletor) — caso contrário marcar o container com `data-sidebar` ou `.no-print`.

## Detalhes técnicos

- **Sem alterações de schema, RLS ou edge functions.**
- Filtro de regime é puramente client-side sobre o que o hook já trouxe (evita refetch ao trocar regime).
- Comparativo de mês anterior dispara um único query extra paralelo via React Query.
- `useFiscalTasks48h` usa `fiscal_due_date::timestamptz` — como o campo é `date`, usaremos comparação em formato `YYYY-MM-DD` com window de 2 dias (today, today+1, today+2) e ignoraremos hora (a UI mostra "—" se não houver hora). Caso o usuário queira granularidade de horas, é só ajustar o tipo no banco — mantemos o frontend pronto para ambos.
- Toda nova UI usa shadcn/ui + Tailwind, padrão visual existente (Apple-like, radii 1rem, cores semânticas).
- Mantém compatibilidade com role de colaborador: hooks continuam respeitando o filtro `responsible_id` quando `isColaborador`.

## Fora de escopo

- Implementação dos filtros `?filter=48h` e `?responsavel=none` no Kanban (links já saem prontos, suporte do destino é tarefa futura).
- Geração de PDF real (jspdf/pdfmake). Por ora apenas `window.print()` com CSS A4, como pedido.

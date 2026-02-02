

## Plano: Renomear "Categoria" para "Evento Contábil"

### Objetivo
Substituir todas as ocorrências do termo "categoria" por "evento contábil" em toda a interface do usuário, mantendo a estrutura técnica do código (nomes de variáveis, tabelas, etc.) inalterada para evitar migrações desnecessárias no banco de dados.

---

### Escopo da Alteração

**O que será alterado:** Textos visíveis ao usuário (labels, títulos, placeholders, toasts, menus)

**O que NÃO será alterado:** Nomes de tabelas no banco de dados, nomes de variáveis/funções no código, nomes de arquivos

---

### Arquivos e Alterações

#### 1. Navegação e Rotas

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppSidebar.tsx` | Linha 84: `'Categorias'` → `'Eventos Contábeis'` |

#### 2. Página Principal de Categorias

**Arquivo:** `src/pages/Categories.tsx`

| Linha | De | Para |
|-------|----|----|
| 97 | `Categorias` | `Eventos Contábeis` |
| 105 | `Nova Categoria` | `Novo Evento Contábil` |
| 119 | `Nenhuma categoria de receita` | `Nenhum evento contábil de receita` |
| 133 | `Nenhuma categoria de despesa` | `Nenhum evento contábil de despesa` |
| 144 | `Excluir categoria?` | `Excluir evento contábil?` |
| 146 | `A categoria será removida` | `O evento contábil será removido` |

#### 3. Formulário de Categoria

**Arquivo:** `src/components/categories/CategoryFormDialog.tsx`

| Linha | De | Para |
|-------|----|----|
| 48 | `'Editar Categoria' : 'Nova Categoria'` | `'Editar Evento Contábil' : 'Novo Evento Contábil'` |

#### 4. Hook de Categorias (Toasts)

**Arquivo:** `src/hooks/useCategories.ts`

| Linha | De | Para |
|-------|----|----|
| 63 | `'Categoria criada com sucesso!'` | `'Evento contábil criado com sucesso!'` |
| 66 | `'Erro ao criar categoria'` | `'Erro ao criar evento contábil'` |
| 84 | `'Categoria atualizada!'` | `'Evento contábil atualizado!'` |
| 87 | `'Erro ao atualizar categoria'` | `'Erro ao atualizar evento contábil'` |
| 102 | `'Categoria excluída!'` | `'Evento contábil excluído!'` |
| 105 | `'Erro ao excluir categoria'` | `'Erro ao excluir evento contábil'` |

#### 5. Filtros Unificados

**Arquivo:** `src/components/filters/UnifiedFilterBox.tsx`

| Linha | De | Para |
|-------|----|----|
| 320 | `placeholder="Categoria"` | `placeholder="Evento Contábil"` |
| 323 | `Todas as Categorias` | `Todos os Eventos Contábeis` |

#### 6. Formulário de Transações

**Arquivo:** `src/components/transactions/TransactionFormDialog.tsx`

| Linha | De | Para |
|-------|----|----|
| 234 | `Categoria` | `Evento Contábil` |
| 243 | `Nova categoria` | `Novo evento contábil` |

#### 7. Formulário de Recorrências (se aplicável)

**Arquivo:** `src/components/recurring/RecurringFormDialog.tsx`

Verificar e alterar labels de "Categoria" para "Evento Contábil"

#### 8. Dashboard Widgets

**Arquivo:** `src/components/dashboard/DashboardWidgets.tsx`

| Linha | De | Para |
|-------|----|----|
| 23 | `'Receitas por Categoria'` | `'Receitas por Evento Contábil'` |
| 24 | `'Despesas por Categoria'` | `'Despesas por Evento Contábil'` |

#### 9. Gráficos e Relatórios

**Arquivo:** `src/pages/Dashboard.tsx`

Alterar títulos dos gráficos de categoria:
- `"Receitas por Categoria"` → `"Receitas por Evento Contábil"`
- `"Despesas por Categoria"` → `"Despesas por Evento Contábil"`

**Arquivo:** `src/pages/Reports.tsx`

| Linha | De | Para |
|-------|----|----|
| 329 | `"Receitas por Categoria"` | `"Receitas por Evento Contábil"` |
| 330 | `"Despesas por Categoria"` | `"Despesas por Evento Contábil"` |
| 351 | `Categoria` (coluna tabela) | `Evento Contábil` |

**Arquivo:** `src/components/reports/ReportFilters.tsx`

| Linha | De | Para |
|-------|----|----|
| 196 | `Categoria` (label) | `Evento Contábil` |

**Arquivo:** `src/components/reports/CashFlowForecast.tsx`

| Linha | De | Para |
|-------|----|----|
| 222 | `Categoria` (TableHead) | `Evento Contábil` |

#### 10. Hook de Dados de Relatório

**Arquivo:** `src/hooks/useReportData.ts`

| Linha | De | Para |
|-------|----|----|
| 98 | `'Sem categoria'` | `'Sem evento contábil'` |

#### 11. Hook de Logs Globais

**Arquivo:** `src/hooks/useGlobalLogs.ts`

| Linha | De | Para |
|-------|----|----|
| 16 | `'CATEGORIAS'` | `'EVENTOS_CONTABEIS'` |

---

### Resumo das Alterações

| Arquivo | Quantidade de Alterações |
|---------|-------------------------|
| `src/pages/Categories.tsx` | 6 textos |
| `src/components/categories/CategoryFormDialog.tsx` | 1 título dinâmico |
| `src/hooks/useCategories.ts` | 6 mensagens de toast |
| `src/components/layout/AppSidebar.tsx` | 1 item de menu |
| `src/components/filters/UnifiedFilterBox.tsx` | 2 textos |
| `src/components/transactions/TransactionFormDialog.tsx` | 2 textos |
| `src/components/recurring/RecurringFormDialog.tsx` | ~2 textos |
| `src/components/dashboard/DashboardWidgets.tsx` | 2 nomes de widget |
| `src/pages/Dashboard.tsx` | 2 títulos de gráfico |
| `src/pages/Reports.tsx` | 3 textos |
| `src/components/reports/ReportFilters.tsx` | 1 label |
| `src/components/reports/CashFlowForecast.tsx` | 1 cabeçalho |
| `src/hooks/useReportData.ts` | 1 texto fallback |
| `src/hooks/useGlobalLogs.ts` | 1 tipo de módulo |

**Total:** ~14 arquivos, ~30 alterações de texto

---

### Observações Importantes

1. **Banco de dados permanece inalterado** - A tabela continua chamada `categories` e a coluna `category_id` nas transações não será renomeada para evitar migrações complexas.

2. **Nomes de variáveis/funções permanecem** - `useCategories`, `Category`, `categoryId`, etc. continuam com os mesmos nomes no código.

3. **Apenas textos da UI são alterados** - Isso garante uma mudança segura e sem riscos de quebrar funcionalidades.


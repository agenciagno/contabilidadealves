
## Plano: Reestruturar DRE para refletir o layout do PDF (Balancete Mensal)

### Diferenças identificadas entre o PDF e o sistema atual

| Aspecto | Sistema Atual | PDF |
|---|---|---|
| Estrutura | 2 seções planas (Receitas / Despesas) | Estrutura hierárquica com subtotais intermediários (Receita Bruta → Receita Líquida → Lucro Bruto → Lucro Operacional → Lucro Líquido) |
| Colunas | 4 (Evento, Previsto, Realizado, RXP) | 6 (Evento, Previsto, Realizado, RXP, % Previsto, % Realizado) |
| Subtotais computados | Apenas "Total Receitas" e "Total Despesas" | 7 linhas calculadas: Receita Bruta, Deduções, Receita Líquida, Lucro Bruto, Lucro Operacional, Lucro Operacional (2), Lucro/Prejuízo Líquido |
| Ordenação | Ordem aleatória por tipo | Sequência fixa: Receitas Op. → Deduções → Custo Pessoal → Desp. Fixas → Variáveis → Imobilizados → Financeiras → Receita Financeira → Tributárias → Parcelamentos → Terc. Serviços → Sócios → Não Operacionais |
| Resumo superior | Inexistente | Card resumo com Receita Líquida, Custo Pessoal, Desp. Operacionais, Receitas/Despesas não Op., Lucro/Prejuízo, Saldo em Caixa |
| Seção não-operacional | Misturada com despesas | Separada após o resultado operacional |
| Fluxo de caixa | Inexistente na DRE | Linha final com saldo em caixa |

### Mudanças

| # | Recurso | Mudança |
|---|---|---|
| 1 | **Migration SQL** | Adicionar `display_order` (int) e `dre_section` (text) à tabela `categories` |
| 2 | `src/hooks/useDREData.ts` | Reescrever: agrupar macros por `dre_section`, calcular subtotais intermediários, % sobre Receita Líquida |
| 3 | `src/pages/DRE.tsx` | Reescrever layout completo: resumo superior + tabela hierárquica com subtotais computados na sequência do PDF |

### 1. Migration SQL

```sql
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dre_section text NOT NULL DEFAULT 'despesas_operacionais';
```

`dre_section` define em qual bloco estrutural da DRE o Macro pertence. Valores possíveis:
- `receitas_operacionais`
- `deducoes_receita`
- `custo_pessoal`
- `despesas_fixas`
- `despesas_variaveis`
- `despesas_imobilizados`
- `despesas_financeiras`
- `receita_financeira`
- `despesas_tributarias`
- `despesas_parcelamentos`
- `despesas_terceirizacao`
- `despesas_socios`
- `nao_operacional_receita`
- `nao_operacional_despesa`

`display_order` controla a ordem de exibição dentro de cada seção.

### 2. Hook `useDREData.ts` — Reestruturação completa

**Novo retorno:**
```typescript
interface DREResult {
  // Seções na ordem do PDF
  receitasOperacionais: DRERow[];
  deducoesReceita: DRERow[];
  custoPessoal: DRERow[];
  despesasFixas: DRERow[];
  despesasVariaveis: DRERow[];
  despesasImobilizados: DRERow[];
  despesasFinanceiras: DRERow[];
  receitaFinanceira: DRERow[];
  despesasTributarias: DRERow[];
  despesasParcelamentos: DRERow[];
  despesasTerceirizacao: DRERow[];
  despesasSocios: DRERow[];
  naoOperacionalReceita: DRERow[];
  naoOperacionalDespesa: DRERow[];
  
  // Subtotais computados
  receitaBruta: { previsto: number; realizado: number };
  deducoes: { previsto: number; realizado: number };
  receitaLiquida: { previsto: number; realizado: number };
  lucroBruto: { previsto: number; realizado: number };
  totalDespesasOperacionais: { previsto: number; realizado: number };
  lucroOperacional: { previsto: number; realizado: number };
  lucroOperacional2: { previsto: number; realizado: number };
  lucroPrejuizoLiquido: { previsto: number; realizado: number };
  fluxoCaixa: number; // saldo dos bancos
}
```

**Lógica de cálculo (sequência do PDF):**
```
Receita Bruta = Σ Receitas Operacionais
Deduções = Σ Deduções Receita
Receita Líquida = Receita Bruta + Deduções (deduções são negativas)
Lucro Bruto = Receita Líquida - Custo com Pessoal
Despesas Operacionais = Fixas + Variáveis + Imobilizados + Financeiras - Rec. Financeira + Tributárias + Parcelamentos + Terceirização
Lucro Operacional = Lucro Bruto - Despesas Operacionais
Lucro Operacional (2) = Lucro Operacional - Despesas c/ Sócios
Lucro/Prejuízo Líquido = Lucro Op. (2) + Não Op. Receita - Não Op. Despesa
```

**% Previsto e % Realizado:** cada linha calcula `valor / receitaLiquida * 100`.

**Ordenação:** macros dentro de cada seção ordenados por `display_order`.

### 3. Página `DRE.tsx` — Layout do PDF

**Resumo superior (card):** tabela compacta com:
- Receita Líquida | Previsto | Realizado | RXP | Análise | Saldo a Pagar
- Custo com Pessoal | ...
- Despesas Operacionais | ...
- Receitas não operacionais | ...
- Despesas não operacionais | ...
- Lucro/Prejuízo Líquido | ...

Campo "Análise": "Positivo" se RXP > 0, "Negativo" se < 0, "Saldo em Caixa" para Receita Líquida.
Campo "Saldo a Pagar": soma das transações pendentes daquela seção.

**Tabela principal — sequência fixa de renderização:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ Evento Contábil        │ Previsto │ Realizado │ RXP │ %P │ %R  │
├─────────────────────────────────────────────────────────────────┤
│ [Seção] Receitas Operacionais                                  │
│   > Macro expandível → Sub eventos                             │
│ ═ Receita Bruta (subtotal)                                     │
│                                                                │
│ [Seção] Deduções Receita Bruta                                 │
│   > Macro expandível → Sub eventos                             │
│ ═ Total Deduções (subtotal)                                    │
│                                                                │
│ ══ RECEITA LÍQUIDA (calculada)                                 │
│                                                                │
│ [Seção] Custo com Pessoal                                      │
│   > Macro expandível → Sub eventos                             │
│ ═ Total Custo com Pessoal                                      │
│                                                                │
│ ══ LUCRO BRUTO (calculada)                                     │
│                                                                │
│ [Seção] Despesas Fixas                                         │
│ [Seção] Despesas Variáveis                                     │
│ [Seção] Despesas Imobilizados                                  │
│ [Seção] Despesas Financeiras                                   │
│ [Seção] (+) Receita Financeira                                 │
│ [Seção] Despesas Tributárias                                   │
│ [Seção] Desp. c/ Parcelamentos                                 │
│ [Seção] Desp. c/ Terc. de Serviços                             │
│                                                                │
│ ══ LUCRO/PREJUÍZO OPERACIONAL (calculada)                      │
│                                                                │
│ [Seção] Despesas c/ Sócios                                     │
│                                                                │
│ ══ LUCRO/PREJUÍZO OPERACIONAL (2)                              │
│                                                                │
│ [Seção] Despesas/Receitas não Operacionais                     │
│   > Empréstimos Recebidos PF/PJ                                │
│   > Despesas Empréstimos                                       │
│                                                                │
│ ══ LUCRO/PREJUÍZO LÍQUIDO (destaque final)                     │
│ Fluxo de Caixa: R$ X.XXX,XX                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Linhas computadas** têm estilo visual destacado (bold, background diferenciado) e não são clicáveis.

**Cada seção de Macros** mantém o comportamento de acordeão existente (expandir/recolher sub eventos).

### 4. Configuração inicial dos Eventos Macro existentes

Será necessário que o usuário classifique seus Macros existentes no campo `dre_section`. Para facilitar, o formulário de criação/edição de Evento Contábil (CategoryFormDialog) receberá:
- Dropdown "Seção DRE" (apenas para Macros, visível quando `parent_id` é null)
- Campo "Ordem de Exibição" (número)

### Resumo
- 1 migration (2 colunas em `categories`)
- 2 arquivos reescritos (`useDREData.ts`, `DRE.tsx`)
- 1 arquivo editado (`CategoryFormDialog.tsx` — adicionar campos seção DRE e ordem)

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ChevronRight, ChevronDown, CalendarDays, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useDREData, DRERow, DRETotals, DRE_SECTIONS } from '@/hooks/useDREData';
import { cn } from '@/lib/utils';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function rxpColor(value: number) {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function AnalysisBadge({ value }: { value: number }) {
  if (value > 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded"><TrendingUp className="h-3 w-3" /> Positivo</span>;
  if (value < 0) return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded"><TrendingDown className="h-3 w-3" /> Negativo</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded"><Minus className="h-3 w-3" /> Neutro</span>;
}

// Computed subtotal row
function ComputedRow({ label, totals, highlight }: { label: string; totals: DRETotals; highlight?: boolean }) {
  const rlRef = 1; // percentage already computed in hook
  return (
    <TableRow className={cn(
      'font-bold border-t-2',
      highlight ? 'bg-primary/10 text-primary' : 'bg-muted/40'
    )}>
      <TableCell className="pl-4 uppercase tracking-wide text-sm">{label}</TableCell>
      <TableCell className="text-right">{formatCurrency(totals.previsto)}</TableCell>
      <TableCell className="text-right">{formatCurrency(totals.realizado)}</TableCell>
      <TableCell className={cn('text-right', rxpColor(totals.rxp))}>{formatCurrency(totals.rxp)}</TableCell>
      <TableCell className="text-right text-muted-foreground">—</TableCell>
      <TableCell className="text-right text-muted-foreground">—</TableCell>
    </TableRow>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={6} className="font-semibold text-xs uppercase tracking-widest text-muted-foreground py-2 pl-4">
        {title}
      </TableCell>
    </TableRow>
  );
}

// Macro row with expand/collapse
function MacroRow({ row, expanded, onToggle }: { row: DRERow; expanded: boolean; onToggle: () => void }) {
  const hasChildren = row.children.length > 0;
  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-muted/40', hasChildren && 'font-medium')}
        onClick={hasChildren ? onToggle : undefined}
      >
        <TableCell className="pl-6">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <span className="w-4" />
            )}
            {row.name}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(row.previsto)}</TableCell>
        <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
        <TableCell className={cn('text-right', rxpColor(row.rxp))}>{formatCurrency(row.rxp)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatPercent(row.percentPrevisto)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatPercent(row.percentRealizado)}</TableCell>
      </TableRow>
      {expanded && row.children.map(child => (
        <TableRow key={child.id} className="hover:bg-muted/20">
          <TableCell className="pl-14">
            <span className="text-muted-foreground">↳</span> {child.name}
          </TableCell>
          <TableCell className="text-right">{formatCurrency(child.previsto)}</TableCell>
          <TableCell className="text-right">{formatCurrency(child.realizado)}</TableCell>
          <TableCell className={cn('text-right', rxpColor(child.rxp))}>{formatCurrency(child.rxp)}</TableCell>
          <TableCell className="text-right text-muted-foreground">{formatPercent(child.percentPrevisto)}</TableCell>
          <TableCell className="text-right text-muted-foreground">{formatPercent(child.percentRealizado)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

// Section with macros and subtotal
function DRESection({ sectionKey, label, rows, expanded, onToggle }: {
  sectionKey: string;
  label: string;
  rows: DRERow[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  const total = {
    previsto: rows.reduce((s, r) => s + r.previsto, 0),
    realizado: rows.reduce((s, r) => s + r.realizado, 0),
    rxp: rows.reduce((s, r) => s + r.rxp, 0),
  };

  return (
    <>
      <SectionHeader title={label} />
      {rows.map(row => (
        <MacroRow
          key={row.id}
          row={row}
          expanded={!!expanded[row.id]}
          onToggle={() => onToggle(row.id)}
        />
      ))}
      <TableRow className="bg-muted/10 font-semibold text-sm">
        <TableCell className="pl-4">Total {label}</TableCell>
        <TableCell className="text-right">{formatCurrency(total.previsto)}</TableCell>
        <TableCell className="text-right">{formatCurrency(total.realizado)}</TableCell>
        <TableCell className={cn('text-right', rxpColor(total.rxp))}>{formatCurrency(total.rxp)}</TableCell>
        <TableCell className="text-right text-muted-foreground">—</TableCell>
        <TableCell className="text-right text-muted-foreground">—</TableCell>
      </TableRow>
    </>
  );
}

export default function DRE() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(now), 'yyyy-MM-dd'));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const data = useDREData(startDate, endDate);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleClear = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  };

  // Summary card data
  const summaryRows = [
    { label: 'Receita Líquida', totals: data.receitaLiquida },
    { label: 'Custo com Pessoal', totals: data.custoPessoalTotal },
    { label: 'Despesas Operacionais', totals: data.totalDespesasOperacionais },
    { label: 'Receitas não Operacionais', totals: data.naoOperacionalReceita },
    { label: 'Despesas não Operacionais', totals: data.naoOperacionalDespesa },
    { label: 'Lucro/Prejuízo Líquido', totals: data.lucroPrejuizoLiquido },
  ];

  // Operation sections for the main table
  const opSections: { key: string; label: string }[] = [
    { key: 'despesas_fixas', label: 'Despesas Fixas' },
    { key: 'despesas_variaveis', label: 'Despesas Variáveis' },
    { key: 'despesas_imobilizados', label: 'Despesas com Imobilizados' },
    { key: 'despesas_financeiras', label: 'Despesas Financeiras' },
    { key: 'receita_financeira', label: '(+) Receita Financeira' },
    { key: 'despesas_tributarias', label: 'Despesas Tributárias' },
    { key: 'despesas_parcelamentos', label: 'Desp. c/ Parcelamentos' },
    { key: 'despesas_terceirizacao', label: 'Desp. c/ Terc. de Serviços' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão gerencial do resultado operacional</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-[150px] text-sm" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-[150px] text-sm" />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClear} title="Limpar filtro">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Indicador</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Previsto</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Realizado</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">RXP</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">Análise</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(row => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.label}</td>
                    <td className="text-right py-2">{formatCurrency(row.totals.previsto)}</td>
                    <td className="text-right py-2">{formatCurrency(row.totals.realizado)}</td>
                    <td className={cn('text-right py-2 font-semibold', rxpColor(row.totals.rxp))}>{formatCurrency(row.totals.rxp)}</td>
                    <td className="text-center py-2"><AnalysisBadge value={row.totals.rxp} /></td>
                  </tr>
                ))}
                <tr className="bg-muted/30">
                  <td className="py-2 font-bold">Fluxo de Caixa (Saldo Bancário)</td>
                  <td colSpan={4} className="text-right py-2 font-bold text-lg">{formatCurrency(data.fluxoCaixa)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Main DRE Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]">Evento Contábil</TableHead>
                <TableHead className="text-right w-[14%]">Previsto (R$)</TableHead>
                <TableHead className="text-right w-[14%]">Realizado (R$)</TableHead>
                <TableHead className="text-right w-[14%]">RXP (R$)</TableHead>
                <TableHead className="text-right w-[12%]">% Prev.</TableHead>
                <TableHead className="text-right w-[12%]">% Real.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Receitas Operacionais */}
              <DRESection sectionKey="receitas_operacionais" label="Receitas Operacionais" rows={data.sections.receitas_operacionais || []} expanded={expanded} onToggle={toggle} />
              <ComputedRow label="= Receita Bruta" totals={data.receitaBruta} />

              {/* Deduções */}
              <DRESection sectionKey="deducoes_receita" label="Deduções Receita Bruta" rows={data.sections.deducoes_receita || []} expanded={expanded} onToggle={toggle} />
              <ComputedRow label="= Total Deduções" totals={data.totalDeducoes} />

              {/* Receita Líquida */}
              <ComputedRow label="═ RECEITA LÍQUIDA" totals={data.receitaLiquida} highlight />

              {/* Custo com Pessoal */}
              <DRESection sectionKey="custo_pessoal" label="Custo com Pessoal" rows={data.sections.custo_pessoal || []} expanded={expanded} onToggle={toggle} />

              {/* Lucro Bruto */}
              <ComputedRow label="═ LUCRO BRUTO" totals={data.lucroBruto} highlight />

              {/* Despesas Operacionais */}
              {opSections.map(sec => (
                <DRESection key={sec.key} sectionKey={sec.key} label={sec.label} rows={data.sections[sec.key] || []} expanded={expanded} onToggle={toggle} />
              ))}

              {/* Lucro Operacional */}
              <ComputedRow label="═ LUCRO/PREJUÍZO OPERACIONAL" totals={data.lucroOperacional} highlight />

              {/* Despesas c/ Sócios */}
              <DRESection sectionKey="despesas_socios" label="Despesas c/ Sócios" rows={data.sections.despesas_socios || []} expanded={expanded} onToggle={toggle} />

              {/* Lucro Operacional 2 */}
              <ComputedRow label="═ LUCRO/PREJUÍZO OPERACIONAL (2)" totals={data.lucroOperacional2} highlight />

              {/* Não Operacionais */}
              <DRESection sectionKey="nao_operacional_receita" label="Receitas não Operacionais" rows={data.sections.nao_operacional_receita || []} expanded={expanded} onToggle={toggle} />
              <DRESection sectionKey="nao_operacional_despesa" label="Despesas não Operacionais" rows={data.sections.nao_operacional_despesa || []} expanded={expanded} onToggle={toggle} />

              {/* Lucro/Prejuízo Líquido */}
              <ComputedRow label="══ LUCRO/PREJUÍZO LÍQUIDO" totals={data.lucroPrejuizoLiquido} highlight />
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold text-base bg-primary/5">
                <TableCell>FLUXO DE CAIXA (Saldo Bancário)</TableCell>
                <TableCell colSpan={5} className="text-right text-lg">{formatCurrency(data.fluxoCaixa)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

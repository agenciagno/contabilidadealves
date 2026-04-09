import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, X, TrendingUp, TrendingDown, DollarSign, Wallet, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDREData, DRESectionRow, DRECalculatedRow, DRERowResult } from '@/hooks/useDREData';
import { cn } from '@/lib/utils';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPerc(value: number) {
  return `${value.toFixed(1)}%`;
}

function valueColor(value: number) {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function SummaryCard({ title, previsto, realizado, icon: Icon, color }: {
  title: string;
  previsto: number;
  realizado: number;
  icon: any;
  color: string;
}) {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Previsto</span>
            <span className="font-semibold">{formatCurrency(previsto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Realizado</span>
            <span className={cn('font-semibold', valueColor(realizado))}>{formatCurrency(realizado)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionRow({ row }: { row: DRESectionRow }) {
  return (
    <>
      <TableRow className="hover:bg-emerald-500/10 bg-emerald-500/5 font-semibold">
        <TableCell className="pl-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 dark:text-emerald-400">{row.macroName}</span>
            {!row.macroId && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded dark:bg-amber-900/30 dark:text-amber-400">
                Não cadastrado
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(row.previsto)}</TableCell>
        <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
        <TableCell className={cn('text-right', valueColor(row.rxp))}>{formatCurrency(row.rxp)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatPerc(row.percPrevisto)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatPerc(row.percRealizado)}</TableCell>
      </TableRow>

      {row.children.map(child => (
        <TableRow key={child.id} className="hover:bg-muted/20">
          <TableCell className="pl-12">
            <span className="text-muted-foreground">↳</span> {child.name}
          </TableCell>
          <TableCell className="text-right">{formatCurrency(child.previsto)}</TableCell>
          <TableCell className="text-right">{formatCurrency(child.realizado)}</TableCell>
          <TableCell className={cn('text-right', valueColor(child.rxp))}>{formatCurrency(child.rxp)}</TableCell>
          <TableCell className="text-right text-muted-foreground">{formatPerc(child.percPrevisto)}</TableCell>
          <TableCell className="text-right text-muted-foreground">{formatPerc(child.percRealizado)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function CalculatedRow({ row }: { row: DRECalculatedRow }) {
  const isLucro = row.key.startsWith('lucro');
  const isFinal = row.key === 'lucro_liquido';

  return (
    <TableRow className={cn(
      'font-bold',
      isFinal
        ? 'bg-primary/10 text-primary dark:bg-primary/20'
        : 'bg-muted/50 dark:bg-muted/30',
    )}>
      <TableCell className="pl-4">
        <span className={cn(
          isFinal ? 'text-primary' : isLucro ? 'text-foreground' : 'text-foreground',
          'uppercase text-sm tracking-wide'
        )}>
          {row.label}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(row.previsto)}</TableCell>
      <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
      <TableCell className={cn('text-right', valueColor(row.rxp))}>{formatCurrency(row.rxp)}</TableCell>
      <TableCell className="text-right">{formatPerc(row.percPrevisto)}</TableCell>
      <TableCell className="text-right">{formatPerc(row.percRealizado)}</TableCell>
    </TableRow>
  );
}

export default function DRE() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(now), 'yyyy-MM-dd'));
  const { dreRows, summary } = useDREData(startDate, endDate);

  const handleClear = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  };

  // Dynamic month/year label
  const start = new Date(startDate + 'T12:00:00');
  const monthLabel = format(start, "MMMM'-'yy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão gerencial do resultado operacional • <span className="font-medium capitalize">{monthLabel}</span>
          </p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Receita Líquida"
          previsto={summary.receitaLiquida.previsto}
          realizado={summary.receitaLiquida.realizado}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <SummaryCard
          title="Custo c/ Pessoal"
          previsto={summary.custoPessoal.previsto}
          realizado={summary.custoPessoal.realizado}
          icon={Building2}
          color="bg-blue-600"
        />
        <SummaryCard
          title="Desp. Operacionais"
          previsto={summary.despesasOperacionais.previsto}
          realizado={summary.despesasOperacionais.realizado}
          icon={TrendingDown}
          color="bg-orange-600"
        />
        <SummaryCard
          title="Lucro/Prejuízo"
          previsto={summary.lucroPrejuizoLiquido.previsto}
          realizado={summary.lucroPrejuizoLiquido.realizado}
          icon={DollarSign}
          color={summary.lucroPrejuizoLiquido.realizado >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
        />
        <SummaryCard
          title="Fluxo de Caixa"
          previsto={summary.fluxoCaixa}
          realizado={summary.fluxoCaixa}
          icon={Wallet}
          color="bg-violet-600"
        />
      </div>

      {/* DRE Table */}
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
              {dreRows.map((row, idx) => {
                if (row.type === 'section') {
                  return (
                    <SectionRow
                      key={row.macroName + idx}
                      row={row}
                    />
                  );
                }
                return <CalculatedRow key={row.key} row={row} />;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

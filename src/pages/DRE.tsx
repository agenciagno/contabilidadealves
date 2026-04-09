import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ChevronRight, ChevronDown, CalendarDays, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useDREData, DRERow } from '@/hooks/useDREData';
import { cn } from '@/lib/utils';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function rxpColor(value: number) {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function DRESection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: DRERow[];
  total: { previsto: number; realizado: number };
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      <TableRow className="bg-muted/30">
        <TableCell colSpan={4} className="font-bold text-sm uppercase tracking-wide text-foreground">
          {title}
        </TableCell>
      </TableRow>

      {rows.map(macro => (
        <MacroRow
          key={macro.id}
          row={macro}
          expanded={!!expanded[macro.id]}
          onToggle={() => toggle(macro.id)}
        />
      ))}

      <TableRow className="bg-muted/20 font-semibold">
        <TableCell className="pl-4">Total {title}</TableCell>
        <TableCell className="text-right">{formatCurrency(total.previsto)}</TableCell>
        <TableCell className="text-right">{formatCurrency(total.realizado)}</TableCell>
        <TableCell className={cn('text-right', rxpColor(total.realizado - total.previsto))}>
          {formatCurrency(total.realizado - total.previsto)}
        </TableCell>
      </TableRow>
    </>
  );
}

function MacroRow({
  row,
  expanded,
  onToggle,
}: {
  row: DRERow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = row.children.length > 0;

  return (
    <>
      <TableRow
        className={cn('cursor-pointer hover:bg-muted/40', hasChildren && 'font-medium')}
        onClick={hasChildren ? onToggle : undefined}
      >
        <TableCell className="pl-4">
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
      </TableRow>

      {expanded && row.children.map(child => (
        <TableRow key={child.id} className="hover:bg-muted/20">
          <TableCell className="pl-12">
            <span className="text-muted-foreground">↳</span> {child.name}
          </TableCell>
          <TableCell className="text-right">{formatCurrency(child.previsto)}</TableCell>
          <TableCell className="text-right">{formatCurrency(child.realizado)}</TableCell>
          <TableCell className={cn('text-right', rxpColor(child.rxp))}>{formatCurrency(child.rxp)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function DRE() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(now), 'yyyy-MM-dd'));

  const { dreData, totalReceitas, totalDespesas, resultadoLiquido } = useDREData(startDate, endDate);

  const handleClear = () => {
    const today = new Date();
    setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão gerencial do resultado operacional</p>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="h-9 w-[150px] text-sm"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="h-9 w-[150px] text-sm"
          />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleClear} title="Limpar filtro">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Evento Contábil</TableHead>
                <TableHead className="text-right w-[20%]">Previsto (R$)</TableHead>
                <TableHead className="text-right w-[20%]">Realizado (R$)</TableHead>
                <TableHead className="text-right w-[20%]">RXP (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <DRESection
                title="Receitas"
                rows={dreData.receitas}
                total={totalReceitas}
              />
              <DRESection
                title="Despesas"
                rows={dreData.despesas}
                total={totalDespesas}
              />
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold text-base">
                <TableCell>RESULTADO LÍQUIDO</TableCell>
                <TableCell className="text-right">{formatCurrency(resultadoLiquido.previsto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(resultadoLiquido.realizado)}</TableCell>
                <TableCell className={cn('text-right', rxpColor(resultadoLiquido.rxp))}>
                  {formatCurrency(resultadoLiquido.rxp)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

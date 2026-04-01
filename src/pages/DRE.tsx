import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ChevronRight, ChevronDown, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDREData, DRERow } from '@/hooks/useDREData';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function rxpColor(value: number) {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, month] = value.split('-').map(Number);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {MONTHS[month - 1]} {year}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-4 pointer-events-auto" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={() => setPickerYear(y => y - 1)}>←</Button>
          <span className="font-semibold">{pickerYear}</span>
          <Button variant="ghost" size="sm" onClick={() => setPickerYear(y => y + 1)}>→</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((m, i) => (
            <Button
              key={m}
              variant={i + 1 === month && pickerYear === year ? 'default' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => {
                onChange(`${pickerYear}-${String(i + 1).padStart(2, '0')}`);
                setOpen(false);
              }}
            >
              {m.slice(0, 3)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InlineEdit({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));

  const handleSave = () => {
    const num = parseFloat(editValue) || 0;
    onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        type="number"
        className="h-7 w-28 text-right text-sm"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        autoFocus
      />
    );
  }

  return (
    <span
      className="cursor-pointer hover:text-primary hover:underline underline-offset-2"
      onClick={() => { setEditValue(String(value || '')); setEditing(true); }}
    >
      {formatCurrency(value)}
    </span>
  );
}

function DRESection({
  title,
  rows,
  total,
  onUpsertBudget,
}: {
  title: string;
  rows: DRERow[];
  total: { previsto: number; realizado: number };
  onUpsertBudget: (categoryId: string, value: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <>
      {/* Section header */}
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
          onUpsertBudget={onUpsertBudget}
        />
      ))}

      {/* Section total */}
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
  onUpsertBudget,
}: {
  row: DRERow;
  expanded: boolean;
  onToggle: () => void;
  onUpsertBudget: (categoryId: string, value: number) => void;
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
        <TableCell className="text-right">
          {row.isMacro ? formatCurrency(row.previsto) : (
            <InlineEdit value={row.previsto} onSave={v => onUpsertBudget(row.id, v)} />
          )}
        </TableCell>
        <TableCell className="text-right">{formatCurrency(row.realizado)}</TableCell>
        <TableCell className={cn('text-right', rxpColor(row.rxp))}>{formatCurrency(row.rxp)}</TableCell>
      </TableRow>

      {expanded && row.children.map(child => (
        <TableRow key={child.id} className="hover:bg-muted/20">
          <TableCell className="pl-12">
            <span className="text-muted-foreground">↳</span> {child.name}
          </TableCell>
          <TableCell className="text-right">
            <InlineEdit value={child.previsto} onSave={v => onUpsertBudget(child.id, v)} />
          </TableCell>
          <TableCell className="text-right">{formatCurrency(child.realizado)}</TableCell>
          <TableCell className={cn('text-right', rxpColor(child.rxp))}>{formatCurrency(child.rxp)}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function DRE() {
  const [monthYear, setMonthYear] = useState(() => format(new Date(), 'yyyy-MM'));
  const { dreData, totalReceitas, totalDespesas, resultadoLiquido, upsertBudget } = useDREData(monthYear);

  const handleUpsertBudget = (categoryId: string, value: number) => {
    upsertBudget.mutate({ categoryId, value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão gerencial do resultado operacional</p>
        </div>
        <MonthYearPicker value={monthYear} onChange={setMonthYear} />
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
                onUpsertBudget={handleUpsertBudget}
              />
              <DRESection
                title="Despesas"
                rows={dreData.despesas}
                total={totalDespesas}
                onUpsertBudget={handleUpsertBudget}
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

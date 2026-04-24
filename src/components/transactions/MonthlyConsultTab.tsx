import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { isEffectivelyPaid } from '@/lib/financial-utils';

interface MonthlyConsultTabProps {
  transactions: Transaction[];
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Number(dateStr.slice(0, 4));
}

function getMonth(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Number(dateStr.slice(5, 7)) - 1;
}

interface EventRow {
  macroId: string;
  macroName: string;
  type: 'receita' | 'despesa';
  isMacro: true;
  receber: number;
  pagar: number;
  status: 'realizado' | 'previsto' | 'misto';
  totalAno: { receber: number; pagar: number };
  children: {
    id: string;
    name: string;
    receber: number;
    pagar: number;
    status: 'realizado' | 'previsto' | 'misto';
    totalAno: { receber: number; pagar: number };
  }[];
}

export function MonthlyConsultTab({ transactions }: MonthlyConsultTabProps) {
  const { categories } = useCategories();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number | 'all'>(currentMonth);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Available years
  const years = useMemo(() => {
    const set = new Set<number>();
    set.add(currentYear);
    for (const t of transactions) {
      const ye = getYear(t.expected_date);
      const yd = getYear(t.date);
      if (ye) set.add(ye);
      if (yd) set.add(yd);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  // Determines if a (year, month) pair is in the past relative to today
  const isPastMonth = (y: number, m: number) =>
    y < currentYear || (y === currentYear && m < currentMonth);

  /**
   * For a single (year, month), aggregate transactions:
   * - past month -> realized (paid_amount, by `date`)
   * - current/future -> previsto (amount, by `expected_date`)
   */
  const aggregateMonth = (y: number, m: number) => {
    const past = isPastMonth(y, m);
    const map = new Map<string, { receber: number; pagar: number; status: 'realizado' | 'previsto' }>();

    for (const t of transactions) {
      let include = false;
      let value = 0;

      if (past) {
        if (!isEffectivelyPaid(t)) continue;
        if (getYear(t.date) !== y || getMonth(t.date) !== m) continue;
        include = true;
        value = Number(t.paid_amount ?? t.amount);
      } else {
        if (!t.expected_date) continue;
        if (getYear(t.expected_date) !== y || getMonth(t.expected_date) !== m) continue;
        include = true;
        value = Number(t.amount);
      }

      if (!include) continue;
      const catId = t.category_id || '__no_category__';
      const cur = map.get(catId) || { receber: 0, pagar: 0, status: past ? 'realizado' as const : 'previsto' as const };
      if (t.type === 'receita') cur.receber += Math.abs(value);
      else cur.pagar += Math.abs(value);
      map.set(catId, cur);
    }

    return map;
  };

  // Period maps: either single month or all 12 months merged
  const { periodTotals, yearTotals } = useMemo(() => {
    // Year totals: for each month of `year`, aggregate; sum into a single map per category
    const yearMap = new Map<string, { receber: number; pagar: number }>();
    for (let m = 0; m < 12; m++) {
      const monthAgg = aggregateMonth(year, m);
      monthAgg.forEach((v, k) => {
        const cur = yearMap.get(k) || { receber: 0, pagar: 0 };
        cur.receber += v.receber;
        cur.pagar += v.pagar;
        yearMap.set(k, cur);
      });
    }

    let periodMap: Map<string, { receber: number; pagar: number; status: 'realizado' | 'previsto' | 'misto' }>;
    if (month === 'all') {
      periodMap = new Map();
      let hasPast = false;
      let hasFuture = false;
      for (let m = 0; m < 12; m++) {
        if (isPastMonth(year, m)) hasPast = true; else hasFuture = true;
        const monthAgg = aggregateMonth(year, m);
        monthAgg.forEach((v, k) => {
          const cur = periodMap.get(k) || { receber: 0, pagar: 0, status: 'previsto' as const };
          cur.receber += v.receber;
          cur.pagar += v.pagar;
          periodMap.set(k, cur);
        });
      }
      const overallStatus: 'realizado' | 'previsto' | 'misto' =
        hasPast && hasFuture ? 'misto' : hasPast ? 'realizado' : 'previsto';
      periodMap.forEach((v, k) => periodMap.set(k, { ...v, status: overallStatus }));
    } else {
      const single = aggregateMonth(year, month);
      periodMap = new Map();
      single.forEach((v, k) => periodMap.set(k, { ...v }));
    }

    return { periodTotals: periodMap, yearTotals: yearMap };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, year, month]);

  // Build hierarchical rows grouped by macro
  const rows = useMemo<EventRow[]>(() => {
    const macros = categories.filter(c => !c.parent_id);
    const subsByMacro = new Map<string, typeof categories>();
    for (const c of categories) {
      if (c.parent_id) {
        const arr = subsByMacro.get(c.parent_id) || [];
        arr.push(c);
        subsByMacro.set(c.parent_id, arr);
      }
    }

    const out: EventRow[] = [];

    for (const macro of macros) {
      const subs = (subsByMacro.get(macro.id) || []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      const macroPeriod = periodTotals.get(macro.id) || { receber: 0, pagar: 0, status: 'previsto' as const };
      const macroYear = yearTotals.get(macro.id) || { receber: 0, pagar: 0 };

      let receber = macroPeriod.receber;
      let pagar = macroPeriod.pagar;
      let yReceber = macroYear.receber;
      let yPagar = macroYear.pagar;

      const children = subs.map(sub => {
        const p = periodTotals.get(sub.id) || { receber: 0, pagar: 0, status: macroPeriod.status };
        const y = yearTotals.get(sub.id) || { receber: 0, pagar: 0 };
        receber += p.receber;
        pagar += p.pagar;
        yReceber += y.receber;
        yPagar += y.pagar;
        return {
          id: sub.id,
          name: sub.name,
          receber: p.receber,
          pagar: p.pagar,
          status: p.status,
          totalAno: { receber: y.receber, pagar: y.pagar },
        };
      });

      // Filter row based on eventFilter
      if (eventFilter !== 'all' && eventFilter !== macro.id) {
        // also allow drilling to a sub
        const subMatch = subs.find(s => s.id === eventFilter);
        if (!subMatch) continue;
      }

      // Skip totally empty
      if (receber === 0 && pagar === 0 && yReceber === 0 && yPagar === 0) continue;

      out.push({
        macroId: macro.id,
        macroName: macro.name,
        type: macro.type,
        isMacro: true,
        receber,
        pagar,
        status: macroPeriod.status,
        totalAno: { receber: yReceber, pagar: yPagar },
        children: eventFilter !== 'all' && eventFilter !== macro.id
          ? children.filter(c => c.id === eventFilter)
          : children,
      });
    }

    return out.sort((a, b) => a.macroName.localeCompare(b.macroName, 'pt-BR'));
  }, [categories, periodTotals, yearTotals, eventFilter]);

  // Footer totals
  const footer = useMemo(() => {
    let pReceber = 0, pPagar = 0, yReceber = 0, yPagar = 0;
    for (const r of rows) {
      pReceber += r.receber;
      pPagar += r.pagar;
      yReceber += r.totalAno.receber;
      yPagar += r.totalAno.pagar;
    }
    return { pReceber, pPagar, yReceber, yPagar };
  }, [rows]);

  const StatusBadge = ({ status }: { status: 'realizado' | 'previsto' | 'misto' }) => {
    if (status === 'realizado') {
      return <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px]">Realizado</Badge>;
    }
    if (status === 'misto') {
      return <Badge variant="outline" className="text-[10px]">Misto</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground text-[10px]">Previsto</Badge>;
  };

  const valueClass = (status: 'realizado' | 'previsto' | 'misto', kind: 'receber' | 'pagar', value: number) => {
    if (value === 0) return 'text-muted-foreground/50';
    if (status === 'realizado') {
      return kind === 'receber' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium';
    }
    return 'text-foreground';
  };

  // Flat list of categories for the dropdown filter
  const categoryOptions = useMemo(() => {
    const macros = categories.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const list: { id: string; label: string; isMacro: boolean }[] = [];
    for (const macro of macros) {
      list.push({ id: macro.id, label: macro.name, isMacro: true });
      const subs = categories
        .filter(c => c.parent_id === macro.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      for (const s of subs) list.push({ id: s.id, label: `   ↳ ${s.name}`, isMacro: false });
    }
    return list;
  }, [categories]);

  const toggleExpanded = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Years */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ano</p>
            <div className="flex flex-wrap gap-1.5">
              {years.map(y => (
                <Button
                  key={y}
                  size="sm"
                  variant={year === y ? 'default' : 'outline'}
                  onClick={() => setYear(y)}
                  className="h-8 px-3"
                >
                  {y}
                </Button>
              ))}
            </div>
          </div>

          {/* Months */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mês</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={month === 'all' ? 'default' : 'outline'}
                onClick={() => setMonth('all')}
                className="h-8 px-3"
              >
                Ano todo
              </Button>
              {MONTHS_PT.map((label, idx) => (
                <Button
                  key={label}
                  size="sm"
                  variant={month === idx ? 'default' : 'outline'}
                  onClick={() => setMonth(idx)}
                  className="h-8 px-3 min-w-[44px]"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Event filter */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evento Contábil</p>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full sm:w-80 h-9">
                <SelectValue placeholder="Todos os eventos" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">Todos os eventos</SelectItem>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span className={opt.isMacro ? 'font-semibold' : 'text-muted-foreground'}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[40%]">Evento Contábil</TableHead>
                <TableHead className="text-right">A Receber</TableHead>
                <TableHead className="text-right">A Pagar</TableHead>
                <TableHead className="text-center w-[110px]">Status</TableHead>
                <TableHead className="text-right">Total Ano (Receber)</TableHead>
                <TableHead className="text-right">Total Ano (Pagar)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(row => {
                const hasChildren = row.children.length > 0;
                const isOpen = !!expanded[row.macroId];
                return (
                  <Fragment key={row.macroId}>
                    <TableRow className="bg-muted/20 hover:bg-muted/40">
                      <TableCell className="font-semibold">
                        <button
                          className="flex items-center gap-1.5 text-left"
                          onClick={() => hasChildren && toggleExpanded(row.macroId)}
                          disabled={!hasChildren}
                        >
                          {hasChildren ? (
                            isOpen
                              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : <span className="w-3.5" />}
                          {row.macroName}
                        </button>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${valueClass(row.status, 'receber', row.receber)}`}>
                        {row.receber > 0 ? formatCurrency(row.receber) : '–'}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${valueClass(row.status, 'pagar', row.pagar)}`}>
                        {row.pagar > 0 ? formatCurrency(row.pagar) : '–'}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.totalAno.receber > 0 ? formatCurrency(row.totalAno.receber) : '–'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.totalAno.pagar > 0 ? formatCurrency(row.totalAno.pagar) : '–'}
                      </TableCell>
                    </TableRow>
                    {isOpen && row.children.map(child => (
                      <TableRow key={`${row.macroId}-${child.id}`} className="bg-background">
                        <TableCell className="pl-10 text-sm text-muted-foreground">
                          ↳ {child.name}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums text-sm ${valueClass(child.status, 'receber', child.receber)}`}>
                          {child.receber > 0 ? formatCurrency(child.receber) : '–'}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums text-sm ${valueClass(child.status, 'pagar', child.pagar)}`}>
                          {child.pagar > 0 ? formatCurrency(child.pagar) : '–'}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={child.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {child.totalAno.receber > 0 ? formatCurrency(child.totalAno.receber) : '–'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                          {child.totalAno.pagar > 0 ? formatCurrency(child.totalAno.pagar) : '–'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/60 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(footer.pReceber)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                    {formatCurrency(footer.pPagar)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">{formatCurrency(footer.yReceber)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(footer.yPagar)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { UnifiedFilterBox, PeriodFilter, getDateRangeFromPeriod } from '@/components/filters/UnifiedFilterBox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { AlertTriangle, SlidersHorizontal, ChevronDown, ChevronUp, Landmark, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { format, differenceInDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { Transaction } from '@/hooks/useTransactions';
import type { Bank } from '@/hooks/useBanks';
import type { Contact } from '@/hooks/useContacts';

interface Category {
  id: string;
  name: string;
  color: string | null;
  type: string;
}

interface CashFlowTabProps {
  transactions: Transaction[];
  banks: Bank[];
  categories: Category[];
  contacts: Contact[];
  togglePaid: { mutate: (args: { id: string; is_paid: boolean }) => void };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy');
}

function getDayOfWeek(dateStr: string) {
  return format(new Date(dateStr + 'T12:00:00'), 'EEEE', { locale: ptBR });
}

function getStatus(isPaid: boolean, dueDate: string | null): 'pago' | 'pendente' | 'vencido' {
  if (isPaid) return 'pago';
  if (dueDate) {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (dueDate < today) return 'vencido';
  }
  return 'pendente';
}

export function CashFlowTab({ transactions, banks, categories, contacts, togglePaid }: CashFlowTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bankFilter, setBankFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getDateRange = (p: PeriodFilter) => {
    if (p === 'custom' && customStartDate && customEndDate) return { start: customStartDate, end: customEndDate };
    return getDateRangeFromPeriod(p);
  };

  // Active banks total
  const activeBanks = useMemo(() => banks.filter(b => b.is_active), [banks]);
  const totalBankBalance = useMemo(() => activeBanks.reduce((s, b) => s + Number(b.current_balance), 0), [activeBanks]);

  // Filtered & sorted transactions
  const filtered = useMemo(() => {
    const range = getDateRange(period);
    let result = [...transactions];
    if (range) {
      result = result.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: range.start, end: range.end });
      });
    }
    if (bankFilter !== 'all') result = result.filter(t => t.bank_id === bankFilter);
    if (categoryFilter !== 'all') result = result.filter(t => t.category_id === categoryFilter);
    if (contactFilter !== 'all') result = result.filter(t => t.contact_id === contactFilter);
    if (paymentStatusFilter === 'paid') result = result.filter(t => t.is_paid);
    else if (paymentStatusFilter === 'pending') result = result.filter(t => !t.is_paid);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(t => t.description.toLowerCase().includes(s) || t.contact?.name?.toLowerCase().includes(s));
    }
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [transactions, period, customStartDate, customEndDate, bankFilter, categoryFilter, contactFilter, paymentStatusFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const mesStart = startOfMonth(today);
    const mesEnd = endOfMonth(today);

    // Capital de Giro — from ALL transactions (not filtered), only !is_paid
    let receitasPendentesMes = 0, despesasPendentesMes = 0;
    let receitasPendentesHoje = 0, despesasPendentesHoje = 0;
    for (const t of transactions) {
      if (t.is_paid || !t.due_date) continue;
      const d = parseISO(t.due_date);
      const amt = Number(t.amount);
      if (isWithinInterval(d, { start: mesStart, end: mesEnd })) {
        if (t.type === 'receita') receitasPendentesMes += amt;
        else despesasPendentesMes += amt;
      }
      if (t.due_date <= todayStr) {
        if (t.type === 'receita') receitasPendentesHoje += amt;
        else despesasPendentesHoje += amt;
      }
    }

    // Entradas/Saídas — from filtered, split by is_paid
    let receitasPendentes = 0, receitasPagas = 0;
    let despesasPendentes = 0, despesasPagas = 0;
    for (const t of filtered) {
      const amt = Number(t.amount);
      if (t.type === 'receita') {
        if (t.is_paid) receitasPagas += amt;
        else receitasPendentes += amt;
      } else {
        if (t.is_paid) despesasPagas += amt;
        else despesasPendentes += amt;
      }
    }

    return {
      capitalDeGiroMes: totalBankBalance + receitasPendentesMes - despesasPendentesMes,
      capitalDeGiroHoje: totalBankBalance + receitasPendentesHoje - despesasPendentesHoje,
      receitasPendentes,
      receitasPagas,
      despesasPendentes,
      despesasPagas,
    };
  }, [filtered, transactions, totalBankBalance]);

  // Running balance with juros/multa
  const rows = useMemo(() => {
    let saldoAcumulado = totalBankBalance;

    return filtered.map(t => {
      const amt = Number(t.amount);
      const status = getStatus(t.is_paid, t.due_date);
      const isHonorarios = t.category?.name === 'Honorários Contábeis';
      let displayAmount = amt;
      let hasJuros = false;

      // Juros e multa virtual (apenas visual)
      if (t.type === 'receita' && isHonorarios && status === 'vencido' && t.due_date) {
        const diasAtraso = differenceInDays(new Date(), new Date(t.due_date + 'T12:00:00'));
        if (diasAtraso > 0) {
          const multa = amt * 0.02;
          const juros = amt * 0.0015 * diasAtraso;
          displayAmount = amt + multa + juros;
          hasJuros = true;
        }
      }

      // Running balance: apenas pendentes/vencidos alteram o saldo
      if (status !== 'pago') {
        if (t.type === 'receita') {
          saldoAcumulado += amt;
        } else {
          saldoAcumulado -= amt;
        }
      }

      return { ...t, status, displayAmount, hasJuros, originalAmount: amt, saldoAtual: saldoAcumulado };
    });
  }, [filtered, totalBankBalance]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center justify-end">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <UnifiedFilterBox
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            period={period}
            onPeriodChange={setPeriod}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomStartDateChange={setCustomStartDate}
            onCustomEndDateChange={setCustomEndDate}
            bankId={bankFilter}
            onBankChange={setBankFilter}
            banks={banks}
            categoryId={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
            paymentStatus={paymentStatusFilter}
            onPaymentStatusChange={setPaymentStatusFilter}
            contactId={contactFilter}
            onContactChange={setContactFilter}
            contacts={contacts}
            onClearFilters={() => {
              setPeriod('thisMonth');
              setCustomStartDate(null);
              setCustomEndDate(null);
              setBankFilter('all');
              setCategoryFilter('all');
              setContactFilter('all');
              setPaymentStatusFilter('all');
              setSearchTerm('');
            }}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital de Giro */}
        <Card className="bg-card border-border/50 border-l-2 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Capital de Giro</p>
                <p className={`text-2xl font-extrabold ${kpis.capitalDeGiroMes >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                  {formatCurrency(kpis.capitalDeGiroMes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Até hoje: {formatCurrency(kpis.capitalDeGiroHoje)}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entradas (A Receber) */}
        <Card className="bg-card border-border/50 border-l-2 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entradas</p>
                <p className="text-2xl font-extrabold text-emerald-500">
                  {formatCurrency(kpis.receitasPendentes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Recebido: {formatCurrency(kpis.receitasPagas)}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saídas (A Pagar) */}
        <Card className="bg-card border-border/50 border-l-2 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saídas</p>
                <p className="text-2xl font-extrabold text-red-500">
                  {formatCurrency(kpis.despesasPendentes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Pago: {formatCurrency(kpis.despesasPagas)}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saldos Atuais */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Saldos Atuais</p>
            <div className="space-y-1">
              {activeBanks.map(b => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color || 'hsl(var(--primary))' }} />
                    <span className="text-muted-foreground truncate">{b.name}</span>
                  </div>
                  <span className={`font-semibold tabular-nums ${Number(b.current_balance) >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {formatCurrency(Number(b.current_balance))}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-border/50 pt-1 mt-1">
                <span className="font-semibold text-muted-foreground">Disponível Total</span>
                <span className={`font-bold ${totalBankBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {formatCurrency(totalBankBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <TooltipProvider>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap">Data Prevista</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Cliente/Fornecedor</TableHead>
                    <TableHead className="text-xs whitespace-nowrap text-right">Valor</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Vencimento</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Evento Contábil</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Histórico</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Dia da Semana</TableHead>
                    <TableHead className="text-xs whitespace-nowrap text-center">Status</TableHead>
                    <TableHead className="text-xs whitespace-nowrap text-right">Saldo Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma transação encontrada no período.
                      </TableCell>
                    </TableRow>
                  ) : rows.map(row => (
                    <TableRow key={row.id} className="text-xs">
                      <TableCell className="font-mono tabular-nums whitespace-nowrap">{formatDate(row.date)}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{row.contact?.name ?? row.description}</TableCell>

                      {/* Valor */}
                      <TableCell className="text-right whitespace-nowrap">
                        {row.type === 'receita' ? (
                          row.hasJuros ? (
                            <div className="flex items-center justify-end gap-1">
                              <div className="flex flex-col items-end">
                                <span className="text-muted-foreground line-through text-[10px]">{formatCurrency(row.originalAmount)}</span>
                                <span className="text-emerald-500 font-bold">{formatCurrency(row.displayAmount)}</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent><p>+ Juros e Multa</p></TooltipContent>
                              </Tooltip>
                            </div>
                          ) : (
                            <span className="text-emerald-500 font-semibold">{formatCurrency(row.originalAmount)}</span>
                          )
                        ) : (
                          <span className="text-red-500 font-semibold">{formatCurrency(row.originalAmount)}</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono tabular-nums whitespace-nowrap">{row.due_date ? formatDate(row.due_date) : '—'}</TableCell>
                      <TableCell className="truncate max-w-[120px]">{row.category?.name ?? '—'}</TableCell>
                      <TableCell className="truncate max-w-[140px]">{row.notes ?? '—'}</TableCell>
                      <TableCell className="capitalize whitespace-nowrap">{row.due_date ? getDayOfWeek(row.due_date) : '—'}</TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <button
                          onClick={() => togglePaid.mutate({ id: row.id, is_paid: !row.is_paid })}
                          className="cursor-pointer"
                        >
                          {row.status === 'pago' ? (
                            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[10px]">Pago</Badge>
                          ) : row.status === 'vencido' ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 text-[10px]">Vencido</Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px]">Pendente</Badge>
                          )}
                        </button>
                      </TableCell>

                      {/* Saldo Atual */}
                      <TableCell className={`text-right font-bold tabular-nums whitespace-nowrap ${row.saldoAtual < 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {formatCurrency(row.saldoAtual)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}

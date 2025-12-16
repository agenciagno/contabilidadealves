import { useMemo } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  Users,
  FileText,
  ChevronRight,
  PiggyBank
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTransactions } from '@/hooks/useTransactions';
import { useBanks } from '@/hooks/useBanks';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useContacts } from '@/hooks/useContacts';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Area, AreaChart, CartesianGrid } from 'recharts';
import { format, addDays, isBefore, isAfter, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardWidgetsConfig, useDashboardWidgets } from '@/components/dashboard/DashboardWidgets';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
};

const CHART_COLORS = [
  'hsl(142.1 76.2% 36.3%)',
  'hsl(221.2 83.2% 53.3%)',
  'hsl(262.1 83.3% 57.8%)',
  'hsl(24.6 95% 53.1%)',
  'hsl(346.8 77.2% 49.8%)',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const { widgets, toggleWidget, isWidgetEnabled } = useDashboardWidgets();

  const { transactions, isLoading: loadingTransactions } = useTransactions({
    month: currentMonth,
    year: currentYear,
  });

  const { banks, isLoading: loadingBanks } = useBanks();
  const { recurringTransactions } = useRecurringTransactions();
  const { contacts } = useContacts();

  // Calculate financial summary
  const summary = useMemo(() => {
    const receitas = transactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const despesas = transactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const receitasPagas = transactions
      .filter(t => t.type === 'receita' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const despesasPagas = transactions
      .filter(t => t.type === 'despesa' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const aReceber = transactions
      .filter(t => t.type === 'receita' && !t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const aPagar = transactions
      .filter(t => t.type === 'despesa' && !t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const saldoAtual = banks
      .filter(b => b.is_active)
      .reduce((sum, b) => sum + Number(b.current_balance), 0);

    const saldoPrevisto = saldoAtual + aReceber - aPagar;

    const receitasProgress = receitas > 0 ? (receitasPagas / receitas) * 100 : 0;
    const despesasProgress = despesas > 0 ? (despesasPagas / despesas) * 100 : 0;

    return {
      receitas,
      despesas,
      receitasPagas,
      despesasPagas,
      saldoAtual,
      aReceber,
      aPagar,
      saldoPrevisto,
      receitasProgress,
      despesasProgress,
      saldo: receitas - despesas,
    };
  }, [transactions, banks]);

  // Monthly evolution data (last 6 months)
  const monthlyEvolution = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, 'yyyy-MM');
      months.push({
        key: monthKey,
        month: format(date, 'MMM', { locale: ptBR }),
        receitas: 0,
        despesas: 0,
        saldo: 0,
      });
    }

    transactions.forEach(t => {
      const tDate = parseISO(t.date);
      const monthKey = format(tDate, 'yyyy-MM');
      const monthData = months.find(m => m.key === monthKey);
      if (monthData) {
        if (t.type === 'receita') {
          monthData.receitas += Number(t.amount);
        } else {
          monthData.despesas += Number(t.amount);
        }
      }
    });

    months.forEach(m => {
      m.saldo = m.receitas - m.despesas;
    });

    return months;
  }, [transactions, now]);

  // Category chart data
  const categoryChartData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number; color: string }>();
    
    transactions.forEach(t => {
      if (t.type === 'despesa' && t.category) {
        const existing = categoryMap.get(t.category.id);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          categoryMap.set(t.category.id, {
            name: t.category.name,
            value: Number(t.amount),
            color: t.category.color || CHART_COLORS[categoryMap.size % CHART_COLORS.length],
          });
        }
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions]);

  // Upcoming bills (unpaid in next 7 days or overdue)
  const upcomingBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = addDays(today, 7);
    
    return transactions
      .filter(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        return t.type === 'despesa' && !t.is_paid && isBefore(tDate, nextWeek);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // Active banks
  const activeBanks = useMemo(() => {
    return banks.filter(b => b.is_active).sort((a, b) => Number(b.current_balance) - Number(a.current_balance));
  }, [banks]);

  // Stats counts
  const statsCount = useMemo(() => ({
    transactions: transactions.length,
    recurring: recurringTransactions.filter(r => r.is_active).length,
    contacts: contacts.length,
    banks: activeBanks.length,
  }), [transactions, recurringTransactions, contacts, activeBanks]);

  const chartConfig = {
    receitas: { label: 'Receitas', color: 'hsl(142.1 76.2% 36.3%)' },
    despesas: { label: 'Despesas', color: 'hsl(0 84.2% 60.2%)' },
    saldo: { label: 'Saldo', color: 'hsl(221.2 83.2% 53.3%)' },
  };

  const isLoading = loadingTransactions || loadingBanks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral de {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <DashboardWidgetsConfig widgets={widgets} onToggle={toggleWidget} />
          <Button variant="outline" size="sm" onClick={() => navigate('/relatorios')}>
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => navigate('/transactions?type=receita')}
        >
          <Plus className="w-4 h-4" />
          Receita
        </Button>
        <Button 
          variant="destructive" 
          className="gap-2"
          onClick={() => navigate('/transactions?type=despesa')}
        >
          <Plus className="w-4 h-4" />
          Despesa
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate('/recurring')}
        >
          <Clock className="w-4 h-4" />
          Recorrente
        </Button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isWidgetEnabled('receitas') && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Receitas do Mês</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.receitas)}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Recebido</span>
                      <span>{summary.receitasProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={summary.receitasProgress} className="h-1.5" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('despesas') && (
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Despesas do Mês</span>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.despesas)}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Pago</span>
                      <span>{summary.despesasProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={summary.despesasProgress} className="h-1.5" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('saldo') && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Saldo em Contas</span>
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-500">{formatCurrency(summary.saldoAtual)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Previsto: <span className={summary.saldoPrevisto >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {formatCurrency(summary.saldoPrevisto)}
                    </span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('resultado') && (
          <Card className={`bg-gradient-to-br ${summary.saldo >= 0 ? 'from-primary/10 to-primary/5 border-primary/20' : 'from-orange-500/10 to-orange-500/5 border-orange-500/20'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Resultado do Mês</span>
                {summary.saldo >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-orange-500" />
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-primary' : 'text-orange-500'}`}>
                    {formatCurrency(summary.saldo)}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-emerald-500">+{formatCompact(summary.aReceber)} a receber</span>
                    <span className="text-red-500">-{formatCompact(summary.aPagar)} a pagar</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('aReceber') && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">A Receber</span>
                <PiggyBank className="w-5 h-5 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.aReceber)}</p>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('aPagar') && (
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">A Pagar</span>
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.aPagar)}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bank Accounts */}
      {isWidgetEnabled('bankAccounts') && activeBanks.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Contas Bancárias
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/banks" className="text-xs text-muted-foreground">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeBanks.slice(0, 4).map((bank) => (
                <div
                  key={bank.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: bank.color || '#3B82F6' }}
                    />
                    <span className="text-sm font-medium truncate">{bank.name}</span>
                  </div>
                  <p className={`text-lg font-bold ${Number(bank.current_balance) >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {formatCurrency(Number(bank.current_balance))}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      {(isWidgetEnabled('evolution') || isWidgetEnabled('categoryChart')) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        {isWidgetEnabled('evolution') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : monthlyEvolution.some(d => d.receitas > 0 || d.despesas > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142.1 76.2% 36.3%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="hsl(142.1 76.2% 36.3%)" 
                    fillOpacity={1} 
                    fill="url(#colorReceitas)" 
                    name="Receitas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="hsl(0 84.2% 60.2%)" 
                    fillOpacity={1} 
                    fill="url(#colorDespesas)" 
                    name="Despesas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Category Pie Chart */}
        {isWidgetEnabled('categoryChart') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem despesas categorizadas
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
      )}

      {/* Bottom Row */}
      {(isWidgetEnabled('upcomingBills') || isWidgetEnabled('recentTransactions')) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bills */}
        {isWidgetEnabled('upcomingBills') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Contas a Vencer
              </CardTitle>
              <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                {upcomingBills.length} pendente{upcomingBills.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : upcomingBills.length > 0 ? (
              <div className="space-y-2">
                {upcomingBills.map((bill) => {
                  const billDate = new Date(bill.date + 'T12:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = isBefore(billDate, today);
                  
                  return (
                    <div
                      key={bill.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{bill.description}</p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {isOverdue ? 'Vencido em ' : ''}{format(billDate, "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="font-semibold text-red-500 ml-3">
                        {formatCurrency(Number(bill.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma conta pendente nos próximos dias
              </p>
            )}
          </CardContent>
        </Card>
        )}

        {/* Recent Transactions */}
        {isWidgetEnabled('recentTransactions') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Últimas Movimentações
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transactions" className="text-xs text-muted-foreground">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'receita' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}
                      >
                        {transaction.type === 'receita' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category?.name || 'Sem categoria'} • {format(new Date(transaction.date + 'T12:00:00'), "dd/MM")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ml-3 ${
                        transaction.type === 'receita' ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {transaction.type === 'receita' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma movimentação encontrada
              </p>
            )}
          </CardContent>
        </Card>
        )}
      </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/transactions" className="block">
          <Card className="bg-card border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCount.transactions}</p>
                <p className="text-xs text-muted-foreground">Transações no mês</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/recurring" className="block">
          <Card className="bg-card border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCount.recurring}</p>
                <p className="text-xs text-muted-foreground">Contas recorrentes</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/contatos" className="block">
          <Card className="bg-card border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCount.contacts}</p>
                <p className="text-xs text-muted-foreground">Contatos</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/banks" className="block">
          <Card className="bg-card border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Building2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsCount.banks}</p>
                <p className="text-xs text-muted-foreground">Contas bancárias</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

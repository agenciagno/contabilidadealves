import { useMemo } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { useBanks } from '@/hooks/useBanks';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const { transactions, isLoading: loadingTransactions } = useTransactions({
    month: currentMonth,
    year: currentYear,
  });

  const { banks, isLoading: loadingBanks } = useBanks();

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

    return {
      receitas,
      despesas,
      saldoAtual,
      aReceber,
      aPagar,
      saldoPrevisto,
    };
  }, [transactions, banks]);

  // Monthly chart data (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      months.push({
        month: format(date, 'MMM', { locale: ptBR }),
        fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
        receitas: 0,
        despesas: 0,
      });
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const monthIdx = months.findIndex(
        m => m.fullMonth === format(tDate, 'MMMM yyyy', { locale: ptBR })
      );
      if (monthIdx !== -1) {
        if (t.type === 'receita') {
          months[monthIdx].receitas += Number(t.amount);
        } else {
          months[monthIdx].despesas += Number(t.amount);
        }
      }
    });

    return months;
  }, [transactions, currentMonth, currentYear]);

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

  // Upcoming bills (unpaid expenses in next 7 days)
  const upcomingBills = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    return transactions
      .filter(t => 
        t.type === 'despesa' && 
        !t.is_paid && 
        isAfter(new Date(t.date), today) &&
        isBefore(new Date(t.date), nextWeek)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const stats = [
    { label: 'Receitas', value: formatCurrency(summary.receitas), icon: TrendingUp, color: 'text-success' },
    { label: 'Despesas', value: formatCurrency(summary.despesas), icon: TrendingDown, color: 'text-destructive' },
    { label: 'Saldo Atual', value: formatCurrency(summary.saldoAtual), icon: Wallet, color: 'text-primary' },
    { label: 'A Receber', value: formatCurrency(summary.aReceber), icon: ArrowUpRight, color: 'text-success' },
    { label: 'A Pagar', value: formatCurrency(summary.aPagar), icon: ArrowDownRight, color: 'text-destructive' },
    { label: 'Saldo Previsto', value: formatCurrency(summary.saldoPrevisto), icon: Clock, color: 'text-primary' },
  ];

  const chartConfig = {
    receitas: {
      label: 'Receitas',
      color: 'hsl(var(--success))',
    },
    despesas: {
      label: 'Despesas',
      color: 'hsl(var(--destructive))',
    },
  };

  const isLoading = loadingTransactions || loadingBanks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-muted-foreground">
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Acesso Rápido */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Acesso Rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => navigate('/transactions?type=despesa')}
          >
            <Plus className="w-4 h-4" />
            Despesa
          </Button>
          <Button 
            variant="default" 
            className="gap-2"
            onClick={() => navigate('/transactions?type=receita')}
          >
            <Plus className="w-4 h-4" />
            Receita
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
      </section>

      {/* Cards de Estatísticas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : monthlyChartData.some(d => d.receitas > 0 || d.despesas > 0) ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={monthlyChartData}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="receitas" fill="var(--color-receitas)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
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
      </div>

      {/* Próximas Contas e Últimas Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximas Contas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcomingBills.length > 0 ? (
              <div className="space-y-3">
                {upcomingBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{bill.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(bill.date), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="font-semibold text-destructive">
                      {formatCurrency(Number(bill.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma conta pendente nos próximos 7 dias
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Últimas Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          transaction.type === 'receita' ? 'bg-success' : 'bg-destructive'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category?.name || 'Sem categoria'} • {format(new Date(transaction.date), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.type === 'receita' ? 'text-success' : 'text-destructive'
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
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  Building2,
  Users,
  FileText,
  ChevronRight,
  PiggyBank,
  CreditCard,
  Tag,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTransactions } from '@/hooks/useTransactions';
import { useBanks } from '@/hooks/useBanks';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useContacts } from '@/hooks/useContacts';
import { useCategories } from '@/hooks/useCategories';
import { 
  ChartTooltip, 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Area, AreaChart, CartesianGrid } from 'recharts';
import { format, addDays, addMonths, isBefore, isAfter, subMonths, subDays, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardWidgetsConfig, useDashboardWidgets } from '@/components/dashboard/DashboardWidgets';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { BankFormDialog } from '@/components/banks/BankFormDialog';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { TransactionInsert } from '@/hooks/useTransactions';
import { UnifiedFilterBox, PeriodFilter, getDateRangeFromPeriod } from '@/components/filters/UnifiedFilterBox';
import { exportToCSV, exportToPDF } from '@/hooks/useReportData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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

  const { widgets, toggleWidget, isWidgetEnabled } = useDashboardWidgets();

  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<'receita' | 'despesa'>('despesa');
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  // Filter states - Default to 'all' (limpo)
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const { transactions: allTransactions, isLoading: loadingTransactions, createTransaction } = useTransactions();
  const { banks, isLoading: loadingBanks, createBank } = useBanks();
  const { recurringTransactions } = useRecurringTransactions();
  const { contacts, createContact } = useContacts();
  const { categories, createCategory } = useCategories();

  // Get date range for filtering
  const getDateRange = (): { start: Date; end: Date } | null => {
    if (period === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return getDateRangeFromPeriod(period);
  };

  // Clear all filters - limpa para estado padrão 'all'
  const handleClearFilters = () => {
    setPeriod('all');
    setSearchTerm('');
    setSelectedBankId('all');
    setCategoryFilter('all');
    setContactFilter('all');
    setPaymentStatusFilter('all');
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

  // Filter transactions based on all filters
  const transactions = useMemo(() => {
    let result = [...allTransactions];
    
    // Date filter
    const dateRange = getDateRange();
    if (dateRange) {
      result = result.filter((t) => {
        const txDate = parseISO(t.date);
        return isWithinInterval(txDate, { start: dateRange.start, end: dateRange.end });
      });
    }
    
    // Bank filter
    if (selectedBankId !== 'all') {
      result = result.filter(t => t.bank_id === selectedBankId);
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category_id === categoryFilter);
    }
    
    // Contact filter
    if (contactFilter !== 'all') {
      result = result.filter(t => t.contact_id === contactFilter);
    }
    
    // Payment status filter
    if (paymentStatusFilter === 'paid') {
      result = result.filter(t => t.is_paid);
    } else if (paymentStatusFilter === 'pending') {
      result = result.filter(t => !t.is_paid);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(t => t.description.toLowerCase().includes(search));
    }
    
    return result;
  }, [allTransactions, period, customStartDate, customEndDate, selectedBankId, categoryFilter, contactFilter, paymentStatusFilter, searchTerm]);

  // Calculate financial summary
  const summary = useMemo(() => {
    // Receitas
    const receitasPagas = transactions
      .filter(t => t.type === 'receita' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const aReceber = transactions
      .filter(t => t.type === 'receita' && !t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Despesas
    const despesasPagas = transactions
      .filter(t => t.type === 'despesa' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const aPagar = transactions
      .filter(t => t.type === 'despesa' && !t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Saldos
    const saldoBancario = banks
      .filter(b => b.is_active)
      .reduce((sum, b) => sum + Number(b.current_balance), 0);

    const caixaGeral = banks
      .filter(b => b.is_active && b.is_caixa_geral)
      .reduce((sum, b) => sum + Number(b.current_balance), 0);

    return {
      receitasPagas,
      aReceber,
      despesasPagas,
      aPagar,
      saldoBancario,
      caixaGeral,
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

    allTransactions.forEach(t => {
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
  }, [allTransactions, now]);

  // Category chart data (expenses)
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

  // Revenue category chart data
  const revenueCategoryChartData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; value: number; color: string }>();
    
    transactions.forEach(t => {
      if (t.type === 'receita' && t.category) {
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

  // Pending transactions (unified list - a receber + a pagar)
  const pendingTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTransactions
      .filter(t => !t.is_paid)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 15);
  }, [allTransactions]);

  // Recent transactions (last 10)
  const recentTransactions = useMemo(() => {
    return [...allTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [allTransactions]);

  const isLoading = loadingTransactions || loadingBanks;

  // Handlers
  const handleNewTransaction = (type: 'receita' | 'despesa') => {
    setDefaultTransactionType(type);
    setTransactionDialogOpen(true);
  };

  const handleTransactionSubmit = (data: TransactionInsert) => {
    createTransaction.mutate(data, {
      onSuccess: () => setTransactionDialogOpen(false),
    });
  };

  const handleBankSubmit = (data: any) => {
    createBank.mutate(data, {
      onSuccess: () => setBankDialogOpen(false),
    });
  };

  const handleContactSubmit = (data: any) => {
    createContact.mutate(data, {
      onSuccess: () => setContactDialogOpen(false),
    });
  };

  const handleCategorySubmit = (data: any) => {
    createCategory.mutate(data, {
      onSuccess: () => setCategoryDialogOpen(false),
    });
  };

  // Export handlers
  const handleExportCSV = () => {
    const reportData = transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      is_paid: t.is_paid,
      category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '' } : null,
      bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '' } : null,
      contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null,
    }));
    exportToCSV(reportData);
  };

  const handleExportPDF = () => {
    const reportData = transactions.map(t => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      is_paid: t.is_paid,
      category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color || '' } : null,
      bank: t.bank ? { id: t.bank.id, name: t.bank.name, color: t.bank.color || '' } : null,
      contact: t.contact ? { id: t.contact.id, name: t.contact.name, type: t.contact.type } : null,
    }));
    const totals = {
      receitas: transactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + Number(t.amount), 0),
      despesas: transactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + Number(t.amount), 0),
    };
    const dateRange = getDateRange();
    exportToPDF(reportData, totals, dateRange?.start, dateRange?.end);
  };

  // Period label for display
  const periodLabel = useMemo(() => {
    const dateRange = getDateRange();
    if (dateRange) {
      return `${format(dateRange.start, "dd/MM/yyyy")} - ${format(dateRange.end, "dd/MM/yyyy")}`;
    }
    return 'Visão Geral';
  }, [period, customStartDate, customEndDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {periodLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <DashboardWidgetsConfig widgets={widgets} onToggle={toggleWidget} />
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
                <FileText className="w-4 h-4" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => navigate('/relatorios')}>
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button 
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => handleNewTransaction('receita')}
        >
          <Plus className="w-4 h-4" />
          Receita
        </Button>
        <Button 
          variant="destructive" 
          className="gap-2"
          onClick={() => handleNewTransaction('despesa')}
        >
          <Plus className="w-4 h-4" />
          Despesa
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => setBankDialogOpen(true)}
        >
          <Building2 className="w-4 h-4" />
          Conta
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => setContactDialogOpen(true)}
        >
          <Users className="w-4 h-4" />
          Cliente/Forn.
        </Button>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => setCategoryDialogOpen(true)}
        >
          <Tag className="w-4 h-4" />
          Categoria
        </Button>
      </div>

      {/* Filters */}
      <UnifiedFilterBox
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        period={period}
        onPeriodChange={setPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        bankId={selectedBankId}
        onBankChange={setSelectedBankId}
        banks={banks}
        categoryId={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        paymentStatus={paymentStatusFilter}
        onPaymentStatusChange={setPaymentStatusFilter}
        contactId={contactFilter}
        onContactChange={setContactFilter}
        contacts={contacts}
        onClearFilters={handleClearFilters}
      />

      {/* Main Stats Cards - Nova estrutura: 3 linhas x 2 colunas (50% cada) */}
      
      {/* Linha 1: Receitas */}
      <div className="grid grid-cols-2 gap-4">
        {isWidgetEnabled('receitasRecebidas') && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Receitas Recebidas</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-emerald-500 transition-all duration-300">
                  {formatCurrency(summary.receitasPagas)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('receitasAReceber') && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Receitas a Receber</span>
                <PiggyBank className="w-5 h-5 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-emerald-500 transition-all duration-300">
                  {formatCurrency(summary.aReceber)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Linha 2: Despesas */}
      <div className="grid grid-cols-2 gap-4">
        {isWidgetEnabled('contasPagas') && (
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Contas Pagas</span>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-red-500 transition-all duration-300">
                  {formatCurrency(summary.despesasPagas)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('contasAPagar') && (
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Contas a Pagar</span>
                <CreditCard className="w-5 h-5 text-red-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-bold text-red-500 transition-all duration-300">
                  {formatCurrency(summary.aPagar)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Linha 3: Saldos */}
      <div className="grid grid-cols-2 gap-4">
        {isWidgetEnabled('saldoBancario') && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Saldo Bancário</span>
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className={`text-2xl font-bold transition-all duration-300 ${summary.saldoBancario >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(summary.saldoBancario)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isWidgetEnabled('caixaGeral') && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Caixa Geral</span>
                <Wallet className="w-5 h-5 text-blue-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className={`text-2xl font-bold transition-all duration-300 ${summary.caixaGeral >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {formatCurrency(summary.caixaGeral)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Evolution - Full Width & Larger */}
      {isWidgetEnabled('evolution') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
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

      {/* Category Charts Row */}
      {(isWidgetEnabled('revenueCategoryChart') || isWidgetEnabled('categoryChart')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Category Pie Chart */}
          {isWidgetEnabled('revenueCategoryChart') && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Receitas por Evento Contábil</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : revenueCategoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueCategoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {revenueCategoryChartData.map((entry, index) => (
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
                    Sem receitas categorizadas
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expense Category Pie Chart */}
          {isWidgetEnabled('categoryChart') && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Despesas por Evento Contábil</CardTitle>
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

      {/* Lista Unificada de Contas Pendentes - 100% largura */}
      {isWidgetEnabled('pendingList') && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contas Pendentes
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/movimentacoes" className="text-xs text-muted-foreground">
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
            ) : pendingTransactions.length > 0 ? (
              <div className="space-y-2">
                {pendingTransactions.map((transaction) => {
                  const isReceita = transaction.type === 'receita';
                  const txDate = new Date(transaction.date + 'T12:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = isBefore(txDate, today);
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isReceita 
                          ? 'bg-emerald-500/10 border-emerald-500/20' 
                          : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isReceita ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                          {isReceita ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.contact?.name || 'Sem contato'} • Venc: {format(txDate, "dd/MM/yyyy")}
                            {isOverdue && (
                              <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500/50">
                                Vencido
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ml-3 ${
                        isReceita ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {formatCurrency(Number(transaction.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma conta pendente
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
                Últimas 10 Movimentações
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/movimentacoes" className="text-xs text-muted-foreground">
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

      {/* Dialogs */}
      <TransactionFormDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        transaction={null}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onSubmit={handleTransactionSubmit}
        isLoading={createTransaction.isPending}
        defaultType={defaultTransactionType}
      />

      <BankFormDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        onSubmit={handleBankSubmit}
        isLoading={createBank.isPending}
      />

      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onSubmit={handleContactSubmit}
        isLoading={createContact.isPending}
      />

      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCategorySubmit}
        isLoading={createCategory.isPending}
      />
    </div>
  );
}

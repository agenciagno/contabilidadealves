import { useMemo, useState } from 'react';
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
  PiggyBank,
  CreditCard,
  Tag,
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
import { useCategories } from '@/hooks/useCategories';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Area, AreaChart, CartesianGrid } from 'recharts';
import { format, addDays, addMonths, isBefore, isAfter, subMonths, subDays, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardWidgetsConfig, useDashboardWidgets } from '@/components/dashboard/DashboardWidgets';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { BankFormDialog } from '@/components/banks/BankFormDialog';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { TransactionInsert } from '@/hooks/useTransactions';
import { ReportFilters, QuickPeriod } from '@/components/reports/ReportFilters';
import { exportToCSV, exportToPDF } from '@/hooks/useReportData';

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

  const { widgets, toggleWidget, isWidgetEnabled } = useDashboardWidgets();

  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<'receita' | 'despesa'>('despesa');
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(now));
  const [endDate, setEndDate] = useState<Date | undefined>(now);
  const [categoryId, setCategoryId] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [contactId, setContactId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('thisMonth');

  const { transactions: allTransactions, isLoading: loadingTransactions, createTransaction } = useTransactions();
  const { banks, isLoading: loadingBanks, createBank } = useBanks();
  const { recurringTransactions } = useRecurringTransactions();
  const { contacts, createContact } = useContacts();
  const { categories, createCategory } = useCategories();

  // Handle quick period change
  const handleQuickPeriodChange = (period: QuickPeriod) => {
    setQuickPeriod(period);
    const today = new Date();

    switch (period) {
      case 'thisMonth':
        setStartDate(startOfMonth(today));
        setEndDate(today);
        setPaymentStatus('all');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        setPaymentStatus('all');
        break;
      case 'thisYear':
        setStartDate(startOfYear(today));
        setEndDate(today);
        setPaymentStatus('all');
        break;
      case 'last30Days':
        setStartDate(subDays(today, 30));
        setEndDate(today);
        setPaymentStatus('all');
        break;
      case 'last15Days':
        setStartDate(subDays(today, 15));
        setEndDate(today);
        setPaymentStatus('all');
        break;
      case 'nextMonth':
        const nextMonth = addMonths(today, 1);
        setStartDate(startOfMonth(nextMonth));
        setEndDate(endOfMonth(nextMonth));
        setPaymentStatus('pending');
        break;
      case 'next30Days':
        setStartDate(today);
        setEndDate(addDays(today, 30));
        setPaymentStatus('pending');
        break;
      case 'next15Days':
        setStartDate(today);
        setEndDate(addDays(today, 15));
        setPaymentStatus('pending');
        break;
      default:
        break;
    }
  };

  // Filter transactions based on all filters
  const transactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const txDate = new Date(t.date + 'T12:00:00');
      
      // Date filter
      if (startDate && txDate < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (txDate > endOfDay) return false;
      }
      
      // Type filter
      if (transactionType !== 'all' && t.type !== transactionType) return false;
      
      // Category filter
      if (categoryId !== 'all' && t.category_id !== categoryId) return false;
      
      // Bank filter
      if (bankId !== 'all' && t.bank_id !== bankId) return false;
      
      // Contact filter
      if (contactId !== 'all' && t.contact_id !== contactId) return false;
      
      // Payment status filter
      if (paymentStatus === 'paid' && !t.is_paid) return false;
      if (paymentStatus === 'pending' && t.is_paid) return false;
      
      return true;
    });
  }, [allTransactions, startDate, endDate, transactionType, categoryId, bankId, contactId, paymentStatus]);

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

  // Upcoming receivables (next 10)
  const upcomingReceivables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTransactions
      .filter(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        return t.type === 'receita' && !t.is_paid && (isAfter(tDate, today) || format(tDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [allTransactions]);

  // Upcoming payables (next 10)
  const upcomingPayables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allTransactions
      .filter(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        return t.type === 'despesa' && !t.is_paid && (isAfter(tDate, today) || format(tDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [allTransactions]);

  // Recent transactions (last 10)
  const recentTransactions = useMemo(() => {
    return [...allTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [allTransactions]);

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
    exportToPDF(reportData, totals, startDate, endDate);
  };

  // Period label for display
  const periodLabel = useMemo(() => {
    if (startDate && endDate) {
      return `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`;
    }
    return format(now, "MMMM 'de' yyyy", { locale: ptBR });
  }, [startDate, endDate, now]);

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
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(date) => { setStartDate(date); setQuickPeriod(null); }}
        onEndDateChange={(date) => { setEndDate(date); setQuickPeriod(null); }}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        bankId={bankId}
        onBankChange={setBankId}
        transactionType={transactionType}
        onTransactionTypeChange={setTransactionType}
        contactId={contactId}
        onContactChange={setContactId}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={setPaymentStatus}
        categories={categories}
        banks={banks}
        contacts={contacts}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        quickPeriod={quickPeriod}
        onQuickPeriodChange={handleQuickPeriodChange}
      />

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                <p className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-primary' : 'text-orange-500'}`}>
                  {formatCurrency(summary.saldo)}
                </p>
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
                <CreditCard className="w-5 h-5 text-red-500" />
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
                <CardTitle className="text-base">Receitas por Categoria</CardTitle>
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

      {/* Receivables and Payables Row */}
      {(isWidgetEnabled('receivables') || isWidgetEnabled('payables')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts Receivable */}
          {isWidgetEnabled('receivables') && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-emerald-500" />
                    Contas a Receber
                  </CardTitle>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                    {upcomingReceivables.length} pendente{upcomingReceivables.length !== 1 ? 's' : ''}
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
                ) : upcomingReceivables.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {upcomingReceivables.map((item) => {
                      const itemDate = new Date(item.date + 'T12:00:00');
                      
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(itemDate, "dd 'de' MMM", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="font-semibold text-emerald-500 ml-3">
                            {formatCurrency(Number(item.amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma conta a receber pendente
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Accounts Payable */}
          {isWidgetEnabled('payables') && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-red-500" />
                    Contas a Pagar
                  </CardTitle>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                    {upcomingPayables.length} pendente{upcomingPayables.length !== 1 ? 's' : ''}
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
                ) : upcomingPayables.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {upcomingPayables.map((item) => {
                      const itemDate = new Date(item.date + 'T12:00:00');
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isOverdue = isBefore(itemDate, today);
                      
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.description}</p>
                            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {isOverdue ? 'Vencido em ' : ''}{format(itemDate, "dd 'de' MMM", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="font-semibold text-red-500 ml-3">
                            {formatCurrency(Number(item.amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma conta a pagar pendente
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
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

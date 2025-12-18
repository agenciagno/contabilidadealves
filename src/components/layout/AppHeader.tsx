import { useMemo } from 'react';
import { Bell, Moon, Sun, TrendingDown, TrendingUp, Calendar, Users, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTransactions } from '@/hooks/useTransactions';
import { useInadimplentContacts } from '@/hooks/useInadimplentContacts';
import { format, isBefore, addDays, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { HeaderCalculator } from './HeaderCalculator';
import { HeaderCalendar } from './HeaderCalendar';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function AppHeader() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const { transactions: allTransactions } = useTransactions();
  const { inadimplentContacts, count: inadimplentCount } = useInadimplentContacts();

  // Filter transactions for current month
  const transactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const txDate = new Date(t.date + 'T12:00:00');
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
  }, [allTransactions, currentMonth, currentYear]);

  // Get upcoming unpaid bills (next 7 days) and overdue bills
  const notifications = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    const upcoming = transactions
      .filter(t => {
        if (t.is_paid) return false;
        const transactionDate = startOfDay(parseISO(t.date));
        // Include overdue (past) and upcoming (next 7 days)
        return isBefore(transactionDate, nextWeek);
      })
      .map(t => {
        const transactionDate = startOfDay(parseISO(t.date));
        const isOverdue = isBefore(transactionDate, today);
        return {
          ...t,
          isOverdue,
          daysUntil: Math.ceil((transactionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return upcoming;
  }, [transactions]);

  const overdueCount = notifications.filter(n => n.isOverdue).length;
  const upcomingCount = notifications.filter(n => !n.isOverdue).length;
  const totalCount = notifications.length + inadimplentCount;

  const getDueDateLabel = (daysUntil: number, isOverdue: boolean) => {
    if (isOverdue) {
      if (daysUntil === -1) return 'Venceu ontem';
      return `Venceu há ${Math.abs(daysUntil)} dias`;
    }
    if (daysUntil === 0) return 'Vence hoje';
    if (daysUntil === 1) return 'Vence amanhã';
    return `Vence em ${daysUntil} dias`;
  };

  const getOverdueDaysLabel = (oldestDueDate: string) => {
    const days = differenceInDays(new Date(), parseISO(oldestDueDate));
    if (days === 1) return 'há 1 dia';
    return `há ${days} dias`;
  };

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <HeaderCalculator />
          <HeaderCalendar />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground hover:text-foreground"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                {totalCount > 0 && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full ${
                    overdueCount > 0 || inadimplentCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
                  }`}>
                    {totalCount > 9 ? '9+' : totalCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Notificações</h3>
                  <div className="flex gap-2 flex-wrap">
                    {inadimplentCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {inadimplentCount} inadimplente{inadimplentCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {overdueCount > 0 && (
                      <Badge variant="outline" className="text-xs border-destructive text-destructive">
                        {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {upcomingCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {upcomingCount} a vencer
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <ScrollArea className="max-h-96">
                {/* Inadimplent Contacts Section */}
                {inadimplentCount > 0 && (
                  <>
                    <div className="px-3 py-2 bg-destructive/10">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium">Clientes Inadimplentes</span>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {inadimplentContacts.slice(0, 5).map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => navigate(`/crm/cliente/${contact.id}`)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-destructive/20">
                              <Users className="w-4 h-4 text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {contact.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-destructive font-medium">
                                  {contact.overdueCount} título{contact.overdueCount > 1 ? 's' : ''} em atraso
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {getOverdueDaysLabel(contact.oldestDueDate)}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-semibold flex-shrink-0 text-destructive">
                              {formatCurrency(contact.totalOverdue)}
                            </span>
                          </div>
                        </button>
                      ))}
                      {inadimplentCount > 5 && (
                        <button
                          onClick={() => navigate('/contatos')}
                          className="w-full p-2 text-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                          Ver todos os {inadimplentCount} inadimplentes
                        </button>
                      )}
                    </div>
                    {notifications.length > 0 && <Separator />}
                  </>
                )}

                {/* Transactions Section */}
                {notifications.length > 0 && (
                  <>
                    <div className="px-3 py-2 bg-muted/50">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium">Contas Pendentes</span>
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => navigate('/movimentacoes')}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                notification.type === 'receita' 
                                  ? 'bg-success/20' 
                                  : notification.isOverdue 
                                    ? 'bg-destructive/20' 
                                    : 'bg-warning/20'
                              }`}
                            >
                              {notification.type === 'receita' ? (
                                <TrendingUp className="w-4 h-4 text-success" />
                              ) : (
                                <TrendingDown className={`w-4 h-4 ${notification.isOverdue ? 'text-destructive' : 'text-warning'}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {notification.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs ${notification.isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                  {getDueDateLabel(notification.daysUntil, notification.isOverdue)}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(notification.date), "dd/MM", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-semibold flex-shrink-0 ${
                                notification.type === 'receita' ? 'text-success' : 'text-destructive'
                              }`}
                            >
                              {formatCurrency(Number(notification.amount))}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Empty State */}
                {notifications.length === 0 && inadimplentCount === 0 && (
                  <div className="p-6 text-center">
                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma notificação pendente
                    </p>
                  </div>
                )}
              </ScrollArea>
              
              {(notifications.length > 0 || inadimplentCount > 0) && (
                <div className="p-2 border-t border-border flex gap-2">
                  {inadimplentCount > 0 && (
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-sm" 
                      onClick={() => navigate('/contatos')}
                    >
                      Ver Contatos
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-sm" 
                      onClick={() => navigate('/movimentacoes')}
                    >
                      Ver Transações
                    </Button>
                  )}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
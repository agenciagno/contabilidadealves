import { useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RefreshCw, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRecurringTransactions, RecurringTransaction, RecurringTransactionInsert } from '@/hooks/useRecurringTransactions';
import { RecurringFormDialog } from '@/components/recurring/RecurringFormDialog';
import { DAY_LABELS } from '@/components/recurring/WeekDaysSelector';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};

export default function RecurringBills() {
  const {
    recurringTransactions,
    isLoading,
    monthlyTotals,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    toggleActive,
  } = useRecurringTransactions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingRecurring(null);
    setDialogOpen(true);
  };

  const handleEdit = (recurring: RecurringTransaction) => {
    setEditingRecurring(recurring);
    setDialogOpen(true);
  };

  const handleSubmit = (data: RecurringTransactionInsert) => {
    if (editingRecurring) {
      updateRecurring.mutate({ id: editingRecurring.id, ...data }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createRecurring.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRecurring.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const activeRecurring = recurringTransactions.filter(r => r.is_active);
  const inactiveRecurring = recurringTransactions.filter(r => !r.is_active);

  const RecurringCard = ({ recurring }: { recurring: RecurringTransaction }) => (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                recurring.type === 'receita' ? 'bg-success/20' : 'bg-destructive/20'
              }`}
            >
              {recurring.type === 'receita' ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{recurring.description}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {recurring.category && (
                  <Badge variant="secondary" className="text-xs">
                    <div
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: recurring.category.color || '#3B82F6' }}
                    />
                    {recurring.category.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {frequencyLabels[recurring.frequency]}
                  {recurring.frequency === 'weekly' && recurring.times_per_week && recurring.times_per_week > 1 && (
                    <span className="ml-1">({recurring.times_per_week}x)</span>
                  )}
                </Badge>
                {recurring.day_of_month && recurring.frequency === 'monthly' && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Dia {recurring.day_of_month}
                  </Badge>
                )}
                {recurring.frequency === 'weekly' && recurring.days_of_week && recurring.days_of_week.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {recurring.days_of_week.map(d => DAY_LABELS[d] || d).join(', ')}
                  </Badge>
                )}
              </div>
              {/* Contact info */}
              {recurring.contact && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {recurring.contact.type === 'fornecedor' ? 'Fornecedor' : 'Cliente'}: {recurring.contact.name}
                </p>
              )}
              {recurring.bank && (
                <p className="text-xs text-muted-foreground mt-1">
                  Conta: {recurring.bank.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-semibold ${
                recurring.type === 'receita' ? 'text-success' : 'text-destructive'
              }`}
            >
              {recurring.type === 'receita' ? '+' : '-'}
              {formatCurrency(Number(recurring.amount))}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={recurring.is_active}
                onCheckedChange={(checked) => toggleActive.mutate({ id: recurring.id, is_active: checked })}
              />
              <Button variant="ghost" size="icon" onClick={() => handleEdit(recurring)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(recurring.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas Recorrentes</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas fixas</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Recorrente
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas Mensais
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl font-bold text-success">
                {formatCurrency(monthlyTotals.receitas)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas Mensais
            </CardTitle>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(monthlyTotals.despesas)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Mensal
            </CardTitle>
            <RefreshCw className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className={`text-xl font-bold ${
                monthlyTotals.receitas - monthlyTotals.despesas >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {formatCurrency(monthlyTotals.receitas - monthlyTotals.despesas)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Recurring */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Ativas ({activeRecurring.length})</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : activeRecurring.length > 0 ? (
          <div className="space-y-3">
            {activeRecurring.map((recurring) => (
              <RecurringCard key={recurring.id} recurring={recurring} />
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma conta recorrente ativa
            </CardContent>
          </Card>
        )}
      </section>

      {/* Inactive Recurring */}
      {inactiveRecurring.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">
            Inativas ({inactiveRecurring.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {inactiveRecurring.map((recurring) => (
              <RecurringCard key={recurring.id} recurring={recurring} />
            ))}
          </div>
        </section>
      )}

      {/* Form Dialog */}
      <RecurringFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recurring={editingRecurring}
        onSubmit={handleSubmit}
        isLoading={createRecurring.isPending || updateRecurring.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta recorrente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

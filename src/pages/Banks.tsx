import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Building2, CircleDollarSign } from 'lucide-react';
import { useBanks, Bank } from '@/hooks/useBanks';
import { BankFormDialog } from '@/components/banks/BankFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
export default function Banks() {
  const {
    banks,
    isLoading,
    createBank,
    updateBank,
    deleteBank
  } = useBanks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const activeBanks = banks.filter(b => b.is_active);
  const inactiveBanks = banks.filter(b => !b.is_active);
  const totalBalance = activeBanks.reduce((sum, b) => sum + Number(b.current_balance), 0);
  const handleSubmit = (data: {
    name: string;
    bank_code: string | null;
    agency: string | null;
    account_number: string | null;
    initial_balance: number;
    color: string;
    is_active: boolean;
  }) => {
    if (editingBank) {
      updateBank.mutate({
        id: editingBank.id,
        ...data
      }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingBank(null);
        }
      });
    } else {
      createBank.mutate(data, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };
  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setDialogOpen(true);
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteBank.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };
  const BankCard = ({
    bank
  }: {
    bank: Bank;
  }) => <Card className="bg-card border-border/50 hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
            backgroundColor: bank.color + '20'
          }}>
              <Building2 className="w-6 h-6" style={{
              color: bank.color
            }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{bank.name}</h3>
                {!bank.is_active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
              </div>
              {(bank.bank_code || bank.agency || bank.account_number) && <p className="text-sm text-muted-foreground">
                  {[bank.bank_code, bank.agency, bank.account_number].filter(Boolean).join(' • ')}
                </p>}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(bank)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(bank.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo atual</span>
            <span className={`text-lg font-bold ${Number(bank.current_balance) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(Number(bank.current_balance))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>;
  if (isLoading) {
    return <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Contas</h1>
          <p className="text-muted-foreground">Organize suas contas bancárias</p>
        </div>
        <Button className="gap-2" onClick={() => {
        setEditingBank(null);
        setDialogOpen(true);
      }}>
          <Plus className="w-4 h-4" />
          Novo Banco
        </Button>
      </div>

      {/* Total Balance Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <CircleDollarSign className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo total em contas ativas</p>
              <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {formatCurrency(totalBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Banks */}
      {activeBanks.length > 0 && <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Contas Ativas ({activeBanks.length})</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBanks.map(bank => <BankCard key={bank.id} bank={bank} />)}
          </div>
        </div>}

      {/* Inactive Banks */}
      {inactiveBanks.length > 0 && <div>
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">Contas Inativas ({inactiveBanks.length})</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveBanks.map(bank => <BankCard key={bank.id} bank={bank} />)}
          </div>
        </div>}

      {banks.length === 0 && <Card className="bg-card border-border/50">
          <CardContent className="text-muted-foreground text-center py-16">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma conta cadastrada</p>
            <p className="text-sm mt-1">Clique em "Novo Banco" para adicionar sua primeira conta</p>
          </CardContent>
        </Card>}

      <BankFormDialog open={dialogOpen} onOpenChange={setDialogOpen} bank={editingBank} onSubmit={handleSubmit} isLoading={createBank.isPending || updateBank.isPending} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O banco será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
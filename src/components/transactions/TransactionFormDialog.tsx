import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Transaction, TransactionInsert } from '@/hooks/useTransactions';
import { Category } from '@/hooks/useCategories';
import { Bank } from '@/hooks/useBanks';
import { Contact } from '@/hooks/useContacts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, User, Building2 } from 'lucide-react';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  banks: Bank[];
  contacts: Contact[];
  onSubmit: (data: TransactionInsert) => void;
  isLoading?: boolean;
  defaultType?: 'receita' | 'despesa';
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  banks,
  contacts,
  onSubmit,
  isLoading,
  defaultType = 'despesa',
}: TransactionFormDialogProps) {
  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [bankId, setBankId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState('');

  const filteredCategories = categories.filter(c => c.type === type);
  const activeBanks = banks.filter(b => b.is_active);
  const activeContacts = contacts.filter(c => c.is_active);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setDate(transaction.date);
      setCategoryId(transaction.category_id || '');
      setBankId(transaction.bank_id || '');
      setContactId(transaction.contact_id || '');
      setIsPaid(transaction.is_paid);
      setNotes(transaction.notes || '');
    } else {
      setType(defaultType);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId('');
      setBankId('');
      setContactId('');
      setIsPaid(false);
      setNotes('');
    }
  }, [transaction, open, defaultType]);

  // Reset category when type changes
  useEffect(() => {
    if (!transaction) {
      setCategoryId('');
    }
  }, [type, transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      description,
      amount: parseFloat(amount),
      date,
      category_id: categoryId || null,
      bank_id: bankId || null,
      contact_id: contactId || null,
      is_paid: isPaid,
      notes: notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <Tabs value={type} onValueChange={(v) => setType(v as 'receita' | 'despesa')}>
            <TabsList className="w-full">
              <TabsTrigger value="despesa" className="flex-1 gap-2">
                <TrendingDown className="w-4 h-4" />
                Despesa
              </TabsTrigger>
              <TabsTrigger value="receita" className="flex-1 gap-2">
                <TrendingUp className="w-4 h-4" />
                Receita
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento de fornecedor"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Conta</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {activeBanks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Cliente/Fornecedor</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contato..." />
              </SelectTrigger>
              <SelectContent>
                {activeContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <div className="flex items-center gap-2">
                      {contact.type === 'fornecedor' ? (
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                      {contact.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="paid" className="font-medium">
                {type === 'receita' ? 'Recebido' : 'Pago'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {type === 'receita' ? 'Marque se já recebeu' : 'Marque se já pagou'}
              </p>
            </div>
            <Switch id="paid" checked={isPaid} onCheckedChange={setIsPaid} />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !description.trim() || !amount}
              className="flex-1"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

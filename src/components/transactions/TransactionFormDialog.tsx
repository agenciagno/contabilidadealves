import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Transaction, TransactionInsert } from '@/hooks/useTransactions';
import { Category, useCategories, CategoryInsert } from '@/hooks/useCategories';
import { Bank, useBanks, BankInsert } from '@/hooks/useBanks';
import { Contact, useContacts, ContactInsert } from '@/hooks/useContacts';
import { useTransactionAttachments } from '@/hooks/useTransactionAttachments';
import { AttachmentUpload } from './AttachmentUpload';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { BankFormDialog } from '@/components/banks/BankFormDialog';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, User, Plus } from 'lucide-react';
import { addBusinessDays } from '@/lib/business-days';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  banks: Bank[];
  contacts: Contact[];
  onSubmit: (data: TransactionInsert, pendingFiles?: File[]) => void;
  isLoading?: boolean;
  defaultType?: 'receita' | 'despesa';
}

// Currency formatting helpers
function formatCurrencyInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  const cents = parseInt(numbers || '0', 10);
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyInput(value: string): number {
  const numbers = value.replace(/\D/g, '');
  return parseInt(numbers || '0', 10) / 100;
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
  const todayStr = new Date().toISOString().split('T')[0];

  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [bankId, setBankId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Inline creation dialogs
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Hooks for inline creation
  const { createCategory } = useCategories();
  const { createBank } = useBanks();
  const { createContact } = useContacts();
  const { attachments, uploadAttachment, deleteAttachment } = useTransactionAttachments(transaction?.id);

  const filteredCategories = categories;
  const activeBanks = banks.filter(b => b.is_active);
  const filteredContacts = contacts.filter(c => c.is_active);

  // Auto-calculate expected_date when dueDate or type changes
  useEffect(() => {
    if (dueDate) {
      const dueDateObj = new Date(dueDate + 'T00:00:00');
      if (!isNaN(dueDateObj.getTime())) {
        if (type === 'receita') {
          const expected = addBusinessDays(dueDateObj, 2);
          setExpectedDate(format(expected, 'yyyy-MM-dd'));
        } else {
          setExpectedDate(dueDate);
        }
      }
    }
  }, [dueDate, type]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(formatCurrencyInput(String(Math.round(Number(transaction.amount) * 100))));
      setDate(transaction.date || '');
      setIssueDate(transaction.issue_date || todayStr);
      setDueDate(transaction.due_date || '');
      setExpectedDate(transaction.expected_date || '');
      setCategoryId(transaction.category_id || '');
      setBankId(transaction.bank_id || '');
      setContactId(transaction.contact_id || '');
      setIsPaid(transaction.is_paid);
      setNotes(transaction.notes || '');
      setPendingFiles([]);
    } else {
      setType(defaultType);
      setAmount('');
      setDate('');
      setIssueDate(todayStr);
      setDueDate('');
      setExpectedDate('');
      setCategoryId('');
      setBankId('');
      setContactId('');
      setIsPaid(false);
      setNotes('');
      setPendingFiles([]);
    }
  }, [transaction, open, defaultType]);

  // Reset category and contact when type changes
  useEffect(() => {
    if (!transaction) {
      setCategoryId('');
      setContactId('');
    }
  }, [type, transaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedCategory = filteredCategories.find(c => c.id === categoryId);
    const autoDescription = selectedCategory?.name || 'Movimentação';
    
    onSubmit({
      type,
      description: autoDescription,
      amount: parseCurrencyInput(amount),
      date: date || undefined,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      expected_date: expectedDate || null,
      category_id: categoryId || null,
      bank_id: bankId || null,
      contact_id: contactId || null,
      is_paid: isPaid,
      notes: notes || null,
    } as TransactionInsert, pendingFiles);
  };

  // Inline creation handlers
  const handleCreateCategory = (data: CategoryInsert) => {
    createCategory.mutate(data, {
      onSuccess: (newCategory) => {
        setCategoryId(newCategory.id);
        setCategoryDialogOpen(false);
      },
    });
  };

  const handleCreateBank = (data: BankInsert) => {
    createBank.mutate(data, {
      onSuccess: (newBank) => {
        setBankId(newBank.id);
        setBankDialogOpen(false);
      },
    });
  };

  const handleCreateContact = (data: ContactInsert) => {
    createContact.mutate({ ...data, type: 'cliente' }, {
      onSuccess: (newContact) => {
        setContactId(newContact.id);
        setContactDialogOpen(false);
      },
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__new__') {
      setCategoryDialogOpen(true);
    } else {
      setCategoryId(value);
    }
  };

  const handleBankChange = (value: string) => {
    if (value === '__new__') {
      setBankDialogOpen(true);
    } else {
      setBankId(value);
    }
  };

  const handleContactChange = (value: string) => {
    if (value === '__new__') {
      setContactDialogOpen(true);
    } else {
      setContactId(value);
    }
  };

  const isFormValid = parseCurrencyInput(amount) > 0 && categoryId && bankId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
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

            {/* Line 1: Cliente/Fornecedor + Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">Cliente/Fornecedor</Label>
                <Select value={contactId} onValueChange={handleContactChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente/fornecedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        Novo cliente/fornecedor
                      </div>
                    </SelectItem>
                    {filteredContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {contact.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) <span className="text-destructive">*</span></Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0,00"
                  required
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            {/* Line 2: Evento Contábil + Conta/Banco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Evento Contábil <span className="text-destructive">*</span></Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger className={!categoryId ? 'border-muted-foreground/30' : ''}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        Novo evento contábil
                      </div>
                    </SelectItem>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank">Conta/Banco <span className="text-destructive">*</span></Label>
                <Select value={bankId} onValueChange={handleBankChange}>
                  <SelectTrigger className={!bankId ? 'border-muted-foreground/30' : ''}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        Nova conta/banco
                      </div>
                    </SelectItem>
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

            {/* Line 3: Datas - 4 colunas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Data Emissão</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDate">Data Prevista</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data Pagamento</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line 4: Anexo */}
            <div className="space-y-2">
              <Label>Anexo</Label>
              <AttachmentUpload
                compact
                attachments={attachments}
                pendingFiles={pendingFiles}
                onAddFiles={(files) => setPendingFiles([...pendingFiles, ...files])}
                onRemovePendingFile={(index) => setPendingFiles(pendingFiles.filter((_, i) => i !== index))}
                onDeleteAttachment={(attachment) => deleteAttachment.mutate(attachment)}
                isUploading={uploadAttachment.isPending}
              />
            </div>

            {/* Line 5: Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionais..."
                rows={1}
                className="min-h-[40px] resize-none"
              />
            </div>

            {/* Line 6: Paid Switch */}
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

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="flex-1"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inline Creation Dialogs */}
      <CategoryFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCreateCategory}
        isLoading={createCategory.isPending}
      />

      <BankFormDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        onSubmit={handleCreateBank}
        isLoading={createBank.isPending}
      />

      <ContactFormDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onSubmit={handleCreateContact}
        isLoading={createContact.isPending}
      />
    </>
  );
}

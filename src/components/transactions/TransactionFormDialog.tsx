import { useState, useEffect } from 'react';
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
import { useTransactionAttachments, TransactionAttachment } from '@/hooks/useTransactionAttachments';
import { AttachmentUpload } from './AttachmentUpload';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { BankFormDialog } from '@/components/banks/BankFormDialog';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, User, Plus } from 'lucide-react';

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
  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
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

  const filteredCategories = categories.filter(c => c.type === type);
  const activeBanks = banks.filter(b => b.is_active);
  const filteredContacts = contacts.filter(c => c.is_active);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      setAmount(formatCurrencyInput(String(Math.round(Number(transaction.amount) * 100))));
      setDate(transaction.date);
      setDueDate((transaction as any).due_date || '');
      setCategoryId(transaction.category_id || '');
      setBankId(transaction.bank_id || '');
      setContactId(transaction.contact_id || '');
      setIsPaid(transaction.is_paid);
      setNotes(transaction.notes || '');
      setPendingFiles([]);
    } else {
      setType(defaultType);
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
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
    onSubmit({
      type,
      description,
      amount: parseCurrencyInput(amount),
      date,
      issue_date: null,
      due_date: dueDate || null,
      category_id: categoryId || null,
      bank_id: bankId || null,
      contact_id: contactId || null,
      is_paid: isPaid,
      notes: notes || null,
    } as TransactionInsert, pendingFiles);
  };

  // Inline creation handlers
  const handleCreateCategory = (data: CategoryInsert) => {
    createCategory.mutate({ ...data, type }, {
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

  const isFormValid = description.trim() && parseCurrencyInput(amount) > 0 && categoryId && bankId;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Column 1 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição <span className="text-destructive">*</span></Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Pagamento de fornecedor"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria <span className="text-destructive">*</span></Label>
                  <Select value={categoryId} onValueChange={handleCategoryChange}>
                    <SelectTrigger className={!categoryId ? 'border-muted-foreground/30' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="w-3 h-3" />
                          Nova categoria
                        </div>
                      </SelectItem>
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
                  <Label htmlFor="contact">Contato</Label>
                  <Select value={contactId} onValueChange={handleContactChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contato..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="w-3 h-3" />
                          Novo contato
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
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
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

                <div className="space-y-2">
                  <Label htmlFor="bank">Conta <span className="text-destructive">*</span></Label>
                  <Select value={bankId} onValueChange={handleBankChange}>
                    <SelectTrigger className={!bankId ? 'border-muted-foreground/30' : ''}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="w-3 h-3" />
                          Nova conta
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data da Transação <span className="text-destructive">*</span></Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
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
                </div>
              </div>
            </div>

            {/* Attachments */}
            <AttachmentUpload
              attachments={attachments}
              pendingFiles={pendingFiles}
              onAddFiles={(files) => setPendingFiles([...pendingFiles, ...files])}
              onRemovePendingFile={(index) => setPendingFiles(pendingFiles.filter((_, i) => i !== index))}
              onDeleteAttachment={(attachment) => deleteAttachment.mutate(attachment)}
              isUploading={uploadAttachment.isPending}
            />

            {/* Notes */}
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

            {/* Paid Switch */}
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

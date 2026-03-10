import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { isValidDateString } from '@/lib/utils';

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  banks: Bank[];
  contacts: Contact[];
  onSubmit: (data: TransactionInsert, pendingFiles?: File[], shouldClose?: boolean) => void;
  isLoading?: boolean;
  defaultType?: 'receita' | 'despesa';
  mode?: 'edit' | 'settle';
  resetKey?: number;
}

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
  open, onOpenChange, transaction, categories, banks, contacts, onSubmit, isLoading, defaultType = 'receita', mode = 'edit', resetKey,
}: TransactionFormDialogProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const isSettleMode = mode === 'settle';
  const isEditing = !!transaction;
  const saveActionRef = useRef<'close' | 'continue'>('close');
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);
  const [paymentCondition, setPaymentCondition] = useState<'a_vista' | 'a_prazo'>('a_vista');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [date, setDate] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [bankId, setBankId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const isAPrazo = paymentCondition === 'a_prazo' && !isEditing && !isSettleMode;

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  const { createCategory } = useCategories();
  const { createBank } = useBanks();
  const { createContact } = useContacts();
  const { attachments, uploadAttachment, deleteAttachment } = useTransactionAttachments(transaction?.id);

  const filteredCategories = categories;
  const activeBanks = banks.filter(b => b.is_active);
  const filteredContacts = contacts.filter(c => c.is_active);

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
      setPaidAmount(transaction.paid_amount != null ? formatCurrencyInput(String(Math.round(Number(transaction.paid_amount) * 100))) : '');
      setDate(transaction.date || '');
      setIssueDate(transaction.issue_date || todayStr);
      setDueDate(transaction.due_date || '');
      setExpectedDate(transaction.expected_date || '');
      setCategoryId(transaction.category_id || '');
      setBankId(transaction.bank_id || '');
      setContactId(transaction.contact_id || '');
      setNotes(transaction.notes || '');
      setPendingFiles([]);
    } else {
      setType(defaultType);
      setPaymentCondition('a_vista');
      setAmount(''); setPaidAmount('');
      setDate(''); setIssueDate(todayStr); setDueDate(''); setExpectedDate('');
      setCategoryId(''); setBankId(''); setContactId('');
      setNotes(''); setPendingFiles([]);
    }
  }, [transaction, open, defaultType, resetKey]);

  useEffect(() => {
    if (!transaction) { setCategoryId(''); setContactId(''); }
  }, [type, transaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmount(formatCurrencyInput(e.target.value));
  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setPaidAmount(formatCurrencyInput(e.target.value));

  const { toast } = useToast();

  const resetForm = () => {
    setType(defaultType);
    setPaymentCondition('a_vista');
    setAmount(''); setPaidAmount('');
    setDate(''); setIssueDate(todayStr); setDueDate(''); setExpectedDate('');
    setCategoryId(''); setBankId(''); setContactId('');
    setNotes(''); setPendingFiles([]);
  };

  const handlePaymentConditionChange = (v: string) => {
    setPaymentCondition(v as 'a_vista' | 'a_prazo');
    if (v === 'a_prazo') {
      setPaidAmount('');
      setDate('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Date validation
    const dateFields = [
      { value: issueDate, label: 'Emissão' },
      { value: dueDate, label: 'Vencimento' },
      { value: expectedDate, label: 'Prevista' },
      ...(date ? [{ value: date, label: 'Pagamento' }] : []),
    ];
    for (const field of dateFields) {
      if (field.value && !isValidDateString(field.value)) {
        toast({ title: `Data inválida no campo "${field.label}". Use o formato AAAA-MM-DD com valores válidos.`, variant: 'destructive' });
        return;
      }
    }

    const selectedCategory = filteredCategories.find(c => c.id === categoryId);
    const autoDescription = selectedCategory?.name || 'Movimentação';
    const paidAmountValue = parseCurrencyInput(paidAmount);

    if (isSettleMode) {
    onSubmit({
      type,
      description: autoDescription,
      amount: parseCurrencyInput(amount),
      paid_amount: paidAmountValue,
      date: date || undefined,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      expected_date: expectedDate || null,
      category_id: categoryId || null,
      bank_id: bankId || null,
      contact_id: contactId || null,
      is_paid: true,
      notes: notes || null,
    } as TransactionInsert, pendingFiles, true);
    return;
    }

    // Edit / Create mode
    if (isAPrazo) {
      const shouldClose = saveActionRef.current === 'close';
      onSubmit({
        type,
        description: autoDescription,
        amount: parseCurrencyInput(amount),
        paid_amount: null,
        date: undefined,
        issue_date: issueDate || null,
        due_date: dueDate || null,
        expected_date: expectedDate || null,
        category_id: categoryId || null,
        bank_id: bankId || null,
        contact_id: contactId || null,
        is_paid: false,
        notes: notes || null,
      } as TransactionInsert, pendingFiles, shouldClose);
      saveActionRef.current = 'close';
      return;
    }

    const derivedIsPaid = paidAmountValue > 0;

    if (derivedIsPaid && !date) {
      toast({
        title: 'Para liquidar a transação, a Data de Pagamento e o Valor Recebido são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const shouldClose = saveActionRef.current === 'close';

    onSubmit({
      type,
      description: autoDescription,
      amount: parseCurrencyInput(amount),
      paid_amount: paidAmountValue > 0 ? paidAmountValue : null,
      date: date || undefined,
      issue_date: issueDate || null,
      due_date: dueDate || null,
      expected_date: expectedDate || null,
      category_id: categoryId || null,
      bank_id: bankId || null,
      contact_id: contactId || null,
      is_paid: derivedIsPaid,
      notes: notes || null,
    } as TransactionInsert, pendingFiles, shouldClose);

    saveActionRef.current = 'close';
  };

  const handleCreateCategory = (data: CategoryInsert) => {
    createCategory.mutate(data, { onSuccess: (nc) => { setCategoryId(nc.id); setCategoryDialogOpen(false); } });
  };
  const handleCreateBank = (data: BankInsert) => {
    createBank.mutate(data, { onSuccess: (nb) => { setBankId(nb.id); setBankDialogOpen(false); } });
  };
  const handleCreateContact = (data: ContactInsert) => {
    createContact.mutate({ ...data, type: 'cliente' }, { onSuccess: (nc) => { setContactId(nc.id); setContactDialogOpen(false); } });
  };

  const handleCategoryChange = (v: string) => { if (v === '__new__') setCategoryDialogOpen(true); else setCategoryId(v); };
  const handleBankChange = (v: string) => { if (v === '__new__') setBankDialogOpen(true); else setBankId(v); };
  const handleContactChange = (v: string) => { if (v === '__new__') setContactDialogOpen(true); else setContactId(v); };

  // Validation rules per mode
  const isFormValid = isSettleMode
    ? parseCurrencyInput(paidAmount) > 0 && !!bankId && !!date
    : parseCurrencyInput(amount) > 0 && !!categoryId && !!contactId && !!issueDate && !!dueDate && !!expectedDate;

  // Disabled states
  const structuralDisabled = isSettleMode;

  const dialogTitle = isSettleMode
    ? 'Liquidar Transação'
    : transaction ? 'Editar Transação' : 'Nova Transação';

  const submitLabel = isSettleMode ? 'Liquidar' : 'Salvar';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            {/* Type Toggle */}
            <Tabs value={type} onValueChange={(v) => !structuralDisabled && setType(v as 'receita' | 'despesa')}>
              <TabsList className={`w-full h-9 ${structuralDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
                <TabsTrigger value="receita" className="flex-1 gap-1.5 text-xs h-7" disabled={structuralDisabled}>
                  <TrendingUp className="w-3.5 h-3.5" /> Receita
                </TabsTrigger>
                <TabsTrigger value="despesa" className="flex-1 gap-1.5 text-xs h-7" disabled={structuralDisabled}>
                  <TrendingDown className="w-3.5 h-3.5" /> Despesa
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Payment Condition Toggle — only for new transactions */}
            {!isEditing && !isSettleMode && (
              <Tabs value={paymentCondition} onValueChange={handlePaymentConditionChange}>
                <TabsList className="w-full h-8">
                  <TabsTrigger value="a_vista" className="flex-1 text-xs h-6">À Vista</TabsTrigger>
                  <TabsTrigger value="a_prazo" className="flex-1 text-xs h-6">À Prazo</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Row 1: Cliente | Valor | Valor Recebido/Pago */}
            <div className={`grid ${isAPrazo ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
              <div className="space-y-1">
                <Label className="text-xs">Cliente/Fornecedor <span className="text-destructive">*</span></Label>
                <Select value={contactId} onValueChange={handleContactChange} disabled={structuralDisabled}>
                  <SelectTrigger className={`h-8 text-xs ${structuralDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium text-xs">
                      <div className="flex items-center gap-1"><Plus className="w-3 h-3" /> Novo</div>
                    </SelectItem>
                    {filteredContacts.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        <div className="flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" />{c.name}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) <span className="text-destructive">*</span></Label>
                <Input value={amount} onChange={handleAmountChange} placeholder="0,00" required className="h-8 text-sm font-semibold" disabled={isSettleMode} />
              </div>
              {!isAPrazo && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {type === 'receita' ? 'Valor Recebido' : 'Valor Pago'}
                    {isSettleMode && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input value={paidAmount} onChange={handlePaidAmountChange} placeholder="0,00" className="h-8 text-sm" disabled={isEditing && !isSettleMode} />
                </div>
              )}
            </div>

            {/* Row 2: Evento Contábil | Conta/Banco */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Evento Contábil <span className="text-destructive">*</span></Label>
                <Select value={categoryId} onValueChange={handleCategoryChange} disabled={structuralDisabled}>
                  <SelectTrigger className={`h-8 text-xs ${structuralDisabled ? 'opacity-60 cursor-not-allowed' : !categoryId ? 'border-muted-foreground/30' : ''}`}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium text-xs">
                      <div className="flex items-center gap-1"><Plus className="w-3 h-3" /> Novo</div>
                    </SelectItem>
                    {filteredCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Conta/Banco
                  {isSettleMode && <span className="text-destructive"> *</span>}
                </Label>
                <Select value={bankId} onValueChange={handleBankChange}>
                  <SelectTrigger className={`h-8 text-xs ${!bankId ? 'border-muted-foreground/30' : ''}`}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__" className="text-primary font-medium text-xs">
                      <div className="flex items-center gap-1"><Plus className="w-3 h-3" /> Novo</div>
                    </SelectItem>
                    {activeBanks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id} className="text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bank.color }} />
                          {bank.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: 4 Datas */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Emissão <span className="text-destructive">*</span></Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-8 text-xs" disabled={isSettleMode} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vencimento <span className="text-destructive">*</span></Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-8 text-xs" disabled={isSettleMode} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prevista <span className="text-destructive">*</span></Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="h-8 text-xs" disabled={isSettleMode} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Pagamento
                  {isSettleMode && <span className="text-destructive"> *</span>}
                </Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-xs" disabled={isEditing && !isSettleMode} />
              </div>
            </div>

            {/* Row 4: Anexo | Histórico side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Anexo</Label>
                <div className={isSettleMode ? 'opacity-60 pointer-events-none' : ''}>
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
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Histórico</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Histórico..." rows={1} className="min-h-[36px] resize-none text-xs" disabled={isSettleMode} />
              </div>
            </div>

            {/* Row 5: Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs px-4">
                  Cancelar
                </Button>
                {isSettleMode ? (
                  <Button type="submit" size="sm" disabled={isLoading || !isFormValid} className="h-8 text-xs px-6">
                    {isLoading ? 'Salvando...' : 'Liquidar'}
                  </Button>
                ) : (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={isLoading || !isFormValid} className="h-8 text-xs px-4"
                      onClick={() => { saveActionRef.current = 'continue'; formRef.current?.requestSubmit(); }}>
                      {isLoading ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button type="button" size="sm" disabled={isLoading || !isFormValid} className="h-8 text-xs px-4"
                      onClick={() => { saveActionRef.current = 'close'; formRef.current?.requestSubmit(); }}>
                      {isLoading ? 'Salvando...' : 'Salvar e Fechar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryFormDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} onSubmit={handleCreateCategory} isLoading={createCategory.isPending} />
      <BankFormDialog open={bankDialogOpen} onOpenChange={setBankDialogOpen} onSubmit={handleCreateBank} isLoading={createBank.isPending} />
      <ContactFormDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} onSubmit={handleCreateContact} isLoading={createContact.isPending} />
    </>
  );
}

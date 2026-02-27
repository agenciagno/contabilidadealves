import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { format, parse, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import type { TransactionInsert } from '@/hooks/useTransactions';

interface Bank { id: string; name: string; }
interface Category { id: string; name: string; }
interface Contact { id: string; name: string; }

interface ImportSpreadsheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: Bank[];
  categories: Category[];
  contacts: Contact[];
  onImport: (transactions: TransactionInsert[]) => Promise<void>;
  onCreateCategory?: (name: string) => Promise<{ id: string }>;
  onCreateContact?: (name: string) => Promise<{ id: string }>;
  onCreateBank?: (name: string) => Promise<{ id: string }>;
}

const TEMPLATE_HEADERS = [
  'Data Emissão',
  'Cliente/Fornecedor',
  'Tipo (Receita ou Despesa)',
  'Valor',
  'Status (Pendente ou Pago)',
  'Data Vencimento',
  'Data Prevista',
  'Data Pagamento',
  'Conta Bancária',
  'Evento Contábil',
  'Histórico',
];

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function excelDateToString(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'string') {
    try {
      const parsed = parse(value.trim(), 'dd/MM/yyyy', new Date());
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    } catch {}
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  }
  return null;
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

function findByName<T extends { id: string; name: string }>(list: T[], name: unknown): string | null {
  if (!name || typeof name !== 'string') return null;
  const lower = normalizeName(name).toLowerCase();
  const found = list.find((item) => item.name.toLowerCase() === lower);
  return found?.id ?? null;
}

function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

export function ImportSpreadsheetDialog({ open, onOpenChange, banks, categories, contacts, onImport, onCreateCategory, onCreateContact, onCreateBank }: ImportSpreadsheetDialogProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<TransactionInsert[]>([]);
  const [createdCategories, setCreatedCategories] = useState<Map<string, string>>(new Map());
  const [createdContacts, setCreatedContacts] = useState<Map<string, string>>(new Map());
  const [createdBanks, setCreatedBanks] = useState<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const bankName = (id: string | null | undefined) => {
    const found = banks.find(b => b.id === id);
    if (found) return found.name;
    for (const [name, bId] of createdBanks) {
      if (bId === id) return name;
    }
    return '—';
  };
  const categoryName = (id: string | null | undefined) => {
    const found = categories.find(c => c.id === id);
    if (found) return found.name;
    for (const [name, cId] of createdCategories) {
      if (cId === id) return name;
    }
    return '—';
  };
  const contactName = (id: string | null | undefined) => {
    const found = contacts.find(c => c.id === id);
    if (found) return found.name;
    for (const [name, cId] of createdContacts) {
      if (cId === id) return name;
    }
    return '—';
  };

  const resetState = () => {
    setStep(1);
    setIsProcessing(false);
    setIsDragging(false);
    setParsedData([]);
    setCreatedCategories(new Map());
    setCreatedContacts(new Map());
    setCreatedBanks(new Map());
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo-lancamentos.xlsx');
    toast({ title: 'Modelo baixado com sucesso!' });
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (!rows.length) {
        toast({ title: 'Nenhum dado encontrado na planilha.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const firstRowKeys = Object.keys(rows[0]);
      const hasRequiredHeaders = TEMPLATE_HEADERS.slice(0, 4).every((h) =>
        firstRowKeys.some((k) => k.trim().toLowerCase() === h.toLowerCase())
      );
      if (!hasRequiredHeaders) {
        toast({ title: 'Formato inválido. Use o modelo fornecido.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const transactions: TransactionInsert[] = [];

      // Collect unique category names and auto-create missing ones
      const newCatsMap = new Map<string, string>();
      if (onCreateCategory) {
        const uniqueCatNames = new Set<string>();
        for (const row of rows) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === 'evento contábil');
          const val = key ? row[key] : undefined;
          if (val && typeof val === 'string' && val.trim()) {
            const normalized = normalizeName(String(val));
            const lower = normalized.toLowerCase();
            if (!categories.find((c) => c.name.toLowerCase() === lower)) {
              uniqueCatNames.add(normalized);
            }
          }
        }
        for (const name of uniqueCatNames) {
          try {
            const created = await onCreateCategory(name);
            newCatsMap.set(name.toLowerCase(), created.id);
          } catch (err) {
            console.error(`Failed to create category "${name}":`, err);
          }
        }
        setCreatedCategories(newCatsMap);
      }

      // Auto-create missing contacts
      const newContactsMap = new Map<string, string>();
      if (onCreateContact) {
        const uniqueContactNames = new Set<string>();
        for (const row of rows) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === 'cliente/fornecedor');
          const val = key ? row[key] : undefined;
          if (val && typeof val === 'string' && val.trim()) {
            const normalized = normalizeName(String(val));
            const lower = normalized.toLowerCase();
            if (!contacts.find((c) => c.name.toLowerCase() === lower)) {
              uniqueContactNames.add(normalized);
            }
          }
        }
        for (const name of uniqueContactNames) {
          try {
            const created = await onCreateContact(name);
            newContactsMap.set(name.toLowerCase(), created.id);
          } catch (err) {
            console.error(`Failed to create contact "${name}":`, err);
          }
        }
        setCreatedContacts(newContactsMap);
      }

      // Auto-create missing banks
      const newBanksMap = new Map<string, string>();
      if (onCreateBank) {
        const uniqueBankNames = new Set<string>();
        for (const row of rows) {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === 'conta bancária');
          const val = key ? row[key] : undefined;
          if (val && typeof val === 'string' && val.trim()) {
            const normalized = normalizeName(String(val));
            const lower = normalized.toLowerCase();
            if (!banks.find((b) => b.name.toLowerCase() === lower)) {
              uniqueBankNames.add(normalized);
            }
          }
        }
        for (const name of uniqueBankNames) {
          try {
            const created = await onCreateBank(name);
            newBanksMap.set(name.toLowerCase(), created.id);
          } catch (err) {
            console.error(`Failed to create bank "${name}":`, err);
          }
        }
        setCreatedBanks(newBanksMap);
      }

      const findCategoryId = (name: unknown): string | null => {
        if (!name || typeof name !== 'string') return null;
        const lower = name.trim().toLowerCase();
        const existing = categories.find((c) => c.name.toLowerCase() === lower);
        if (existing) return existing.id;
        return newCatsMap.get(lower) ?? null;
      };

      const findContactId = (name: unknown): string | null => {
        if (!name || typeof name !== 'string') return null;
        const lower = name.trim().toLowerCase();
        const existing = contacts.find((c) => c.name.toLowerCase() === lower);
        if (existing) return existing.id;
        return newContactsMap.get(lower) ?? null;
      };

      const findBankId = (name: unknown): string | null => {
        if (!name || typeof name !== 'string') return null;
        const lower = name.trim().toLowerCase();
        const existing = banks.find((b) => b.name.toLowerCase() === lower);
        if (existing) return existing.id;
        return newBanksMap.get(lower) ?? null;
      };

      for (const row of rows) {
        const get = (header: string) => {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === header.toLowerCase());
          return key ? row[key] : undefined;
        };

        const issueDateStr = excelDateToString(get('Data Emissão'));
        const dueDateStr = excelDateToString(get('Data Vencimento'));
        const expectedDateStr = excelDateToString(get('Data Prevista'));
        const paymentDateStr = excelDateToString(get('Data Pagamento'));
        const amount = parseAmount(get('Valor'));
        if (amount == null) continue;

        const tipoRaw = String(get('Tipo (Receita ou Despesa)') ?? '').trim().toLowerCase();
        const type: 'receita' | 'despesa' = tipoRaw.includes('receita') ? 'receita' : 'despesa';

        const statusRaw = String(get('Status (Pendente ou Pago)') ?? '').trim().toLowerCase();
        const isPaid = statusRaw.includes('pago');

        const eventoContabil = get('Evento Contábil');
        const historico = get('Histórico');
        const description = String(eventoContabil ?? historico ?? get('Cliente/Fornecedor') ?? 'Importado via planilha');

        transactions.push({
          date: paymentDateStr || null,
          issue_date: issueDateStr || null,
          expected_date: expectedDateStr || null,
          amount: Math.abs(amount),
          type,
          is_paid: isPaid,
          description,
          due_date: dueDateStr || null,
          bank_id: findBankId(get('Conta Bancária')),
          category_id: findCategoryId(eventoContabil),
          contact_id: findContactId(get('Cliente/Fornecedor')),
          notes: historico ? String(historico) : null,
        });
      }

      if (!transactions.length) {
        toast({ title: 'Nenhum lançamento válido encontrado.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      setParsedData(transactions);
      setStep(3);
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Erro ao processar a planilha.', description: String(err), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [banks, categories, contacts, toast, onCreateCategory, onCreateContact, onCreateBank]);

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      await onImport(parsedData);
      toast({ title: `${parsedData.length} lançamento(s) importado(s) com sucesso!` });
      handleClose(false);
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Erro ao importar.', description: String(err), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls)$/i.test(file.name)) {
      processFile(file);
    } else {
      toast({ title: 'Formato inválido. Use .xlsx ou .xls', variant: 'destructive' });
    }
  };

  const stepDescription = step === 1
    ? 'Baixe o modelo e preencha com seus dados'
    : step === 2
    ? 'Envie a planilha preenchida'
    : 'Revise os dados antes de confirmar';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 3 ? 'sm:max-w-4xl' : 'sm:max-w-lg'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Planilha
          </DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-3 py-2">
          {[
            { num: 1, label: 'Modelo' },
            { num: 2, label: 'Upload' },
            { num: 3, label: 'Revisar' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-1.5 flex-shrink-0">
              {i > 0 && <div className="w-8 h-px bg-border flex-shrink-0" />}
              <div className={`flex items-center gap-1.5 text-sm font-medium ${step === s.num ? 'text-primary' : step > s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > s.num ? 'bg-primary text-primary-foreground' : step === s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </span>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como importar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Baixe o modelo em Excel</li>
                <li>Cole seus dados respeitando as colunas</li>
                <li>Faça o upload do arquivo</li>
              </ol>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Baixar Planilha Modelo
            </Button>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="gap-2">
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Processando planilha...</p>
              </div>
            ) : (
              <>
                <div
                  className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium text-foreground">Arraste e solte seu arquivo aqui</p>
                  <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: .xlsx, .xls</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Importando lançamentos...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{parsedData.length}</strong> lançamento(s) encontrado(s)
                </p>
                <ScrollArea className="h-[400px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Prevista</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Categoria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="whitespace-nowrap">{formatDateDisplay(row.issue_date)}</TableCell>
                          <TableCell>{contactName(row.contact_id)}</TableCell>
                          <TableCell>
                            <Badge className={row.type === 'receita' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/20' : 'bg-red-500/15 text-red-700 border-red-200 hover:bg-red-500/20'}>
                              {row.type === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.is_paid ? 'default' : 'secondary'}>
                              {row.is_paid ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateDisplay(row.due_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateDisplay(row.expected_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateDisplay(row.date)}</TableCell>
                          <TableCell>{bankName(row.bank_id)}</TableCell>
                          <TableCell>{categoryName(row.category_id)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button onClick={handleConfirmImport} className="gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

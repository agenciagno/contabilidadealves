import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

const TEMPLATE_HEADERS = [
  'Data Prevista',
  'Cliente/Fornecedor',
  'Tipo (Receita ou Despesa)',
  'Valor',
  'Status (Pendente ou Pago)',
  'Data Vencimento',
  'Data Pagamento',
  'Conta Bancária',
  'Evento Contábil',
  'Histórico',
];

function excelDateToString(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return format(date, 'yyyy-MM-dd');
  }
  if (typeof value === 'string') {
    // Try dd/MM/yyyy
    try {
      const parsed = parse(value.trim(), 'dd/MM/yyyy', new Date());
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    } catch {}
    // Try yyyy-MM-dd
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
  const lower = name.trim().toLowerCase();
  const found = list.find((item) => item.name.toLowerCase() === lower);
  return found?.id ?? null;
}

export function ImportSpreadsheetDialog({ open, onOpenChange, banks, categories, contacts, onImport }: ImportSpreadsheetDialogProps) {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setStep(1);
    setIsProcessing(false);
    setIsDragging(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    // Set column widths
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

      // Validate headers
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

      for (const row of rows) {
        const get = (header: string) => {
          const key = Object.keys(row).find((k) => k.trim().toLowerCase() === header.toLowerCase());
          return key ? row[key] : undefined;
        };

        const dateStr = excelDateToString(get('Data Prevista'));
        const amount = parseAmount(get('Valor'));
        if (!dateStr || amount == null) continue;

        const tipoRaw = String(get('Tipo (Receita ou Despesa)') ?? '').trim().toLowerCase();
        const type: 'receita' | 'despesa' = tipoRaw.includes('receita') ? 'receita' : 'despesa';

        const statusRaw = String(get('Status (Pendente ou Pago)') ?? '').trim().toLowerCase();
        const isPaid = statusRaw.includes('pago');

        const description = String(get('Histórico') ?? get('Cliente/Fornecedor') ?? 'Importado via planilha');

        transactions.push({
          date: dateStr,
          amount: Math.abs(amount),
          type,
          is_paid: isPaid,
          description,
          due_date: excelDateToString(get('Data Vencimento')),
          bank_id: findByName(banks, get('Conta Bancária')),
          category_id: findByName(categories, get('Evento Contábil')),
          contact_id: findByName(contacts, get('Cliente/Fornecedor')),
          notes: get('Histórico') ? String(get('Histórico')) : null,
        });
      }

      if (!transactions.length) {
        toast({ title: 'Nenhum lançamento válido encontrado.', variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      await onImport(transactions);
      toast({ title: `${transactions.length} lançamento(s) importado(s) com sucesso!` });
      handleClose(false);
    } catch (err) {
      console.error('Import error:', err);
      toast({ title: 'Erro ao processar a planilha.', description: String(err), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  }, [banks, categories, contacts, onImport, toast]);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Planilha
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Baixe o modelo e preencha com seus dados' : 'Envie a planilha preenchida'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-3 py-2">
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </span>
            Modelo
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </span>
            Upload
          </div>
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
                Próximo
                <ArrowRight className="w-4 h-4" />
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
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

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Table2, Download, Image, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Bank } from '@/hooks/useBanks';
import { useCategories } from '@/hooks/useCategories';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { useCompany } from '@/hooks/useCompany';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: Bank[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateBR(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

export function BankReportModal({ open, onOpenChange, banks }: BankReportModalProps) {
  const { categories } = useCategories();
  const { company } = useCompany();
  const summaryRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(lastOfMonth);
  const [categoryId, setCategoryId] = useState('all');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const banksList = banks.map(b => ({ id: b.id, initial_balance: b.initial_balance, is_active: b.is_active }));

  // For multi-bank, we run the query with 'all' and filter client-side OR use single bank
  const effectiveBankId = selectedBankIds.length === 1 ? selectedBankIds[0] : 'all';

  const { rows, openingBalance, totalIncome, totalExpense, closingBalance, isLoading } = useBankTransactions(
    {
      bankId: effectiveBankId,
      startDate: startDate || null,
      endDate: endDate || null,
      contactId: null,
      categoryId: categoryId === 'all' ? null : categoryId,
    },
    banksList
  );

  // Filter rows by selected banks (when multiple selected)
  const filteredRows = selectedBankIds.length > 0 && selectedBankIds.length > 1
    ? rows.filter(r => r.bank_id && selectedBankIds.includes(r.bank_id))
    : rows;

  const toggleBank = (id: string) => {
    setSelectedBankIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const periodLabel = `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;

  // ─── PDF Export ───────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const emittedAt = `Emitido em ${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()} às ${pad2(today.getHours())}:${pad2(today.getMinutes())}`;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Empresa', 14, 18);

    if (company?.cnpj) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`CNPJ: ${company.cnpj}`, 14, 24);
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Extrato Bancário', 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel}`, 14, 40);

    // Summary
    doc.setFontSize(9);
    const summaryY = 48;
    doc.text(`Saldo Inicial: ${formatCurrency(openingBalance)}`, 14, summaryY);
    doc.text(`Entradas: ${formatCurrency(totalIncome)}`, 80, summaryY);
    doc.text(`Saídas: ${formatCurrency(totalExpense)}`, 140, summaryY);
    doc.text(`Saldo Final: ${formatCurrency(closingBalance)}`, 14, summaryY + 6);

    // Table
    autoTable(doc, {
      startY: summaryY + 14,
      head: [['Data', 'Banco', 'Cliente/Fornecedor', 'Evento', 'Entrada', 'Saída', 'Saldo']],
      body: filteredRows.map(r => [
        r.date,
        r.bank_name || '—',
        r.contact_name || '—',
        r.category_name || '—',
        r.type === 'receita' ? formatCurrency(r.amount) : '',
        r.type === 'despesa' ? formatCurrency(r.amount) : '',
        formatCurrency(r.running_balance),
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        4: { halign: 'right', textColor: [22, 163, 74] },
        5: { halign: 'right', textColor: [239, 68, 68] },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(emittedAt, 14, pageHeight - 8);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 14, pageHeight - 8, { align: 'right' });
        doc.setTextColor(0);
      },
    });

    doc.save(`extrato-bancario-${startDate}-${endDate}.pdf`);
  };

  // ─── CSV/Excel Export ─────────────────────────────────────────────
  const exportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Data', 'Banco', 'Histórico', 'Cliente/Fornecedor', 'Evento Contábil', 'Valor Entrada', 'Valor Saída', 'Saldo'];
    const csvRows = filteredRows.map(r => [
      r.date,
      r.bank_name || '',
      r.description,
      r.contact_name || '',
      r.category_name || '',
      r.type === 'receita' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.type === 'despesa' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.running_balance.toFixed(2).replace('.', ','),
    ]);

    const csv = BOM + [headers, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-bancario-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── OFX Export ───────────────────────────────────────────────────
  const exportOFX = () => {
    const dtStart = startDate.replace(/-/g, '');
    const dtEnd = endDate.replace(/-/g, '');
    const dtNow = `${today.getFullYear()}${pad2(today.getMonth() + 1)}${pad2(today.getDate())}`;

    const transactions = filteredRows
      .map(r => {
        const dtPosted = r.date.split('/').reverse().join(''); // DD/MM/YYYY → YYYYMMDD
        const trnType = r.type === 'receita' ? 'CREDIT' : 'DEBIT';
        const amount = r.type === 'receita' ? r.amount.toFixed(2) : `-${r.amount.toFixed(2)}`;
        const memo = `${r.description}${r.contact_name ? ` - ${r.contact_name}` : ''}`;
        return `        <STMTTRN>
          <TRNTYPE>${trnType}</TRNTYPE>
          <DTPOSTED>${dtPosted}</DTPOSTED>
          <TRNAMT>${amount}</TRNAMT>
          <FITID>${r.id}</FITID>
          <MEMO>${memo.replace(/[<>&]/g, ' ')}</MEMO>
        </STMTTRN>`;
      })
      .join('\n');

    const ofx = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER:100 DATA:OFXSGML VERSION:151 SECURITY:NONE ENCODING:UTF-8 CHARSET:1252 COMPRESSION:NONE OLDFILEUID:NONE NEWFILEUID:NONE?>
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
      <DTSERVER>${dtNow}</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1</TRNUID>
      <STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>000</BANKID>
          <ACCTID>EXTRATO</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dtStart}</DTSTART>
          <DTEND>${dtEnd}</DTEND>
${transactions}
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>${closingBalance.toFixed(2)}</BALAMT>
          <DTASOF>${dtEnd}</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

    const blob = new Blob([ofx], { type: 'application/x-ofx' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-bancario-${startDate}-${endDate}.ofx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── PNG Export ───────────────────────────────────────────────────
  const exportPNG = async () => {
    if (!summaryRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-extrato-${startDate}-${endDate}.png`;
      a.click();
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Gerar Relatório de Extrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Period */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Período</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bank selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Contas Bancárias</Label>
            <div className="grid grid-cols-2 gap-2">
              {banks.map(bank => (
                <div
                  key={bank.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedBankIds.includes(bank.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-border'
                  }`}
                  onClick={() => toggleBank(bank.id)}
                >
                  <Checkbox
                    checked={selectedBankIds.includes(bank.id)}
                    onCheckedChange={() => toggleBank(bank.id)}
                    className="pointer-events-none"
                  />
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bank.color }} />
                  <span className="text-sm truncate">{bank.name}</span>
                </div>
              ))}
              {banks.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">Nenhuma conta cadastrada</p>
              )}
            </div>
            {selectedBankIds.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Nenhuma conta selecionada = todas as contas</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Evento Contábil</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os eventos contábeis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preview Summary */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Preview do Resumo</Label>
            {isLoading ? (
              <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ) : (
              <div
                ref={summaryRef}
                className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
                style={{ fontFamily: 'sans-serif' }}
              >
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{company?.name || 'Extrato Bancário'}</h3>
                  <p className="text-xs text-gray-500">Período: {periodLabel}</p>
                  {selectedBankIds.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Contas: {banks.filter(b => selectedBankIds.includes(b.id)).map(b => b.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Saldo Inicial</p>
                    <p className="font-bold text-gray-900 text-sm mt-1">{formatCurrency(openingBalance)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <p className="text-xs text-green-700">Entradas</p>
                    </div>
                    <p className="font-bold text-green-700 text-sm mt-1">+{formatCurrency(totalIncome)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-600" />
                      <p className="text-xs text-red-700">Saídas</p>
                    </div>
                    <p className="font-bold text-red-700 text-sm mt-1">-{formatCurrency(totalExpense)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-blue-600" />
                      <p className="text-xs text-blue-700">Saldo Final</p>
                    </div>
                    <p className="font-bold text-blue-700 text-sm mt-1">{formatCurrency(closingBalance)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400">
                    {filteredRows.length} lançamentos • Gerado em {pad2(today.getDate())}/{pad2(today.getMonth() + 1)}/{today.getFullYear()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Export buttons */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Exportar</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 flex-col"
                onClick={exportPDF}
                disabled={isLoading}
              >
                <FileText className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <p className="text-xs font-semibold">PDF Gestão</p>
                  <p className="text-xs text-muted-foreground">Formal, pronto para impressão</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 flex-col"
                onClick={exportCSV}
                disabled={isLoading}
              >
                <Table2 className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Excel Analítico</p>
                  <p className="text-xs text-muted-foreground">CSV com colunas separadas</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 flex-col"
                onClick={exportOFX}
                disabled={isLoading}
              >
                <Download className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <p className="text-xs font-semibold">OFX Contábil</p>
                  <p className="text-xs text-muted-foreground">Domínio / Contmatic</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-auto py-3 flex-col"
                onClick={exportPNG}
                disabled={isLoading}
              >
                <Image className="w-5 h-5 text-purple-500" />
                <div className="text-left">
                  <p className="text-xs font-semibold">Imagem PNG</p>
                  <p className="text-xs text-muted-foreground">Resumo para WhatsApp</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

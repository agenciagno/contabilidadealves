import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [categoryId, setCategoryId] = useState('all');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const banksList = banks.map(b => ({ id: b.id, initial_balance: b.initial_balance, is_active: b.is_active }));

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

  const filteredRows = selectedBankIds.length > 1
    ? rows.filter(r => r.bank_id && selectedBankIds.includes(r.bank_id))
    : rows;

  const toggleBank = (id: string) => {
    setSelectedBankIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const periodLabel = `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;

  const accountsLabel = selectedBankIds.length > 0
    ? banks.filter(b => selectedBankIds.includes(b.id)).map(b => b.name).join(', ')
    : 'Todas';

  const categoryLabel = categoryId !== 'all'
    ? categories.find(c => c.id === categoryId)?.name || 'Todos'
    : 'Todos';

  // ─── PDF Export ───────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const emittedAt = `Emitido em ${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()} às ${pad2(today.getHours())}:${pad2(today.getMinutes())}`;

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
    doc.text(`Contas: ${accountsLabel}`, 14, 45);
    doc.text(`Evento Contábil: ${categoryLabel}`, 14, 50);

    // ─── Cards compactos 4 colunas ───
    const cardW = 43;
    const cardH = 14;
    const cardY = 56;
    const gap = 2;
    const col1X = 14;
    const col2X = col1X + cardW + gap;
    const col3X = col2X + cardW + gap;
    const col4X = col3X + cardW + gap;
    const labelOffsetY = 6;
    const valueOffsetY = 12;
    const padX = 3;

    // Saldo Inicial (cinza)
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(col1X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Saldo Inicial', col1X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(formatCurrency(openingBalance), col1X + padX, cardY + valueOffsetY);

    // Entradas (verde)
    doc.setFillColor(240, 255, 244);
    doc.roundedRect(col2X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(21, 128, 61);
    doc.text('Entradas', col2X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatCurrency(totalIncome)}`, col2X + padX, cardY + valueOffsetY);

    // Saídas (vermelho)
    doc.setFillColor(255, 245, 245);
    doc.roundedRect(col3X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text('Saídas', col3X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatCurrency(totalExpense)}`, col3X + padX, cardY + valueOffsetY);

    // Saldo Final (azul)
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(col4X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(29, 78, 216);
    doc.text('Saldo Final', col4X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(closingBalance), col4X + padX, cardY + valueOffsetY);

    // Separador e rodapé do resumo
    const sepY = cardY + cardH + 4;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(14, sepY, 192, sepY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(`${filteredRows.length} lançamentos • Gerado em ${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()}`, 14, sepY + 5);

    doc.setTextColor(0);

    autoTable(doc, {
      startY: sepY + 10,
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

  // ─── XLS Export ───────────────────────────────────────────────────
  const exportXLS = () => {
    const headers = ['Data', 'Banco', 'Histórico', 'Cliente/Fornecedor', 'Evento Contábil', 'Valor Entrada', 'Valor Saída', 'Saldo'];
    const tableRows = filteredRows.map(r => [
      r.date,
      r.bank_name || '',
      r.description,
      r.contact_name || '',
      r.category_name || '',
      r.type === 'receita' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.type === 'despesa' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.running_balance.toFixed(2).replace('.', ','),
    ]);

    const headerRows = `
      <tr><td colspan="8"><b>${company?.name || 'Empresa'}</b></td></tr>
      <tr><td colspan="8">Período: ${periodLabel}</td></tr>
      <tr><td colspan="8">Contas: ${accountsLabel}</td></tr>
      <tr><td colspan="8">Evento Contábil: ${categoryLabel}</td></tr>
      <tr><td colspan="8"></td></tr>
    `;

    const table = `<table>${headerRows}<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato-bancario-${startDate}-${endDate}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── CSV Export ───────────────────────────────────────────────────
  const exportCSV = () => {
    const metaLines = [
      company?.name || 'Empresa',
      `Período: ${periodLabel}`,
      `Contas: ${accountsLabel}`,
      `Evento Contábil: ${categoryLabel}`,
      '',
    ];

    const headers = ['Data', 'Banco', 'Histórico', 'Cliente/Fornecedor', 'Evento Contábil', 'Valor Entrada', 'Valor Saída', 'Saldo'];
    const dataLines = filteredRows.map(r => [
      r.date,
      r.bank_name || '',
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.contact_name || '').replace(/"/g, '""')}"`,
      r.category_name || '',
      r.type === 'receita' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.type === 'despesa' ? r.amount.toFixed(2).replace('.', ',') : '',
      r.running_balance.toFixed(2).replace('.', ','),
    ].join(';'));

    const csv = [...metaLines, headers.join(';'), ...dataLines].join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
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
        const dtPosted = r.date.split('/').reverse().join('');
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

  // ─── JPEG Export ──────────────────────────────────────────────────
  const exportImage = async () => {
    if (!summaryRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const url = canvas.toDataURL('image/jpeg', 0.92);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-extrato-${startDate}-${endDate}.jpg`;
      a.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
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
                  <p className="text-xs text-gray-500">Contas: {accountsLabel}</p>
                  <p className="text-xs text-gray-500">Evento Contábil: {categoryLabel}</p>
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
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportPDF}
                disabled={isLoading}
              >
                <FileText className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">PDF / Impressão</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportXLS}
                disabled={isLoading}
              >
                <Table2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Excel - XLS</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportCSV}
                disabled={isLoading}
              >
                <Table2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Excel - CSV</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportOFX}
                disabled={isLoading}
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">OFX</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportImage}
                disabled={isLoading}
              >
                <Image className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Imagem</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Table2, Image, TrendingUp, TrendingDown, Building2, Wallet, X, Printer } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { format, parseISO, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '@/hooks/useTransactions';
import type { Bank } from '@/hooks/useBanks';
import type { Contact } from '@/hooks/useContacts';

interface Category {
  id: string;
  name: string;
  color: string | null;
  type: string;
}

interface CashFlowReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  banks: Bank[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialCategoryIds?: string[];
  initialContactIds?: string[];
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

function getStatus(isPaid: boolean, dueDate: string | null): string {
  if (isPaid) return 'Pago';
  if (dueDate) {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (dueDate < today) return 'Vencido';
  }
  return 'Pendente';
}

export function CashFlowReportModal({
  open, onOpenChange, transactions, categories, contacts, banks,
  initialStartDate = '', initialEndDate = '', initialCategoryIds = [], initialContactIds = [],
}: CashFlowReportModalProps) {
  const { company } = useCompany();
  const summaryRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [contactId, setContactId] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (open) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      setCategoryId(initialCategoryIds.length === 1 ? initialCategoryIds[0] : 'all');
      setContactId(initialContactIds.length === 1 ? initialContactIds[0] : 'all');
      setTypeFilter('all');
    }
  }, [open, initialStartDate, initialEndDate, initialCategoryIds, initialContactIds]);

  const today = new Date();

  const periodLabel = startDate && endDate
    ? `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`
    : 'Acumulado Geral';
  const categoryLabel = categoryId !== 'all'
    ? categories.find(c => c.id === categoryId)?.name || 'Todos'
    : 'Todos';
  const contactLabel = contactId !== 'all'
    ? contacts.find(c => c.id === contactId)?.name || 'Todos'
    : 'Todos';
  const typeLabel = typeFilter === 'receita' ? 'A Receber' : typeFilter === 'despesa' ? 'A Pagar' : 'Todos';

  const clearDates = () => { setStartDate(''); setEndDate(''); };

  const activeBanks = useMemo(() => banks.filter(b => b.is_active), [banks]);
  const totalBankBalance = useMemo(() => activeBanks.reduce((s, b) => s + Number(b.current_balance), 0), [activeBanks]);

  // Filter: same strict rule as CashFlowTab — only !is_paid && expected_date not null
  const filteredRows = useMemo(() => {
    let result = transactions.filter(t => !t.is_paid && t.expected_date);

    if (startDate && endDate) {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      e.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        const dateKey = t.expected_date;
        if (!dateKey) return false;
        const d = parseISO(dateKey);
        return isWithinInterval(d, { start: s, end: e });
      });
    }

    if (categoryId !== 'all') result = result.filter(t => t.category_id === categoryId);
    if (contactId !== 'all') result = result.filter(t => t.contact_id === contactId);
    if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter);

    result.sort((a, b) => (a.expected_date || '').localeCompare(b.expected_date || ''));
    return result;
  }, [transactions, startDate, endDate, categoryId, contactId, typeFilter]);

  // Running balance rows
  const rowsWithBalance = useMemo(() => {
    let saldo = totalBankBalance;
    return filteredRows.map(t => {
      const amt = Number(t.amount);
      if (t.type === 'receita') saldo += amt;
      else saldo -= amt;
      return { ...t, saldoAtual: saldo };
    });
  }, [filteredRows, totalBankBalance]);

  // KPIs matching main screen: Capital de Giro, Entradas, Saídas, Saldos Atuais
  const kpis = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const t of filteredRows) {
      const amt = Number(t.amount);
      if (t.type === 'receita') entradas += amt;
      else saidas += amt;
    }
    const capitalDeGiro = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].saldoAtual : totalBankBalance;
    return { entradas, saidas, capitalDeGiro, totalBankBalance };
  }, [filteredRows, rowsWithBalance, totalBankBalance]);

  // ─── PDF Export ───────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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
    doc.text('Relatório de Contas a Pagar/Receber', 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel}`, 14, 40);
    doc.text(`Evento Contábil: ${categoryLabel}`, 14, 45);
    doc.text(`Cliente/Fornecedor: ${contactLabel}`, 14, 50);
    doc.text(`Tipo: ${typeLabel}`, 14, 55);

    // 4 KPI cards
    const cardW = 63;
    const cardH = 14;
    const cardY = 61;
    const gap = 2;
    const padX = 3;
    const labelOffsetY = 6;
    const valueOffsetY = 12;
    const col1X = 14;
    const col2X = col1X + cardW + gap;
    const col3X = col2X + cardW + gap;
    const col4X = col3X + cardW + gap;

    // Capital de Giro
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(col1X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(29, 78, 216);
    doc.text('Capital de Giro', col1X + padX, cardY + labelOffsetY);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(kpis.capitalDeGiro), col1X + padX, cardY + valueOffsetY);

    // Entradas
    doc.setFillColor(240, 255, 244);
    doc.roundedRect(col2X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(21, 128, 61);
    doc.text('Entradas', col2X + padX, cardY + labelOffsetY);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(kpis.entradas), col2X + padX, cardY + valueOffsetY);

    // Saídas
    doc.setFillColor(255, 245, 245);
    doc.roundedRect(col3X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(220, 38, 38);
    doc.text('Saídas', col3X + padX, cardY + labelOffsetY);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(kpis.saidas), col3X + padX, cardY + valueOffsetY);

    // Saldos Atuais (Bancos)
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(col4X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.text('Saldos Atuais (Bancos)', col4X + padX, cardY + labelOffsetY);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(formatCurrency(kpis.totalBankBalance), col4X + padX, cardY + valueOffsetY);

    const sepY = cardY + cardH + 4;
    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3);
    doc.line(14, sepY, 283, sepY);

    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
    doc.text(`${filteredRows.length} lançamentos • Gerado em ${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()}`, 14, sepY + 5);
    doc.setTextColor(0);

    // 9 columns: PREVISTA | CLIENTE | RECEBER | PAGAR | VENCIMENTO | EVENTO | HISTÓRICO | SALDO ATUAL | STATUS
    autoTable(doc, {
      startY: sepY + 10,
      head: [['Prevista', 'Cliente', 'Receber', 'Pagar', 'Vencimento', 'Evento', 'Histórico', 'Saldo Atual', 'Status']],
      body: rowsWithBalance.map(r => [
        formatDateBR(r.expected_date || ''),
        r.contact?.name || r.description,
        r.type === 'receita' ? formatCurrency(Number(r.amount)) : '',
        r.type === 'despesa' ? formatCurrency(Number(r.amount)) : '',
        r.due_date ? formatDateBR(r.due_date) : '',
        r.category?.name || '',
        r.notes || '',
        formatCurrency(r.saldoAtual),
        getStatus(r.is_paid, r.due_date),
      ]),
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
        6: { cellWidth: 40, halign: 'center' },
        7: { cellWidth: 28, halign: 'center' },
        8: { cellWidth: 18, halign: 'center' },
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(emittedAt, 14, pageHeight - 8);
        doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 14, pageHeight - 8, { align: 'right' });
        doc.setTextColor(0);
      },
    });

    doc.save(`contas-pagar-receber-${startDate || 'geral'}-${endDate || 'geral'}.pdf`);
  };

  // ─── XLS Export ───────────────────────────────────────────────────
  const exportXLS = () => {
    const headers = ['Prevista', 'Cliente', 'Receber', 'Pagar', 'Vencimento', 'Evento', 'Histórico', 'Saldo Atual', 'Status'];
    const tableRows = rowsWithBalance.map(r => [
      formatDateBR(r.expected_date || ''),
      r.contact?.name || r.description || '',
      r.type === 'receita' ? Number(r.amount).toFixed(2).replace('.', ',') : '',
      r.type === 'despesa' ? Number(r.amount).toFixed(2).replace('.', ',') : '',
      r.due_date ? formatDateBR(r.due_date) : '',
      r.category?.name || '',
      r.notes || '',
      r.saldoAtual.toFixed(2).replace('.', ','),
      getStatus(r.is_paid, r.due_date),
    ]);

    const headerRows = `
      <tr><td colspan="9"><b>${company?.name || 'Empresa'}</b></td></tr>
      <tr><td colspan="9">Período: ${periodLabel}</td></tr>
      <tr><td colspan="9">Evento Contábil: ${categoryLabel}</td></tr>
      <tr><td colspan="9">Cliente/Fornecedor: ${contactLabel}</td></tr>
      <tr><td colspan="9"></td></tr>
    `;

    const table = `<table>${headerRows}<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-pagar-receber-${startDate || 'geral'}-${endDate || 'geral'}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── CSV Export ───────────────────────────────────────────────────
  const exportCSV = () => {
    const metaLines = [
      company?.name || 'Empresa',
      `Período: ${periodLabel}`,
      `Evento Contábil: ${categoryLabel}`,
      `Cliente/Fornecedor: ${contactLabel}`,
      '',
    ];

    const headers = ['Prevista', 'Cliente', 'Receber', 'Pagar', 'Vencimento', 'Evento', 'Histórico', 'Saldo Atual', 'Status'];
    const dataLines = rowsWithBalance.map(r => [
      formatDateBR(r.expected_date || ''),
      `"${(r.contact?.name || r.description || '').replace(/"/g, '""')}"`,
      r.type === 'receita' ? Number(r.amount).toFixed(2).replace('.', ',') : '',
      r.type === 'despesa' ? Number(r.amount).toFixed(2).replace('.', ',') : '',
      r.due_date ? formatDateBR(r.due_date) : '',
      r.category?.name || '',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.saldoAtual.toFixed(2).replace('.', ','),
      getStatus(r.is_paid, r.due_date),
    ].join(';'));

    const csv = [...metaLines, headers.join(';'), ...dataLines].join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-pagar-receber-${startDate || 'geral'}-${endDate || 'geral'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── JPEG Export ──────────────────────────────────────────────────
  const exportImage = async () => {
    if (!summaryRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true,
      });
      const url = canvas.toDataURL('image/jpeg', 0.92);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-pagar-receber-${startDate || 'geral'}-${endDate || 'geral'}.jpg`;
      a.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
    }
  };

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl print-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Relatório de Contas a Pagar/Receber
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Period with clear button */}
          <div>
            <Label className="text-sm font-semibold mb-1 block">Período</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min="1900-01-01" max="9999-12-31" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <div className="relative flex gap-1">
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min="1900-01-01" max="9999-12-31" className="flex-1" />
                  {(startDate || endDate) && (
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 no-print" onClick={clearDates} title="Limpar datas (Acumulado Geral)">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category + Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold mb-1 block">Evento Contábil</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-1 block">Cliente/Fornecedor</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Preview Summary — 4 cards matching main screen */}
          <div>
            <Label className="text-xs font-semibold mb-1 block">Preview do Resumo</Label>
            <div
              ref={summaryRef}
              className="bg-white rounded-lg border border-gray-200 p-3 space-y-2 print-visible"
              style={{ fontFamily: 'sans-serif' }}
            >
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{company?.name || 'Contas a Pagar/Receber'}</h3>
                <p className="text-[10px] text-gray-500">Período: {periodLabel} • Evento: {categoryLabel} • Cliente: {contactLabel}</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-blue-50 rounded p-1.5 border-l-2 border-l-blue-500">
                  <p className="text-[9px] text-blue-700">Capital de Giro</p>
                  <p className={`font-bold text-[11px] ${kpis.capitalDeGiro >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(kpis.capitalDeGiro)}</p>
                </div>
                <div className="bg-green-50 rounded p-1.5 border-l-2 border-l-green-500">
                  <p className="text-[9px] text-green-700">Entradas</p>
                  <p className="font-bold text-green-700 text-[11px]">{formatCurrency(kpis.entradas)}</p>
                </div>
                <div className="bg-red-50 rounded p-1.5 border-l-2 border-l-red-500">
                  <p className="text-[9px] text-red-700">Saídas</p>
                  <p className="font-bold text-red-700 text-[11px]">{formatCurrency(kpis.saidas)}</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 border-l-2 border-l-gray-400">
                  <p className="text-[9px] text-gray-600">Saldos Atuais</p>
                  <p className="font-bold text-gray-800 text-[11px]">{formatCurrency(kpis.totalBankBalance)}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-1.5">
                <p className="text-[10px] text-gray-400">
                  {filteredRows.length} lançamentos • Gerado em {pad2(today.getDate())}/{pad2(today.getMonth() + 1)}/{today.getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Export buttons */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Exportar</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Button variant="outline" className="flex items-center gap-1.5 h-8 text-xs no-print" onClick={exportPDF}>
                <FileText className="w-3.5 h-3.5 text-red-500" /> PDF
              </Button>
              <Button variant="outline" className="flex items-center gap-1.5 h-8 text-xs no-print" onClick={exportXLS}>
                <Table2 className="w-3.5 h-3.5 text-green-600" /> XLS
              </Button>
              <Button variant="outline" className="flex items-center gap-1.5 h-8 text-xs no-print" onClick={exportCSV}>
                <Table2 className="w-3.5 h-3.5 text-green-600" /> CSV
              </Button>
              <Button variant="outline" className="flex items-center gap-1.5 h-8 text-xs no-print" onClick={exportImage}>
                <Image className="w-3.5 h-3.5 text-purple-500" /> Imagem
              </Button>
              <Button variant="outline" className="flex items-center gap-1.5 h-8 text-xs no-print" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 text-muted-foreground" /> Imprimir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

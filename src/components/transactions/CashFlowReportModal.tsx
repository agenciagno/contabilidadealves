import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Table2, Image, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
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

export function CashFlowReportModal({ open, onOpenChange, transactions, categories, contacts, banks }: CashFlowReportModalProps) {
  const { company } = useCompany();
  const summaryRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [categoryId, setCategoryId] = useState('all');
  const [contactId, setContactId] = useState('all');

  const periodLabel = `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;
  const categoryLabel = categoryId !== 'all'
    ? categories.find(c => c.id === categoryId)?.name || 'Todos'
    : 'Todos';
  const contactLabel = contactId !== 'all'
    ? contacts.find(c => c.id === contactId)?.name || 'Todos'
    : 'Todos';

  // Filter transactions: only pending, within period, by category/contact
  const filteredRows = useMemo(() => {
    let result = transactions.filter(t => !t.is_paid);

    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      // Set end to end of day
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => {
        const dateKey = t.due_date || t.issue_date;
        if (!dateKey) return false;
        const d = parseISO(dateKey);
        return isWithinInterval(d, { start, end });
      });
    }

    if (categoryId !== 'all') result = result.filter(t => t.category_id === categoryId);
    if (contactId !== 'all') result = result.filter(t => t.contact_id === contactId);

    result.sort((a, b) => (a.due_date || a.issue_date || '').localeCompare(b.due_date || b.issue_date || ''));
    return result;
  }, [transactions, startDate, endDate, categoryId, contactId]);

  // KPIs
  const kpis = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const t of filteredRows) {
      const amt = Number(t.amount);
      if (t.type === 'receita') entradas += amt;
      else saidas += amt;
    }
    const totalBankBalance = banks.filter(b => b.is_active).reduce((s, b) => s + Number(b.current_balance), 0);
    return { entradas, saidas, saldoProjetado: totalBankBalance + entradas - saidas };
  }, [filteredRows, banks]);

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
    doc.text('Relatório de Contas a Pagar/Receber', 14, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel}`, 14, 40);
    doc.text(`Evento Contábil: ${categoryLabel}`, 14, 45);
    doc.text(`Cliente/Fornecedor: ${contactLabel}`, 14, 50);

    // ─── Cards compactos 3 colunas ───
    const cardW = 57;
    const cardH = 14;
    const cardY = 56;
    const gap = 2;
    const col1X = 14;
    const col2X = col1X + cardW + gap;
    const col3X = col2X + cardW + gap;
    const labelOffsetY = 6;
    const valueOffsetY = 12;
    const padX = 3;

    // Entradas Pendentes (verde)
    doc.setFillColor(240, 255, 244);
    doc.roundedRect(col1X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(21, 128, 61);
    doc.text('Entradas Pendentes', col1X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`+${formatCurrency(kpis.entradas)}`, col1X + padX, cardY + valueOffsetY);

    // Saídas Pendentes (vermelho)
    doc.setFillColor(255, 245, 245);
    doc.roundedRect(col2X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text('Saídas Pendentes', col2X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatCurrency(kpis.saidas)}`, col2X + padX, cardY + valueOffsetY);

    // Saldo Projetado (azul)
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(col3X, cardY, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(29, 78, 216);
    doc.text('Saldo Projetado', col3X + padX, cardY + labelOffsetY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(kpis.saldoProjetado), col3X + padX, cardY + valueOffsetY);

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
      head: [['Data Prevista', 'Cliente/Fornecedor', 'Evento', 'Valor', 'Vencimento', 'Status']],
      body: filteredRows.map(r => [
        formatDateBR(r.due_date || r.issue_date || ''),
        r.contact?.name || r.description,
        r.category?.name || '—',
        r.type === 'receita' ? formatCurrency(Number(r.amount)) : `-${formatCurrency(Number(r.amount))}`,
        r.due_date ? formatDateBR(r.due_date) : '—',
        getStatus(r.is_paid, r.due_date),
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        3: { halign: 'right' },
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

    doc.save(`contas-pagar-receber-${startDate}-${endDate}.pdf`);
  };

  // ─── XLS Export ───────────────────────────────────────────────────
  const exportXLS = () => {
    const headers = ['Data Prevista', 'Cliente/Fornecedor', 'Evento Contábil', 'Descrição', 'Valor', 'Vencimento', 'Status'];
    const tableRows = filteredRows.map(r => [
      formatDateBR(r.due_date || r.issue_date || ''),
      r.contact?.name || '',
      r.category?.name || '',
      r.description,
      r.type === 'receita' ? Number(r.amount).toFixed(2).replace('.', ',') : `-${Number(r.amount).toFixed(2).replace('.', ',')}`,
      r.due_date ? formatDateBR(r.due_date) : '',
      getStatus(r.is_paid, r.due_date),
    ]);

    const headerRows = `
      <tr><td colspan="7"><b>${company?.name || 'Empresa'}</b></td></tr>
      <tr><td colspan="7">Período: ${periodLabel}</td></tr>
      <tr><td colspan="7">Evento Contábil: ${categoryLabel}</td></tr>
      <tr><td colspan="7">Cliente/Fornecedor: ${contactLabel}</td></tr>
      <tr><td colspan="7"></td></tr>
    `;

    const table = `<table>${headerRows}<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-pagar-receber-${startDate}-${endDate}.xls`;
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

    const headers = ['Data Prevista', 'Cliente/Fornecedor', 'Evento Contábil', 'Descrição', 'Valor', 'Vencimento', 'Status'];
    const dataLines = filteredRows.map(r => [
      formatDateBR(r.due_date || r.issue_date || ''),
      `"${(r.contact?.name || '').replace(/"/g, '""')}"`,
      r.category?.name || '',
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.type === 'receita' ? Number(r.amount).toFixed(2).replace('.', ',') : `-${Number(r.amount).toFixed(2).replace('.', ',')}`,
      r.due_date ? formatDateBR(r.due_date) : '',
      getStatus(r.is_paid, r.due_date),
    ].join(';'));

    const csv = [...metaLines, headers.join(';'), ...dataLines].join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contas-pagar-receber-${startDate}-${endDate}.csv`;
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
      a.download = `resumo-pagar-receber-${startDate}-${endDate}.jpg`;
      a.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Relatório de Contas a Pagar/Receber
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Period */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Período</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Início</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min="1900-01-01" max="9999-12-31" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min="1900-01-01" max="9999-12-31" />
              </div>
            </div>
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

          {/* Contact */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Cliente/Fornecedor</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os clientes/fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {contacts.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preview Summary */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Preview do Resumo</Label>
            <div
              ref={summaryRef}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
              style={{ fontFamily: 'sans-serif' }}
            >
              <div>
                <h3 className="font-bold text-gray-900 text-base">{company?.name || 'Contas a Pagar/Receber'}</h3>
                <p className="text-xs text-gray-500">Período: {periodLabel}</p>
                <p className="text-xs text-gray-500">Evento Contábil: {categoryLabel}</p>
                <p className="text-xs text-gray-500">Cliente/Fornecedor: {contactLabel}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-md p-2">
                  <p className="text-[10px] text-green-700">Entradas Pendentes</p>
                  <p className="font-bold text-green-700 text-xs mt-0.5">+{formatCurrency(kpis.entradas)}</p>
                </div>
                <div className="bg-red-50 rounded-md p-2">
                  <p className="text-[10px] text-red-700">Saídas Pendentes</p>
                  <p className="font-bold text-red-700 text-xs mt-0.5">-{formatCurrency(kpis.saidas)}</p>
                </div>
                <div className="bg-blue-50 rounded-md p-2">
                  <p className="text-[10px] text-blue-700">Saldo Projetado</p>
                  <p className="font-bold text-blue-700 text-xs mt-0.5">{formatCurrency(kpis.saldoProjetado)}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400">
                  {filteredRows.length} lançamentos • Gerado em {pad2(today.getDate())}/{pad2(today.getMonth() + 1)}/{today.getFullYear()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Export buttons */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Exportar</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportPDF}
              >
                <FileText className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">PDF</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportXLS}
              >
                <Table2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">XLS</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportCSV}
              >
                <Table2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">CSV</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2 h-10"
                onClick={exportImage}
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

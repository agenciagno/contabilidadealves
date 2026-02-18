import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Loader2,
  FileCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useBoletoControls } from '@/hooks/useBoletoControls';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function getFirstOfMonth(date: Date): string {
  return format(date, 'yyyy-MM-01');
}

export default function Boletos() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'GENERATED'>('ALL');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const referenceMonth = getFirstOfMonth(currentMonth);
  const { boletoList, isLoading, isGenerating, toggleStatus } = useBoletoControls(referenceMonth);

  const filteredList = boletoList.filter(b => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const pendingCount = boletoList.filter(b => b.status === 'PENDING').length;
  const generatedCount = boletoList.filter(b => b.status === 'GENERATED').length;

  const handleCopy = async (text: string, fieldId: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast({ title: 'Copiado!', description: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, fieldId }: { text: string | null; fieldId: string }) => {
    if (!text) return null;
    const copied = copiedField === fieldId;
    return (
      <button
        onClick={() => handleCopy(text, fieldId)}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
        title="Copiar"
      >
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-6 pb-4 print-hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            Controle de Boletos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Geração e controle mensal de cobranças
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Lista
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 pb-4 flex-wrap print-hidden">
        {/* Seletor de Mês */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[160px]">
              <ChevronLeft
                className="h-4 w-4 cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setCurrentMonth(prev => subMonths(prev, 1)); }}
              />
              <span className="flex-1 text-center">
                {format(currentMonth, 'MM/yyyy', { locale: ptBR })}
              </span>
              <ChevronRight
                className="h-4 w-4 cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setCurrentMonth(prev => addMonths(prev, 1)); }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <p className="text-sm text-muted-foreground mb-3 font-medium">Mês de Referência</p>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filtro de Status */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos ({boletoList.length})</SelectItem>
            <SelectItem value="PENDING">Pendentes ({pendingCount})</SelectItem>
            <SelectItem value="GENERATED">Gerados ({generatedCount})</SelectItem>
          </SelectContent>
        </Select>

        {/* Botão Hoje */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(today)}
          className="text-muted-foreground"
        >
          Mês atual
        </Button>
      </div>

      {/* Título de impressão (visível apenas ao imprimir) */}
      <div className="hidden print:block px-6 pb-4">
        <h1 className="text-xl font-bold">Controle de Boletos — {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h1>
        <p className="text-sm">{filteredList.length} boleto(s) listado(s)</p>
      </div>

      <Separator className="print-hidden" />

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6 pt-4">
        {isLoading || isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm">
              {isGenerating ? 'Gerando boletos do mês...' : 'Carregando...'}
            </span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <FileCheck className="w-12 h-12 opacity-30" />
            <p className="font-medium">Nenhum boleto encontrado</p>
            <p className="text-sm">
              {boletoList.length === 0
                ? 'Nenhum cliente com cobrança ativa cadastrada'
                : 'Tente ajustar os filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredList.map((boleto) => (
              <Card
                key={boleto.id}
                className={cn(
                  'boleto-card border transition-colors',
                  boleto.status === 'GENERATED' && 'bg-success/5 border-success/30'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Col 1: Cliente */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center print:hidden">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{boleto.contact_name}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {boleto.contact_type === 'cliente'
                            ? 'Cliente'
                            : boleto.contact_type === 'fornecedor'
                            ? 'Fornecedor'
                            : 'Cliente/Forn.'}
                        </Badge>
                      </div>
                    </div>

                    {/* Col 2: Dados de contato */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {boleto.contact_document && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70 w-10 shrink-0">CNPJ:</span>
                          <span className="truncate">{boleto.contact_document}</span>
                          <CopyButton text={boleto.contact_document} fieldId={`${boleto.id}-doc`} />
                        </div>
                      )}
                      {boleto.contact_email && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70 w-10 shrink-0">Email:</span>
                          <span className="truncate">{boleto.contact_email}</span>
                          <CopyButton text={boleto.contact_email} fieldId={`${boleto.id}-email`} />
                        </div>
                      )}
                      {boleto.contact_phone && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/70 w-10 shrink-0">Tel:</span>
                          <span className="truncate">{boleto.contact_phone}</span>
                          <CopyButton text={boleto.contact_phone} fieldId={`${boleto.id}-tel`} />
                        </div>
                      )}
                      {!boleto.contact_document && !boleto.contact_email && !boleto.contact_phone && (
                        <span className="text-xs text-muted-foreground/50">Sem dados de contato</span>
                      )}
                    </div>

                    {/* Col 3: Financeiro */}
                    <div className="text-right shrink-0">
                      {boleto.boleto_value != null && (
                        <p className="text-sm font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.boleto_value)}
                        </p>
                      )}
                      {boleto.boleto_due_day != null && (
                        <p className="text-xs text-muted-foreground">
                          Venc. dia {boleto.boleto_due_day}
                        </p>
                      )}
                    </div>

                    {/* Col 4: Status badge clicável */}
                    <div className="shrink-0 print-hidden">
                      <Badge
                        className={cn(
                          'cursor-pointer select-none transition-all text-xs font-medium px-3 py-1',
                          boleto.status === 'PENDING'
                            ? 'bg-background border border-warning/60 text-warning-foreground hover:bg-warning/10'
                            : 'bg-success text-success-foreground hover:bg-success/90 border-transparent'
                        )}
                        onClick={() => {
                          if (!toggleStatus.isPending) {
                            toggleStatus.mutate({ id: boleto.id, currentStatus: boleto.status });
                          }
                        }}
                      >
                        {toggleStatus.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : boleto.status === 'PENDING' ? (
                          'Pendente'
                        ) : (
                          'Gerado ✓'
                        )}
                      </Badge>
                    </div>

                    {/* Status para impressão */}
                    <div className="shrink-0 hidden print:block">
                      <span className={cn(
                        'text-xs font-medium px-2 py-1 border rounded',
                        boleto.status === 'PENDING' ? 'border-border' : 'border-foreground bg-muted'
                      )}>
                        {boleto.status === 'PENDING' ? 'PENDENTE' : 'GERADO'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  Search,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const referenceMonth = getFirstOfMonth(currentMonth);
  const { boletoList, isLoading, isGenerating, toggleStatus, refresh, isRefreshing } = useBoletoControls(referenceMonth);

  const filteredList = boletoList.filter(b => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = !searchQuery || b.contact_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isLoading || isGenerating || isRefreshing}
            title="Atualizar listagem"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir Lista
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 px-6 pb-4 flex-wrap print-hidden">
        {/* Campo de pesquisa */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 w-[220px] text-sm"
          />
        </div>
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

        {/* Filtro de Status como botões */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'transition-all',
              statusFilter === 'ALL' && 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
            )}
          >
            Todos ({boletoList.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('PENDING')}
            className={cn(
              'transition-all',
              statusFilter === 'PENDING'
                ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300'
                : 'hover:border-amber-300 hover:text-amber-700'
            )}
          >
            Pendentes ({pendingCount})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatusFilter('GENERATED')}
            className={cn(
              'transition-all',
              statusFilter === 'GENERATED'
                ? 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-500 dark:text-green-300'
                : 'hover:border-green-300 hover:text-green-700'
            )}
          >
            Gerados ({generatedCount})
          </Button>
        </div>
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
            {filteredList.map((boleto) => {
              const dueDate = boleto.boleto_due_day != null
                ? format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), boleto.boleto_due_day), 'dd/MM/yyyy')
                : null;
              return (
                <Card
                  key={boleto.id}
                  className={cn(
                    'boleto-card border transition-colors',
                    boleto.status === 'GENERATED' && 'bg-success/5 border-success/30'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      {/* Lado esquerdo: info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{boleto.contact_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {boleto.contact_document && (
                            <div className="flex items-center">
                              <span className="font-medium text-foreground/70 mr-1">CNPJ:</span>
                              <span>{boleto.contact_document}</span>
                              <CopyButton text={boleto.contact_document} fieldId={`${boleto.id}-doc`} />
                            </div>
                          )}
                          {boleto.contact_email && (
                            <div className="flex items-center print:hidden">
                              <span className="font-medium text-foreground/70 mr-1">Email:</span>
                              <span className="truncate max-w-[180px]">{boleto.contact_email}</span>
                              <CopyButton text={boleto.contact_email} fieldId={`${boleto.id}-email`} />
                            </div>
                          )}
                          {boleto.contact_phone && (
                            <div className="flex items-center print:hidden">
                              <span className="font-medium text-foreground/70 mr-1">Tel:</span>
                              <span>{boleto.contact_phone}</span>
                              <CopyButton text={boleto.contact_phone} fieldId={`${boleto.id}-tel`} />
                            </div>
                          )}
                          {dueDate && (
                            <div className="flex items-center">
                              <span className="font-medium text-foreground/70 mr-1">Venc:</span>
                              <span>{dueDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Lado direito: valor + status */}
                      <div className="flex items-center gap-3 shrink-0">
                        {boleto.boleto_value != null && (
                          <p className="text-sm font-bold text-foreground whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.boleto_value)}
                          </p>
                        )}
                        {/* Badge interativo (tela) */}
                        <div className="print-hidden">
                          <Badge
                            className={cn(
                              'cursor-pointer select-none transition-all text-xs font-semibold px-3 py-1',
                              boleto.status === 'PENDING'
                                ? 'bg-amber-100 border border-amber-400 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:border-amber-500 dark:text-amber-300'
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
                            ) : boleto.status === 'PENDING' ? 'Pendente' : 'Gerado ✓'}
                          </Badge>
                        </div>
                        {/* Status para impressão */}
                        <span className={cn(
                          'hidden print:inline-block text-xs font-medium px-2 py-1 border rounded',
                          boleto.status === 'PENDING' ? 'border-border' : 'border-foreground bg-muted'
                        )}>
                          {boleto.status === 'PENDING' ? 'PENDENTE' : 'GERADO'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Totalizador */}
            {filteredList.length > 0 && (
              <div className="flex justify-end border-t pt-3 mt-4">
                <p className="font-bold text-base">
                  Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    filteredList.reduce((sum, b) => sum + (b.boleto_value ?? 0), 0)
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Bank {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  bankId: string;
  onBankChange: (value: string) => void;
  transactionType: string;
  onTransactionTypeChange: (value: string) => void;
  categories: Category[];
  banks: Bank[];
  onExportCSV: () => void;
}

export function ReportFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  categoryId,
  onCategoryChange,
  bankId,
  onBankChange,
  transactionType,
  onTransactionTypeChange,
  categories,
  banks,
  onExportCSV,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Data Inicial</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[140px] justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, 'dd/MM/yyyy') : 'Início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Data Final</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[140px] justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, 'dd/MM/yyyy') : 'Fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tipo</label>
        <Select value={transactionType} onValueChange={onTransactionTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Categoria</label>
        <Select value={categoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Banco</label>
        <Select value={bankId} onValueChange={onBankChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" onClick={onExportCSV} className="gap-2">
        <Download className="h-4 w-4" />
        Exportar CSV
      </Button>
    </div>
  );
}

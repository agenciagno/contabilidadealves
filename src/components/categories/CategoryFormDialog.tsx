import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Category } from '@/hooks/useCategories';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSubmit: (data: { name: string; type: 'receita' | 'despesa'; color: string; icon: string }) => void;
  isLoading?: boolean;
  defaultType?: 'receita' | 'despesa';
}

export function CategoryFormDialog({ open, onOpenChange, category, onSubmit, isLoading, defaultType = 'receita' }: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType((category.type as 'receita' | 'despesa') || defaultType);
    } else {
      setName('');
      setType(defaultType);
    }
  }, [category, open, defaultType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, type, color: '#3B82F6', icon: 'tag' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Evento Contábil' : 'Novo Evento Contábil'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as 'receita' | 'despesa')}>
              <TabsList className="w-full h-9">
                <TabsTrigger value="receita" className="flex-1 gap-1.5 text-xs h-7">
                  <TrendingUp className="w-3.5 h-3.5" /> Receita
                </TabsTrigger>
                <TabsTrigger value="despesa" className="flex-1 gap-1.5 text-xs h-7">
                  <TrendingDown className="w-3.5 h-3.5" /> Despesa
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Honorários, Aluguel..."
              required
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()} className="flex-1">
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

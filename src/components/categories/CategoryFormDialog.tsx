import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Category } from '@/hooks/useCategories';
import { DRE_SECTIONS } from '@/hooks/useDREData';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  categories?: Category[];
  onSubmit: (data: { name: string; type: 'receita' | 'despesa'; color: string; icon: string; parent_id?: string | null; dre_section?: string; display_order?: number }) => void;
  isLoading?: boolean;
  defaultType?: 'receita' | 'despesa';
}

export function CategoryFormDialog({ open, onOpenChange, category, categories = [], onSubmit, isLoading, defaultType = 'receita' }: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>(defaultType);
  const [parentId, setParentId] = useState<string | null>(null);
  const [dreSection, setDreSection] = useState('despesas_operacionais');
  const [displayOrder, setDisplayOrder] = useState(0);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType((category.type as 'receita' | 'despesa') || defaultType);
      setParentId(category.parent_id || null);
      setDreSection(category.dre_section || 'despesas_operacionais');
      setDisplayOrder(category.display_order || 0);
    } else {
      setName('');
      setType(defaultType);
      setParentId(null);
      setDreSection('despesas_operacionais');
      setDisplayOrder(0);
    }
  }, [category, open, defaultType]);

  const isMacro = !parentId;

  const macroOptions = categories.filter(
    c => !c.parent_id && c.type === type && c.id !== category?.id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      color: '#3B82F6',
      icon: 'tag',
      parent_id: parentId,
      ...(isMacro ? { dre_section: dreSection, display_order: displayOrder } : {}),
    });
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
            <Tabs value={type} onValueChange={(v) => { setType(v as 'receita' | 'despesa'); setParentId(null); }}>
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

          <div className="space-y-2">
            <Label>Pertence a qual Evento Macro? (Opcional)</Label>
            <Select
              value={parentId || '__none__'}
              onValueChange={(v) => setParentId(v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum (este é um Evento Macro)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (Evento Macro)</SelectItem>
                {macroOptions.map(macro => (
                  <SelectItem key={macro.id} value={macro.id}>
                    {macro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se não selecionar, este evento será um Macro. Se selecionar, será um sub evento.
            </p>
          </div>

          {/* DRE Section and Order - only for Macros */}
          {isMacro && (
            <>
              <div className="space-y-2">
                <Label>Seção DRE</Label>
                <Select value={dreSection} onValueChange={setDreSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRE_SECTIONS.map(sec => (
                      <SelectItem key={sec.key} value={sec.key}>
                        {sec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define onde este evento aparece na estrutura da DRE.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Ordem de Exibição</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Define a posição deste macro dentro da seção (menor = primeiro).
                </p>
              </div>
            </>
          )}

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

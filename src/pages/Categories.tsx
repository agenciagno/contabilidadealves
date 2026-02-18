import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { useCategories, Category } from '@/hooks/useCategories';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function Categories() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleSubmit = (data: {
    name: string;
    type: 'receita' | 'despesa';
    color: string;
    icon: string;
  }) => {
    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        ...data
      }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingCategory(null);
        }
      });
    } else {
      createCategory.mutate(data, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  const CategoryCard = ({ category }: { category: Category }) => (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Tag className="w-4 h-4 text-primary" />
        </div>
        <span className="font-medium text-foreground">{category.name}</span>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(category.id)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos Contábeis</h1>
        </div>
        <Button className="gap-2" onClick={() => {
          setEditingCategory(null);
          setDialogOpen(true);
        }}>
          <Plus className="w-4 h-4" />
          Novo Evento Contábil
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Todos os Eventos</h2>
            <span className="text-sm text-muted-foreground">({sortedCategories.length})</span>
          </div>
          <div className="space-y-2">
            {sortedCategories.length === 0
              ? <p className="text-muted-foreground text-center py-8">Nenhum evento contábil cadastrado</p>
              : sortedCategories.map(cat => <CategoryCard key={cat.id} category={cat} />)
            }
          </div>
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSubmit={handleSubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento contábil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento contábil será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

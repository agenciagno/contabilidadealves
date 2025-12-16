import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Contacts() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes/Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus contatos comerciais</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Contato
        </Button>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="text-muted-foreground text-center py-16">
          Este módulo será implementado em breve
        </CardContent>
      </Card>
    </div>
  );
}

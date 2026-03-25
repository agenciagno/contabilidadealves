import { Card, CardContent } from '@/components/ui/card';
import { FileBarChart } from 'lucide-react';

export default function DRE() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">DRE - Demonstração do Resultado do Exercício</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão gerencial do resultado operacional</p>
      </div>
      <Card className="bg-card border-border/50">
        <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-4">
          <FileBarChart className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Em construção — a estrutura de Eventos Contábeis hierárquicos está sendo preparada para alimentar este relatório.</p>
        </CardContent>
      </Card>
    </div>
  );
}

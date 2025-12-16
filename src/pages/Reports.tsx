import { Card, CardContent } from '@/components/ui/card';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Analise suas finanças em detalhes</p>
        </div>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="text-muted-foreground text-center py-16">
          Este módulo será implementado em breve
        </CardContent>
      </Card>
    </div>
  );
}

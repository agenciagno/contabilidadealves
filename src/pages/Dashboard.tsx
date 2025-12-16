import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock,
  ArrowUpRight,
  ArrowDownRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions = [
  { label: 'Despesa', icon: TrendingDown, variant: 'destructive' as const },
  { label: 'Receita', icon: TrendingUp, variant: 'default' as const },
  { label: 'Recorrente', icon: Clock, variant: 'outline' as const },
];

const stats = [
  { label: 'Receitas', value: 'R$ 0,00', icon: TrendingUp, color: 'text-success' },
  { label: 'Despesas', value: 'R$ 0,00', icon: TrendingDown, color: 'text-destructive' },
  { label: 'Saldo Atual', value: 'R$ 0,00', icon: Wallet, color: 'text-primary' },
  { label: 'A Receber', value: 'R$ 0,00', icon: ArrowUpRight, color: 'text-success' },
  { label: 'A Pagar', value: 'R$ 0,00', icon: ArrowDownRight, color: 'text-destructive' },
  { label: 'Saldo Previsto', value: 'R$ 0,00', icon: Clock, color: 'text-primary' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>
      </div>

      {/* Acesso Rápido */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Acesso Rápido</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button key={action.label} variant={action.variant} className="gap-2">
              <Plus className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Cards de Estatísticas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Gráficos e Tabelas - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Gráfico será implementado no Módulo 4
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Gráfico será implementado no Módulo 4
          </CardContent>
        </Card>
      </div>

      {/* Próximas Contas e Últimas Movimentações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Próximas Contas</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-center py-8">
            Nenhuma conta pendente
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-center py-8">
            Nenhuma movimentação encontrada
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

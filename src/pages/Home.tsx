import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home as HomeIcon } from 'lucide-react';

const Home = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao seu painel de gestão
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <HomeIcon className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle>Página Inicial</CardTitle>
          <CardDescription>
            Esta página será personalizada com widgets e resumos importantes do seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Em breve você poderá ver aqui:</p>
          <ul className="mt-4 space-y-2">
            <li>• Resumo financeiro do dia</li>
            <li>• Alertas e notificações importantes</li>
            <li>• Atividades recentes</li>
            <li>• Metas e indicadores</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;

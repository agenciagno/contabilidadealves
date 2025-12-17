import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send } from 'lucide-react';

const CrmDispatches = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Disparos</h1>
        <p className="text-muted-foreground">
          Gerencie suas campanhas de WhatsApp e E-mail
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Send className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle>Módulo de Disparos</CardTitle>
          <CardDescription>
            Em breve você poderá enviar mensagens em massa para seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Funcionalidades planejadas:</p>
          <ul className="mt-4 space-y-2">
            <li>• Disparos de WhatsApp</li>
            <li>• Campanhas de E-mail</li>
            <li>• Templates personalizados</li>
            <li>• Agendamento de envios</li>
            <li>• Relatórios de entrega</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmDispatches;

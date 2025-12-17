import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Building2 } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useContactTransactions, useContactFinancialStatus } from '@/hooks/useContactTransactions';
import { ContactFinancialTab } from '@/components/contacts/ContactFinancialTab';
import { ContactDetailsTab } from '@/components/contacts/ContactDetailsTab';

const typeLabels = {
  cliente: { label: 'Cliente', color: 'bg-emerald-500/10 text-emerald-500' },
  fornecedor: { label: 'Fornecedor', color: 'bg-blue-500/10 text-blue-500' },
  ambos: { label: 'Ambos', color: 'bg-purple-500/10 text-purple-500' },
};

const taxRegimeLabels: Record<string, string> = {
  mei: 'MEI',
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  nao_aplica: 'Pessoa Física',
};

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, isLoading: isLoadingContacts } = useContacts();
  const { data: transactions } = useContactTransactions(id);
  
  const contact = contacts.find(c => c.id === id);
  const { isInadimplente } = useContactFinancialStatus(id, transactions);

  if (isLoadingContacts) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/contatos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Contato não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/contatos')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-primary/10 rounded-xl">
            {contact.type === 'fornecedor' ? (
              <Building2 className="h-6 w-6 text-primary" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="secondary" className={typeLabels[contact.type].color}>
                {typeLabels[contact.type].label}
              </Badge>
              {contact.tax_regime && (
                <Badge variant="outline">
                  {taxRegimeLabels[contact.tax_regime]}
                </Badge>
              )}
              <Badge 
                variant={isInadimplente ? 'destructive' : 'secondary'}
                className={!isInadimplente ? 'bg-emerald-500/10 text-emerald-500' : ''}
              >
                {isInadimplente ? 'Inadimplente' : 'Adimplente'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="financeiro" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="financeiro" className="flex-1 sm:flex-none">
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex-1 sm:flex-none">
            Dados Detalhados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="mt-6">
          <ContactFinancialTab contactId={contact.id} />
        </TabsContent>

        <TabsContent value="dados" className="mt-6">
          <ContactDetailsTab contact={contact} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

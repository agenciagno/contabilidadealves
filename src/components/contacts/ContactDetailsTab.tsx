import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, FileText, Building2 } from 'lucide-react';
import { Contact } from '@/hooks/useContacts';

interface ContactDetailsTabProps {
  contact: Contact;
}

const taxRegimeLabels: Record<string, string> = {
  mei: 'MEI',
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  nao_aplica: 'Pessoa Física',
};

export function ContactDetailsTab({ contact }: ContactDetailsTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Informações de Contato */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Informações de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">E-mail</label>
            <p className="text-foreground">{contact.email || 'Não informado'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Telefone</label>
            <p className="text-foreground">{contact.phone || 'Não informado'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">CPF/CNPJ</label>
            <p className="text-foreground">{contact.document || 'Não informado'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Endereço</label>
            <p className="text-foreground">{contact.address || 'Não informado'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cidade</label>
            <p className="text-foreground">{contact.city || 'Não informado'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estado</label>
            <p className="text-foreground">{contact.state || 'Não informado'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Dados Fiscais */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Regime Tributário</label>
            <p className="text-foreground">
              {contact.tax_regime ? taxRegimeLabels[contact.tax_regime] : 'Não informado'}
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <p className="text-foreground">{contact.is_active ? 'Ativo' : 'Inativo'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">
            {contact.notes || 'Nenhuma observação cadastrada'}
          </p>
        </CardContent>
      </Card>

      {/* Sócios - Preparação para expansão futura */}
      <Card className="bg-card border-border/50 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Sócios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Funcionalidade em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

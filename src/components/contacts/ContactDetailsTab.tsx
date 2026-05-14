import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MapPin, FileText, Building2, Pencil } from 'lucide-react';
import { Contact } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { ContactEditSheet } from './ContactEditSheet';

type Section = 'contato' | 'endereco' | 'fiscal' | 'observacoes';

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
  const [editSection, setEditSection] = useState<Section | null>(null);

  const { data: profiles } = useQuery({
    queryKey: ['profiles-active-for-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const responsibleName = contact.responsible_id
    ? profiles?.find((p) => p.id === contact.responsible_id)?.full_name
    : null;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Informações de Contato */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Informações de Contato
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditSection('contato')}>
            <Pencil className="h-4 w-4" />
          </Button>
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
          <div>
            <label className="text-xs text-muted-foreground">Representante Legal</label>
            <p className="text-foreground">{contact.representative_legal || 'Não informado'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditSection('endereco')}>
            <Pencil className="h-4 w-4" />
          </Button>
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
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados Fiscais
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditSection('fiscal')}>
            <Pencil className="h-4 w-4" />
          </Button>
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
          <div>
            <label className="text-xs text-muted-foreground">Colaborador Responsável</label>
            {responsibleName ? (
              <p className="text-foreground">{responsibleName}</p>
            ) : (
              <p className="text-muted-foreground">Não atribuído</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card className="bg-card border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Observações
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setEditSection('observacoes')}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">
            {contact.notes || 'Nenhuma observação cadastrada'}
          </p>
        </CardContent>
      </Card>

      {editSection && (
        <ContactEditSheet
          contact={contact}
          section={editSection}
          open={!!editSection}
          onOpenChange={(open) => !open && setEditSection(null)}
        />
      )}
    </div>
  );
}

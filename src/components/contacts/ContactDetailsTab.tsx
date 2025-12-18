import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Phone, MapPin, FileText, Building2, Users, Plus, Edit2, Trash2, Percent } from 'lucide-react';
import { Contact } from '@/hooks/useContacts';
import { useContactPartners, ContactPartnerInsert } from '@/hooks/useContactPartners';
import { PartnerFormDialog } from './PartnerFormDialog';

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
  const { partners, isLoading: loadingPartners, totalParticipation, createPartner, updatePartner, deletePartner } = useContactPartners(contact.id);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<typeof partners[0] | undefined>();
  const [deletePartnerId, setDeletePartnerId] = useState<string | null>(null);

  const handlePartnerSubmit = (data: ContactPartnerInsert) => {
    if (editingPartner) {
      updatePartner.mutate({ id: editingPartner.id, ...data }, {
        onSuccess: () => {
          setPartnerDialogOpen(false);
          setEditingPartner(undefined);
        },
      });
    } else {
      createPartner.mutate(data, {
        onSuccess: () => setPartnerDialogOpen(false),
      });
    }
  };

  const handleEditPartner = (partner: typeof partners[0]) => {
    setEditingPartner(partner);
    setPartnerDialogOpen(true);
  };

  const handleNewPartner = () => {
    setEditingPartner(undefined);
    setPartnerDialogOpen(true);
  };

  const handleDeletePartner = () => {
    if (deletePartnerId) {
      deletePartner.mutate(deletePartnerId, {
        onSuccess: () => setDeletePartnerId(null),
      });
    }
  };

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
          <div>
            <label className="text-xs text-muted-foreground">Representante Legal</label>
            <p className="text-foreground">{contact.representative_legal || 'Não informado'}</p>
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

      {/* Sócios */}
      <Card className="bg-card border-border/50 md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sócios
            {totalParticipation > 0 && (
              <Badge variant="outline" className="ml-2">
                {totalParticipation.toFixed(1)}% total
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={handleNewPartner} className="gap-1">
            <Plus className="h-4 w-4" />
            Adicionar Sócio
          </Button>
        </CardHeader>
        <CardContent>
          {loadingPartners ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : partners.length > 0 ? (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{partner.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        <Percent className="h-3 w-3 mr-1" />
                        {partner.participation_percentage || 0}%
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      {partner.cpf && <span className="font-mono text-xs">{partner.cpf}</span>}
                      {partner.email && <span>{partner.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEditPartner(partner)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletePartnerId(partner.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Nenhum sócio cadastrado
            </p>
          )}
        </CardContent>
      </Card>

      <PartnerFormDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        partner={editingPartner}
        contactId={contact.id}
        onSubmit={handlePartnerSubmit}
        isLoading={createPartner.isPending || updatePartner.isPending}
      />

      <AlertDialog open={!!deletePartnerId} onOpenChange={() => setDeletePartnerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sócio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O sócio será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePartner} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

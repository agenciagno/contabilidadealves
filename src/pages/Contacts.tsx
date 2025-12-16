import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit2, Trash2, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { useContacts, Contact, ContactInsert } from '@/hooks/useContacts';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';

const typeLabels = {
  cliente: { label: 'Cliente', color: 'bg-emerald-500/10 text-emerald-500' },
  fornecedor: { label: 'Fornecedor', color: 'bg-blue-500/10 text-blue-500' },
  ambos: { label: 'Ambos', color: 'bg-purple-500/10 text-purple-500' },
};

export default function Contacts() {
  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document?.includes(searchTerm);
    const matchesType = filterType === 'all' || c.type === filterType || (filterType === 'ambos' && c.type === 'ambos');
    return matchesSearch && matchesType;
  });

  const activeContacts = filteredContacts.filter((c) => c.is_active);
  const inactiveContacts = filteredContacts.filter((c) => !c.is_active);

  const handleSubmit = (data: ContactInsert) => {
    if (editingContact) {
      updateContact.mutate({ id: editingContact.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingContact(undefined);
        },
      });
    } else {
      createContact.mutate(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteContact.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingContact(undefined);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const ContactCard = ({ contact }: { contact: Contact }) => (
    <Card className={`bg-card border-border/50 ${!contact.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {contact.type === 'fornecedor' ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{contact.name}</h3>
              <Badge variant="secondary" className={typeLabels[contact.type].color}>
                {typeLabels[contact.type].label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(contact.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {contact.document && (
            <p className="truncate">{contact.document}</p>
          )}
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{contact.phone}</span>
            </div>
          )}
          {(contact.city || contact.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span>{[contact.city, contact.state].filter(Boolean).join(' - ')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes/Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus contatos comerciais</p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="w-4 h-4" />
          Novo Contato
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="cliente">Clientes</SelectItem>
            <SelectItem value="fornecedor">Fornecedores</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {contacts.filter(c => c.type === 'cliente' || c.type === 'ambos').length}
            </p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {contacts.filter(c => c.type === 'fornecedor' || c.type === 'ambos').length}
            </p>
            <p className="text-xs text-muted-foreground">Fornecedores</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Contacts */}
      {activeContacts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Contatos Ativos ({activeContacts.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Contacts */}
      {inactiveContacts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Contatos Inativos ({inactiveContacts.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </div>
      )}

      {filteredContacts.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="text-muted-foreground text-center py-16">
            {searchTerm || filterType !== 'all'
              ? 'Nenhum contato encontrado com os filtros aplicados'
              : 'Nenhum contato cadastrado ainda'}
          </CardContent>
        </Card>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSubmit={handleSubmit}
        isLoading={createContact.isPending || updateContact.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contato será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

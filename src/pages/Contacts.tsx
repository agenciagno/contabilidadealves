import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit2, Trash2, User, Mail, Phone, Copy, Eye, Users, AlertTriangle, X, FileText, RefreshCw } from 'lucide-react';
import { useContacts, Contact, ContactInsert } from '@/hooks/useContacts';
import { useTransactions } from '@/hooks/useTransactions';
import { useContactDependencies } from '@/hooks/useContactDependencies';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import { useToast } from '@/hooks/use-toast';
export default function Contacts() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact
  } = useContacts();
  const {
    transactions
  } = useTransactions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFinancialStatus, setFilterFinancialStatus] = useState('all');

  // Handle navigation state for automatic filter
  useEffect(() => {
    if (location.state?.filterStatus === 'inadimplente') {
      setFilterFinancialStatus('inadimplente');
      // Clear the state to prevent re-applying on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Get dependencies for delete confirmation
  const {
    data: dependencies,
    isLoading: loadingDependencies
  } = useContactDependencies(deleteId);

  // Get financial status for each contact
  const getFinancialStatus = (contactId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const contactTransactions = transactions.filter(t => t.contact_id === contactId);
    const hasOverdue = contactTransactions.some(t => !t.is_paid && t.due_date && t.due_date < today);
    return {
      isInadimplente: hasOverdue
    };
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = contacts.length;
    let adimplentes = 0;
    let inadimplentes = 0;
    contacts.forEach(contact => {
      const {
        isInadimplente
      } = getFinancialStatus(contact.id);
      if (isInadimplente) {
        inadimplentes++;
      } else {
        adimplentes++;
      }
    });
    return {
      total,
      adimplentes,
      inadimplentes
    };
  }, [contacts, transactions]);
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.document?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesFinancialStatus = true;
      if (filterFinancialStatus !== 'all') {
        const {
          isInadimplente
        } = getFinancialStatus(c.id);
        matchesFinancialStatus = filterFinancialStatus === 'inadimplente' ? isInadimplente : !isInadimplente;
      }
      return matchesSearch && matchesFinancialStatus;
    });
  }, [contacts, searchTerm, filterFinancialStatus, transactions]);
  const activeContacts = filteredContacts.filter(c => c.is_active);
  const inactiveContacts = filteredContacts.filter(c => !c.is_active);
  const hasActiveFilters = searchTerm || filterFinancialStatus !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setFilterFinancialStatus('all');
  };
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${label} copiado!`,
        duration: 2000
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        variant: 'destructive'
      });
    }
  };
  const handleSubmit = (data: ContactInsert) => {
    if (editingContact) {
      updateContact.mutate({
        id: editingContact.id,
        originalContact: editingContact,
        ...data
      }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingContact(undefined);
        }
      });
    } else {
      createContact.mutate(data, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };
  const handleDelete = () => {
    if (deleteId) {
      deleteContact.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
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
    return <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>;
  }
  const ContactCard = ({
    contact
  }: {
    contact: Contact;
  }) => {
    const {
      isInadimplente
    } = getFinancialStatus(contact.id);
    return <Card className={`bg-card border-border/50 ${!contact.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <User className="h-5 w-5 text-primary" />
              </div>
              <button 
                onClick={() => copyToClipboard(contact.name, 'Nome')} 
                className="group flex items-center gap-2 hover:text-primary transition-colors text-left"
              >
                <h3 className="font-semibold text-foreground">{contact.name}</h3>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
              </button>
            </div>
            <div 
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isInadimplente ? 'bg-destructive' : 'bg-emerald-500'}`}
              title={isInadimplente ? 'Inadimplente' : 'Adimplente'}
            />
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {contact.document && (
              <button 
                onClick={() => copyToClipboard(contact.document!, 'CPF/CNPJ')} 
                className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1 font-mono text-xs">{contact.document}</span>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}
            {contact.phone && (
              <button 
                onClick={() => copyToClipboard(contact.phone!, 'Telefone')} 
                className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
              >
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1">{contact.phone}</span>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}
            {contact.email && (
              <button 
                onClick={() => copyToClipboard(contact.email!, 'E-mail')} 
                className="group flex items-center gap-2 w-full hover:text-primary transition-colors text-left"
              >
                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate flex-1">{contact.email}</span>
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/crm/cliente/${contact.id}`)}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Perfil
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteId(contact.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>;
  };
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cliente/Fornecedor</h1>
          
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="w-4 h-4" />
          Novo Cliente/Fornecedor
        </Button>
      </div>

      {/* Compact Filters Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou CNPJ..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="pl-9 h-9 bg-background/50 border-border/50" 
          />
        </div>
        
        <Select value={filterFinancialStatus} onValueChange={setFilterFinancialStatus}>
          <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="adimplente">Adimplentes</SelectItem>
            <SelectItem value="inadimplente">Inadimplentes</SelectItem>
          </SelectContent>
        </Select>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
        
        <div className="h-5 w-px bg-border/50 hidden sm:block" />
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{summaryStats.total}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{summaryStats.adimplentes}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span>{summaryStats.inadimplentes}</span>
          </span>
        </div>
      </div>

      {/* Active Contacts */}
      {activeContacts.length > 0 && <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Ativos ({activeContacts.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeContacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}
          </div>
        </div>}

      {/* Inactive Contacts */}
      {inactiveContacts.length > 0 && <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Inativos ({inactiveContacts.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveContacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}
          </div>
        </div>}

      {filteredContacts.length === 0 && <Card className="bg-card border-border/50">
          <CardContent className="text-muted-foreground text-center py-16">
            {hasActiveFilters ? 'Nenhum cliente/fornecedor encontrado com os filtros aplicados' : 'Nenhum cliente/fornecedor cadastrado ainda'}
          </CardContent>
        </Card>}

      <ContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editingContact} onSubmit={handleSubmit} isLoading={createContact.isPending || updateContact.isPending} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente/fornecedor?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação não pode ser desfeita. O cliente/fornecedor será removido permanentemente.</p>
                
                {loadingDependencies ? <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verificando vínculos...
                  </div> : dependencies?.hasDependencies && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                    <p className="font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Atenção: Este contato possui vínculos
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      {dependencies.transactionCount > 0 && <li className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          {dependencies.transactionCount} transação(ões) financeira(s)
                        </li>}
                      {dependencies.recurringCount > 0 && <li className="flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5" />
                          {dependencies.recurringCount} conta(s) recorrente(s)
                        </li>}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Ao excluir, os registros vinculados permanecerão sem associação a este contato.
                    </p>
                  </div>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" disabled={loadingDependencies}>
              {dependencies?.hasDependencies ? 'Excluir mesmo assim' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}
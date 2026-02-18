import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAuditLog, getFieldChanges } from '@/hooks/useAuditLog';
import { createGlobalLog } from '@/hooks/useGlobalLogs';

export type TaxRegime = 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'nao_aplica';

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  type: 'cliente' | 'fornecedor' | 'ambos';
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  tax_regime: TaxRegime | null;
  is_active: boolean;
  representative_legal: string | null;
  boleto_active: boolean;
  boleto_value: number | null;
  boleto_due_day: number | null;
  boleto_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ContactInsert = Omit<Contact, 'id' | 'company_id' | 'created_at' | 'updated_at'>;
export type ContactUpdate = Partial<ContactInsert>;

export function useContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Contact[];
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });

  const createContact = useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;
      
      const typeLabel = contact.type === 'cliente' ? 'Cliente' : contact.type === 'fornecedor' ? 'Fornecedor' : 'Cliente/Fornecedor';
      await createGlobalLog({
        action: 'ADICAO',
        module: 'CRM',
        entityId: data.id,
        entityName: contact.name,
        details: `${typeLabel} "${contact.name}" cadastrado`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['global-logs'] });
      toast({ title: 'Cliente/Fornecedor criado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar cliente/fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, originalContact, ...updates }: ContactUpdate & { id: string; originalContact?: Contact }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log for cadastral changes
      if (originalContact) {
        const fieldLabels: Record<string, string> = {
          name: 'Nome',
          document: 'CPF/CNPJ',
          tax_regime: 'Regime Tributário',
          email: 'E-mail',
          phone: 'Telefone',
          address: 'Endereço',
          city: 'Cidade',
          state: 'Estado',
          representative_legal: 'Representante Legal',
          type: 'Tipo',
          is_active: 'Status',
        };

        const taxRegimeLabels: Record<string, string> = {
          mei: 'MEI',
          simples_nacional: 'Simples Nacional',
          lucro_presumido: 'Lucro Presumido',
          lucro_real: 'Lucro Real',
          nao_aplica: 'Pessoa Física',
        };

        // Map tax regime values to labels for better readability
        const mappedOldData = {
          ...originalContact,
          tax_regime: originalContact.tax_regime ? taxRegimeLabels[originalContact.tax_regime] || originalContact.tax_regime : '',
          is_active: originalContact.is_active ? 'Ativo' : 'Inativo',
        };
        const mappedNewData = {
          ...updates,
          tax_regime: updates.tax_regime ? taxRegimeLabels[updates.tax_regime] || updates.tax_regime : '',
          is_active: updates.is_active !== undefined ? (updates.is_active ? 'Ativo' : 'Inativo') : mappedOldData.is_active,
        };

        const changes = getFieldChanges(mappedOldData, mappedNewData, fieldLabels);

        if (changes.length > 0) {
          await createAuditLog({
            contactId: id,
            action: 'CADASTRO_ALTERADO',
            description: changes.join('; '),
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['contact-logs'] });
      toast({ title: 'Cliente/Fornecedor atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar cliente/fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Sync transactions view
      toast({ title: 'Cliente/Fornecedor excluído!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir cliente/fornecedor', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    contacts,
    isLoading,
    error,
    createContact,
    updateContact,
    deleteContact,
    toggleActive,
  };
}

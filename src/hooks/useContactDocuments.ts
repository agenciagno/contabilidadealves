import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactDocument {
  id: string;
  company_id: string;
  contact_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

export function useContactDocuments(contactId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['contact-documents', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_documents')
        .select('*')
        .eq('contact_id', contactId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as ContactDocument[];
    },
    enabled: !!contactId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, contactId }: { file: File; contactId: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${contactId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contact-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contact-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { data, error } = await supabase
        .from('contact_documents')
        .insert({
          company_id: profile.company_id,
          contact_id: contactId,
          file_name: file.name,
          file_url: fileName,
          file_type: fileExt?.toUpperCase() || null,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-documents', contactId] });
      toast({
        title: 'Documento enviado',
        description: 'O arquivo foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar documento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (document: ContactDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contact-documents')
        .remove([document.file_url]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete record
      const { error } = await supabase
        .from('contact_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-documents', contactId] });
      toast({
        title: 'Documento excluído',
        description: 'O arquivo foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const downloadDocument = async (document: ContactDocument) => {
    const { data, error } = await supabase.storage
      .from('contact-documents')
      .download(document.file_url);

    if (error) {
      toast({
        title: 'Erro ao baixar documento',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.file_name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  };
}

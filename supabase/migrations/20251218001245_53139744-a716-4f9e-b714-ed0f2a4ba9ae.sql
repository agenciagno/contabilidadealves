-- Create contact_messages table for communication logs
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  message TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'falhou', 'pendente')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contact_documents table for document management
CREATE TABLE public.contact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their company"
ON public.contact_messages FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create messages for their company"
ON public.contact_messages FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update messages from their company"
ON public.contact_messages FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete messages from their company"
ON public.contact_messages FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Enable RLS on contact_documents
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents from their company"
ON public.contact_documents FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create documents for their company"
ON public.contact_documents FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update documents from their company"
ON public.contact_documents FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete documents from their company"
ON public.contact_documents FOR DELETE
USING (company_id = get_user_company_id(auth.uid()));

-- Create storage bucket for contact documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-documents', 'contact-documents', false);

-- Storage policies for contact-documents bucket
CREATE POLICY "Users can view their company documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contact-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contact-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contact-documents' AND auth.uid() IS NOT NULL);
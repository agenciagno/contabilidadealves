-- Create contact_notes table for managing notes on client profiles
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_logs table for tracking profile changes
CREATE TABLE public.contact_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_notes
CREATE POLICY "Users can view notes from their company" 
ON public.contact_notes 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create notes for their company" 
ON public.contact_notes 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update notes from their company" 
ON public.contact_notes 
FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete notes from their company" 
ON public.contact_notes 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));

-- RLS policies for contact_logs
CREATE POLICY "Users can view logs from their company" 
ON public.contact_logs 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create logs for their company" 
ON public.contact_logs 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id);
CREATE INDEX idx_contact_notes_company_id ON public.contact_notes(company_id);
CREATE INDEX idx_contact_logs_contact_id ON public.contact_logs(contact_id);
CREATE INDEX idx_contact_logs_company_id ON public.contact_logs(company_id);
-- Add representative_legal field to contacts table
ALTER TABLE public.contacts 
ADD COLUMN representative_legal character varying NULL;

-- Create contact_partners table for managing partners
CREATE TABLE public.contact_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  name character varying NOT NULL,
  cpf character varying NULL,
  email character varying NULL,
  participation_percentage numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_partners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_partners
CREATE POLICY "Users can view partners from their company" 
ON public.contact_partners 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create partners for their company" 
ON public.contact_partners 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update partners from their company" 
ON public.contact_partners 
FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete partners from their company" 
ON public.contact_partners 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_contact_partners_contact_id ON public.contact_partners(contact_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contact_partners_updated_at
BEFORE UPDATE ON public.contact_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
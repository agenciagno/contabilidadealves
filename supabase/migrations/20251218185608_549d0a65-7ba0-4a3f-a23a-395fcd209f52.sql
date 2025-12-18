-- Create global logs table for system-wide audit trail
CREATE TABLE public.global_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  action text NOT NULL,
  module text NOT NULL,
  entity_id uuid,
  entity_name text,
  details text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_global_logs_company_id ON public.global_logs(company_id);
CREATE INDEX idx_global_logs_created_at ON public.global_logs(created_at DESC);
CREATE INDEX idx_global_logs_module ON public.global_logs(module);
CREATE INDEX idx_global_logs_user_id ON public.global_logs(user_id);

-- Enable Row Level Security
ALTER TABLE public.global_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view logs from their company" 
ON public.global_logs 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create logs for their company" 
ON public.global_logs 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));
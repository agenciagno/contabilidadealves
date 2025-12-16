-- Add contact_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_transactions_contact ON public.transactions(contact_id);

-- Add contact_id to recurring_transactions table
ALTER TABLE public.recurring_transactions
ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create index for recurring transactions
CREATE INDEX idx_recurring_transactions_contact ON public.recurring_transactions(contact_id);
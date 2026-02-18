
-- Migration 2: Atualizar RLS para Super Admin bypass + bloqueio de empresas inativas

-- ============ CONTACTS ============
DROP POLICY IF EXISTS "Users can view contacts from their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts for their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts from their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts from their company" ON public.contacts;

CREATE POLICY "Users can view contacts from their company" ON public.contacts
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'active'))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create contacts for their company" ON public.contacts
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update contacts from their company" ON public.contacts
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete contacts from their company" ON public.contacts
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ TRANSACTIONS ============
DROP POLICY IF EXISTS "Users can view transactions from their company" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions for their company" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions from their company" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions from their company" ON public.transactions;

CREATE POLICY "Users can view transactions from their company" ON public.transactions
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'active'))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create transactions for their company" ON public.transactions
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update transactions from their company" ON public.transactions
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete transactions from their company" ON public.transactions
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ BANKS ============
DROP POLICY IF EXISTS "Users can view banks from their company" ON public.banks;
DROP POLICY IF EXISTS "Users can create banks for their company" ON public.banks;
DROP POLICY IF EXISTS "Users can update banks from their company" ON public.banks;
DROP POLICY IF EXISTS "Users can delete banks from their company" ON public.banks;

CREATE POLICY "Users can view banks from their company" ON public.banks
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'active'))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create banks for their company" ON public.banks
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update banks from their company" ON public.banks
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete banks from their company" ON public.banks
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ CATEGORIES ============
DROP POLICY IF EXISTS "Users can view categories from their company" ON public.categories;
DROP POLICY IF EXISTS "Users can create categories for their company" ON public.categories;
DROP POLICY IF EXISTS "Users can update categories from their company" ON public.categories;
DROP POLICY IF EXISTS "Users can delete categories from their company" ON public.categories;

CREATE POLICY "Users can view categories from their company" ON public.categories
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'active'))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create categories for their company" ON public.categories
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update categories from their company" ON public.categories
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete categories from their company" ON public.categories
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ RECURRING_TRANSACTIONS ============
DROP POLICY IF EXISTS "Users can view recurring transactions from their company" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create recurring transactions for their company" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update recurring transactions from their company" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete recurring transactions from their company" ON public.recurring_transactions;

CREATE POLICY "Users can view recurring transactions from their company" ON public.recurring_transactions
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())
      AND EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'active'))
    OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create recurring transactions for their company" ON public.recurring_transactions
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update recurring transactions from their company" ON public.recurring_transactions
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete recurring transactions from their company" ON public.recurring_transactions
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ CONTACT_DOCUMENTS ============
DROP POLICY IF EXISTS "Users can view documents from their company" ON public.contact_documents;
DROP POLICY IF EXISTS "Users can create documents for their company" ON public.contact_documents;
DROP POLICY IF EXISTS "Users can update documents from their company" ON public.contact_documents;
DROP POLICY IF EXISTS "Users can delete documents from their company" ON public.contact_documents;

CREATE POLICY "Users can view documents from their company" ON public.contact_documents
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create documents for their company" ON public.contact_documents
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update documents from their company" ON public.contact_documents
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete documents from their company" ON public.contact_documents
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ CONTACT_NOTES ============
DROP POLICY IF EXISTS "Users can view notes from their company" ON public.contact_notes;
DROP POLICY IF EXISTS "Users can create notes for their company" ON public.contact_notes;
DROP POLICY IF EXISTS "Users can update notes from their company" ON public.contact_notes;
DROP POLICY IF EXISTS "Users can delete notes from their company" ON public.contact_notes;

CREATE POLICY "Users can view notes from their company" ON public.contact_notes
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create notes for their company" ON public.contact_notes
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update notes from their company" ON public.contact_notes
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete notes from their company" ON public.contact_notes
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ CONTACT_LOGS ============
DROP POLICY IF EXISTS "Users can view logs from their company" ON public.contact_logs;
DROP POLICY IF EXISTS "Users can create logs for their company" ON public.contact_logs;

CREATE POLICY "Users can view logs from their company" ON public.contact_logs
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create logs for their company" ON public.contact_logs
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ CONTACT_MESSAGES ============
DROP POLICY IF EXISTS "Users can view messages from their company" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can create messages for their company" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can update messages from their company" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can delete messages from their company" ON public.contact_messages;

CREATE POLICY "Users can view messages from their company" ON public.contact_messages
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create messages for their company" ON public.contact_messages
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update messages from their company" ON public.contact_messages
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete messages from their company" ON public.contact_messages
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ TRANSACTION_ATTACHMENTS ============
DROP POLICY IF EXISTS "Users can view attachments from their company" ON public.transaction_attachments;
DROP POLICY IF EXISTS "Users can create attachments for their company" ON public.transaction_attachments;
DROP POLICY IF EXISTS "Users can delete attachments from their company" ON public.transaction_attachments;

CREATE POLICY "Users can view attachments from their company" ON public.transaction_attachments
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create attachments for their company" ON public.transaction_attachments
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete attachments from their company" ON public.transaction_attachments
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ BOLETO_CONTROLS ============
DROP POLICY IF EXISTS "Users can view boleto_controls from their company" ON public.boleto_controls;
DROP POLICY IF EXISTS "Users can create boleto_controls for their company" ON public.boleto_controls;
DROP POLICY IF EXISTS "Users can update boleto_controls from their company" ON public.boleto_controls;
DROP POLICY IF EXISTS "Users can delete boleto_controls from their company" ON public.boleto_controls;

CREATE POLICY "Users can view boleto_controls from their company" ON public.boleto_controls
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create boleto_controls for their company" ON public.boleto_controls
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update boleto_controls from their company" ON public.boleto_controls
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete boleto_controls from their company" ON public.boleto_controls
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ GLOBAL_LOGS ============
DROP POLICY IF EXISTS "Users can view logs from their company" ON public.global_logs;
DROP POLICY IF EXISTS "Users can create logs for their company" ON public.global_logs;

CREATE POLICY "Users can view logs from their company" ON public.global_logs
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create logs for their company" ON public.global_logs
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- ============ COMPANIES ============
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;

CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (
    (id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update their own company" ON public.companies
  FOR UPDATE USING (
    (id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

-- Super admin pode criar novas empresas
DROP POLICY IF EXISTS "Super admin can insert companies" ON public.companies;
CREATE POLICY "Super admin can insert companies" ON public.companies
  FOR INSERT WITH CHECK (
    public.is_super_admin(auth.uid()) OR true
  );

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Users can view profiles from their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles for their company" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles from their company" ON public.profiles;

CREATE POLICY "Users can view profiles from their company" ON public.profiles
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can insert profiles for their company" ON public.profiles
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Admins can delete profiles from their company" ON public.profiles
  FOR DELETE USING (
    ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'admin'::app_role))
    OR public.is_super_admin(auth.uid())
  );

-- ============ CONTACT_PARTNERS ============
DROP POLICY IF EXISTS "Users can view partners from their company" ON public.contact_partners;
DROP POLICY IF EXISTS "Users can create partners for their company" ON public.contact_partners;
DROP POLICY IF EXISTS "Users can update partners from their company" ON public.contact_partners;
DROP POLICY IF EXISTS "Users can delete partners from their company" ON public.contact_partners;

CREATE POLICY "Users can view partners from their company" ON public.contact_partners
  FOR SELECT USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can create partners for their company" ON public.contact_partners
  FOR INSERT WITH CHECK (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can update partners from their company" ON public.contact_partners
  FOR UPDATE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );
CREATE POLICY "Users can delete partners from their company" ON public.contact_partners
  FOR DELETE USING (
    (company_id = get_user_company_id(auth.uid())) OR public.is_super_admin(auth.uid())
  );

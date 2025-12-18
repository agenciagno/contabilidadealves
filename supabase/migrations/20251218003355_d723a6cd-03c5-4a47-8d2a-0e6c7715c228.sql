-- Add category column to contact_documents
ALTER TABLE contact_documents 
ADD COLUMN category VARCHAR DEFAULT 'atos_constitutivos';

-- Add check constraint for valid categories
ALTER TABLE contact_documents 
ADD CONSTRAINT contact_documents_category_check 
CHECK (category IN (
  'atos_constitutivos', 
  'impostos_guias', 
  'fiscal', 
  'dp_rh', 
  'certidoes'
));

-- Create index for performance on category filtering
CREATE INDEX idx_contact_documents_category ON contact_documents(category);
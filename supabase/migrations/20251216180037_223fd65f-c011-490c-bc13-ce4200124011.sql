-- Add columns for weekly frequency details
ALTER TABLE recurring_transactions 
ADD COLUMN IF NOT EXISTS times_per_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS days_of_week TEXT DEFAULT NULL;
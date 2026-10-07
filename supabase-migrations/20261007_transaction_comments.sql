-- Persist the optional "Notas" field from the transaction form.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS comments TEXT;

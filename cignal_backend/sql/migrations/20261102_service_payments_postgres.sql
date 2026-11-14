-- CignalCare+ Service Payment Recording (Supabase PostgreSQL setup)
-- NON-DESTRUCTIVE: for a fresh database only; live Supabase already has this.
-- Matches the audited live column types, constraints, and relevant indexes.
-- For a brand-new project, create users and technician_requests first.

CREATE TABLE IF NOT EXISTS public.service_payments (
  id BIGSERIAL PRIMARY KEY,
  reference_no VARCHAR(50) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(80) NOT NULL CHECK (service_type IN (
    'Signal / Dish Repair', 'Dish Realignment', 'Cable Replacement',
    'Box Replacement', 'New Installation', 'Relocation', 'Other'
  )),
  description VARCHAR(500),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 1 AND amount <= 1000000),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('Cash', 'GCash')),
  external_reference VARCHAR(120),
  technician_request_id INTEGER REFERENCES public.technician_requests(id) ON DELETE SET NULL,
  processed_by VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_payments_day
  ON public.service_payments (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_payments_user
  ON public.service_payments (user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_payments_technician_request_id
  ON public.service_payments (technician_request_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_gcash_external_reference
  ON public.service_payments (external_reference)
  WHERE payment_method = 'GCash' AND external_reference IS NOT NULL;

-- Client-facing Data API access remains denied; Express handles authorization.
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_payments FROM anon, authenticated;

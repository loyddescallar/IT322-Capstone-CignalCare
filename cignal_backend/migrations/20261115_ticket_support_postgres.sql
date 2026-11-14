-- Operator-controlled migration. Back up the database and test in staging first.
-- Run using a privileged SQL migration session; NEVER from an ordinary HTTP request.
BEGIN;
CREATE TABLE IF NOT EXISTS ticket_support_details (
 ticket_id BIGINT PRIMARY KEY,
 report_group VARCHAR(60), issue_code VARCHAR(80), issue_label VARCHAR(150),
 diagnostics_json TEXT, receiver_model VARCHAR(100), receiver_code VARCHAR(40),
 contact_phone VARCHAR(32), alternative_phone VARCHAR(32), contact_email VARCHAR(254),
 preferred_contact VARCHAR(12), sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
 email_opt_in BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ticket_support_calls (
 id VARCHAR(36) PRIMARY KEY, request_key VARCHAR(64) NOT NULL UNIQUE, ticket_id BIGINT NOT NULL, admin_id BIGINT NOT NULL,
 outcome VARCHAR(30) NOT NULL, contact_number VARCHAR(32), admin_notes TEXT,
 subscriber_message TEXT NOT NULL, callback_at TIMESTAMP NULL,
 marked_resolved BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_support_calls_ticket ON ticket_support_calls (ticket_id,created_at);
CREATE TABLE IF NOT EXISTS ticket_support_deliveries (
 id VARCHAR(36) PRIMARY KEY, ticket_id BIGINT NOT NULL, event_key VARCHAR(180) NOT NULL UNIQUE,
 channel VARCHAR(12) NOT NULL, recipient_masked VARCHAR(40), state VARCHAR(20) NOT NULL,
 provider_reference VARCHAR(160), error_summary VARCHAR(200), created_at TIMESTAMP NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_ticket_support_deliveries_ticket ON ticket_support_deliveries (ticket_id,created_at);
-- Security: all three tables contain private customer contacts and/or call records.
-- The existing Express backend accesses PostgreSQL directly. These tables must
-- never be readable or writable through a public/anon Supabase Data API role.
ALTER TABLE public.ticket_support_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_support_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_support_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ticket_support_details, public.ticket_support_calls,
  public.ticket_support_deliveries FROM PUBLIC, anon, authenticated;
COMMIT;

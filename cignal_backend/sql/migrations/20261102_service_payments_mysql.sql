-- CignalCare+ Service Payment Recording (LOCAL MySQL / MariaDB setup)
-- NON-DESTRUCTIVE: table creation is skipped if the table already exists.
-- Business rules: admin records completed paid services; service revenue never
-- receives prepaid-load validity or the fixed PHP 40 prepaid-load profit.
-- New local database setup only. Review first; do not import on production.

CREATE TABLE IF NOT EXISTS service_payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  reference_no VARCHAR(50) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  user_id INT NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(80) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  external_reference VARCHAR(120) DEFAULT NULL,
  technician_request_id INT DEFAULT NULL,
  processed_by VARCHAR(255) NOT NULL,
  transaction_date DATE NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_payment_reference_no (reference_no),
  UNIQUE KEY uq_service_gcash_external_reference (external_reference),
  KEY idx_service_payments_day (transaction_date),
  KEY idx_service_payments_user (user_id, transaction_date),
  KEY idx_service_payments_technician_request_id (technician_request_id),
  CONSTRAINT fk_service_payments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_service_payments_technician_request FOREIGN KEY (technician_request_id) REFERENCES technician_requests (id) ON DELETE SET NULL,
  CONSTRAINT chk_service_payment_amount CHECK (amount >= 1 AND amount <= 1000000),
  CONSTRAINT chk_service_payment_method CHECK (payment_method IN ('Cash', 'GCash')),
  CONSTRAINT chk_service_payment_type CHECK (service_type IN (
    'Signal / Dish Repair', 'Dish Realignment', 'Cable Replacement',
    'Box Replacement', 'New Installation', 'Relocation', 'Other'
  )),
  CONSTRAINT chk_service_payment_gc_ref CHECK (
    (payment_method = 'Cash' AND external_reference IS NULL)
    OR (payment_method = 'GCash' AND external_reference IS NOT NULL AND CHAR_LENGTH(TRIM(external_reference)) > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

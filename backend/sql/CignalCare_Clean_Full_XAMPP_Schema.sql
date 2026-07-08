-- =========================================================
-- CignalCare+ Clean Full XAMPP Schema
-- Project: Subscriber Support, Transaction, and Records Management System
-- Database target: cignal_system
-- Recommended use: backup old cignal_system first, then import this in phpMyAdmin/XAMPP.
-- Compatible with MariaDB 10.4+ / MySQL 8+
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `cignal_system`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cignal_system`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `service_history`;
DROP TABLE IF EXISTS `archive_records`;
DROP TABLE IF EXISTS `import_batches`;
DROP TABLE IF EXISTS `validation_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `load_history`;
DROP TABLE IF EXISTS `load_requests`;
DROP TABLE IF EXISTS `prepaid_transactions`;
DROP TABLE IF EXISTS `prepaid_accounts`;
DROP TABLE IF EXISTS `prepaid_plans`;
DROP TABLE IF EXISTS `ticket_messages`;
DROP TABLE IF EXISTS `technician_requests`;
DROP TABLE IF EXISTS `tickets`;
DROP TABLE IF EXISTS `troubleshoot_steps`;
DROP TABLE IF EXISTS `troubleshoot_issues`;
DROP TABLE IF EXISTS `troubleshoot_models`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- USERS / SUBSCRIBERS / ADMIN
-- =========================================================
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `accountName` VARCHAR(100) NOT NULL,
  `accountNumber` VARCHAR(50) NOT NULL,
  `ccaNumber` VARCHAR(50) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `location` ENUM('Balayan','Calaca','Lian','Calatagan','Nasugbu','Lemery') NOT NULL DEFAULT 'Balayan',
  `email` VARCHAR(150) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `role` ENUM('user','admin') NOT NULL DEFAULT 'user',
  `status` ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_accountNumber` (`accountNumber`),
  UNIQUE KEY `idx_users_ccaNumber` (`ccaNumber`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_location` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- PREPAID PLANS / POS MODULE
-- =========================================================
CREATE TABLE `prepaid_plans` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `plan_code` VARCHAR(50) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `validity_days` INT(11) NOT NULL DEFAULT 30,
  `hd_channels` INT(11) DEFAULT 0,
  `sd_channels` INT(11) DEFAULT 0,
  `benefits_text` TEXT DEFAULT NULL,
  `ai_note` TEXT DEFAULT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prepaid_plan_code` (`plan_code`),
  KEY `idx_prepaid_plans_status` (`status`),
  KEY `idx_prepaid_plans_amount` (`amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `prepaid_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `current_plan_id` INT(11) DEFAULT NULL,
  `last_transaction_id` INT(11) DEFAULT NULL,
  `last_load_amount` DECIMAL(10,2) DEFAULT 0.00,
  `last_load_date` DATETIME DEFAULT NULL,
  `expiry_date` DATETIME DEFAULT NULL,
  `status` ENUM('active','expired','inactive') NOT NULL DEFAULT 'inactive',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prepaid_account_number` (`account_number`),
  KEY `idx_prepaid_accounts_user` (`user_id`),
  KEY `idx_prepaid_accounts_plan` (`current_plan_id`),
  KEY `idx_prepaid_accounts_status` (`status`),
  CONSTRAINT `fk_prepaid_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prepaid_accounts_plan` FOREIGN KEY (`current_plan_id`) REFERENCES `prepaid_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `prepaid_transactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(100) NOT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `plan_id` INT(11) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `processed_by` VARCHAR(100) NOT NULL,
  `transaction_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `validity_days` INT(11) NOT NULL DEFAULT 30,
  `expiry_date` DATETIME NOT NULL,
  `status` ENUM('completed','pending','failed','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prepaid_transactions_reference` (`reference_no`),
  KEY `idx_prepaid_tx_user` (`user_id`),
  KEY `idx_prepaid_tx_plan` (`plan_id`),
  KEY `idx_prepaid_tx_account` (`account_number`),
  KEY `idx_prepaid_tx_date` (`transaction_date`),
  KEY `idx_prepaid_tx_status` (`status`),
  CONSTRAINT `fk_prepaid_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_prepaid_transactions_plan` FOREIGN KEY (`plan_id`) REFERENCES `prepaid_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- REMOTE PREPAID LOAD REQUESTS
-- =========================================================
CREATE TABLE `load_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL DEFAULT 'GCash',
  `reference_no` VARCHAR(100) NOT NULL,
  `receipt_photo` LONGTEXT DEFAULT NULL,
  `screen_photo` LONGTEXT DEFAULT NULL,
  `diagnostic_result` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('Received','Under Review','Attending','Completed','Rejected') NOT NULL DEFAULT 'Received',
  `location` VARCHAR(100) DEFAULT 'Balayan',
  `admin_note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_load_reference` (`reference_no`),
  KEY `idx_load_requests_user` (`user_id`),
  KEY `idx_load_requests_account` (`account_number`),
  KEY `idx_load_requests_status` (`status`),
  KEY `idx_load_requests_created` (`created_at`),
  CONSTRAINT `fk_load_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `load_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `accountNumber` VARCHAR(50) NOT NULL,
  `loadAmount` DECIMAL(10,2) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'completed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_load_history_user` (`user_id`),
  KEY `idx_load_history_account` (`accountNumber`),
  KEY `idx_load_history_created` (`created_at`),
  CONSTRAINT `fk_load_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TICKETS / SUPPORT
-- =========================================================
CREATE TABLE `tickets` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `subject` TEXT NOT NULL,
  `ai_tag` VARCHAR(100) DEFAULT NULL,
  `priority` ENUM('Low','Normal','High','Urgent') NOT NULL DEFAULT 'Normal',
  `status` ENUM('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tickets_user` (`user_id`),
  KEY `idx_tickets_status` (`status`),
  KEY `idx_tickets_category` (`category`),
  KEY `idx_tickets_created` (`created_at`),
  CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ticket_messages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` INT(11) NOT NULL,
  `sender_id` INT(11) NOT NULL,
  `sender_role` ENUM('user','admin') NOT NULL,
  `message` TEXT DEFAULT NULL,
  `attachment` VARCHAR(255) DEFAULT NULL,
  `attachment_type` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_messages_ticket` (`ticket_id`),
  KEY `idx_ticket_messages_sender` (`sender_id`),
  KEY `idx_ticket_messages_created` (`created_at`),
  CONSTRAINT `fk_ticket_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TECHNICIAN / REPAIR REQUESTS
-- =========================================================
CREATE TABLE `technician_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `accountNumber` VARCHAR(50) NOT NULL,
  `contactName` VARCHAR(100) NOT NULL,
  `contactPhone` VARCHAR(30) NOT NULL,
  `issueDescription` TEXT NOT NULL,
  `preferred_date` DATE DEFAULT NULL,
  `preferred_time` TIME DEFAULT NULL,
  `technician_name` VARCHAR(100) DEFAULT NULL,
  `admin_note` TEXT DEFAULT NULL,
  `status` ENUM('Pending','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_technician_user` (`user_id`),
  KEY `idx_technician_account` (`accountNumber`),
  KEY `idx_technician_status` (`status`),
  CONSTRAINT `fk_technician_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TROUBLESHOOTING KNOWLEDGE BASE
-- =========================================================
CREATE TABLE `troubleshoot_models` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `troubleshoot_issues` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `model_id` INT(11) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `error_code` VARCHAR(50) DEFAULT NULL,
  `suggested_tag` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_troubleshoot_issues_model` (`model_id`),
  CONSTRAINT `fk_troubleshoot_issue_model` FOREIGN KEY (`model_id`) REFERENCES `troubleshoot_models` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `troubleshoot_steps` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `issue_id` INT(11) NOT NULL,
  `step_number` INT(11) NOT NULL,
  `instruction` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_troubleshoot_steps_issue` (`issue_id`),
  CONSTRAINT `fk_troubleshoot_step_issue` FOREIGN KEY (`issue_id`) REFERENCES `troubleshoot_issues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE `notifications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `account_number` VARCHAR(50) DEFAULT NULL,
  `type` VARCHAR(50) DEFAULT 'info',
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `related_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- VALIDATION LOGS
-- =========================================================
CREATE TABLE `validation_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `field` VARCHAR(50) NOT NULL,
  `input_value` VARCHAR(255) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- IMPORT / ARCHIVE / SERVICE HISTORY
-- =========================================================
CREATE TABLE `import_batches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(255) NOT NULL,
  `import_type` VARCHAR(100) NOT NULL,
  `total_rows` INT(11) DEFAULT 0,
  `successful_rows` INT(11) DEFAULT 0,
  `failed_rows` INT(11) DEFAULT 0,
  `uploaded_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_import_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `archive_records` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `source_table` VARCHAR(100) NOT NULL,
  `source_id` INT(11) NOT NULL,
  `archive_reason` VARCHAR(255) DEFAULT NULL,
  `record_snapshot` LONGTEXT DEFAULT NULL,
  `archived_by` INT(11) DEFAULT NULL,
  `archived_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_archive_by` FOREIGN KEY (`archived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `service_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `account_number` VARCHAR(50) DEFAULT NULL,
  `record_type` ENUM('ticket','technician_request','load_request','pos_transaction','manual_note') NOT NULL,
  `record_id` INT(11) DEFAULT NULL,
  `description` TEXT NOT NULL,
  `status` VARCHAR(100) DEFAULT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_service_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_history_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- SEED DATA
-- =========================================================
INSERT INTO `users`
  (`id`, `accountName`, `accountNumber`, `ccaNumber`, `address`, `phone`, `location`, `email`, `role`, `status`)
VALUES
  (1, 'admin', 'admin', '0', 'Descallar Satellite Services HQ, Balayan, Batangas', '09170000000', 'Balayan', NULL, 'admin', 'active'),
  (2, 'loyd descallar', '88773322', '88773322', 'Balayan, Batangas', '09755718056', 'Balayan', NULL, 'user', 'active'),
  (3, 'maria santos', '88001001', 'CCA-1001', 'Brgy. Lucban, Calaca, Batangas', '09181234567', 'Calaca', NULL, 'user', 'active'),
  (4, 'jose reyes', '88002001', 'CCA-2001', 'Brgy. Lian Proper, Lian, Batangas', '09209876543', 'Lian', NULL, 'user', 'active'),
  (5, 'ana garcia', '88003001', 'CCA-3001', 'Brgy. Calatagan Proper, Calatagan, Batangas', '09351112222', 'Calatagan', NULL, 'user', 'active'),
  (6, 'pedro dela cruz', '88004001', 'CCA-4001', 'Brgy. Nasugbu Poblacion, Nasugbu, Batangas', '09473334444', 'Nasugbu', NULL, 'user', 'active'),
  (7, 'rosa mendoza', '88005001', 'CCA-5001', 'Brgy. Lemery Proper, Lemery, Batangas', '09555556666', 'Lemery', NULL, 'user', 'active');

INSERT INTO `prepaid_plans`
  (`id`, `plan_code`, `plan_name`, `amount`, `validity_days`, `hd_channels`, `sd_channels`, `benefits_text`, `ai_note`, `status`)
VALUES
  (1,  'REG100',  'Load 100',  100.00,  30, 2,  38, 'Entry regular load.',                  'Best for light viewing.',                   'active'),
  (2,  'REG175',  'Load 175',  175.00,  30, 4,  45, 'Adds more channels than Load 100.',    'Good for small upgrade.',                   'active'),
  (3,  'REG200',  'Load 200',  200.00,  30, 7,  62, 'Mid-entry package.',                   'Good for users wanting more content.',      'active'),
  (4,  'REG300',  'Load 300',  300.00,  30, 10, 70, 'Broader channel access.',              'Good value for frequent viewers.',          'active'),
  (5,  'REG450',  'Load 450',  450.00,  30, 14, 78, 'Higher-tier regular load.',            'Good for users wanting more variety.',      'active'),
  (6,  'REG500',  'Load 500',  500.00,  30, 17, 82, 'Premium regular package.',             'Good for richer viewing experience.',       'active'),
  (7,  'REG600',  'Load 600',  600.00,  30, 20, 86, 'High-tier regular load.',              'Good for heavier viewers.',                 'active'),
  (8,  'REG800',  'Load 800',  800.00,  30, 25, 91, 'High-value load with premium lineup.', 'Ideal for wide viewing selection.',         'active'),
  (9,  'REG1000', 'Load 1000', 1000.00, 30, 30, 95, 'Top-tier prepaid load.',              'Best for broadest viewing experience.',     'active');

INSERT INTO `prepaid_accounts`
  (`id`, `user_id`, `account_number`, `account_name`, `current_plan_id`, `last_load_amount`, `last_load_date`, `expiry_date`, `status`)
VALUES
  (1, 2, '88773322', 'loyd descallar', 9, 1000.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active');

INSERT INTO `load_history`
  (`id`, `user_id`, `accountNumber`, `loadAmount`, `description`, `status`, `created_at`)
VALUES
  (1, 2, '88773322', 300.00, 'Initial sample POS prepaid load', 'completed', NOW());

INSERT INTO `troubleshoot_models` (`id`, `name`, `description`, `status`) VALUES
  (1, 'Cignal SD Box Model A', 'Standard definition receiver for entry-level plans', 'active'),
  (2, 'Cignal HD Box Model B', 'High definition receiver for HD plans', 'active'),
  (3, 'Cignal DVR Box Model C', 'DVR receiver with recording capability', 'active');

INSERT INTO `troubleshoot_issues`
  (`id`, `model_id`, `title`, `description`, `category`, `error_code`, `suggested_tag`)
VALUES
  (1, 1, 'No signal on screen',       'TV shows no signal or blank screen',    'Technical Problem', 'NO_SIGNAL',  'Connection Issue'),
  (2, 1, 'Remote not responding',     'Remote control does not work',          'Technical Problem', 'REMOTE',     'Device Issue'),
  (3, 2, 'HD channels not displaying','Only SD channels are available',        'Channel Concern',   'HD_CHANNEL', 'Plan/Channel Issue'),
  (4, 3, 'Recording not working',     'Cannot record scheduled programs',      'Device Concern',    'DVR_RECORD', 'Device Issue');

INSERT INTO `troubleshoot_steps` (`id`, `issue_id`, `step_number`, `instruction`) VALUES
  (1, 1, 1, 'Check that the satellite cable is firmly connected to the box.'),
  (2, 1, 2, 'Ensure the TV is set to the correct HDMI/AV input.'),
  (3, 1, 3, 'Restart the box by unplugging it for 10 seconds, then plug it back in.'),
  (4, 2, 1, 'Replace the remote batteries with new ones.'),
  (5, 2, 2, 'Make sure there are no obstructions between the remote and the receiver.'),
  (6, 2, 3, 'Try resetting the box using the power button.'),
  (7, 3, 1, 'Confirm that the subscription includes HD channels.'),
  (8, 3, 2, 'Run a channel scan from the settings menu.'),
  (9, 4, 1, 'Check available storage space on the DVR.'),
  (10, 4, 2, 'Verify that the recording schedule time is correct.'),
  (11, 4, 3, 'Restart the DVR and try scheduling the recording again.');

INSERT INTO `notifications`
  (`user_id`, `account_number`, `type`, `message`, `related_id`, `is_read`)
VALUES
  (2, '88773322', 'info', 'Welcome to CignalCare+. Your account is ready for testing.', NULL, 0);

-- =========================================================
-- End of schema
-- =========================================================

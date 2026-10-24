-- CignalCare+ CURRENT LOCAL MYSQL SCHEMA
-- Updated: Sep 14, 2026 (v2: corrected FK creation order)
-- Schema aligned with the latest CignalCare+ backend source provided on Sep 13, 2026.
-- Schema only: contains no real customer or payment records.
-- This file cannot recover local records that were created after that backup and later deleted.
--
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 15, 2026 at 06:55 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cignal_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `load_history`
--

CREATE TABLE `load_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `accountNumber` varchar(50) NOT NULL,
  `loadAmount` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','completed','cancelled','failed') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `load_requests`
--

CREATE TABLE `load_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `account_number` varchar(50) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) NOT NULL DEFAULT 'GCash',
  `payment_status` enum('pending','paid','failed','cancelled','manual_review') NOT NULL DEFAULT 'manual_review',
  `reference_no` varchar(100) NOT NULL,
  `paymongo_checkout_session_id` varchar(120) DEFAULT NULL,
  `paymongo_checkout_url` text DEFAULT NULL,
  `paymongo_payment_intent_id` varchar(120) DEFAULT NULL,
  `paymongo_payment_id` varchar(120) DEFAULT NULL,
  `paymongo_payment_method` varchar(60) DEFAULT NULL,
  `paymongo_fee` decimal(10,2) DEFAULT NULL,
  `paymongo_net_amount` decimal(10,2) DEFAULT NULL,
  `payment_completed_at` datetime DEFAULT NULL,
  `fulfilled_at` datetime DEFAULT NULL,
  `receipt_photo` longtext DEFAULT NULL,
  `screen_photo` longtext DEFAULT NULL,
  `diagnostic_result` varchar(100) DEFAULT NULL,
  `status` enum('Received','Under Review','Attending','Completed','Rejected') NOT NULL DEFAULT 'Received',
  `location` varchar(100) DEFAULT 'Balayan',
  `admin_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'info',
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `paymongo_webhook_events`
--

CREATE TABLE `paymongo_webhook_events` (
  `event_id` varchar(180) NOT NULL,
  `event_type` varchar(120) DEFAULT NULL,
  `payload_hash` char(64) NOT NULL,
  `status` enum('processing','processed','failed') NOT NULL DEFAULT 'processing',
  `attempts` int(11) NOT NULL DEFAULT 1,
  `error_message` text DEFAULT NULL,
  `first_received_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_received_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `prepaid_accounts`
--

CREATE TABLE `prepaid_accounts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `account_number` varchar(50) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `current_plan_id` int(11) DEFAULT NULL,
  `last_load_amount` decimal(10,2) DEFAULT 0.00,
  `last_load_date` datetime DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `status` enum('active','expired','inactive') NOT NULL DEFAULT 'inactive',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `prepaid_plans`
--

CREATE TABLE `prepaid_plans` (
  `id` int(11) NOT NULL,
  `plan_code` varchar(50) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `validity_days` int(11) NOT NULL DEFAULT 30,
  `hd_channels` int(11) DEFAULT 0,
  `sd_channels` int(11) DEFAULT 0,
  `benefits_text` text DEFAULT NULL,
  `channels_json` longtext DEFAULT NULL,
  `ai_note` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `prepaid_transactions`
--

CREATE TABLE `prepaid_transactions` (
  `id` int(11) NOT NULL,
  `reference_no` varchar(100) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `account_number` varchar(50) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `processed_by` varchar(100) NOT NULL DEFAULT 'Admin',
  `transaction_date` datetime NOT NULL DEFAULT current_timestamp(),
  `validity_days` int(11) NOT NULL DEFAULT 30,
  `expiry_date` datetime NOT NULL,
  `status` enum('completed','pending','failed','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `technician_requests`
--

CREATE TABLE `technician_requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `accountNumber` varchar(50) NOT NULL,
  `contactName` varchar(100) NOT NULL,
  `contactPhone` varchar(30) NOT NULL,
  `issueDescription` text NOT NULL,
  `preferred_date` date DEFAULT NULL,
  `preferred_time` time DEFAULT NULL,
  `source` varchar(80) DEFAULT NULL,
  `screen_issue` varchar(120) DEFAULT NULL,
  `screen_photo_url` text DEFAULT NULL,
  `service_address` text DEFAULT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  `incident_id` varchar(36) DEFAULT NULL,
  `technician_name` varchar(100) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `status` enum('Submitted','Under Review','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `subject` text NOT NULL,
  `priority` enum('Low','Normal','High','Urgent') NOT NULL DEFAULT 'Normal',
  `status` enum('Submitted','Under Review','Job Order Assigned','Resolved','Archived') NOT NULL DEFAULT 'Submitted',
  `incident_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `ticket_messages`
--

CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `sender_role` enum('user','admin') NOT NULL,
  `message` text DEFAULT NULL,
  `attachment` text DEFAULT NULL,
  `attachment_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `troubleshoot_issues`
--

CREATE TABLE `troubleshoot_issues` (
  `id` int(11) NOT NULL,
  `model_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `error_code` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `troubleshoot_models`
--

CREATE TABLE `troubleshoot_models` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `troubleshoot_steps`
--

CREATE TABLE `troubleshoot_steps` (
  `id` int(11) NOT NULL,
  `issue_id` int(11) NOT NULL,
  `step_number` int(11) NOT NULL,
  `instruction` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.


-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `accountName` varchar(100) NOT NULL,
  `accountNumber` varchar(50) NOT NULL,
  `ccaNumber` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `location` enum('Balayan','Calaca','Lian','Calatagan','Nasugbu','Lemery') NOT NULL DEFAULT 'Balayan',
  `email` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `temporary_password_expires_at` timestamp NULL DEFAULT NULL,
  `recovery_code_hash` varchar(64) DEFAULT NULL,
  `recovery_code_issued_at` timestamp NULL DEFAULT NULL,
  `auth_session_version` int(11) NOT NULL DEFAULT 1,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_verification_code_hash` varchar(64) DEFAULT NULL,
  `email_verification_expires_at` timestamp NULL DEFAULT NULL,
  `email_verification_attempts` int(11) NOT NULL DEFAULT 0,
  `email_verification_last_sent_at` timestamp NULL DEFAULT NULL,
  `password_reset_code_hash` varchar(64) DEFAULT NULL,
  `password_reset_expires_at` timestamp NULL DEFAULT NULL,
  `password_reset_attempts` int(11) NOT NULL DEFAULT 0,
  `password_reset_last_sent_at` timestamp NULL DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Data omitted for privacy.
--

-- Historical INSERT rows omitted from schema-only installation.



-- --------------------------------------------------------

--
-- Current admin security tables
--

CREATE TABLE `admin_security` (
  `user_id` int(11) NOT NULL,
  `username` varchar(80) NOT NULL,
  `totp_secret_enc` text DEFAULT NULL,
  `totp_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `session_version` int(11) NOT NULL DEFAULT 1,
  `failed_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_password_change_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_admin_security_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `admin_recovery_codes` (
  `code_id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`code_id`),
  KEY `idx_admin_recovery_user_used` (`user_id`,`used_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `admin_audit_logs` (
  `event_id` varchar(36) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `ip_address` varchar(80) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`event_id`),
  KEY `idx_admin_audit_user_created` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Current troubleshooting outcome analytics table
--

CREATE TABLE `troubleshoot_outcomes` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `model_id` varchar(100) NOT NULL,
  `model_name` varchar(160) DEFAULT NULL,
  `issue_id` varchar(100) NOT NULL,
  `issue_label` varchar(180) NOT NULL,
  `outcome` varchar(30) NOT NULL,
  `session_id` varchar(80) DEFAULT NULL,
  `support_mode` varchar(30) NOT NULL DEFAULT 'full',
  `is_final` int(11) NOT NULL DEFAULT 1,
  `video_watched` int(11) NOT NULL DEFAULT 0,
  `steps_completed` int(11) NOT NULL DEFAULT 0,
  `total_steps` int(11) NOT NULL DEFAULT 0,
  `last_step_id` varchar(180) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_troubleshoot_outcomes_created` (`created_at`),
  KEY `idx_troubleshoot_outcomes_issue` (`issue_id`,`outcome`),
  KEY `idx_troubleshoot_outcomes_session` (`session_id`,`support_mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Current common-issue / incident table
--

CREATE TABLE `support_incidents` (
  `id` varchar(36) NOT NULL,
  `issue_key` varchar(100) NOT NULL,
  `issue_label` varchar(160) NOT NULL,
  `location` varchar(100) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'candidate',
  `report_count` int(11) NOT NULL DEFAULT 0,
  `distinct_subscribers` int(11) NOT NULL DEFAULT 0,
  `first_reported_at` timestamp NULL DEFAULT NULL,
  `last_reported_at` timestamp NULL DEFAULT NULL,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `dismissed_at` timestamp NULL DEFAULT NULL,
  `confirmed_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_incidents_status_location` (`status`,`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Indexes for dumped tables
--

--
-- Indexes for table `load_history`
--
ALTER TABLE `load_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_load_history_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_load_history_account_created` (`accountNumber`,`created_at`),
  ADD KEY `idx_load_history_status` (`status`);

--
-- Indexes for table `load_requests`
--
ALTER TABLE `load_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_load_reference` (`reference_no`),
  ADD KEY `idx_load_requests_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_load_requests_plan` (`plan_id`),
  ADD KEY `idx_load_requests_status_created` (`status`,`created_at`),
  ADD KEY `idx_load_requests_payment_status` (`payment_status`),
  ADD KEY `idx_load_requests_account` (`account_number`),
  ADD KEY `idx_load_requests_checkout_session` (`paymongo_checkout_session_id`),
  ADD KEY `idx_load_requests_payment_id` (`paymongo_payment_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_read_created` (`user_id`,`is_read`,`created_at`),
  ADD KEY `idx_notifications_account_read_created` (`account_number`,`is_read`,`created_at`),
  ADD KEY `idx_notifications_type_created` (`type`,`created_at`);

--
-- Indexes for table `paymongo_webhook_events`
--
ALTER TABLE `paymongo_webhook_events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_paymongo_event_status` (`status`),
  ADD KEY `idx_paymongo_payload_hash` (`payload_hash`);

--
-- Indexes for table `prepaid_accounts`
--
ALTER TABLE `prepaid_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_account_number` (`account_number`),
  ADD KEY `idx_prepaid_accounts_user` (`user_id`),
  ADD KEY `idx_prepaid_accounts_plan` (`current_plan_id`),
  ADD KEY `idx_prepaid_accounts_status_expiry` (`status`,`expiry_date`);

--
-- Indexes for table `prepaid_plans`
--
ALTER TABLE `prepaid_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_plan_code` (`plan_code`),
  ADD KEY `idx_prepaid_plans_status_amount` (`status`,`amount`);

--
-- Indexes for table `prepaid_transactions`
--
ALTER TABLE `prepaid_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_reference` (`reference_no`),
  ADD KEY `idx_prepaid_transactions_user_date` (`user_id`,`transaction_date`),
  ADD KEY `idx_prepaid_transactions_account_date` (`account_number`,`transaction_date`),
  ADD KEY `idx_prepaid_transactions_plan` (`plan_id`),
  ADD KEY `idx_prepaid_transactions_status` (`status`);

--
-- Indexes for table `technician_requests`
--
ALTER TABLE `technician_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_technician_requests_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_technician_requests_account` (`accountNumber`),
  ADD KEY `idx_technician_requests_status_created` (`status`,`created_at`),
  ADD KEY `idx_technician_requests_schedule` (`preferred_date`,`preferred_time`),
  ADD KEY `idx_technician_incident` (`incident_id`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tickets_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_tickets_status_created` (`status`,`created_at`),
  ADD KEY `idx_tickets_incident` (`incident_id`);

--
-- Indexes for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_messages_ticket_created` (`ticket_id`,`created_at`,`id`),
  ADD KEY `idx_ticket_messages_sender` (`sender_id`);

--
-- Indexes for table `troubleshoot_issues`
--
ALTER TABLE `troubleshoot_issues`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ti_model` (`model_id`);

--
-- Indexes for table `troubleshoot_models`
--
ALTER TABLE `troubleshoot_models`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `troubleshoot_steps`
--
ALTER TABLE `troubleshoot_steps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ts_issue` (`issue_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_accountNumber` (`accountNumber`),
  ADD UNIQUE KEY `idx_ccaNumber` (`ccaNumber`),
  ADD KEY `idx_users_account_name` (`accountName`),
  ADD KEY `idx_users_role_status` (`role`,`status`),
  ADD KEY `idx_users_created_at` (`created_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `load_history`
--
ALTER TABLE `load_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `load_requests`
--
ALTER TABLE `load_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prepaid_accounts`
--
ALTER TABLE `prepaid_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prepaid_plans`
--
ALTER TABLE `prepaid_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `prepaid_transactions`
--
ALTER TABLE `prepaid_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `technician_requests`
--
ALTER TABLE `technician_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `troubleshoot_issues`
--
ALTER TABLE `troubleshoot_issues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `troubleshoot_models`
--
ALTER TABLE `troubleshoot_models`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `troubleshoot_steps`
--
ALTER TABLE `troubleshoot_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for current admin security tables
--
ALTER TABLE `admin_security`
  ADD CONSTRAINT `fk_admin_security_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `admin_recovery_codes`
  ADD CONSTRAINT `fk_admin_recovery_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `admin_audit_logs`
  ADD CONSTRAINT `fk_admin_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `load_history`
--
ALTER TABLE `load_history`
  ADD CONSTRAINT `fk_lh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `load_requests`
--
ALTER TABLE `load_requests`
  ADD CONSTRAINT `fk_load_requests_plan` FOREIGN KEY (`plan_id`) REFERENCES `prepaid_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `prepaid_accounts`
--
ALTER TABLE `prepaid_accounts`
  ADD CONSTRAINT `fk_pa_plan` FOREIGN KEY (`current_plan_id`) REFERENCES `prepaid_plans` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `prepaid_transactions`
--
ALTER TABLE `prepaid_transactions`
  ADD CONSTRAINT `fk_pt_plan` FOREIGN KEY (`plan_id`) REFERENCES `prepaid_plans` (`id`),
  ADD CONSTRAINT `fk_pt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `technician_requests`
--
ALTER TABLE `technician_requests`
  ADD CONSTRAINT `fk_tr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `fk_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD CONSTRAINT `fk_tm_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `troubleshoot_issues`
--
ALTER TABLE `troubleshoot_issues`
  ADD CONSTRAINT `fk_ti_model` FOREIGN KEY (`model_id`) REFERENCES `troubleshoot_models` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `troubleshoot_steps`
--
ALTER TABLE `troubleshoot_steps`
  ADD CONSTRAINT `fk_ts_issue` FOREIGN KEY (`issue_id`) REFERENCES `troubleshoot_issues` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

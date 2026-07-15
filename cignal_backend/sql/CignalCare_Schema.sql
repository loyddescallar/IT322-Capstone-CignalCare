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
-- Dumping data for table `load_history`
--

INSERT INTO `load_history` (`id`, `user_id`, `accountNumber`, `loadAmount`, `description`, `status`, `created_at`) VALUES
(1, 2, '88773322', 300.00, 'Initial sample POS prepaid load', 'completed', '2026-07-03 22:15:50'),
(2, 1, '88773322', 200.00, 'POS Load — Load 200 via Cash', 'pending', '2026-07-03 22:28:05'),
(3, 2, '88773322', 500.00, 'Load 500 processed from load request #7', 'completed', '2026-07-09 06:26:18'),
(4, 2, '88773322', 450.00, 'Load 450 processed from load request #8', 'completed', '2026-07-09 06:28:06'),
(5, 9, '22232422', 300.00, 'POS Load — Load 300 via Cash', 'completed', '2026-07-10 10:41:16'),
(6, 2, '88773322', 1000.00, 'Load 1000 processed from load request #9', 'completed', '2026-07-13 19:49:21');

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
-- Dumping data for table `load_requests`
--

INSERT INTO `load_requests` (`id`, `user_id`, `plan_id`, `account_number`, `account_name`, `plan_name`, `amount`, `payment_method`, `payment_status`, `reference_no`, `paymongo_checkout_session_id`, `paymongo_checkout_url`, `paymongo_payment_intent_id`, `paymongo_payment_id`, `paymongo_payment_method`, `paymongo_fee`, `paymongo_net_amount`, `payment_completed_at`, `fulfilled_at`, `receipt_photo`, `screen_photo`, `diagnostic_result`, `status`, `location`, `admin_note`, `created_at`, `updated_at`) VALUES
(1, 2, 5, '88773322', 'loyd descallar', 'Load 600', 600.00, 'PayMongo', 'pending', 'PM-1783541879382-NVIHXL', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', NULL, '2026-07-08 20:17:59', '2026-07-15 04:47:15'),
(2, 2, 3, '88773322', 'loyd descallar', 'Load 450', 450.00, 'PayMongo', 'pending', 'PM-1783544978380-WG6NRK', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', NULL, '2026-07-08 21:09:38', '2026-07-15 04:47:15'),
(3, 2, 4, '88773322', 'loyd descallar', 'Load 500', 500.00, 'PayMongo', 'pending', 'PM-1783545114453-UF7YHI', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', NULL, '2026-07-08 21:11:54', '2026-07-15 04:47:15'),
(4, 2, 2, '88773322', 'loyd descallar', 'Load 300', 300.00, 'PayMongo', 'pending', 'PM-1783545137223-PN563B', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', NULL, '2026-07-08 21:12:17', '2026-07-15 04:47:15'),
(5, 2, 3, '88773322', 'loyd descallar', 'Load 450', 450.00, 'PayMongo', 'pending', 'PM-1783545926011-UPDB4R', 'cs_d48bc40bc76447d57979eb5b', 'https://checkout.paymongo.com/d48bc40bc76447d57979eb5b', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', NULL, '2026-07-08 21:25:26', '2026-07-15 04:47:15'),
(6, 2, 1, '88773322', 'loyd descallar', 'Load 200', 200.00, 'PayMongo', 'pending', 'PM-1783546137315-2XUAI7', 'cs_7f99fc2671950f1c62f9b072', 'https://checkout.paymongo.com/7f99fc2671950f1c62f9b072', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'channel_1_ok', 'Rejected', 'Balayan', 'okay na po', '2026-07-08 21:28:57', '2026-07-15 04:47:15'),
(7, 2, 4, '88773322', 'loyd descallar', 'Load 500', 500.00, 'PayMongo', 'paid', 'PM-1783577259871-TCGGO9', 'cs_4e943b6dc1d8f8ee389bccb7', 'https://checkout.paymongo.com/4e943b6dc1d8f8ee389bccb7', 'pi_4TsN3BCTGDDY6fmsVpQR5J7P', 'pay_RR4N9316VbeURHyLCgcm8eTa', 'qrph', 7.50, 492.50, '2026-07-09 14:25:30', '2026-07-09 14:26:18', NULL, NULL, 'channel_1_ok', 'Completed', 'Balayan', NULL, '2026-07-09 06:07:39', '2026-07-15 04:47:15'),
(8, 2, 3, '88773322', 'loyd descallar', 'Load 450', 450.00, 'PayMongo', 'paid', 'PM-1783578441937-YIZC38', 'cs_d0840ceb0f3eca191fa3eb79', 'https://checkout.paymongo.com/d0840ceb0f3eca191fa3eb79', 'pi_byu9nDP2nZe4ChSbGkuwNond', 'pay_wE3BDYLoyEejNhysN3W4BUK4', 'qrph', 6.75, 443.25, '2026-07-09 14:27:34', '2026-07-09 14:28:06', NULL, NULL, 'channel_1_ok', 'Completed', 'Balayan', NULL, '2026-07-09 06:27:21', '2026-07-15 04:47:15'),
(9, 2, 7, '88773322', 'loyd descallar', 'Load 1000', 1000.00, 'PayMongo', 'paid', 'PM-1783969126762-R59RBT', 'cs_3df0e77133a51dc63d7a7a13', 'https://checkout.paymongo.com/3df0e77133a51dc63d7a7a13', 'pi_EydabqD7YvTQWMwt3bgTjX7A', 'pay_ANzZ5wQxx6fcJex3UhaP8LGV', 'qrph', 15.00, 985.00, '2026-07-14 03:48:23', '2026-07-14 03:49:21', NULL, NULL, 'channel_1_ok', 'Completed', 'Balayan', NULL, '2026-07-13 18:58:46', '2026-07-15 04:47:15');

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
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `account_number`, `type`, `message`, `is_read`, `created_at`) VALUES
(1, 2, '88773322', 'info', 'Welcome to CignalCare+. Your account is ready!', 1, '2026-07-03 22:15:51'),
(2, 2, '88773322', 'payment', 'PayMongo checkout was created for Load 450. Complete payment to continue your load request.', 1, '2026-07-08 21:25:26'),
(3, 2, '88773322', 'payment', 'PayMongo checkout was created for Load 200. Complete payment to continue your load request.', 1, '2026-07-08 21:28:57'),
(4, 2, '88773322', 'load_status', 'Your Load 200 load request is now Received.', 1, '2026-07-09 06:06:23'),
(5, 2, '88773322', 'payment', 'PayMongo checkout was created for Load 500. Complete payment to continue your load request.', 1, '2026-07-09 06:07:40'),
(6, 2, '88773322', 'payment', 'Payment confirmed for Load 500. Your load request is now ready for processing.', 1, '2026-07-09 06:25:30'),
(7, 2, '88773322', 'payment', 'Payment confirmed for Load 500. Your load request is now ready for processing.', 1, '2026-07-09 06:25:51'),
(8, 2, '88773322', 'payment', 'Payment confirmed for Load 500. Your load request is now ready for processing.', 1, '2026-07-09 06:26:05'),
(9, 2, '88773322', 'load_status', 'Your Load 500 load request is now Completed.', 1, '2026-07-09 06:26:18'),
(10, 2, '88773322', 'payment', 'PayMongo checkout was created for Load 450. Complete payment to continue your load request.', 1, '2026-07-09 06:27:22'),
(11, 2, '88773322', 'payment', 'Payment confirmed for Load 450. Your load request is now ready for processing.', 1, '2026-07-09 06:27:34'),
(12, 2, '88773322', 'load_status', 'Your Load 450 load request is now Completed.', 1, '2026-07-09 06:28:06'),
(13, 2, '88773322', 'load_status', 'Your Load 200 load request is now Rejected.', 1, '2026-07-09 07:44:13'),
(14, 9, '22232422', 'welcome', 'Welcome to CignalCare+. Your account is ready.', 0, '2026-07-10 10:08:51'),
(15, 1, 'admin', 'admin_customer', 'New subscriber registered: Angel Locsin (22232422) from Balayan.', 1, '2026-07-10 10:08:51'),
(16, 1, 'admin', 'ticket', 'Your ticket #4 was submitted and is now Open.', 1, '2026-07-10 10:10:36'),
(17, 1, 'admin', 'admin_ticket', 'New support ticket #4 from admin: No channel 2.', 1, '2026-07-10 10:10:36'),
(18, 1, 'admin', 'ticket_reply', 'Admin replied to your ticket #4.', 1, '2026-07-10 10:10:36'),
(19, 1, 'admin', 'ticket_reply', 'Admin replied to your ticket #4.', 1, '2026-07-10 10:11:03'),
(20, 1, 'admin', 'ticket_reply', 'Admin replied to your ticket #4.', 1, '2026-07-10 10:12:02'),
(21, 1, 'admin', 'ticket_reply', 'Admin replied to your ticket #4.', 1, '2026-07-10 10:12:11'),
(22, 9, '22232422', 'load_completed', 'Your ₱300 load was processed by Descallar Satellite Services.', 0, '2026-07-10 10:41:16'),
(23, 1, 'admin', 'admin_customer', 'Customer archived: pedro dela cruz (88004001).', 1, '2026-07-10 13:45:00'),
(24, 1, 'admin', 'admin_customer', 'Customer archived: ana garcia (88003001).', 1, '2026-07-10 13:45:05'),
(25, 1, 'admin', 'admin_customer', 'Customer archived: rosa mendoza (88005001).', 1, '2026-07-10 13:45:09'),
(26, 1, 'admin', 'admin_customer', 'Customer archived: jose reyes (88002001).', 1, '2026-07-10 13:45:12'),
(27, 1, 'admin', 'admin_customer', 'Customer archived: maria santos (88001001).', 1, '2026-07-10 13:45:21'),
(28, 1, 'admin', 'admin_customer', 'Customer permanently deleted: maria santos (88001001).', 1, '2026-07-10 13:45:35'),
(29, 1, 'admin', 'admin_customer', 'Customer permanently deleted: jose reyes (88002001).', 1, '2026-07-10 13:45:48'),
(30, 1, 'admin', 'admin_customer', 'Customer permanently deleted: ana garcia (88003001).', 1, '2026-07-10 13:45:57'),
(31, 1, 'admin', 'admin_customer', 'Customer permanently deleted: pedro dela cruz (88004001).', 1, '2026-07-10 13:46:05'),
(32, 1, 'admin', 'admin_customer', 'Customer permanently deleted: rosa mendoza (88005001).', 1, '2026-07-10 13:46:15'),
(33, 2, '88773322', 'load_status', 'Your Load 450 load request is now Rejected.', 1, '2026-07-10 15:13:21'),
(34, 2, '88773322', 'load_status', 'Your Load 300 load request is now Rejected.', 1, '2026-07-10 15:13:26'),
(35, 2, '88773322', 'load_status', 'Your Load 500 load request is now Rejected.', 1, '2026-07-10 15:13:32'),
(36, 2, '88773322', 'load_status', 'Your Load 450 load request is now Rejected.', 1, '2026-07-10 15:13:36'),
(37, 2, '88773322', 'load_status', 'Your Load 600 load request is now Rejected.', 1, '2026-07-10 15:13:39'),
(38, 1, 'admin', 'admin_message', 'New customer reply on ticket #3 from loyd descallar.', 1, '2026-07-12 21:34:27'),
(39, 1, 'admin', 'admin_message', 'New customer reply on ticket #3 from loyd descallar.', 1, '2026-07-12 21:34:59'),
(40, 1, 'admin', 'admin_message', 'New customer reply on ticket #3 from loyd descallar.', 1, '2026-07-12 21:35:27'),
(41, 1, 'admin', 'admin_message', 'New customer reply on ticket #3 from loyd descallar.', 1, '2026-07-12 21:35:34'),
(42, 2, '88773322', 'ticket_reply', 'Admin replied to your ticket #3.', 1, '2026-07-12 21:35:58'),
(43, 2, '88773322', 'ticket_reply', 'Admin replied to your ticket #3.', 1, '2026-07-12 21:36:12'),
(44, 1, 'admin', 'admin_message', 'New customer reply on ticket #3 from loyd descallar.', 1, '2026-07-12 22:11:30'),
(45, 1, 'admin', 'ticket_reply', 'Admin replied to your ticket #4.', 1, '2026-07-12 22:12:07'),
(46, 2, '88773322', 'ticket_reply', 'Admin replied to your ticket #3.', 1, '2026-07-12 22:12:55'),
(47, 1, 'admin', 'ticket_status', 'Your ticket #4 status was updated to Resolved.', 1, '2026-07-13 18:56:56'),
(48, 2, '88773322', 'ticket_status', 'Your ticket #3 status was updated to Resolved.', 1, '2026-07-13 18:56:58'),
(49, 2, '88773322', 'ticket_status', 'Your ticket #2 status was updated to Resolved.', 1, '2026-07-13 18:57:00'),
(50, 2, '88773322', 'ticket_status', 'Your ticket #1 status was updated to Resolved.', 1, '2026-07-13 18:57:02'),
(51, 2, '88773322', 'technician_status', 'Your technician request #1 is now Submitted.', 1, '2026-07-13 18:57:14'),
(52, 2, '88773322', 'technician_status', 'Your technician request #1 is now Completed.', 1, '2026-07-13 18:57:26'),
(53, 2, '88773322', 'payment', 'PayMongo checkout was created for Load 1000. Complete payment to continue your load request.', 1, '2026-07-13 18:58:47'),
(54, 1, 'admin', 'admin_load_request', 'New PayMongo load request #9 from loyd descallar (88773322) for Load 1000. Awaiting payment confirmation.', 1, '2026-07-13 18:58:47'),
(55, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Under Review.', 1, '2026-07-13 18:59:55'),
(56, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Received.', 1, '2026-07-13 19:00:10'),
(57, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Attending.', 1, '2026-07-13 19:00:28'),
(58, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Under Review.', 1, '2026-07-13 19:04:49'),
(59, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Attending.', 1, '2026-07-13 19:13:31'),
(60, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Received.', 1, '2026-07-13 19:19:26'),
(61, 2, '88773322', 'payment', 'Payment confirmed for Load 1000. Your load request is now ready for processing.', 1, '2026-07-13 19:48:23'),
(62, 1, 'admin', 'admin_payment', 'PayMongo payment confirmed for load request #9 (loyd descallar, Load 1000).', 1, '2026-07-13 19:48:23'),
(63, 2, '88773322', 'load_status', 'Your Load 1000 load request is now Completed.', 1, '2026-07-13 19:49:21');

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
-- Dumping data for table `paymongo_webhook_events`
--

INSERT INTO `paymongo_webhook_events` (`event_id`, `event_type`, `payload_hash`, `status`, `attempts`, `error_message`, `first_received_at`, `last_received_at`, `processed_at`) VALUES
('evt_J7tdgrufx9LnvPrPEs8BmwbX', 'checkout_session.payment.paid', 'cf8b319a0a8b0aaa3dcd917994f38b24e70544ec0c5c6940f38dff85f3c170a2', 'processed', 1, NULL, '2026-07-13 19:48:23', '2026-07-13 19:48:23', '2026-07-14 03:48:23'),
('evt_LN4btCgUWDUKMRWnYkfqAH4o', 'payment.paid', '5df5caec3413c2f92127cbb8692deb6712145e244eb5cd3c1ad9b2fe4d25ec0f', 'processed', 1, NULL, '2026-07-13 19:48:28', '2026-07-13 19:48:28', '2026-07-14 03:48:28');

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
-- Dumping data for table `prepaid_accounts`
--

INSERT INTO `prepaid_accounts` (`id`, `user_id`, `account_number`, `account_name`, `current_plan_id`, `last_load_amount`, `last_load_date`, `expiry_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, '88773322', 'loyd descallar', 7, 1000.00, '2026-07-14 03:49:21', '2026-08-13 03:49:21', 'active', '2026-07-03 22:15:50', NULL);

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
-- Dumping data for table `prepaid_plans`
--

INSERT INTO `prepaid_plans` (`id`, `plan_code`, `plan_name`, `amount`, `validity_days`, `hd_channels`, `sd_channels`, `benefits_text`, `channels_json`, `ai_note`, `status`, `created_at`, `updated_at`) VALUES
(1, 'REG200', 'Load 200', 200.00, 30, 7, 62, 'Mid-entry package with more HD access.', NULL, 'Good for users who want more content.', 'active', '2026-07-03 22:15:50', NULL),
(2, 'REG300', 'Load 300', 300.00, 30, 10, 70, 'Broader channel access.', NULL, 'Good value for frequent viewers.', 'active', '2026-07-03 22:15:50', NULL),
(3, 'REG450', 'Load 450', 450.00, 30, 14, 78, 'Higher-tier regular load.', NULL, 'Good for users wanting more variety.', 'active', '2026-07-03 22:15:50', NULL),
(4, 'REG500', 'Load 500', 500.00, 30, 17, 82, 'Premium regular package.', NULL, 'Good for richer viewing experience.', 'active', '2026-07-03 22:15:50', NULL),
(5, 'REG600', 'Load 600', 600.00, 30, 20, 86, 'High-tier regular load.', NULL, 'Good for heavier viewers.', 'active', '2026-07-03 22:15:50', NULL),
(6, 'REG800', 'Load 800', 800.00, 30, 25, 91, 'High-value load with premium lineup.', NULL, 'Ideal for wide viewing selection.', 'active', '2026-07-03 22:15:50', NULL),
(7, 'REG1000', 'Load 1000', 1000.00, 30, 30, 95, 'Top-tier prepaid load.', NULL, 'Best for broadest viewing experience.', 'active', '2026-07-03 22:15:50', NULL),
(8, 'hehe420', 'LOAD420', 420.00, 30, 77, 22, 'HEHEHEHEHE', '[{\"name\":\"YESYESYES\",\"category\":\"Others\"}]', NULL, 'active', '2026-07-10 15:13:01', NULL);

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
-- Dumping data for table `prepaid_transactions`
--

INSERT INTO `prepaid_transactions` (`id`, `reference_no`, `user_id`, `account_number`, `account_name`, `plan_id`, `amount`, `payment_method`, `processed_by`, `transaction_date`, `validity_days`, `expiry_date`, `status`, `created_at`) VALUES
(1, 'PM-1783577259871-TCGGO9', 2, '88773322', 'loyd descallar', 4, 500.00, 'PayMongo', 'admin', '2026-07-09 14:26:18', 30, '2026-08-08 14:26:18', 'completed', '2026-07-09 06:26:18'),
(2, 'PM-1783578441937-YIZC38', 2, '88773322', 'loyd descallar', 3, 450.00, 'PayMongo', 'admin', '2026-07-09 14:28:06', 30, '2026-08-08 14:28:06', 'completed', '2026-07-09 06:28:06'),
(3, 'PM-1783969126762-R59RBT', 2, '88773322', 'loyd descallar', 7, 1000.00, 'PayMongo', 'admin', '2026-07-14 03:49:21', 30, '2026-08-13 03:49:21', 'completed', '2026-07-13 19:49:21');

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
  `technician_name` varchar(100) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `status` enum('Submitted','Under Review','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `technician_requests`
--

INSERT INTO `technician_requests` (`id`, `user_id`, `accountNumber`, `contactName`, `contactPhone`, `issueDescription`, `preferred_date`, `preferred_time`, `source`, `screen_issue`, `screen_photo_url`, `technician_name`, `admin_note`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, '88773322', 'loyd descallar', '09755718056', '[Urgent] [Signal / Dish Repair] Auto-filled from Load Request Signal Check.\nChannel 1 picture: No picture / error shown.\nSelected TV issue: Black Screen.\nDescription: TV is on but no visible Cignal message.\nTV screen photo: uploaded by customer and attached for review.\nSystem recommendation: Box or TV input issue detected.\nRecommended action: A black screen may be caused by power, HDMI/AV input, box boot failure, or hardware issues.\n\nCustomer note: Customer attempted to request prepaid loading, but the system blocked payment because this issue may not be solved by loading.', NULL, NULL, 'load_request_signal_check', 'Black Screen', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIbGNtcwIQAABtbnRyUkdCIFhZWiAH4gADABQACQAOAB1hY3NwTVNGVAAAAABzYXdzY3RybAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWhhbmSdkQA9QICwPUB0LIGepSKOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAABxjcHJ0AAABDAAAAAx3dHB0AAABGAAAABRyWFlaAAABLAAAABRnWFlaAAABQAAAABRiWFlaAAABVAAAABRyVFJDAAABaAAAAGBnVFJDAAABaAAAAGBiVFJDAAABaAAAAGBkZXNjAAAAAAAAAAV1UkdCAAAAAAAAAAAAAAAAdGV4dAAAAABDQzAAWFlaIAAAAAAAAPNUAAEAAAABFslYWVogAAAAAAAAb6AAADjyAAADj1hZWiAAAAAAAABilgAAt4kAABjaWFlaIAAAAAAAACSgAAAPhQAAtsRjdXJ2AAAAAAAAACoAAAB8APgBnAJ1A4MEyQZOCBIKGAxiDvQRzxT2GGocLiBDJKwpai5+M+s5sz/WRldNNlR2XBdkHWyGdVZ+jYgskjacq6eMstu+mcrH12Xkd/H5////2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAMAAmQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACijNGaADNGaSigBc0lFFACiikooAWigkDqaztT1qw02Nnu7mNMdt3NAGhmmSzxRD95Iq/U15d4g+LWm2wdIEZhyAQ3WvONZ+KTzsxitwO2ST/AI1SjcTZ9IHVLEHBu4c/71SJe20hxHcRN9GFfId74+vJukjAexqKz8dXkEu5J5AfrSaC59kAg9CKXNeCeC/i4yPHDqbB4zxnuK9nsNc06+t0mt7qJlcZA3c0hmpRWVqWuafpsJlvLiONQO5HNcRqHxd0a3LCAGbBxnpQgPTKM1423xwsEcg2RK+xq1afGvR5XAmt5I19Q1OzFc9azRXH6T8Q/DupbRHfLG7dn4rqre5huE3wSpIh7q2RSGTUUmfWlzSAKM0UlAC5ozSUUwFzRmkooAXNGaSigBaKSjNAC0UCigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKSgAzRRRQAUUUUAFFFFABRRTXYIpZiABySegoAdWdrOs2WkW7S3kyrgZ255NcL47+J1noqyW2nlZrocF85C14NrPinU9fupJJZ2IY5yx+UU1G4Hqni74sStvi04LFEejH71eS654nvtSdpJJGYnrmsC71GOBykam7n745AqEwXcy+a+2GM+prRQEJdXTDmaRS1UJbjPzK7Mf7oGakX7KjHy43uphwSegpWS8b7rJbr6KOatIllaQzMgYQn8eKqvM6n5kUfjUlxayFiXupXPpmqMkJiPIZgf7xqZDRowXjKeBjHcVvaV4jvbV1E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', NULL, NULL, 'Completed', '2026-07-08 20:55:48', '2026-07-13 18:57:26');

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
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `user_id`, `category`, `subject`, `priority`, `status`, `created_at`, `updated_at`) VALUES
(1, 2, 'Connection Issue', 'hehehehe', 'Normal', 'Resolved', '2026-07-04 08:29:04', '2026-07-13 18:57:02'),
(2, 2, 'Technical Problem', 'Arion Cordless HD Zapper — E1 / E2 / E11', 'Normal', 'Resolved', '2026-07-08 19:13:03', '2026-07-13 18:57:00'),
(3, 2, 'Connection Issue', 'Load Request Signal Check — Weak Signal / Pixelated', 'Normal', 'Resolved', '2026-07-08 20:55:23', '2026-07-13 18:56:58'),
(4, 1, 'Channel Concern', 'No channel 2', 'Normal', 'Resolved', '2026-07-10 10:10:35', '2026-07-13 18:56:56');

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
-- Dumping data for table `ticket_messages`
--

INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_role`, `message`, `attachment`, `attachment_type`, `created_at`) VALUES
(1, 3, 2, 'user', 'Auto-filled from Load Request Signal Check.\r\nChannel 1 picture: No picture / error shown.\r\nSelected TV issue: Weak Signal / Pixelated.\r\nDescription: Picture freezes, breaks, or disappears.\r\nTV screen photo: uploaded by customer and attached for review.\r\nSystem recommendation: Possible dish alignment or cable problem.\r\nRecommended action: Pixelation and weak signal are usually caused by dish alignment, obstruction, LNB, or cable issues.\r\n\r\nCustomer note: Customer attempted to request prepaid loading, but the system blocked payment because this issue may not be solved by loading.', '1783544123185-892722662-Scooter_ni_youngstunna.png', 'image/png', '2026-07-08 20:55:23'),
(2, 4, 1, 'admin', 'binuhay ko ang tv pero walang display ang channels', NULL, NULL, '2026-07-10 10:10:36'),
(3, 4, 1, 'admin', 'ano po nakadisplay sa tv?', NULL, NULL, '2026-07-10 10:11:03'),
(4, 4, 1, 'admin', NULL, '1783678322298-24876467-Scooter_ni_youngstunna.png', 'image/png', '2026-07-10 10:12:02'),
(5, 4, 1, 'admin', 'ano yan?', NULL, NULL, '2026-07-10 10:12:11'),
(6, 3, 2, 'user', 'Hello Sir Goodmorning', NULL, NULL, '2026-07-12 21:34:27'),
(7, 3, 2, 'user', 'this is it sir', NULL, NULL, '2026-07-12 21:34:59'),
(8, 3, 2, 'user', 'i sent the photo', NULL, NULL, '2026-07-12 21:35:27'),
(9, 3, 2, 'user', 'so you see it?', NULL, NULL, '2026-07-12 21:35:34'),
(10, 3, 1, 'admin', 'hello', NULL, NULL, '2026-07-12 21:35:58'),
(11, 3, 1, 'admin', 'hii', NULL, NULL, '2026-07-12 21:36:12'),
(12, 3, 2, 'user', 'hello sir', 'https://res.cloudinary.com/dr4mlmuc/image/upload/v1783894295/cignalcare/chat/1783894287003-84171e395908-Scooter_ni_youngstunna_f9u3sl.png', 'image/png', '2026-07-12 22:11:30'),
(13, 4, 1, 'admin', 'ow okay i will check it', 'https://res.cloudinary.com/dr4mlmuc/image/upload/v1783894333/cignalcare/chat/1783894325580-ef63993ed8fa-marimar_n9k74p.jpg', 'image/jpeg', '2026-07-12 22:12:07'),
(14, 3, 1, 'admin', 'ako to si marimar', 'https://res.cloudinary.com/dr4mlmuc/image/upload/v1783894381/cignalcare/chat/1783894373790-edab55b1ec88-marimar_lngwnx.jpg', 'image/jpeg', '2026-07-12 22:12:55');

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
-- Dumping data for table `troubleshoot_issues`
--

INSERT INTO `troubleshoot_issues` (`id`, `model_id`, `title`, `description`, `category`, `error_code`) VALUES
(1, 1, 'No signal on screen', 'TV shows no signal or blank screen', 'Technical Problem', 'NO_SIGNAL'),
(2, 1, 'Remote not responding', 'Remote control does not work', 'Technical Problem', 'REMOTE'),
(3, 2, 'HD channels not displaying', 'Only SD channels are available', 'Channel Concern', 'HD_CHANNEL'),
(4, 3, 'Recording not working', 'Cannot record scheduled programs', 'Device Concern', 'DVR_RECORD');

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
-- Dumping data for table `troubleshoot_models`
--

INSERT INTO `troubleshoot_models` (`id`, `name`, `description`, `status`) VALUES
(1, 'Cignal SD Box Model A', 'Standard definition receiver for entry-level plans', 'active'),
(2, 'Cignal HD Box Model B', 'High definition receiver for HD plans', 'active'),
(3, 'Cignal DVR Box Model C', 'DVR receiver with recording capability', 'active');

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
-- Dumping data for table `troubleshoot_steps`
--

INSERT INTO `troubleshoot_steps` (`id`, `issue_id`, `step_number`, `instruction`) VALUES
(1, 1, 1, 'Check that the satellite cable is firmly connected to the back of the box.'),
(2, 1, 2, 'Ensure the TV is set to the correct HDMI/AV input.'),
(3, 1, 3, 'Restart the box by unplugging it for 10 seconds, then plug it back in.'),
(4, 2, 1, 'Replace the remote batteries with new AA batteries.'),
(5, 2, 2, 'Make sure there are no obstructions between the remote and the receiver.'),
(6, 2, 3, 'Try resetting the box using the power button on the unit.'),
(7, 3, 1, 'Confirm that your subscription plan includes HD channels.'),
(8, 3, 2, 'Run a channel scan from the Settings menu.'),
(9, 4, 1, 'Check available storage space on the DVR hard drive.'),
(10, 4, 2, 'Verify that the recording schedule time is set correctly.'),
(11, 4, 3, 'Restart the DVR and try scheduling the recording again.');

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
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `accountName`, `accountNumber`, `ccaNumber`, `address`, `phone`, `location`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin', '0', 'Descallar Satellite Services HQ, Balayan, Batangas', '09170000000', 'Balayan', NULL, NULL, 'admin', 'active', '2026-07-03 22:15:50', NULL),
(2, 'loyd descallar', '88773322', '88773322', 'Balayan, Batangas', '09755718056', 'Balayan', NULL, NULL, 'user', 'active', '2026-07-03 22:15:50', NULL),
(8, 'Analie Descallar', '34343232', '34343232', 'near barangay hall, Brgy. Balibago, Calatagan, Batangas', '09660026266', 'Balayan', NULL, NULL, 'user', 'active', '2026-07-10 09:13:42', NULL),
(9, 'Angel Locsin', '22232422', '22232422', 'near RSA, Brgy. Caloocan, Balayan, Batangas', '09660026266', 'Balayan', NULL, NULL, 'user', 'active', '2026-07-10 10:08:51', NULL);

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
  ADD KEY `idx_technician_requests_schedule` (`preferred_date`,`preferred_time`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tickets_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_tickets_status_created` (`status`,`created_at`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `load_requests`
--
ALTER TABLE `load_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `prepaid_accounts`
--
ALTER TABLE `prepaid_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `prepaid_plans`
--
ALTER TABLE `prepaid_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `prepaid_transactions`
--
ALTER TABLE `prepaid_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `technician_requests`
--
ALTER TABLE `technician_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `troubleshoot_issues`
--
ALTER TABLE `troubleshoot_issues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `troubleshoot_models`
--
ALTER TABLE `troubleshoot_models`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `troubleshoot_steps`
--
ALTER TABLE `troubleshoot_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

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

-- MariaDB Schema for Commodity Trader PWA
-- Designed to support offline-first sync with SQLite/IndexedDB

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table: products
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `price_buy` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `price_sell` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: partners
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partners` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `is_supplier` TINYINT(1) DEFAULT 0,
  `is_customer` TINYINT(1) DEFAULT 0,
  `sub_type` ENUM('PERSONAL', 'BUSINESS') NOT NULL DEFAULT 'PERSONAL',
  `phone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: employees
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `employees` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `pin` CHAR(6) NOT NULL,
  `role` ENUM('ADMIN', 'FINANCE', 'WAREHOUSE', 'HR', 'FIELD') NOT NULL,
  `salary_frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') DEFAULT 'MONTHLY',
  `base_salary` DECIMAL(15,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: salary_components
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `salary_components` (
  `id` CHAR(36) NOT NULL DEFAULT UUID(),
  `employee_id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `type` ENUM('ALLOWANCE', 'DEDUCTION') NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_salary_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: cash_sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_sessions` (
  `id` CHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `start_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `end_amount` DECIMAL(15,2) NULL,
  `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `created_by` CHAR(36) NOT NULL,
  `closed_by` CHAR(36) NULL,
  `transactions_count` INT DEFAULT 0,
  `expenses_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: expenses
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` CHAR(36) NOT NULL,
  `date` DATETIME NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `category` ENUM('FUEL', 'FOOD', 'MAINTENANCE', 'SALARY', 'OTHER') NOT NULL,
  `description` TEXT,
  `created_by` CHAR(36) NOT NULL,
  `cash_session_id` CHAR(36) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: transactions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` CHAR(36) NOT NULL,
  `date` DATETIME NOT NULL,
  `type` ENUM('PURCHASE', 'SALE') NOT NULL,
  `partner_id` CHAR(36) NULL,
  `partner_name` VARCHAR(255) NULL,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_by` CHAR(36) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`),
  INDEX `idx_type` (`type`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: transaction_items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` CHAR(36) NOT NULL DEFAULT UUID(),
  `transaction_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `price` DECIMAL(15,2) NOT NULL,
  `total` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_trx_item_trx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: attendance
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` CHAR(36) NOT NULL,
  `employee_id` CHAR(36) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `type` ENUM('CHECK_IN', 'CHECK_OUT') NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

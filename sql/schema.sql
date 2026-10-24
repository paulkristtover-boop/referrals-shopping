CREATE DATABASE IF NOT EXISTS referrals_shopping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE referrals_shopping;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) DEFAULT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  terms_accepted_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE packages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category ENUM('regular','gambling') NOT NULL,
  referrals INT UNSIGNED NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  package_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  target_url TEXT NOT NULL,
  status ENUM('pending_payment','pending_approval','approved','rejected','completed') NOT NULL DEFAULT 'pending_payment',
  paid_amount DECIMAL(10,2) DEFAULT NULL,
  crypto_chain ENUM('trx','sol','ton') DEFAULT NULL,
  payment_note VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT UNSIGNED NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL DEFAULT 0.10,
  wait_seconds INT UNSIGNED NOT NULL DEFAULT 15,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE task_submissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  screenshot_path VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY one_submit (task_id, user_id)
) ENGINE=InnoDB;

CREATE TABLE withdrawals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  crypto_chain ENUM('trx','sol','ton') NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  status ENUM('pending','paid','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO packages (name, category, referrals, price_usd) VALUES
('1000 referrals', 'regular', 1000, 50.00),
('1900 referrals', 'regular', 1900, 100.00),
('3800 referrals', 'regular', 3800, 200.00),
('1000 referrals (gambling)', 'gambling', 1000, 100.00),
('1900 referrals (gambling)', 'gambling', 1900, 200.00),
('3800 referrals (gambling)', 'gambling', 3800, 400.00);

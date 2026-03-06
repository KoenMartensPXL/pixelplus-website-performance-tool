-- =========================================================
-- PIXELPLUS WEBSITE PERFORMANCE TOOL
-- FULL MYSQL 8 SCHEMA
-- =========================================================

DROP DATABASE IF EXISTS pixelplus_analytics;
CREATE DATABASE pixelplus_analytics;
USE pixelplus_analytics;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS gsc_daily_queries;
DROP TABLE IF EXISTS gsc_daily_metrics;
DROP TABLE IF EXISTS monthly_reports;
DROP TABLE IF EXISTS ga4_daily_breakdowns;
DROP TABLE IF EXISTS ga4_daily_metrics;
DROP TABLE IF EXISTS job_runs;
DROP TABLE IF EXISTS magic_link_tokens;
DROP TABLE IF EXISTS customers;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE customers (
  id CHAR(36) PRIMARY KEY,

  name VARCHAR(255) NOT NULL,

  contact_emails TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  ga4_property_id VARCHAR(100) NOT NULL,

  gsc_site_url VARCHAR(255) NOT NULL,

  last_ga4_fetch_date DATE NULL,
  last_gsc_fetch_date DATE NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_email ON customers(email);

-- =========================================================
-- JOB RUNS
-- =========================================================
CREATE TABLE job_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  target_date DATE NULL,
  customers_total INT NOT NULL DEFAULT 0,
  customers_success INT NOT NULL DEFAULT 0,
  customers_failed INT NOT NULL DEFAULT 0,
  error_summary TEXT NULL
);

CREATE INDEX idx_job_runs_name_started
  ON job_runs(job_name, started_at);

-- =========================================================
-- MAGIC LINK TOKENS
-- =========================================================
CREATE TABLE magic_link_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,

  CONSTRAINT fk_magic_link_tokens_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_magic_link_tokens_customer
  ON magic_link_tokens(customer_id);

CREATE INDEX idx_magic_link_tokens_expires
  ON magic_link_tokens(expires_at);

-- =========================================================
-- GA4 DAILY METRICS
-- =========================================================
CREATE TABLE ga4_daily_metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,

  new_users INT NOT NULL DEFAULT 0,
  active_users INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  pageviews INT NOT NULL DEFAULT 0,

  engagement_rate DECIMAL(6,5) NULL,
  bounce_rate DECIMAL(6,5) NULL,
  avg_engagement_time_seconds INT NULL,
  pages_per_session DECIMAL(10,4) NULL,

  conversions INT NOT NULL DEFAULT 0,
  total_revenue DECIMAL(14,2) NULL DEFAULT 0.00,

  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_ga4_daily_metrics UNIQUE (customer_id, metric_date),
  CONSTRAINT fk_ga4_daily_metrics_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_ga4_daily_metrics_customer_date
  ON ga4_daily_metrics(customer_id, metric_date);

-- =========================================================
-- GA4 DAILY BREAKDOWNS
-- =========================================================
CREATE TABLE ga4_daily_breakdowns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,

  top_pages JSON NOT NULL,
  top_countries JSON NOT NULL,
  top_sources JSON NOT NULL,
  top_events JSON NOT NULL,
  device_split JSON NOT NULL,

  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_ga4_daily_breakdowns UNIQUE (customer_id, metric_date),
  CONSTRAINT fk_ga4_daily_breakdowns_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_ga4_daily_breakdowns_customer_date
  ON ga4_daily_breakdowns(customer_id, metric_date);

-- =========================================================
-- GSC DAILY METRICS
-- =========================================================
CREATE TABLE gsc_daily_metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,

  clicks INT NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  ctr DECIMAL(8,6) NULL,
  avg_position DECIMAL(10,4) NULL,

  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_gsc_daily_metrics UNIQUE (customer_id, metric_date),
  CONSTRAINT fk_gsc_daily_metrics_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_gsc_daily_metrics_customer_date
  ON gsc_daily_metrics(customer_id, metric_date);

-- =========================================================
-- GSC DAILY QUERIES
-- =========================================================
CREATE TABLE gsc_daily_queries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  metric_date DATE NOT NULL,

  top_queries JSON NOT NULL,

  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_gsc_daily_queries UNIQUE (customer_id, metric_date),
  CONSTRAINT fk_gsc_daily_queries_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_gsc_daily_queries_customer_date
  ON gsc_daily_queries(customer_id, metric_date);

-- =========================================================
-- MONTHLY REPORTS
-- =========================================================
CREATE TABLE monthly_reports (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  report_month DATE NOT NULL,

  summary JSON NOT NULL,
  comparison JSON NOT NULL,

  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_sent_at TIMESTAMP NULL DEFAULT NULL,

  CONSTRAINT uq_monthly_reports UNIQUE (customer_id, report_month),
  CONSTRAINT fk_monthly_reports_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_monthly_reports_customer_month
  ON monthly_reports(customer_id, report_month);
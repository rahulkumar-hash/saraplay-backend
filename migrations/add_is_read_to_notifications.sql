-- =============================================
-- Migration: Create notice_reads table
-- 
-- Strategy: notice table is global broadcast
-- (shared for all users, no per-user rows).
-- So we track read status in a SEPARATE table
-- notice_reads — one row per (user, notice).
--
-- Run this SQL on your PostgreSQL database
-- =============================================

CREATE TABLE IF NOT EXISTS notice_reads (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  notice_id  INTEGER NOT NULL,
  read_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_notice UNIQUE (user_id, notice_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_notice_reads_user_id
ON notice_reads (user_id);

-- =============================================
-- Verify: Check table created successfully
-- =============================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notice_reads'
ORDER BY ordinal_position;

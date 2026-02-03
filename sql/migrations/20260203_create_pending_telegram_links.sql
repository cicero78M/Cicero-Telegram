-- Migration: Create pending_telegram_links table
-- Created: 2026-02-03
-- Purpose: Track pending telegram linking approval requests

CREATE TABLE IF NOT EXISTS pending_telegram_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  telegram_chat_id VARCHAR NOT NULL,
  telegram_username VARCHAR,
  telegram_first_name VARCHAR,
  telegram_last_name VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approval_code VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, telegram_chat_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_telegram_links_user_id ON pending_telegram_links(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_telegram_links_telegram_chat_id ON pending_telegram_links(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_pending_telegram_links_approval_code ON pending_telegram_links(approval_code);
CREATE INDEX IF NOT EXISTS idx_pending_telegram_links_status ON pending_telegram_links(status);

-- Add comments
COMMENT ON TABLE pending_telegram_links IS 'Tracks pending telegram linking approval requests';
COMMENT ON COLUMN pending_telegram_links.approval_code IS 'Unique code for user to approve linking request';
COMMENT ON COLUMN pending_telegram_links.expires_at IS 'Link request expires after 24 hours';

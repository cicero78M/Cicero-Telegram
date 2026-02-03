-- Migration: Add telegram_chat_id to user table
-- Created: 2026-02-03
-- Purpose: Allow users to link their Telegram accounts to user profiles

-- Add telegram_chat_id column to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_telegram_chat_id ON "user"(telegram_chat_id);

-- Add comment to the column
COMMENT ON COLUMN "user".telegram_chat_id IS 'Telegram chat ID for user bot linking';

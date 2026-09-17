CREATE TABLE IF NOT EXISTS telegram_menu_access (
  access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id VARCHAR NOT NULL,
  telegram_user_id VARCHAR,
  telegram_username VARCHAR,
  telegram_name VARCHAR,
  client_id VARCHAR NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by VARCHAR,
  UNIQUE (telegram_chat_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_tg_menu_access_chat ON telegram_menu_access (telegram_chat_id, status);
CREATE INDEX IF NOT EXISTS idx_tg_menu_access_client ON telegram_menu_access (client_id, status);


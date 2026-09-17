import { query } from '../repository/db.js';

let ensured = false;

export async function ensureTelegramMenuAccessTable() {
  if (ensured) return;
  await query('CREATE TABLE IF NOT EXISTS telegram_menu_access (' +
    'access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), telegram_chat_id VARCHAR NOT NULL, ' +
    'telegram_user_id VARCHAR, telegram_username VARCHAR, telegram_name VARCHAR, client_id VARCHAR NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE, ' +
    'status VARCHAR NOT NULL DEFAULT \'pending\' CHECK (status IN (\'pending\',\'approved\',\'rejected\',\'revoked\')), ' +
    'requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ, decided_by VARCHAR, UNIQUE (telegram_chat_id, client_id))');
  await query('CREATE INDEX IF NOT EXISTS idx_tg_menu_access_chat ON telegram_menu_access (telegram_chat_id, status)');
  await query('CREATE INDEX IF NOT EXISTS idx_tg_menu_access_client ON telegram_menu_access (client_id, status)');
  await query("CREATE UNIQUE INDEX IF NOT EXISTS idx_tg_menu_access_one_active_scope ON telegram_menu_access (telegram_chat_id) WHERE status IN ('pending','approved')");
  ensured = true;
}

export async function findApprovedClients(chatId) {
  await ensureTelegramMenuAccessTable();
  const res = await query('SELECT c.client_id, c.nama, c.client_type, c.client_status, c.client_group FROM telegram_menu_access a JOIN clients c ON c.client_id=a.client_id WHERE a.telegram_chat_id=$1 AND a.status=\'approved\' AND c.client_status=true AND LOWER(c.client_type)=LOWER(\'org\') ORDER BY c.client_id', [String(chatId)]);
  return res.rows;
}

export async function findCurrent(chatId) { await ensureTelegramMenuAccessTable(); const res = await query("SELECT * FROM telegram_menu_access WHERE telegram_chat_id=$1 AND status IN ('pending','approved') ORDER BY requested_at DESC LIMIT 1", [String(chatId)]); return res.rows[0] || null; }

export async function findPending(chatId, clientId) {
  await ensureTelegramMenuAccessTable();
  const res = await query('SELECT * FROM telegram_menu_access WHERE telegram_chat_id=$1 AND client_id=$2 AND status=\'pending\' LIMIT 1', [String(chatId), clientId]);
  return res.rows[0] || null;
}

export async function createRequest(data) {
  await ensureTelegramMenuAccessTable();
  const res = await query('INSERT INTO telegram_menu_access (telegram_chat_id, telegram_user_id, telegram_username, telegram_name, client_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (telegram_chat_id, client_id) DO UPDATE SET telegram_user_id=EXCLUDED.telegram_user_id, telegram_username=EXCLUDED.telegram_username, telegram_name=EXCLUDED.telegram_name, status=CASE WHEN telegram_menu_access.status=\'rejected\' THEN \'pending\' ELSE telegram_menu_access.status END, requested_at=NOW() RETURNING *', [String(data.chatId), data.userId ? String(data.userId) : null, data.username || null, data.name || null, data.clientId]);
  return res.rows[0];
}

export async function findById(accessId) {
  await ensureTelegramMenuAccessTable();
  const res = await query('SELECT * FROM telegram_menu_access WHERE access_id=$1', [accessId]);
  return res.rows[0] || null;
}

export async function decide(accessId, status, decidedBy) {
  await ensureTelegramMenuAccessTable();
  const res = await query('UPDATE telegram_menu_access SET status=$2, decided_at=NOW(), decided_by=$3 WHERE access_id=$1 AND status=\'pending\' RETURNING *', [accessId, status, String(decidedBy)]);
  return res.rows[0] || null;
}


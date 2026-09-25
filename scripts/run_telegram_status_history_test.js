#!/usr/bin/env node

/**
 * Isolated Telegram status-history smoke test.
 * Refuses the active database and only runs with an explicit test/staging marker.
 */
import fs from 'node:fs';
import process from 'node:process';
import dotenv from 'dotenv';

const target = String(process.env.STATUS_HISTORY_DB_TARGET || '').trim().toLowerCase();
const envPath = process.env.STATUS_HISTORY_ENV_FILE || '.env.status-history-test';
if (!['test', 'staging'].includes(target)) {
  throw new Error('Refused: STATUS_HISTORY_DB_TARGET must be test or staging');
}
if (!fs.existsSync(envPath)) {
  throw new Error(`Refused: environment file not found: ${envPath}`);
}

const fileEnv = dotenv.parse(fs.readFileSync(envPath));
if (!fileEnv.DB_HOST || !fileEnv.DB_NAME || !fileEnv.DB_USER || !fileEnv.DB_PASS) {
  throw new Error('Refused: test environment must define DB_HOST, DB_NAME, DB_USER, and DB_PASS');
}
if (fileEnv.DB_NAME === 'cicero_db') {
  throw new Error('Refused: cicero_db cannot be used for this isolated test');
}

for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
process.env.JWT_SECRET ||= 'telegram-status-history-test-only';
process.env.USER_STATUS_HISTORY_DUAL_WRITE = 'true';

const { query, close } = await import('../src/db/postgres.js');
const { applyTelegramStatusChange } = await import('../src/service/telegramStatusChangeService.js');

const targetUserId = '99000002';
const rollbackUserId = '99000003';
const actor = {
  user_id: '99000009',
  telegram_chat_id: '70000099',
  nama: 'TELEGRAM TEST ACTOR',
  title: 'AKP',
  client_id: 'TEST',
  status: true,
  roles: ['operator'],
};

const cleanup = async () => {
  await query('DELETE FROM user_status_history WHERE user_id = ANY($1::varchar[])', [[targetUserId, rollbackUserId]]);
  await query('DELETE FROM user_roles WHERE user_id = ANY($1::varchar[])', [[targetUserId, rollbackUserId]]);
  await query('DELETE FROM "user" WHERE user_id = ANY($1::varchar[])', [[targetUserId, rollbackUserId]]);
};

try {
  const identity = (await query(`
    SELECT current_database() AS database,
           inet_server_addr()::text AS server_addr,
           pg_is_in_recovery() AS in_recovery
  `)).rows[0];
  if (identity.database === 'cicero_db') throw new Error('Refused: resolved target is cicero_db');

  await cleanup();
  await query(`
    INSERT INTO "user" (user_id, nama, title, divisi, client_id, status, whatsapp)
    VALUES ($1, 'TELEGRAM STATUS TEST', 'BRIPTU', 'TEST', 'TEST', TRUE, '628000000001'),
           ($2, 'TELEGRAM ROLLBACK TEST', 'BRIPTU', 'TEST', 'TEST', TRUE, '628000000002')
  `, [targetUserId, rollbackUserId]);
  await query("INSERT INTO roles (role_name) VALUES ('telegram-status-test-role') ON CONFLICT (role_name) DO NOTHING");
  await query(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT uid.user_id, r.role_id
    FROM unnest($1::varchar[]) AS uid(user_id)
    CROSS JOIN roles r
    WHERE r.role_name = 'telegram-status-test-role'
    ON CONFLICT DO NOTHING
  `, [[targetUserId, rollbackUserId]]);

  const changed = await applyTelegramStatusChange({
    userId: targetUserId,
    actionType: 'role_remove',
    roleName: 'telegram-status-test-role',
    actorUser: actor,
    chatId: actor.telegram_chat_id,
    reasonCode: 'staging_test',
    reasonText: 'isolated Telegram status-history test',
  });
  const successCheck = (await query(`
    SELECT u.status, u.whatsapp,
      (SELECT COUNT(*) FROM user_status_history WHERE user_id=$1) AS history_count,
      (SELECT action_type FROM user_status_history WHERE user_id=$1 ORDER BY applied_at DESC LIMIT 1) AS action_type,
      (SELECT actor_external_id FROM user_status_history WHERE user_id=$1 ORDER BY applied_at DESC LIMIT 1) AS actor_external_id
    FROM "user" u WHERE u.user_id=$1
  `, [targetUserId])).rows[0];
  if (changed.status !== false || successCheck.status !== false || successCheck.whatsapp !== '' ||
      successCheck.history_count !== '1' || successCheck.action_type !== 'role_remove' ||
      successCheck.actor_external_id !== actor.telegram_chat_id) {
    throw new Error(`Unexpected Telegram success result: ${JSON.stringify(successCheck)}`);
  }

  await applyTelegramStatusChange({
    userId: targetUserId,
    actionType: 'activate',
    actorUser: actor,
    chatId: actor.telegram_chat_id,
    reasonCode: 'staging_test',
    reasonText: 'isolated Telegram activation test',
  });
  const activationCheck = (await query(`
    SELECT u.status,
      (SELECT COUNT(*) FROM user_status_history WHERE user_id=$1) AS history_count,
      (SELECT action_type FROM user_status_history WHERE user_id=$1 ORDER BY applied_at DESC LIMIT 1) AS action_type
    FROM "user" u WHERE u.user_id=$1
  `, [targetUserId])).rows[0];
  if (activationCheck.status !== true || activationCheck.history_count !== '2' || activationCheck.action_type !== 'activate') {
    throw new Error(`Unexpected Telegram activation result: ${JSON.stringify(activationCheck)}`);
  }

  try {
    await applyTelegramStatusChange({
      userId: rollbackUserId,
      actionType: 'invalid_action_for_rollback_test',
      actorUser: actor,
      chatId: actor.telegram_chat_id,
      reasonCode: 'staging_test',
      reasonText: 'intentional rollback test',
    });
    throw new Error('Expected invalid action to fail');
  } catch (error) {
    if (error.message === 'Expected invalid action to fail') throw error;
  }
  const rollbackCheck = (await query(`
    SELECT u.status, u.whatsapp,
      (SELECT COUNT(*) FROM user_status_history WHERE user_id=$1) AS history_count
    FROM "user" u WHERE u.user_id=$1
  `, [rollbackUserId])).rows[0];
  if (rollbackCheck.status !== true || rollbackCheck.whatsapp !== '628000000002' || rollbackCheck.history_count !== '0') {
    throw new Error(`Rollback failed: ${JSON.stringify(rollbackCheck)}`);
  }

  console.log(JSON.stringify({
    target,
    identity,
    feature_flag: 'ON (isolated process only)',
    activation: { status: activationCheck.status, history_count: activationCheck.history_count, action_type: activationCheck.action_type },
    deactivation: { status: successCheck.status, whatsapp: successCheck.whatsapp, history_count: successCheck.history_count },
    rollback: { status: rollbackCheck.status, whatsapp_restored: rollbackCheck.whatsapp === '628000000002', history_count: rollbackCheck.history_count },
  }, null, 2));
} finally {
  await cleanup().catch(() => {});
  await close().catch(() => {});
}

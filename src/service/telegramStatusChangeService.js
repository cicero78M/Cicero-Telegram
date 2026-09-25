import { withTransaction } from '../repository/db.js';
import { resolveTelegramStatusActor } from './telegramStatusActorResolver.js';

export function isTelegramStatusHistoryEnabled() {
  return process.env.USER_STATUS_HISTORY_DUAL_WRITE === 'true';
}

function roleNames(rows) {
  return rows.map((row) => row.role_name).filter(Boolean);
}

/**
 * Applies a Telegram status/role change and its audit event atomically.
 * The caller keeps the legacy model path while the feature flag is OFF.
 */
export async function applyTelegramStatusChange({
  userId,
  actionType,
  roleName = null,
  actorUser,
  chatId,
  reasonCode = 'telegram_operator',
  reasonText = 'Perubahan status melalui menu operator Telegram',
}) {
  const actor = resolveTelegramStatusActor({ linkedUser: actorUser, chatId });
  return withTransaction(async (db) => {
    const targetResult = await db.query(
        'SELECT user_id, nama, title, divisi, client_id, status, whatsapp FROM "user" WHERE user_id=$1 FOR UPDATE',
        [userId],
      );
    const target = targetResult.rows[0];
    if (!target) throw new Error('user tidak ditemukan');
    if (String(target.client_id || '').toLowerCase() !== String(actor.clientId || '').toLowerCase()) {
      throw new Error('user berada di luar client actor Telegram');
    }

    const rolesResult = await db.query(
        `SELECT r.role_name FROM user_roles ur
         JOIN roles r ON r.role_id=ur.role_id
         WHERE ur.user_id=$1 ORDER BY r.role_name`,
        [userId],
      );
    const currentRoles = roleNames(rolesResult.rows);
    const normalizedRole = typeof roleName === 'string' && roleName.trim()
        ? roleName.trim().toLowerCase()
        : null;

    if (normalizedRole) {
        const selected = currentRoles.find((role) => role.toLowerCase() === normalizedRole);
        if (!selected) throw new Error(`Role ${roleName} tidak ditemukan untuk user`);
        await db.query(
          'DELETE FROM user_roles WHERE user_id=$1 AND role_id=(SELECT role_id FROM roles WHERE LOWER(role_name)=LOWER($2))',
          [userId, roleName],
        );
      }

    const remainingRoles = normalizedRole
        ? currentRoles.filter((role) => role.toLowerCase() !== normalizedRole)
        : currentRoles;
    const oldStatus = target.status === true;
      const newStatus = actionType === 'activate'
        ? true
        : (!normalizedRole || remainingRoles.length === 0 ? false : oldStatus);

    await db.query('UPDATE "user" SET status=$2, updated_at=NOW() WHERE user_id=$1', [userId, newStatus]);
    if (!newStatus) {
        await db.query('UPDATE "user" SET whatsapp=\'\', updated_at=NOW() WHERE user_id=$1', [userId]);
      }

    await db.query(
        `INSERT INTO user_status_history (
          user_id, target_client_id, old_status, new_status, action_type,
          reason_code, reason_text, target_name_snapshot, target_title_snapshot,
          target_divisi_snapshot, removed_role, remaining_roles, source_channel,
          actor_user_id, actor_external_id, actor_name_snapshot, actor_title_snapshot,
          actor_role_snapshot, actor_client_id, actor_resolution_status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          userId, target.client_id, oldStatus, newStatus, actionType,
          reasonCode, reasonText, target.nama, target.title, target.divisi,
          roleName, JSON.stringify(remainingRoles), 'telegram_operator',
          actor.userId, actor.externalId, actor.name, actor.title,
          actor.role, actor.clientId, actor.resolutionStatus,
        ],
      );

    return { ...target, status: newStatus, remainingRoles };
  });
}

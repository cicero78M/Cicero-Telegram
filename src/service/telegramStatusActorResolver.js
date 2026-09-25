/**
 * Resolve a Telegram-linked Cicero user into the actor snapshot required by
 * status-history events. The chat ID is evidence of the link, not a substitute
 * for the user's identity, role, or client scope.
 */
export function resolveTelegramStatusActor({ linkedUser, chatId }) {
  if (!linkedUser || String(linkedUser.telegram_chat_id || '') !== String(chatId || '')) {
    throw new Error('Akun Telegram belum tertaut sebagai user Cicero');
  }
  if (linkedUser.status !== true) {
    throw new Error('User Telegram tidak aktif');
  }

  const roles = Array.isArray(linkedUser.roles)
    ? linkedUser.roles.filter(Boolean).map((role) => String(role).toLowerCase())
    : [];
  const actor = {
    userId: linkedUser.user_id,
    externalId: linkedUser.telegram_chat_id,
    name: linkedUser.nama,
    title: linkedUser.title,
    role: linkedUser.actor_role || roles[0] || null,
    clientId: linkedUser.client_id,
    clientIds: [linkedUser.client_id].filter(Boolean),
    resolutionStatus: 'resolved',
    sourceChannel: 'telegram',
  };

  for (const [key, value] of Object.entries(actor)) {
    if (['clientIds', 'resolutionStatus', 'sourceChannel'].includes(key)) continue;
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Identitas actor Telegram tidak lengkap: ${key}`);
    }
  }
  return actor;
}

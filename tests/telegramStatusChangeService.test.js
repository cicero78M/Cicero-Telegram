import { jest } from '@jest/globals';

const mockWithTransaction = jest.fn();
const mockResolveActor = jest.fn();

jest.unstable_mockModule('../src/repository/db.js', () => ({
  withTransaction: mockWithTransaction,
}));
jest.unstable_mockModule('../src/service/telegramStatusActorResolver.js', () => ({
  resolveTelegramStatusActor: mockResolveActor,
}));

const { applyTelegramStatusChange, isTelegramStatusHistoryEnabled } =
  await import('../src/service/telegramStatusChangeService.js');

const actor = {
  userId: '82050014', externalId: '70000001', name: 'ACTOR', title: 'AKP',
  role: 'operator', clientId: 'CLIENT_A', resolutionStatus: 'resolved',
};

beforeEach(() => {
  mockWithTransaction.mockReset();
  mockResolveActor.mockReset();
  mockResolveActor.mockReturnValue(actor);
  delete process.env.USER_STATUS_HISTORY_DUAL_WRITE;
});

test('feature flag is off by default', () => {
  expect(isTelegramStatusHistoryEnabled()).toBe(false);
});

test('activates and writes history through one transaction callback', async () => {
  process.env.USER_STATUS_HISTORY_DUAL_WRITE = 'true';
  const queries = [];
  const db = { query: jest.fn(async (sql) => {
    queries.push(sql);
    if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: '99000001', nama: 'TARGET', title: 'IPDA', divisi: 'OPS', client_id: 'CLIENT_A', status: false, whatsapp: '' }] };
    if (sql.startsWith('SELECT r.role_name')) return { rows: [{ role_name: 'operator' }] };
    return { rows: [] };
  }) };
  mockWithTransaction.mockImplementation(async (callback) => callback(db));

  const result = await applyTelegramStatusChange({
    userId: '99000001', actionType: 'activate', actorUser: { telegram_chat_id: '70000001' }, chatId: '70000001',
  });

  expect(result.status).toBe(true);
  expect(queries.some((sql) => sql.includes('INSERT INTO user_status_history'))).toBe(true);
  expect(queries.some((sql) => sql === 'BEGIN' || sql === 'COMMIT')).toBe(false);
});

test('rolls back through the transaction owner when history insert fails', async () => {
  process.env.USER_STATUS_HISTORY_DUAL_WRITE = 'true';
  const db = { query: jest.fn(async (sql) => {
    if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: '99000001', client_id: 'CLIENT_A', status: true }] };
    if (sql.startsWith('SELECT r.role_name')) return { rows: [{ role_name: 'operator' }] };
    if (sql.startsWith('INSERT INTO user_status_history')) throw new Error('history failure');
    return { rows: [] };
  }) };
  mockWithTransaction.mockImplementation(async (callback) => {
    try { return await callback(db); } catch (error) { db.query('ROLLBACK'); throw error; }
  });

  await expect(applyTelegramStatusChange({
    userId: '99000001', actionType: 'deactivate', actorUser: { telegram_chat_id: '70000001' }, chatId: '70000001',
  })).rejects.toThrow('history failure');
  expect(db.query).toHaveBeenCalledWith('ROLLBACK');
});

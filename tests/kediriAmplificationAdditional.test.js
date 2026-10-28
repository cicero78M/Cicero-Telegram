import { jest } from '@jest/globals';
const query = jest.fn();
const txQuery = jest.fn();
const withTransaction = jest.fn((callback) => callback({ query: txQuery }));
jest.unstable_mockModule('../src/repository/db.js', () => ({ query, withTransaction }));
const users = await import('../src/model/userModel.js');
const routine = await import('../src/model/linkReportModel.js');
const special = await import('../src/model/linkReportKhususModel.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  query.mockResolvedValue({ rows: [] });
  txQuery.mockReset();
});
afterAll(() => { if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED; else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old; });

test('amplifier user query requires exact tenant and filters active membership; unknown roles reject', async () => {
  await users.getUsersByClient('KEDIRI', 'amplifier');
  expect(query.mock.calls[0][0]).toContain('LOWER(u.client_id) = LOWER($1)');
  expect(query.mock.calls[0][1]).toEqual(['KEDIRI', 'amplifier']);
  await expect(users.getUsersByClient('OTHER', 'amplifier')).rejects.toThrow();
  await expect(users.getUsersByClient('KEDIRI', 'typo')).rejects.toThrow();
  expect(query).toHaveBeenCalledTimes(1);
});

test.each(['getReportsThisMonthByClient', 'getReportsPrevMonthByClient'])('%s gates historic exports using current membership', async (name) => {
  await routine[name]('KEDIRI');
  expect(query.mock.calls[0][0]).toMatch(/u\.status = true AND EXISTS/);
  expect(query.mock.calls[0][0]).toContain("LOWER(ar.role_name) = 'amplifier'");
  expect(query.mock.calls[0][1]).toEqual(['KEDIRI']);
  await routine[name]('OTHER');
  expect(query.mock.calls[1][0]).not.toContain('aur.role_id');
});

test.each(['harian', 'mingguan', 'bulanan', 'semua'])('regular %s aggregate uses scoped amplifier roster', async (period) => {
  query.mockResolvedValueOnce({ rows: [{ jumlah_post: '0' }] }).mockResolvedValueOnce({ rows: [] });
  await routine.getRekapLinkByClient('KEDIRI', period);
  const [sql, params] = query.mock.calls[1];
  expect(sql).toContain('LOWER(u.client_id) = LOWER($1)');
  expect(sql).toContain('LOWER(r.role_name) = LOWER(');
  expect(params).toContain('amplifier');
});

test.each(['harian', 'mingguan', 'bulanan', 'semua'])('special %s aggregate uses scoped amplifier roster', async (period) => {
  query.mockResolvedValueOnce({ rows: [{ jumlah_post: '0' }] }).mockResolvedValueOnce({ rows: [] });
  await special.getRekapLinkByClient('KEDIRI', period);
  const [sql, params] = query.mock.calls[1];
  expect(sql).toContain('LOWER(u.client_id) = LOWER($1)');
  expect(params.at(-1)).toBe('amplifier');
});

test('aggregate rejects conflicting tenant and unauthorized amplifier role before querying', async () => {
  await expect(routine.getRekapLinkByClient('KEDIRI', 'semua', null, null, null, null, { userClientId: 'OTHER' })).rejects.toThrow();
  await expect(special.getRekapLinkByClient('OTHER', 'semua', null, 'amplifier')).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();
});

test('dedicated role grant and revoke only touch amplifier in authorized tenant', async () => {
  txQuery.mockResolvedValueOnce({ rows: [{ user_id: '123' }] }).mockResolvedValueOnce({ rows: [{ role_id: 3 }] }).mockResolvedValueOnce({ rows: [] });
  await users.setKediriAmplifierMembership('123', 'KEDIRI', true);
  expect(txQuery.mock.calls[0][0]).toContain('FOR UPDATE');
  expect(txQuery.mock.calls[2][0]).toContain('INSERT INTO user_roles');
  expect(txQuery.mock.calls[2][1]).toEqual(['123', 3]);
  txQuery.mockResolvedValueOnce({ rows: [{ user_id: '123' }] }).mockResolvedValueOnce({ rows: [{ role_id: 3 }] }).mockResolvedValueOnce({ rows: [] });
  await users.setKediriAmplifierMembership('123', 'KEDIRI', false);
  expect(txQuery.mock.calls[5][0]).toContain('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2');
  await expect(users.setKediriAmplifierMembership('123', 'OTHER', true)).rejects.toThrow();
  expect(withTransaction).toHaveBeenCalledTimes(2);
});

test('missing user or unprovisioned role fails before write', async () => {
  txQuery.mockResolvedValueOnce({ rows: [] });
  await expect(users.setKediriAmplifierMembership('123', 'KEDIRI', true)).rejects.toThrow();
  txQuery.mockResolvedValueOnce({ rows: [{ user_id: '123' }] }).mockResolvedValueOnce({ rows: [] });
  await expect(users.setKediriAmplifierMembership('123', 'KEDIRI', true)).rejects.toThrow();
  expect(txQuery.mock.calls.every(([sql]) => !/^(INSERT|DELETE|UPDATE)/.test(sql))).toBe(true);
});

test('generic mutation fails closed instead of interpolating amplifier as column', async () => {
  await expect(users.updateUser('123', { amplifier: true })).rejects.toThrow();
  await expect(users.updateUserField('123', 'amplifier', true)).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();
});

test.each(['getReportsTodayByClient', 'getReportsYesterdayByClient', 'getReportsTodayByShortcode'])('%s uses gated roster and post tenant', async (name) => {
  query.mockResolvedValueOnce({ rows: [{ client_type: 'org' }] }).mockResolvedValueOnce({ rows: [] });
  await routine[name]('KEDIRI', 'post');
  expect(query.mock.calls[1][0]).toContain("LOWER(ar.role_name) = 'amplifier'");
  expect(query.mock.calls[1][0]).toContain('LOWER(p.client_id) = LOWER($1)');
  expect(query.mock.calls[1][0]).toContain('u.status = true');
});

test.each(['getReportsTodayByClient', 'getReportsTodayByShortcode'])('special %s forces amplifier and tenant when gated', async (name) => {
  await (name.endsWith('Shortcode') ? special[name]('KEDIRI', 'p', 'operator') : special[name]('KEDIRI', 'operator'));
  expect(query.mock.calls[0][0]).toContain("LOWER(ro.role_name) = 'amplifier'");
  expect(query.mock.calls[0][0]).toContain('LOWER(p.client_id) = LOWER($1)');
});

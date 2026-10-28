import { jest } from '@jest/globals';
const query = jest.fn();
jest.unstable_mockModule('../src/repository/db.js', () => ({ query, withTransaction: jest.fn() }));
const users = await import('../src/model/userModel.js');
const routine = await import('../src/model/linkReportModel.js');
const special = await import('../src/model/linkReportKhususModel.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
beforeEach(() => { jest.clearAllMocks(); process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true'; query.mockResolvedValue({ rows: [] }); });
afterAll(() => { if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED; else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old; });
const assertMixed = (sql) => {
  expect(sql).toContain("COALESCE(UPPER(TRIM(u.client_id)), '') <> 'KEDIRI'");
  expect(sql).toContain("LOWER(mixed_role.role_name) = 'amplifier'");
  expect(sql).toContain('mixed_ur.user_id = u.user_id');
};
test('directorate roster is gated only when requested by amplification, preserving engagement', async () => {
  await users.getUsersByDirektorat('ditbinmas', null, { amplificationRoster: true });
  assertMixed(query.mock.calls[0][0]);
  await users.getUsersByDirektorat('ditbinmas');
  expect(query.mock.calls[1][0]).not.toContain('mixed_role');
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'false';
  await users.getUsersByDirektorat('ditbinmas', null, { amplificationRoster: true });
  expect(query.mock.calls[2][0]).not.toContain('mixed_role');
});
test('special attendance roster opts in after existing client-role filter', async () => {
  query.mockResolvedValueOnce({ rows: [{ client_type: 'direktorat' }] }).mockResolvedValueOnce({ rows: [] });
  await users.getUsersByClient('ditbinmas', null, { amplificationRoster: true });
  assertMixed(query.mock.calls[1][0]);
});
test.each(['getReportsTodayByClient', 'getReportsYesterdayByClient', 'getReportsTodayByShortcode'])('%s mixed directory restricts Kediri only', async (name) => {
  query.mockResolvedValueOnce({ rows: [{ client_type: 'direktorat' }] }).mockResolvedValueOnce({ rows: [] });
  await routine[name]('ditbinmas', 'post');
  assertMixed(query.mock.calls[1][0]);
});
test.each(['harian', 'mingguan', 'bulanan', 'semua'])('regular %s directory aggregate keeps original role and gates Kediri', async (period) => {
  query.mockResolvedValueOnce({ rows: [{ jumlah_post: '0' }] }).mockResolvedValueOnce({ rows: [] });
  await routine.getRekapLinkByClient('ditbinmas', period, null, null, null, 'ditbinmas');
  const [sql, params] = query.mock.calls[1]; assertMixed(sql); expect(params).toContain('ditbinmas');
});
test.each(['harian', 'mingguan', 'bulanan', 'semua'])('special %s directory aggregate gates Kediri', async (period) => {
  query.mockResolvedValueOnce({ rows: [{ jumlah_post: '0' }] }).mockResolvedValueOnce({ rows: [] });
  await special.getRekapLinkByClient('ditbinmas', period);
  assertMixed(query.mock.calls[1][0]);
});
test.each(['getReportsThisMonthByClient', 'getReportsPrevMonthByClient'])('%s mixed export excludes KEDIRI nonmembers and does not infer orphan tenant', async (name) => {
  await routine[name]('ditbinmas');
  const sql = query.mock.calls[0][0]; assertMixed(sql);
  expect(sql).toContain('JOIN insta_post p ON p.shortcode = r.shortcode');
  expect(sql).toContain('WHERE p.client_id = $1');
});

test('operator lookup retains legacy role for other clients and limits mixed KEDIRI users', async () => {
  query.mockResolvedValueOnce({ rows: [{ client_type: 'direktorat' }] }).mockResolvedValueOnce({ rows: [] });
  await users.getOperatorsByClient('ditbinmas', { amplificationRoster: true });
  expect(query.mock.calls[1][0]).toContain("LOWER(r_opr.role_name) = 'operator'");
  assertMixed(query.mock.calls[1][0]);
});
test.each(['getReportsTodayByClient', 'getReportsTodayByShortcode'])('special %s report contains mixed-client safeguard', async (name) => {
  if (name.endsWith('Shortcode')) await special[name]('ditbinmas', 'post');
  else await special[name]('ditbinmas');
  assertMixed(query.mock.calls[0][0]);
});

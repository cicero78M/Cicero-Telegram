import { jest } from '@jest/globals';
const query = jest.fn();
const today = jest.fn();
const yesterday = jest.fn();
const shortcodes = jest.fn();
jest.unstable_mockModule('../src/repository/db.js', () => ({ query }));
jest.unstable_mockModule('../src/model/linkReportModel.js', () => ({ getReportsTodayByClient: today, getReportsYesterdayByClient: yesterday }));
jest.unstable_mockModule('../src/model/instaPostModel.js', () => ({ getShortcodesTodayByClient: shortcodes, getShortcodesYesterdayByClient: shortcodes }));
const { generateDailyAmplificationReport, generateYesterdayAmplificationReport } = await import('../src/service/oprReportService.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  query.mockImplementation(async (sql) => sql.includes('user_roles') ? { rows: [{ user_id: 'a' }] } : { rows: [{ nama: 'KEDIRI' }] });
  today.mockResolvedValue([{ user_id: 'a', facebook_link: 'ALLOWED' }, { user_id: 'b', facebook_link: 'EXCLUDED' }]);
  yesterday.mockImplementation(today);
  shortcodes.mockResolvedValue(['abc']);
});
afterAll(() => { if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED; else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old; });
test.each([generateDailyAmplificationReport, generateYesterdayAmplificationReport])('service roster switches without leaking operator links', async (report) => {
  const message = await report('KEDIRI');
  expect(query).toHaveBeenCalledWith(expect.stringContaining('r.role_name = $2'), ['KEDIRI', 'amplifier']);
  expect(message).toContain('ALLOWED');
  expect(message).not.toContain('EXCLUDED');
});
test('service remains operator for other clients and when disabled', async () => {
  await generateDailyAmplificationReport('KEDIRI_KOTA');
  expect(query).toHaveBeenCalledWith(expect.stringContaining('r.role_name = $2'), ['KEDIRI_KOTA', 'operator']);
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'false';
  await generateDailyAmplificationReport('KEDIRI');
  expect(query).toHaveBeenCalledWith(expect.stringContaining('r.role_name = $2'), ['KEDIRI', 'operator']);
});

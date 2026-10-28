import { jest } from '@jest/globals';
const query = jest.fn();
const roster = jest.fn();
const reports = jest.fn();
const shortcodes = jest.fn();
jest.unstable_mockModule('../src/db/index.js', () => ({ query }));
jest.unstable_mockModule('../src/model/userModel.js', () => ({ getUsersByClientAndRole: roster }));
jest.unstable_mockModule('../src/model/linkReportModel.js', () => ({ getReportsTodayByClient: reports }));
jest.unstable_mockModule('../src/model/instaPostModel.js', () => ({ getShortcodesTodayByClient: shortcodes }));
const { rekapLink } = await import('../src/handler/fetchabsensi/link/rekapLink.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
beforeEach(() => {
  jest.clearAllMocks(); process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  query.mockResolvedValue({ rows: [{ nama: 'KEDIRI' }] });
  roster.mockResolvedValue([{ user_id: 'a' }]);
  reports.mockResolvedValue([{ user_id: 'a', facebook_link: 'ALLOWED' }, { user_id: 'b', facebook_link: 'EXCLUDED' }]);
  shortcodes.mockResolvedValue(['abc']);
});
afterAll(() => { if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED; else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old; });
test('dashboard action report excludes ineligible links in KEDIRI', async () => {
  const message = await rekapLink('KEDIRI');
  expect(roster).toHaveBeenCalledWith('KEDIRI', 'amplifier');
  expect(message).toContain('ALLOWED'); expect(message).not.toContain('EXCLUDED');
});
test('gate off preserves existing report behavior', async () => {
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'false';
  expect(await rekapLink('KEDIRI')).toContain('EXCLUDED');
  expect(roster).not.toHaveBeenCalled();
});

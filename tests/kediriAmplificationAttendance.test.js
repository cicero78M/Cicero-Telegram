import { jest } from '@jest/globals';

const query = jest.fn();
const users = jest.fn();
const usersByRole = jest.fn();
const operators = jest.fn();
const shortcodes = jest.fn();
const routineReports = jest.fn();
const routinePostReports = jest.fn();
const specialReports = jest.fn();
const specialPostReports = jest.fn();

jest.unstable_mockModule('../src/db/index.js', () => ({ query }));
jest.unstable_mockModule('../src/model/userModel.js', () => ({
  getUsersByClient: users, getUsersByClientAndRole: usersByRole,
  getOperatorsByClient: operators, getUsersByDirektorat: jest.fn(),
}));
jest.unstable_mockModule('../src/model/instaPostModel.js', () => ({ getShortcodesTodayByClient: shortcodes }));
jest.unstable_mockModule('../src/model/instaPostKhususModel.js', () => ({ getShortcodesTodayByClient: shortcodes }));
jest.unstable_mockModule('../src/model/linkReportModel.js', () => ({
  getReportsTodayByClient: routineReports, getReportsTodayByShortcode: routinePostReports,
}));
jest.unstable_mockModule('../src/model/linkReportKhususModel.js', () => ({
  getReportsTodayByClient: specialReports, getReportsTodayByShortcode: specialPostReports,
}));

const routine = await import('../src/handler/fetchabsensi/link/absensiLinkAmplifikasi.js');
const special = await import('../src/handler/fetchabsensi/link/absensiLinkKhusus.js');
const original = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
const amplifier = { user_id: 'a', nama: 'AMPLIFIER USER', divisi: 'A', status: true };
const reports = [
  { user_id: 'a', shortcode: 'p', facebook_link: 'allowed' },
  { user_id: 'o', shortcode: 'p', facebook_link: 'excluded', youtube_link: 'excluded2' },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  query.mockResolvedValue({ rows: [{ nama: 'KEDIRI', client_type: 'org' }] });
  usersByRole.mockResolvedValue([amplifier]);
  users.mockResolvedValue([]);
  operators.mockResolvedValue([{ user_id: 'o', nama: 'OPERATOR USER', divisi: 'O' }]);
  shortcodes.mockResolvedValue(['p']);
  routineReports.mockResolvedValue(reports);
  routinePostReports.mockResolvedValue(reports);
  specialReports.mockResolvedValue(reports);
  specialPostReports.mockResolvedValue(reports);
});
afterAll(() => {
  if (original === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
  else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = original;
});

test.each([
  ['routine', () => routine.absensiLink('KEDIRI', { roleFlag: 'operator' })],
  ['routine per post', () => routine.absensiLinkPerPost('KEDIRI')],
  ['special', () => special.absensiLinkKhusus('KEDIRI', { roleFlag: 'operator' })],
  ['special per post', () => special.absensiLinkKhususPerPost('KEDIRI')],
])('%s uses only active KEDIRI amplifier roster and its link totals', async (_label, run) => {
  const message = await run();
  expect(usersByRole).toHaveBeenCalledWith('KEDIRI', 'amplifier');
  expect(message).toContain('AMPLIFIER USER');
  expect(message).not.toContain('OPERATOR USER');
  expect(message).toMatch(/Jumlah Total Link dari 5 Platform Sosial Media\s*:\s*1/);
});

test('gated-off and neighboring client retain operator behavior', async () => {
  delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
  await routine.absensiLink('KEDIRI');
  expect(operators).toHaveBeenCalledWith('KEDIRI', { amplificationRoster: true });
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  await special.absensiLinkKhusus('KEDIRI_KOTA', { roleFlag: 'operator' });
  expect(operators).toHaveBeenCalledWith('KEDIRI_KOTA', { amplificationRoster: true });
  expect(usersByRole).not.toHaveBeenCalled();
});

test('empty amplifier roster never falls back to operator', async () => {
  usersByRole.mockResolvedValue([]);
  const message = await special.absensiLinkKhusus('KEDIRI');
  expect(message).not.toContain('OPERATOR USER');
  expect(operators).not.toHaveBeenCalled();
});

test('conflicting client filter is rejected instead of crossing tenant', async () => {
  await expect(routine.absensiLink('KEDIRI', { clientFilter: 'OTHER' })).rejects.toThrow();
  expect(usersByRole).not.toHaveBeenCalled();
});

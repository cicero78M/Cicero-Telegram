import { jest } from '@jest/globals';

const today = jest.fn();
const yesterday = jest.fn();
const perPost = jest.fn();
const specialToday = jest.fn();
const specialPost = jest.fn();
const shortcodes = jest.fn();
jest.unstable_mockModule('../src/model/telegramMenuAccessModel.js', () => ({ findApprovedClients: jest.fn().mockResolvedValue([]) }));
jest.unstable_mockModule('../src/model/linkReportModel.js', () => ({
  getReportsTodayByClient: today, getReportsYesterdayByClient: yesterday, getReportsTodayByShortcode: perPost,
}));
jest.unstable_mockModule('../src/model/linkReportKhususModel.js', () => ({
  getReportsTodayByClient: specialToday, getReportsTodayByShortcode: specialPost,
}));
jest.unstable_mockModule('../src/model/instaPostModel.js', () => ({
  getShortcodesTodayByClient: shortcodes, getShortcodesYesterdayByClient: shortcodes,
}));
jest.unstable_mockModule('../src/model/instaPostKhususModel.js', () => ({ getShortcodesTodayByClient: shortcodes }));
const { oprRequestHandlers: handlers } = await import('../src/handler/menu/oprRequestHandlers.js');
const old = process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
let pool, wa, model, session;
const reports = [
  { user_id: 'a', facebook_link: 'ALLOWED_LINK' },
  { user_id: 'o', facebook_link: 'EXCLUDED_LINK' },
];
beforeEach(() => {
  jest.clearAllMocks();
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'true';
  [today, yesterday, perPost, specialToday, specialPost].forEach((fn) => fn.mockResolvedValue(reports));
  shortcodes.mockResolvedValue(['abc']);
  pool = { query: jest.fn().mockResolvedValue({ rows: [{ client_id: 'KEDIRI', nama: 'KEDIRI', client_status: true }] }) };
  wa = { sendMessage: jest.fn() };
  model = { getUsersByClient: jest.fn().mockResolvedValue([{ user_id: 'o' }]), getUsersByClientAndRole: jest.fn().mockResolvedValue([{ user_id: 'a' }]) };
  session = { selected_client_id: 'KEDIRI', rekapShortcodes: ['abc'] };
});
afterAll(() => {
  if (old === undefined) delete process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED;
  else process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = old;
});

test.each([
  ['today', 'rekapLink'], ['yesterday', 'rekapLinkKemarin'],
  ['routine post', 'rekapLinkPerPost_action'], ['special', 'rekapLinkKhusus'],
  ['special post', 'rekapLinkKhususPerPost_action'],
])('%s report includes amplifier reports only', async (_label, handler) => {
  await handlers[handler](session, 'chat', '1', wa, pool, model);
  expect(model.getUsersByClientAndRole).toHaveBeenCalledWith('KEDIRI', 'amplifier');
  const messages = wa.sendMessage.mock.calls.map((call) => call[1]).join('\n');
  expect(messages).toContain('ALLOWED_LINK');
  expect(messages).not.toContain('EXCLUDED_LINK');
});

test('gate off retains operator role and no amplifier access', async () => {
  process.env.KEDIRI_AMPLIFIER_ROLE_ENABLED = 'false';
  await handlers.rekapLink(session, 'chat', '1', wa, pool, model);
  expect(model.getUsersByClient).toHaveBeenCalledWith('KEDIRI', 'operator');
  expect(model.getUsersByClientAndRole).not.toHaveBeenCalled();
  expect(wa.sendMessage.mock.calls.map((x) => x[1]).join('\n')).not.toContain('ALLOWED_LINK');
});

test('empty amplifier roster fails closed', async () => {
  model.getUsersByClientAndRole.mockResolvedValue([]);
  await handlers.rekapLinkKhusus(session, 'chat', '1', wa, pool, model);
  const messages = wa.sendMessage.mock.calls.map((call) => call[1]).join('\n');
  expect(messages).toContain('Tidak ada user amplifier aktif');
  expect(messages).not.toContain('EXCLUDED_LINK');
  expect(model.getUsersByClient).not.toHaveBeenCalled();
});

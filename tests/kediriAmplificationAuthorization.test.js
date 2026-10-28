import { jest } from '@jest/globals';
const listeners = {};
const sent = jest.fn();
const approved = jest.fn();
const main = jest.fn();
class FakeBot {
  onText() {}
  on(event, handler) { listeners[event] = handler; }
  sendMessage(...args) { return sent(...args); }
  stopPolling() {}
}
jest.unstable_mockModule('node-telegram-bot-api', () => ({ default: FakeBot }));
jest.unstable_mockModule('../src/handler/menu/oprRequestHandlers.js', () => ({ default: { main } }));
jest.unstable_mockModule('../src/model/telegramMenuAccessModel.js', () => ({ findApprovedClients: approved }));
jest.unstable_mockModule('../src/repository/db.js', () => ({ query: jest.fn() }));
jest.unstable_mockModule('../src/model/userModel.js', () => ({}));
jest.unstable_mockModule('../src/model/clientModel.js', () => ({}));
jest.unstable_mockModule('../src/handler/fetchpost/tiktokFetchPost.js', () => ({ fetchAndStoreSingleTiktokPost: jest.fn() }));
jest.unstable_mockModule('../src/utils/telegramBotHelpers.js', () => ({
  configureTelegramMenu: jest.fn(), createSendMessageWrapper: () => sent,
  escapeMarkdown: (s) => s,
}));
jest.unstable_mockModule('../src/utils/telegramPolling.js', () => ({ attachTelegramPollingErrorHandler: jest.fn(), getTelegramPollingOptions: () => ({}) }));
const { initializeTelegramOperatorBot, stopTelegramOperatorBot } = await import('../src/service/telegramOperatorBotService.js');
test('revoked or changed authorization blocks a cached attendance tenant before dispatch', async () => {
  approved.mockResolvedValueOnce([{ client_id: 'KEDIRI' }]).mockResolvedValueOnce([{ client_id: 'OTHER' }]);
  main.mockImplementationOnce(async (session) => { session.absensi_client_id = 'KEDIRI'; });
  await initializeTelegramOperatorBot('mock-token');
  const msg = { chat: { id: 987654, type: 'private' }, text: '1' };
  await listeners.message(msg);
  expect(main).toHaveBeenCalledTimes(1);
  await listeners.message(msg);
  expect(main).toHaveBeenCalledTimes(1);
  expect(sent).toHaveBeenCalledWith(987654, expect.stringContaining('Akses client tidak tersedia'));
  await stopTelegramOperatorBot();
});

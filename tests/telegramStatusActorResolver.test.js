import { resolveTelegramStatusActor } from '../src/service/telegramStatusActorResolver.js';

const linkedUser = {
  telegram_chat_id: '70000001',
  user_id: '82050014',
  nama: 'BEKTI PRAMILU K',
  title: 'AKP',
  client_id: 'DITBINMAS',
  status: true,
  roles: ['operator'],
};

test('resolves an approved active Telegram link into a complete actor', () => {
  expect(resolveTelegramStatusActor({ linkedUser, chatId: '70000001' })).toEqual(
    expect.objectContaining({
      userId: '82050014',
      externalId: '70000001',
      name: 'BEKTI PRAMILU K',
      title: 'AKP',
      role: 'operator',
      clientId: 'DITBINMAS',
      resolutionStatus: 'resolved',
      sourceChannel: 'telegram',
    }),
  );
});

test('rejects an unlinked chat', () => {
  expect(() => resolveTelegramStatusActor({ linkedUser, chatId: '70000002' }))
    .toThrow('belum tertaut');
});

test('rejects an inactive linked user', () => {
  expect(() => resolveTelegramStatusActor({ linkedUser: { ...linkedUser, status: false }, chatId: '70000001' }))
    .toThrow('tidak aktif');
});

test('rejects incomplete actor identity', () => {
  expect(() => resolveTelegramStatusActor({ linkedUser: { ...linkedUser, title: '' }, chatId: '70000001' }))
    .toThrow('Identitas actor Telegram tidak lengkap');
});

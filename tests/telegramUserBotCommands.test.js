import { jest } from '@jest/globals';

// Mock the node-telegram-bot-api module
const mockSendMessage = jest.fn().mockResolvedValue();
const mockOnText = jest.fn();
const mockOn = jest.fn();
const mockStopPolling = jest.fn();
const mockAnswerCallbackQuery = jest.fn().mockResolvedValue();
const mockEditMessageReplyMarkup = jest.fn().mockResolvedValue();

const MockTelegramBot = jest.fn().mockImplementation(() => {
  const bot = {
    sendMessage: mockSendMessage,
    onText: mockOnText,
    on: mockOn,
    answerCallbackQuery: mockAnswerCallbackQuery,
    editMessageReplyMarkup: mockEditMessageReplyMarkup,
    stopPolling: mockStopPolling,
  };
  return bot;
});

// Store the prototype for later mocking
MockTelegramBot.prototype.sendMessage = mockSendMessage;

jest.unstable_mockModule('node-telegram-bot-api', () => ({
  default: MockTelegramBot,
}));

// Mock userMenuHandlers
jest.unstable_mockModule('../src/handler/menu/userMenuHandlers.js', () => ({
  userMenuHandlers: {
    main: jest.fn(),
  },
}));

// Mock db
jest.unstable_mockModule('../src/repository/db.js', () => ({
  query: jest.fn(),
}));

// Mock userModel
const mockFindUserByTelegramChatId = jest.fn();
const mockFindUserById = jest.fn();
const mockFindUserByInsta = jest.fn();
const mockFindUserByTiktok = jest.fn();
const mockFindUserBySocialAccount = jest.fn();
const mockUpsertUserSocialAccount = jest.fn();
const mockGetUserSocialAccountsByUserId = jest.fn();
const mockUpdateUserField = jest.fn();
const mockGetUserRoles = jest.fn();
const mockGetPendingTelegramLinkByCode = jest.fn();
const mockApproveTelegramLink = jest.fn();
const mockRejectTelegramLink = jest.fn();

jest.unstable_mockModule('../src/model/userModel.js', () => ({
  findUserByTelegramChatId: mockFindUserByTelegramChatId,
  findUserById: mockFindUserById,
  findUserByInsta: mockFindUserByInsta,
  findUserByTiktok: mockFindUserByTiktok,
  findUserBySocialAccount: mockFindUserBySocialAccount,
  upsertUserSocialAccount: mockUpsertUserSocialAccount,
  getUserSocialAccountsByUserId: mockGetUserSocialAccountsByUserId,
  updateUserField: mockUpdateUserField,
  getUserRoles: mockGetUserRoles,
  getPendingTelegramLinkByCode: mockGetPendingTelegramLinkByCode,
  approveTelegramLink: mockApproveTelegramLink,
  rejectTelegramLink: mockRejectTelegramLink,
}));

// Mock phone helper
jest.unstable_mockModule('../src/utils/phoneHelper.js', () => ({
  normalizeWhatsappNumber: jest.fn((phone) => {
    if (!phone.startsWith('+62')) {
      throw new Error('Phone must start with +62');
    }
    return phone;
  }),
}));

const {
  initializeTelegramUserBot,
  stopTelegramUserBot,
} = await import('../src/service/telegramUserBotService.js');

describe('Telegram User Bot Commands', () => {
  let profileCommandHandler;
  let updateCommandHandler;
  let approveCommandHandler;
  let callbackHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture the command handlers when onText is called
    mockOnText.mockImplementation((regex, handler) => {
      if (regex.toString().includes('profile')) {
        profileCommandHandler = handler;
      }
      if (regex.toString().includes('update')) {
        updateCommandHandler = handler;
      }
      if (regex.toString().includes('approve')) {
        approveCommandHandler = handler;
      }
    });
    mockOn.mockImplementation((event, handler) => {
      if (event === 'callback_query') callbackHandler = handler;
    });
    delete process.env.TELEGRAM_USER_LINK_ADMIN_CHAT_IDS;
    delete process.env.TELEGRAM_OPERATOR_ADMIN_CHAT_IDS;
  });

  afterEach(async () => {
    await stopTelegramUserBot();
    delete process.env.TELEGRAM_USER_LINK_ADMIN_CHAT_IDS;
    delete process.env.TELEGRAM_OPERATOR_ADMIN_CHAT_IDS;
  });

  describe('official actor link approval', () => {
    it('does not allow the requester to approve their own link', async () => {
      await initializeTelegramUserBot('test-token', true);

      const msg = { chat: { id: 123456, type: 'private' }, from: { id: 123456 } };
      await approveCommandHandler(msg, ['/approve 123456', '123456']);

      expect(mockApproveTelegramLink).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('dilakukan oleh admin Telegram'),
        {},
      );
    });

    it('allows a configured admin to approve a pending link', async () => {
      process.env.TELEGRAM_USER_LINK_ADMIN_CHAT_IDS = '999001';
      await initializeTelegramUserBot('test-token', true);
      mockGetPendingTelegramLinkByCode.mockResolvedValue({
        telegram_chat_id: '123456', user_id: '82050014', nama: 'BEKTI PRAMILU K',
      });
      mockApproveTelegramLink.mockResolvedValue({ telegram_chat_id: '123456', user_id: '82050014' });

      await callbackHandler({
        id: 'callback-1',
        data: 'userlink:approve:123456',
        from: { id: 999001 },
        message: { chat: { id: 999001 }, message_id: 10 },
      });

      expect(mockApproveTelegramLink).toHaveBeenCalledWith('123456');
      expect(mockAnswerCallbackQuery).toHaveBeenCalledWith('callback-1', { text: 'Penautan disetujui.' });
      expect(mockEditMessageReplyMarkup).toHaveBeenCalled();
    });
  });

  describe('/profile command', () => {
    it('should display user profile when user is linked', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
        title: 'BRIGADIR',
        divisi: 'SUBBID MULTIMEDIA',
        jabatan: 'ANGGOTA',
        insta: 'budisantoso',
        tiktok: 'budisantoso',
        whatsapp: '+628123456789',
        email: 'budi@example.com',
        status: true,
        client_name: 'POLRES TEST',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockFindUserById.mockResolvedValue(mockUser);
      mockGetUserSocialAccountsByUserId.mockResolvedValue([]);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      await profileCommandHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('PROFIL ANDA'),
        { parse_mode: 'Markdown' }
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('BUDI SANTOSO'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should show error when user is not linked', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      mockFindUserByTelegramChatId.mockResolvedValue(null);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      await profileCommandHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('belum ditautkan'),
        { parse_mode: 'Markdown' }
      );
    });
  });

  describe('/update command', () => {
    it('should update Instagram successfully', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockFindUserBySocialAccount.mockResolvedValue(null);
      mockUpdateUserField.mockResolvedValue();
      mockUpsertUserSocialAccount.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update instagram @jokowi', 'instagram', '@jokowi'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'insta', 'jokowi');
      expect(mockUpsertUserSocialAccount).toHaveBeenCalledWith('123456', 'instagram', 'jokowi', 1);
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should update TikTok successfully', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockFindUserBySocialAccount.mockResolvedValue(null);
      mockUpdateUserField.mockResolvedValue();
      mockUpsertUserSocialAccount.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update tiktok @awkarin', 'tiktok', '@awkarin'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'tiktok', 'awkarin');
      expect(mockUpsertUserSocialAccount).toHaveBeenCalledWith('123456', 'tiktok', 'awkarin', 1);
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should update nama successfully', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockUpdateUserField.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update nama Budi Santoso', 'nama', 'Budi Santoso'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'nama', 'BUDI SANTOSO');
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should update email successfully', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockUpdateUserField.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update email budi@gmail.com', 'email', 'budi@gmail.com'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'email', 'budi@gmail.com');
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should update phone successfully', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockUpdateUserField.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update phone +628123456789', 'phone', '+628123456789'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'whatsapp', '+628123456789');
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should reject invalid Instagram format', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update instagram invalid@@@', 'instagram', 'invalid@@@'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('tidak valid'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should update instagram2 to social accounts order 2', async () => {
      await initializeTelegramUserBot('test-token', true);

      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };

      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      mockFindUserBySocialAccount.mockResolvedValue(null);
      mockUpsertUserSocialAccount.mockResolvedValue();

      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };

      const match = ['/update instagram2 @cadangan', 'instagram2', '@cadangan'];

      await updateCommandHandler(msg, match);

      expect(mockUpdateUserField).not.toHaveBeenCalledWith('123456', 'insta', 'cadangan');
      expect(mockUpsertUserSocialAccount).toHaveBeenCalledWith('123456', 'instagram', 'cadangan', 2);
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Berhasil mengupdate'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should reject invalid email format', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update email invalid-email', 'email', 'invalid-email'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('tidak valid'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should show help when no field is provided', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      const mockUser = {
        user_id: '123456',
        nama: 'BUDI SANTOSO',
      };
      
      mockFindUserByTelegramChatId.mockResolvedValue(mockUser);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update', undefined, undefined];
      
      await updateCommandHandler(msg, match);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Cara menggunakan'),
        { parse_mode: 'Markdown' }
      );
    });

    it('should show error when user is not linked', async () => {
      await initializeTelegramUserBot('test-token', true);
      
      mockFindUserByTelegramChatId.mockResolvedValue(null);
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update instagram @jokowi', 'instagram', '@jokowi'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('belum ditautkan'),
        { parse_mode: 'Markdown' }
      );
    });
  });
});

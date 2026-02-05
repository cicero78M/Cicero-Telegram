import { jest } from '@jest/globals';

// Mock the node-telegram-bot-api module
const mockSendMessage = jest.fn().mockResolvedValue();
const mockOnText = jest.fn();
const mockOn = jest.fn();
const mockStopPolling = jest.fn();

const MockTelegramBot = jest.fn().mockImplementation(() => {
  const bot = {
    sendMessage: mockSendMessage,
    onText: mockOnText,
    on: mockOn,
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
const mockUpdateUserField = jest.fn();

jest.unstable_mockModule('../src/model/userModel.js', () => ({
  findUserByTelegramChatId: mockFindUserByTelegramChatId,
  findUserById: mockFindUserById,
  findUserByInsta: mockFindUserByInsta,
  findUserByTiktok: mockFindUserByTiktok,
  updateUserField: mockUpdateUserField,
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
    });
  });

  afterEach(async () => {
    await stopTelegramUserBot();
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
      mockFindUserByInsta.mockResolvedValue(null);
      mockUpdateUserField.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update instagram @jokowi', 'instagram', '@jokowi'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'insta', 'jokowi');
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
      mockFindUserByTiktok.mockResolvedValue(null);
      mockUpdateUserField.mockResolvedValue();
      
      const msg = {
        chat: { id: 123456, type: 'private' },
        from: { id: 123456 },
      };
      
      const match = ['/update tiktok @awkarin', 'tiktok', '@awkarin'];
      
      await updateCommandHandler(msg, match);
      
      expect(mockUpdateUserField).toHaveBeenCalledWith('123456', 'tiktok', 'awkarin');
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

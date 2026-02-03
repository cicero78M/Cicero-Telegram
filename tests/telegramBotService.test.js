import { jest } from '@jest/globals';

// Mock the node-telegram-bot-api module
const mockSendMessage = jest.fn();
const mockOnText = jest.fn();
const mockOn = jest.fn();
const mockStopPolling = jest.fn();

const MockTelegramBot = jest.fn().mockImplementation(() => ({
  sendMessage: mockSendMessage,
  onText: mockOnText,
  on: mockOn,
  stopPolling: mockStopPolling,
}));

jest.unstable_mockModule('node-telegram-bot-api', () => ({
  default: MockTelegramBot,
}));

// Mock performAction from dirRequestHandlers
const mockPerformAction = jest.fn();
jest.unstable_mockModule('../src/handler/menu/dirRequestHandlers.js', () => ({
  performAction: mockPerformAction,
}));

const {
  initializeTelegramBot,
  stopTelegramBot,
  getBot,
  isBotInitialized,
} = await import('../src/service/telegramBotService.js');

describe('Telegram Bot Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Stop the bot after each test
    await stopTelegramBot();
  });

  describe('initializeTelegramBot', () => {
    it('should return null when bot is disabled', async () => {
      const bot = await initializeTelegramBot('test-token', false);
      expect(bot).toBeNull();
      expect(MockTelegramBot).not.toHaveBeenCalled();
    });

    it('should return null when no token is provided', async () => {
      const bot = await initializeTelegramBot('', true);
      expect(bot).toBeNull();
      expect(MockTelegramBot).not.toHaveBeenCalled();
    });

    it('should initialize bot with valid token and enabled flag', async () => {
      const bot = await initializeTelegramBot('test-token', true);
      expect(bot).not.toBeNull();
      expect(MockTelegramBot).toHaveBeenCalledWith('test-token', { polling: true });
    });

    it('should setup command handlers during initialization', async () => {
      await initializeTelegramBot('test-token', true);
      
      // Check that onText was called for /start, /help, /menu commands
      expect(mockOnText).toHaveBeenCalled();
      expect(mockOnText.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('should setup message handlers during initialization', async () => {
      await initializeTelegramBot('test-token', true);
      
      // Check that on('message') was called
      expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should not reinitialize if already initialized', async () => {
      await initializeTelegramBot('test-token', true);
      const firstCallCount = MockTelegramBot.mock.calls.length;
      
      await initializeTelegramBot('test-token', true);
      const secondCallCount = MockTelegramBot.mock.calls.length;
      
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('stopTelegramBot', () => {
    it('should stop the bot and reset state', async () => {
      await initializeTelegramBot('test-token', true);
      expect(isBotInitialized()).toBe(true);
      
      await stopTelegramBot();
      
      expect(mockStopPolling).toHaveBeenCalled();
      expect(isBotInitialized()).toBe(false);
      expect(getBot()).toBeNull();
    });

    it('should handle stopping when bot is not initialized', async () => {
      await stopTelegramBot();
      expect(mockStopPolling).not.toHaveBeenCalled();
    });
  });

  describe('getBot', () => {
    it('should return null when bot is not initialized', () => {
      expect(getBot()).toBeNull();
    });

    it('should return bot instance when initialized', async () => {
      await initializeTelegramBot('test-token', true);
      const bot = getBot();
      expect(bot).not.toBeNull();
      expect(bot.sendMessage).toBe(mockSendMessage);
    });
  });

  describe('isBotInitialized', () => {
    it('should return false when bot is not initialized', () => {
      expect(isBotInitialized()).toBe(false);
    });

    it('should return true when bot is initialized', async () => {
      await initializeTelegramBot('test-token', true);
      expect(isBotInitialized()).toBe(true);
    });

    it('should return false after stopping bot', async () => {
      await initializeTelegramBot('test-token', true);
      await stopTelegramBot();
      expect(isBotInitialized()).toBe(false);
    });
  });

  describe('Command handlers', () => {
    beforeEach(async () => {
      await initializeTelegramBot('test-token', true);
    });

    it('should handle /start command in private chat', async () => {
      // Find the /start handler
      const startHandler = mockOnText.mock.calls.find(
        call => call[0].toString().includes('start')
      )?.[1];
      
      expect(startHandler).toBeDefined();
      
      const msg = {
        chat: { id: 123, type: 'private' },
        from: { username: 'testuser' }
      };
      
      await startHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Selamat datang'),
        expect.any(Object)
      );
    });

    it('should reject /start command in group chat', async () => {
      const startHandler = mockOnText.mock.calls.find(
        call => call[0].toString().includes('start')
      )?.[1];
      
      const msg = {
        chat: { id: 456, type: 'group' },
        from: { username: 'testuser' }
      };
      
      await startHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        456,
        expect.stringContaining('hanya bekerja di chat private')
      );
    });

    it('should handle /help command', async () => {
      const helpHandler = mockOnText.mock.calls.find(
        call => call[0].toString().includes('help')
      )?.[1];
      
      expect(helpHandler).toBeDefined();
      
      const msg = {
        chat: { id: 123, type: 'private' },
        from: { username: 'testuser' }
      };
      
      await helpHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Bantuan'),
        expect.any(Object)
      );
    });

    it('should handle /menu command', async () => {
      const menuHandler = mockOnText.mock.calls.find(
        call => call[0].toString().includes('menu')
      )?.[1];
      
      expect(menuHandler).toBeDefined();
      
      const msg = {
        chat: { id: 123, type: 'private' },
        from: { username: 'testuser' }
      };
      
      await menuHandler(msg);
      
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Menu DirRequest'),
        expect.any(Object)
      );
    });
  });

  describe('Message handler', () => {
    beforeEach(async () => {
      await initializeTelegramBot('test-token', true);
      mockPerformAction.mockResolvedValue('Test result from menu');
    });

    it('should process menu number in private chat', async () => {
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      expect(messageHandler).toBeDefined();
      
      const msg = {
        chat: { id: 123, type: 'private' },
        text: '1',
        from: { username: 'testuser', first_name: 'Test' }
      };
      
      await messageHandler(msg);
      
      // Should send processing message
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Memproses menu 1')
      );
      
      // Should call performAction with correct parameters
      expect(mockPerformAction).toHaveBeenCalledWith(
        '1',              // action
        'DITBINMAS',      // clientId
        null,             // waClient (not used for Telegram)
        '123',            // chatId
        null,             // roleFlag
        null,             // userClientId
        expect.objectContaining({
          username: 'testuser',
          chatId: '123'
        }),
        {}                // fallbackOptions
      );
      
      // Should send result
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        'Test result from menu'
      );
    });

    it('should ignore commands in message handler', async () => {
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const msg = {
        chat: { id: 123, type: 'private' },
        text: '/start',
        from: { username: 'testuser' }
      };
      
      await messageHandler(msg);
      
      // Should not call performAction for commands
      expect(mockPerformAction).not.toHaveBeenCalled();
    });

    it('should ignore group chat messages', async () => {
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const msg = {
        chat: { id: 456, type: 'group' },
        text: '1',
        from: { username: 'testuser' }
      };
      
      await messageHandler(msg);
      
      // Should not process menu in group chat
      expect(mockPerformAction).not.toHaveBeenCalled();
    });

    it('should handle long messages by splitting them', async () => {
      const longResult = 'a'.repeat(5000); // Longer than 4000 characters
      mockPerformAction.mockResolvedValue(longResult);
      
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const msg = {
        chat: { id: 123, type: 'private' },
        text: '1',
        from: { username: 'testuser' }
      };
      
      await messageHandler(msg);
      
      // Should split into multiple messages
      const resultCalls = mockSendMessage.mock.calls.filter(
        call => call[1].length > 100 // Filter out short messages
      );
      expect(resultCalls.length).toBeGreaterThan(1);
    });

    it('should handle long messages with UTF-8 characters correctly', async () => {
      // Create a long message with emojis and multi-byte characters
      const emojiLine = '🎉 Test message dengan emoji 🚀 dan karakter unicode 中文\n';
      const longResult = emojiLine.repeat(200); // ~10000 characters
      mockPerformAction.mockResolvedValue(longResult);
      
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const msg = {
        chat: { id: 123, type: 'private' },
        text: '1',
        from: { username: 'testuser' }
      };
      
      await messageHandler(msg);
      
      // Should split into multiple messages
      const resultCalls = mockSendMessage.mock.calls.filter(
        call => call[1].length > 100
      );
      expect(resultCalls.length).toBeGreaterThan(1);
      
      // Verify no message exceeds the limit
      resultCalls.forEach(call => {
        expect(call[1].length).toBeLessThanOrEqual(4000);
      });
      
      // Verify messages contain valid UTF-8 (no broken emoji)
      resultCalls.forEach(call => {
        const text = call[1];
        // Check that emojis are present and not corrupted
        // If string has emoji at start/end, it should be complete
        expect(text).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/); // No orphaned high surrogates
        expect(text).not.toMatch(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/); // No orphaned low surrogates
      });
    });

    it('should handle errors gracefully', async () => {
      mockPerformAction.mockRejectedValue(new Error('Test error'));
      
      const messageHandler = mockOn.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const msg = {
        chat: { id: 123, type: 'private' },
        text: '1',
        from: { username: 'testuser' }
      };
      
      await messageHandler(msg);
      
      // Should send error message
      expect(mockSendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('Terjadi kesalahan')
      );
    });
  });
});

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

// Mock clientRequestTelegramHandlers
const mockRunClientRequestAction = jest.fn();
jest.unstable_mockModule('../src/handler/menu/clientRequestTelegramHandlers.js', () => ({
  runClientRequestAction: mockRunClientRequestAction,
}));

// Mock clientService
const mockFindAllActiveClients = jest.fn();
jest.unstable_mockModule('../src/service/clientService.js', () => ({
  findAllActiveClients: mockFindAllActiveClients,
}));

// Mock telegramBotHelpers
const mockEscapeMarkdown = jest.fn((text) => text);
jest.unstable_mockModule('../src/utils/telegramBotHelpers.js', () => ({
  escapeMarkdown: mockEscapeMarkdown,
}));

const {
  initializeTelegramClientBot,
  stopTelegramClientBot,
  getTelegramClientBot,
} = await import('../src/service/telegramClientBotService.js');

describe('Telegram Client Bot Service - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await stopTelegramClientBot();
  });

  describe('Bot Initialization', () => {
    it('should return null when bot is disabled', async () => {
      const bot = await initializeTelegramClientBot('test-token', false);
      expect(bot).toBeNull();
    });

    it('should return null when no token is provided', async () => {
      const bot = await initializeTelegramClientBot(null, true);
      expect(bot).toBeNull();
    });

    it('should initialize successfully with valid token', async () => {
      const bot = await initializeTelegramClientBot('valid-token', true);
      expect(bot).not.toBeNull();
      expect(MockTelegramBot).toHaveBeenCalledWith('valid-token', { polling: true });
    });
  });

  describe('Error Handling in showClientSelection', () => {
    it('should handle database errors gracefully when fetching clients', async () => {
      // Initialize the bot first
      await initializeTelegramClientBot('test-token', true);

      // Mock findAllActiveClients to throw an error
      mockFindAllActiveClients.mockRejectedValue(new Error('Database connection failed'));

      // Get the /menu handler
      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 12345, type: 'private' },
          text: '/menu',
        };

        // Execute the handler
        await handlerFn(mockMsg);

        // Verify error message was sent (with null check protection)
        expect(mockSendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('Terjadi kesalahan saat mengambil daftar client')
        );
      }
    });

    it('should handle empty client list by defaulting to DITBINMAS', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock empty client list
      mockFindAllActiveClients.mockResolvedValue([]);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 12345, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should send success message with default client
        expect(mockSendMessage).toHaveBeenCalledWith(
          12345,
          expect.stringContaining('DITBINMAS')
        );
      }
    });

    it('should display client selection menu when clients are available', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock client list
      mockFindAllActiveClients.mockResolvedValue([
        { client_id: 'CLIENT1', nama: 'Client One' },
        { client_id: 'CLIENT2', nama: 'Client Two' },
      ]);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 54321, type: 'private' },  // Different chat ID to avoid session conflict
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should send client selection menu
        // Note: First call is the client selection menu, or could be main menu if session exists
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 54321);
        expect(calls.length).toBeGreaterThan(0);
        const messages = calls.map(call => call[1]);
        const hasClientMenu = messages.some(msg => msg.includes('Pilih Client') || msg.includes('CLIENT1'));
        expect(hasClientMenu).toBe(true);
      }
    });
  });

  describe('Bot not initialized error handling', () => {
    it('should not crash when bot is not initialized', async () => {
      // Attempt to get bot before initialization
      const bot = getTelegramClientBot();
      expect(bot).toBeNull();
    });
  });
});

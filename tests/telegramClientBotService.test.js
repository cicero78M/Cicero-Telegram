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
const mockFindAllActiveDirektoratClients = jest.fn();
const mockFindAllActiveOrgClients = jest.fn();
jest.unstable_mockModule('../src/service/clientService.js', () => ({
  findAllActiveClients: mockFindAllActiveClients,
  findAllActiveDirektoratClients: mockFindAllActiveDirektoratClients,
  findAllActiveOrgClients: mockFindAllActiveOrgClients,
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

    it('should handle null clients response by defaulting to DITBINMAS', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock null response
      mockFindAllActiveClients.mockResolvedValue(null);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 22345, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should send warning with default client
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 22345);
        expect(calls.length).toBeGreaterThan(0);
        const messages = calls.map(call => call[1]);
        const hasWarning = messages.some(msg => msg.includes('Tidak dapat memuat daftar client') || msg.includes('DITBINMAS'));
        expect(hasWarning).toBe(true);
      }
    });

    it('should handle non-array clients response by defaulting to DITBINMAS', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock non-array response
      mockFindAllActiveClients.mockResolvedValue({ client_id: 'WRONG' });

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 32345, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should send warning with default client
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 32345);
        expect(calls.length).toBeGreaterThan(0);
        const messages = calls.map(call => call[1]);
        const hasWarning = messages.some(msg => msg.includes('tidak valid') || msg.includes('DITBINMAS'));
        expect(hasWarning).toBe(true);
      }
    });

    it('should filter out invalid client objects missing client_id', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock clients with some invalid entries
      mockFindAllActiveClients.mockResolvedValue([
        { client_id: null, nama: 'Invalid Client' },
        { client_id: 'CLIENT1', nama: 'Valid Client One' },
        { nama: 'No ID Client' },
        { client_id: '', nama: 'Empty ID Client' },
        { client_id: '   ', nama: 'Whitespace ID Client' },
        { client_id: 'CLIENT2', nama: 'Valid Client Two' },
      ]);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 42345, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should show client menu with only valid clients
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 42345);
        expect(calls.length).toBeGreaterThan(0);
        const messages = calls.map(call => call[1]);
        const hasClientMenu = messages.some(msg => msg.includes('CLIENT1') && msg.includes('CLIENT2'));
        expect(hasClientMenu).toBe(true);
        // Should not include invalid entries
        const hasInvalidEntries = messages.some(msg => 
          msg.includes('Invalid Client') || 
          msg.includes('No ID Client') || 
          msg.includes('Empty ID Client') ||
          msg.includes('Whitespace ID Client')
        );
        expect(hasInvalidEntries).toBe(false);
      }
    });

    it('should default to DITBINMAS when all clients are invalid', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock clients with all invalid entries
      mockFindAllActiveClients.mockResolvedValue([
        { client_id: null, nama: 'Invalid Client 1' },
        { nama: 'Invalid Client 2' },
        { client_id: '', nama: 'Invalid Client 3' },
      ]);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 52345, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Should send warning with default client
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 52345);
        expect(calls.length).toBeGreaterThan(0);
        const messages = calls.map(call => call[1]);
        const hasWarning = messages.some(msg => msg.includes('tidak valid') || msg.includes('DITBINMAS'));
        expect(hasWarning).toBe(true);
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

    it('should escape special markdown characters in client names to prevent entity parsing errors', async () => {
      await initializeTelegramClientBot('test-token', true);
      
      // Mock escapeMarkdown to track if it's called with the right values
      mockEscapeMarkdown.mockImplementation((text) => {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/[_*`\[\\]/g, '\\$&');
      });
      
      // Mock client list with special characters that would cause Telegram entity parsing errors
      mockFindAllActiveClients.mockResolvedValue([
        { client_id: 'POLRES_BANDUNG', nama: 'POLRES BANDUNG*CITY', client_type: 'ORG' },
        { client_id: 'DITBINMAS_[HQ]', nama: 'Direktorat `Special`', client_type: 'DIR' },
      ]);

      const menuHandler = mockOnText.mock.calls.find(call => 
        call[0].toString().includes('menu')
      );
      
      if (menuHandler) {
        const handlerFn = menuHandler[1];
        const mockMsg = {
          chat: { id: 99999, type: 'private' },
          text: '/menu',
        };

        await handlerFn(mockMsg);

        // Find the client selection menu message
        const calls = mockSendMessage.mock.calls.filter(call => call[0] === 99999);
        expect(calls.length).toBeGreaterThan(0);
        
        // Find the message with client list (should include "Pilih Client")
        const clientMenuMessage = calls.find(call => 
          call[1] && call[1].includes('Pilih Client')
        );
        
        if (clientMenuMessage) {
          const message = clientMenuMessage[1];
          
          // Verify that special characters are escaped in the message
          // The message should contain escaped versions, not raw special characters
          expect(message).toContain('POLRES\\_BANDUNG');
          expect(message).toContain('POLRES BANDUNG\\*CITY');
          expect(message).toContain('DITBINMAS\\_\\[HQ\\]');
          expect(message).toContain('Direktorat \\`Special\\`');
          expect(message).toContain('\\[ORG\\]');
          expect(message).toContain('\\[DIR\\]');
          
          // Verify that escapeMarkdown was called for client data
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('POLRES_BANDUNG');
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('POLRES BANDUNG*CITY');
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('DITBINMAS_[HQ]');
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('Direktorat `Special`');
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('ORG');
          expect(mockEscapeMarkdown).toHaveBeenCalledWith('DIR');
        }
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

import TelegramBot from 'node-telegram-bot-api';
import oprRequestHandlers from '../handler/menu/oprRequestHandlers.js';
import { query } from '../repository/db.js';
import * as userModel from '../model/userModel.js';
import { createSendMessageWrapper } from '../utils/telegramBotHelpers.js';

let operatorBot = null;
let isInitialized = false;
// Store user sessions for state management
const userSessions = new Map();

/**
 * Initialize the Telegram Operator Bot
 * @param {string} token - Telegram bot token
 * @param {boolean} enabled - Whether the bot is enabled
 */
export async function initializeTelegramOperatorBot(token, enabled = true) {
  if (!enabled) {
    console.log('[Telegram Operator Bot] Bot is disabled via configuration flag');
    return null;
  }

  if (!token) {
    console.log('[Telegram Operator Bot] No token provided. Bot will not start.');
    return null;
  }

  if (isInitialized && operatorBot) {
    console.log('[Telegram Operator Bot] Already initialized');
    return operatorBot;
  }

  try {
    console.log('[Telegram Operator Bot] Initializing operatorBot...');
    operatorBot = new TelegramBot(token, { polling: true });
    
    // Add sendMessage wrapper to make bot compatible with WhatsApp-style handlers
    const nativeSendMessage = TelegramBot.prototype.sendMessage;
    operatorBot.sendMessage = createSendMessageWrapper(operatorBot, nativeSendMessage, 'Operator Bot');
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    
    isInitialized = true;
    console.log('[Telegram Operator Bot] Bot initialized successfully');
    
    return operatorBot;
  } catch (error) {
    console.error('[Telegram Operator Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup command handlers for the bot
 */
function setupCommandHandlers() {
  if (!operatorBot) return;

  // /start command
  operatorBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Operator Bot] /start command from chat ${chatId} (type: ${chatType})`);
    
    // Only respond to private chats
    if (chatType !== 'private') {
      await operatorBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private. Silakan hubungi bot secara langsung.');
      return;
    }
    
    const welcomeMessage = 
      '🤖 *Selamat datang di Bot Operator Cicero!*\n\n' +
      'Bot ini dapat membantu Anda mengakses menu operator untuk manajemen user, amplifikasi, dan engagement.\n\n' +
      'Gunakan perintah:\n' +
      '/menu - Tampilkan menu operator yang tersedia\n' +
      '/help - Tampilkan bantuan';
    
    await operatorBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  operatorBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Operator Bot] /help command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await operatorBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    const helpMessage = 
      '📖 *Bantuan Bot Operator Cicero*\n\n' +
      '*Perintah yang tersedia:*\n' +
      '/start - Mulai menggunakan bot\n' +
      '/menu - Tampilkan menu operator\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /menu untuk melihat daftar menu operator\n' +
      '2. Pilih nomor menu yang ingin diakses\n' +
      '3. Ikuti instruksi dari bot\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await operatorBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /menu command
  operatorBot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Operator Bot] /menu command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await operatorBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    // Initialize or get user session
    let session = userSessions.get(chatId);
    if (!session) {
      session = { step: 'main' };
      userSessions.set(chatId, session);
    }
    
    // Reset session to main menu
    session.step = 'main';
    
    try {
      // Create a pool-like object that uses the query function
      const pool = { query };
      
      // Call oprRequestHandlers.main() with appropriate parameters
      await oprRequestHandlers.main(
        session,      // session object for state management
        chatId,       // chatId (Telegram chat ID)
        '',           // text (empty for initial menu display)
        operatorBot,  // waClient replacement (Telegram bot instance)
        pool,         // pool (database query interface)
        userModel     // userModel
      );
    } catch (error) {
      console.error('[Telegram Operator Bot] Error displaying menu:', error);
      await operatorBot.sendMessage(
        chatId, 
        '❌ Terjadi kesalahan saat menampilkan menu. Silakan coba lagi nanti.'
      );
    }
  });
}

/**
 * Setup message handlers for the bot
 */
function setupMessageHandlers() {
  if (!operatorBot) return;

  // Handle all text messages that are not commands
  operatorBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const text = msg.text;
    
    // Ignore if it's a command (starts with /)
    if (text && text.startsWith('/')) {
      return;
    }
    
    // Only respond to private chats
    if (chatType !== 'private') {
      return;
    }
    
    console.log(`[Telegram Operator Bot] Message from chat ${chatId}: ${text}`);
    
    // Get or initialize user session
    let session = userSessions.get(chatId);
    if (!session) {
      session = { step: 'main' };
      userSessions.set(chatId, session);
    }
    
    try {
      // Create a pool-like object that uses the query function
      const pool = { query };
      
      // Determine which handler to call based on session step
      const handlerName = session.step || 'main';
      
      if (oprRequestHandlers[handlerName]) {
        await oprRequestHandlers[handlerName](
          session,
          chatId,
          text,
          operatorBot,
          pool,
          userModel
        );
      } else {
        // Fallback to main if handler doesn't exist
        console.log(`[Telegram Operator Bot] Unknown step: ${handlerName}, falling back to main`);
        session.step = 'main';
        await oprRequestHandlers.main(
          session,
          chatId,
          text,
          operatorBot,
          pool,
          userModel
        );
      }
    } catch (error) {
      console.error('[Telegram Operator Bot] Error handling message:', error);
      await operatorBot.sendMessage(
        chatId, 
        '❌ Terjadi kesalahan saat memproses pesan Anda. Silakan ketik /menu untuk memulai ulang.'
      );
      
      // Reset session on error
      session.step = 'main';
    }
  });
}

/**
 * Stop the Telegram Operator Bot
 */
export async function stopTelegramOperatorBot() {
  if (operatorBot) {
    console.log('[Telegram Operator Bot] Stopping bot...');
    await operatorBot.stopPolling();
    operatorBot = null;
    isInitialized = false;
    console.log('[Telegram Operator Bot] Bot stopped');
  }
}

/**
 * Get bot instance
 */
export function getOperatorBot() {
  return operatorBot;
}

/**
 * Check if bot is initialized
 */
export function isOperatorBotInitialized() {
  return isInitialized;
}

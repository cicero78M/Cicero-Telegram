import TelegramBot from 'node-telegram-bot-api';
import { userMenuHandlers } from '../handler/menu/userMenuHandlers.js';
import { query } from '../repository/db.js';
import * as userModel from '../model/userModel.js';
import { createSendMessageWrapper } from '../utils/telegramBotHelpers.js';

let userBot = null;
let isInitialized = false;
// Store user sessions for state management
const userSessions = new Map();

/**
 * Initialize the Telegram User Bot
 * @param {string} token - Telegram bot token
 * @param {boolean} enabled - Whether the bot is enabled
 */
export async function initializeTelegramUserBot(token, enabled = true) {
  if (!enabled) {
    console.log('[Telegram User Bot] Bot is disabled via configuration flag');
    return null;
  }

  if (!token) {
    console.log('[Telegram User Bot] No token provided. Bot will not start.');
    return null;
  }

  if (isInitialized && userBot) {
    console.log('[Telegram User Bot] Already initialized');
    return userBot;
  }

  try {
    console.log('[Telegram User Bot] Initializing userBot...');
    userBot = new TelegramBot(token, { polling: true });
    
    // Add sendMessage wrapper to make bot compatible with WhatsApp-style handlers
    const nativeSendMessage = TelegramBot.prototype.sendMessage;
    userBot.sendMessage = createSendMessageWrapper(userBot, nativeSendMessage, 'User Bot');
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    
    isInitialized = true;
    console.log('[Telegram User Bot] Bot initialized successfully');
    
    return userBot;
  } catch (error) {
    console.error('[Telegram User Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup command handlers for the bot
 */
function setupCommandHandlers() {
  if (!userBot) return;

  // /start command
  userBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram User Bot] /start command from chat ${chatId} (type: ${chatType})`);
    
    // Only respond to private chats
    if (chatType !== 'private') {
      await userBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private. Silakan hubungi bot secara langsung.');
      return;
    }
    
    const welcomeMessage = 
      '🤖 *Selamat datang di Bot User Cicero!*\n\n' +
      'Bot ini dapat membantu Anda mengakses menu user untuk mengelola data pribadi Anda.\n\n' +
      'Gunakan perintah:\n' +
      '/menu - Tampilkan menu user yang tersedia\n' +
      '/help - Tampilkan bantuan';
    
    await userBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  userBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram User Bot] /help command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await userBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    const helpMessage = 
      '📖 *Bantuan Bot User Cicero*\n\n' +
      '*Perintah yang tersedia:*\n' +
      '/start - Mulai menggunakan bot\n' +
      '/menu - Tampilkan menu user\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /menu untuk melihat daftar menu user\n' +
      '2. Pilih nomor menu yang ingin diakses\n' +
      '3. Ikuti instruksi dari bot\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await userBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /menu command
  userBot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram User Bot] /menu command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await userBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
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
      
      // Call userMenuHandlers.main() with appropriate parameters
      await userMenuHandlers.main(
        session,      // session object for state management
        chatId,       // chatId (Telegram chat ID)
        '',           // text (empty for initial menu display)
        userBot,      // waClient replacement (Telegram bot instance)
        pool,         // pool (database query interface)
        userModel     // userModel
      );
    } catch (error) {
      console.error('[Telegram User Bot] Error displaying menu:', error);
      await userBot.sendMessage(
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
  if (!userBot) return;

  // Handle all text messages that are not commands
  userBot.on('message', async (msg) => {
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
    
    console.log(`[Telegram User Bot] Message from chat ${chatId}: ${text}`);
    
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
      
      if (userMenuHandlers[handlerName]) {
        await userMenuHandlers[handlerName](
          session,
          chatId,
          text,
          userBot,
          pool,
          userModel
        );
      } else {
        // Fallback to main if handler doesn't exist
        console.log(`[Telegram User Bot] Unknown step: ${handlerName}, falling back to main`);
        session.step = 'main';
        await userMenuHandlers.main(
          session,
          chatId,
          text,
          userBot,
          pool,
          userModel
        );
      }
    } catch (error) {
      console.error('[Telegram User Bot] Error handling message:', error);
      await userBot.sendMessage(
        chatId, 
        '❌ Terjadi kesalahan saat memproses pesan Anda. Silakan ketik /menu untuk memulai ulang.'
      );
      
      // Reset session on error
      session.step = 'main';
    }
  });
}

/**
 * Stop the Telegram User Bot
 */
export async function stopTelegramUserBot() {
  if (userBot) {
    console.log('[Telegram User Bot] Stopping bot...');
    await userBot.stopPolling();
    userBot = null;
    isInitialized = false;
    console.log('[Telegram User Bot] Bot stopped');
  }
}

/**
 * Get bot instance
 */
export function getUserBot() {
  return userBot;
}

/**
 * Check if bot is initialized
 */
export function isUserBotInitialized() {
  return isInitialized;
}

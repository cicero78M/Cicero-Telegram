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
    
    // Check if user is already linked
    const linkedUser = await userModel.findUserByTelegramChatId(chatId);
    
    if (linkedUser) {
      const welcomeMessage = 
        '🤖 *Selamat datang kembali di Bot User Cicero!*\n\n' +
        `Halo, *${linkedUser.nama || 'User'}*!\n\n` +
        'Akun Telegram Anda sudah ditautkan.\n\n' +
        '*Perintah yang tersedia:*\n' +
        '/menu - Tampilkan menu user\n' +
        '/help - Tampilkan bantuan';
      
      await userBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    } else {
      const welcomeMessage = 
        '🤖 *Selamat datang di Bot User Cicero!*\n\n' +
        'Bot ini dapat membantu Anda mengakses dan mengelola data pribadi Anda.\n\n' +
        '*Untuk memulai, tautkan akun Telegram Anda:*\n' +
        '`/link NRP_ANDA`\n\n' +
        'Contoh: `/link 081235114745`\n\n' +
        '*Perintah lainnya:*\n' +
        '/help - Tampilkan bantuan lengkap\n\n' +
        '_Pastikan Anda menggunakan NRP/NIP yang terdaftar di sistem._';
      
      await userBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }
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
    
    const linkedUser = await userModel.findUserByTelegramChatId(chatId);
    
    let helpMessage;
    if (linkedUser) {
      helpMessage = 
        '📖 *Bantuan Bot User Cicero*\n\n' +
        '*Perintah yang tersedia:*\n' +
        '/start - Tampilkan pesan selamat datang\n' +
        '/menu - Tampilkan menu user untuk mengelola data\n' +
        '/help - Tampilkan pesan bantuan ini\n\n' +
        '*Cara penggunaan:*\n' +
        '1. Gunakan /menu untuk melihat menu yang tersedia\n' +
        '2. Pilih menu yang ingin diakses\n' +
        '3. Ikuti instruksi dari bot\n\n' +
        'Bot ini hanya merespons di *chat private*.';
    } else {
      helpMessage = 
        '📖 *Bantuan Bot User Cicero*\n\n' +
        '*Langkah-langkah penggunaan:*\n\n' +
        '*1. Tautkan Akun*\n' +
        '   Gunakan: `/link NRP_ANDA`\n' +
        '   Contoh: `/link 081235114745`\n\n' +
        '*2. Setujui Penautan*\n' +
        '   Setelah /link, Anda akan menerima kode persetujuan.\n' +
        '   Ketik: `/approve KODE_ANDA`\n\n' +
        '*3. Akses Menu*\n' +
        '   Setelah berhasil ditautkan, gunakan:\n' +
        '   `/menu` - untuk mengakses menu user\n\n' +
        '*Perintah lainnya:*\n' +
        '/start - Tampilkan pesan selamat datang\n' +
        '/help - Tampilkan bantuan ini\n\n' +
        'Bot ini hanya merespons di *chat private*.';
    }
    
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
    
    // Check if user is linked
    const linkedUser = await userModel.findUserByTelegramChatId(chatId);
    if (!linkedUser) {
      await userBot.sendMessage(
        chatId,
        '⚠️ Akun Telegram Anda belum ditautkan dengan akun pengguna.\n\n' +
        'Untuk menggunakan bot ini, silakan tautkan akun Anda dengan perintah:\n' +
        '`/link NRP_ANDA`\n\n' +
        'Contoh: `/link 081235114745`',
        { parse_mode: 'Markdown' }
      );
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

  // /link command
  userBot.onText(/\/link(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const userId = match[1]?.trim();
    
    console.log(`[Telegram User Bot] /link command from chat ${chatId} with userId: ${userId}`);
    
    if (chatType !== 'private') {
      await userBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    // Check if user is already linked
    const existingLink = await userModel.findUserByTelegramChatId(chatId);
    if (existingLink) {
      await userBot.sendMessage(
        chatId,
        `✅ Akun Telegram Anda sudah ditautkan dengan:\n\n` +
        `*Nama*: ${existingLink.nama || '-'}\n` +
        `*NRP/NIP*: ${existingLink.user_id}\n` +
        `*Satfung*: ${existingLink.divisi || '-'}\n\n` +
        `Gunakan /menu untuk mengakses menu user.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    if (!userId) {
      await userBot.sendMessage(
        chatId,
        '⚠️ *Cara menggunakan perintah /link:*\n\n' +
        'Ketik: `/link NRP_ANDA`\n\n' +
        'Contoh: `/link 081235114745`\n\n' +
        '_NRP/NIP adalah nomor identitas Anda yang terdaftar di sistem._',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    try {
      // Find user by user_id
      const user = await userModel.findUserById(userId);
      
      if (!user) {
        await userBot.sendMessage(
          chatId,
          '❌ NRP/NIP tidak ditemukan dalam sistem.\n\n' +
          'Pastikan Anda memasukkan NRP/NIP yang benar.\n' +
          'Hubungi administrator jika Anda yakin NRP/NIP Anda sudah terdaftar.'
        );
        return;
      }
      
      // Check if this user_id is already linked to another telegram account
      if (user.telegram_chat_id && user.telegram_chat_id !== String(chatId)) {
        await userBot.sendMessage(
          chatId,
          '❌ NRP/NIP ini sudah ditautkan dengan akun Telegram lain.\n\n' +
          'Jika Anda yakin ini adalah akun Anda, silakan hubungi administrator untuk bantuan.'
        );
        return;
      }
      
      // Check for pending link request for this telegram chat
      const existingPending = await userModel.getPendingTelegramLinkByTelegramChatId(chatId);
      if (existingPending) {
        await userBot.sendMessage(
          chatId,
          '⏳ Anda sudah memiliki permintaan penautan yang menunggu persetujuan.\n\n' +
          `*Kode Persetujuan*: \`${existingPending.approval_code}\`\n\n` +
          'Silakan konfirmasi kode ini dengan mengetik:\n' +
          '`/approve KODE_ANDA`\n\n' +
          `Contoh: \`/approve ${existingPending.approval_code}\`\n\n` +
          '_Kode akan kedaluwarsa dalam 24 jam._',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Create pending link request
      const telegramUser = msg.from;
      const pendingLink = await userModel.createPendingTelegramLink(
        userId,
        chatId,
        telegramUser.username || null,
        telegramUser.first_name || null,
        telegramUser.last_name || null
      );
      
      await userBot.sendMessage(
        chatId,
        '✅ *Permintaan Penautan Berhasil Dibuat*\n\n' +
        `Akun Telegram Anda akan ditautkan dengan:\n` +
        `*Nama*: ${user.nama || '-'}\n` +
        `*NRP/NIP*: ${user.user_id}\n` +
        `*Satfung*: ${user.divisi || '-'}\n\n` +
        `*Kode Persetujuan*: \`${pendingLink.approval_code}\`\n\n` +
        'Untuk menyelesaikan penautan, ketik:\n' +
        '`/approve KODE_ANDA`\n\n' +
        `Contoh: \`/approve ${pendingLink.approval_code}\`\n\n` +
        '_Kode akan kedaluwarsa dalam 24 jam._',
        { parse_mode: 'Markdown' }
      );
      
      console.log(`[Telegram User Bot] Link request created for user ${userId}, code: ${pendingLink.approval_code}`);
      
    } catch (error) {
      console.error('[Telegram User Bot] Error in /link command:', error);
      await userBot.sendMessage(
        chatId,
        '❌ Terjadi kesalahan saat memproses permintaan penautan. Silakan coba lagi nanti.'
      );
    }
  });

  // /approve command
  userBot.onText(/\/approve(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const approvalCode = match[1]?.trim();
    
    console.log(`[Telegram User Bot] /approve command from chat ${chatId} with code: ${approvalCode}`);
    
    if (chatType !== 'private') {
      await userBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    if (!approvalCode) {
      await userBot.sendMessage(
        chatId,
        '⚠️ *Cara menggunakan perintah /approve:*\n\n' +
        'Ketik: `/approve KODE_ANDA`\n\n' +
        'Contoh: `/approve 123456`\n\n' +
        '_Kode persetujuan dikirimkan setelah Anda menjalankan perintah /link._',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    try {
      // Get pending link by code
      const pendingLink = await userModel.getPendingTelegramLinkByCode(approvalCode);
      
      if (!pendingLink) {
        await userBot.sendMessage(
          chatId,
          '❌ Kode persetujuan tidak valid atau sudah kedaluwarsa.\n\n' +
          'Silakan lakukan permintaan penautan ulang dengan perintah `/link NRP_ANDA`.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Verify that the approval is from the correct telegram user
      if (pendingLink.telegram_chat_id !== String(chatId)) {
        await userBot.sendMessage(
          chatId,
          '❌ Kode persetujuan ini tidak cocok dengan akun Telegram Anda.\n\n' +
          'Pastikan Anda menggunakan akun Telegram yang sama dengan yang digunakan saat membuat permintaan penautan.'
        );
        return;
      }
      
      // Approve the link
      const approvedLink = await userModel.approveTelegramLink(approvalCode);
      
      await userBot.sendMessage(
        chatId,
        '✅ *Penautan Berhasil!*\n\n' +
        `Akun Telegram Anda telah berhasil ditautkan dengan:\n` +
        `*Nama*: ${pendingLink.nama || '-'}\n` +
        `*NRP/NIP*: ${pendingLink.user_id}\n\n` +
        'Sekarang Anda dapat mengakses menu user dengan perintah:\n' +
        '`/menu`',
        { parse_mode: 'Markdown' }
      );
      
      console.log(`[Telegram User Bot] Link approved for user ${approvedLink.user_id}`);
      
    } catch (error) {
      console.error('[Telegram User Bot] Error in /approve command:', error);
      await userBot.sendMessage(
        chatId,
        '❌ Terjadi kesalahan saat memproses persetujuan. Silakan coba lagi nanti.'
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

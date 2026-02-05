import TelegramBot from 'node-telegram-bot-api';
import { userMenuHandlers } from '../handler/menu/userMenuHandlers.js';
import { query } from '../repository/db.js';
import * as userModel from '../model/userModel.js';
import { createSendMessageWrapper, escapeMarkdown } from '../utils/telegramBotHelpers.js';
import { normalizeWhatsappNumber } from '../utils/phoneHelper.js';

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
        `Halo, *${escapeMarkdown(linkedUser.nama || 'User')}*!\n\n` +
        'Akun Telegram Anda sudah ditautkan.\n\n' +
        '*Perintah yang tersedia:*\n' +
        '/profile - Lihat profil Anda\n' +
        '/update - Update data (Instagram, TikTok, nama, email, phone)\n' +
        '/menu - Menu interaktif\n' +
        '/help - Bantuan lengkap';
      
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
        '🤖 *CARA UPDATE DATA DI BOT TELEGRAM* 🤖\n\n' +
        'Halo! Ini cara update data kamu:\n\n' +
        '*1. Update Instagram*\n' +
        '   `/update instagram @username`\n' +
        '   Contoh: `/update instagram @jokowi`\n' +
        '   Contoh: `/update instagram @raffinagita1717`\n\n' +
        '*2. Update TikTok*\n' +
        '   `/update tiktok @username`\n' +
        '   Contoh: `/update tiktok @jokowi`\n' +
        '   Contoh: `/update tiktok @awkarin`\n\n' +
        '*3. Update Nama*\n' +
        '   `/update nama Nama Lengkap`\n' +
        '   Contoh: `/update nama Budi Santoso`\n\n' +
        '*4. Update Email*\n' +
        '   `/update email nama@email.com`\n' +
        '   Contoh: `/update email budi@gmail.com`\n\n' +
        '*5. Update Telepon*\n' +
        '   `/update phone +628xxxxxxxxx`\n' +
        '   Contoh: `/update phone +628123456789`\n\n' +
        '*✅ CEK DATA SAAT INI*\n' +
        '   Ketik: `/profile`\n\n' +
        '*💡 TIPS*\n' +
        '   • Username Instagram/TikTok pakai @\n' +
        '   • Nomor telepon pakai \\+62\n' +
        '   • Ketik `/help` untuk bantuan\n\n' +
        '*Perintah lainnya:*\n' +
        '/start - Pesan selamat datang\n' +
        '/menu - Menu interaktif\n' +
        '/profile - Lihat profil Anda\n' +
        '/help - Bantuan ini';
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

  // /profile command
  userBot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram User Bot] /profile command from chat ${chatId} (type: ${chatType})`);
    
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
    
    try {
      // Get fresh user data
      const user = await userModel.findUserById(linkedUser.user_id);
      
      if (!user) {
        await userBot.sendMessage(chatId, '❌ Data pengguna tidak ditemukan.');
        return;
      }
      
      const polresName = escapeMarkdown(user.client_name || user.client_id || '-');
      const nama = escapeMarkdown(user.nama || '-');
      const title = escapeMarkdown(user.title || '-');
      const userId = escapeMarkdown(user.user_id || '-');
      const divisi = escapeMarkdown(user.divisi || '-');
      const jabatan = escapeMarkdown(user.jabatan || '-');
      const desa = escapeMarkdown(user.desa || '-');
      const insta = user.insta ? '@' + escapeMarkdown(user.insta.replace(/^@/, '')) : '-';
      const tiktok = user.tiktok ? '@' + escapeMarkdown(user.tiktok.replace(/^@/, '')) : '-';
      const whatsapp = escapeMarkdown(user.whatsapp || '-');
      const email = escapeMarkdown(user.email || '-');
      const status = (user.status === true || user.status === 'true') ? '🟢 AKTIF' : '🔴 NONAKTIF';
      
      const profileMessage = [
        '👤 *PROFIL ANDA*',
        '',
        `*Nama Polres*: ${polresName}`,
        `*Nama*       : ${nama}`,
        `*Pangkat*    : ${title}`,
        `*NRP/NIP*    : ${userId}`,
        `*Satfung*    : ${divisi}`,
        `*Jabatan*    : ${jabatan}`,
        ...(user.ditbinmas ? [`*Desa Binaan* : ${desa}`] : []),
        `*Instagram*  : ${insta}`,
        `*TikTok*     : ${tiktok}`,
        `*WhatsApp*   : ${whatsapp}`,
        `*Email*      : ${email}`,
        `*Status*     : ${status}`,
        '',
        '💡 Untuk mengupdate data, gunakan `/update` atau `/help`'
      ].join('\n');
      
      await userBot.sendMessage(chatId, profileMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[Telegram User Bot] Error in /profile command:', error);
      await userBot.sendMessage(
        chatId,
        '❌ Terjadi kesalahan saat menampilkan profil. Silakan coba lagi nanti.'
      );
    }
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
        `*Nama*: ${escapeMarkdown(existingLink.nama || '-')}\n` +
        `*NRP/NIP*: ${escapeMarkdown(existingLink.user_id)}\n` +
        `*Satfung*: ${escapeMarkdown(existingLink.divisi || '-')}\n\n` +
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
        `*Nama*: ${escapeMarkdown(user.nama || '-')}\n` +
        `*NRP/NIP*: ${escapeMarkdown(user.user_id)}\n` +
        `*Satfung*: ${escapeMarkdown(user.divisi || '-')}\n\n` +
        `*Kode Persetujuan*: \`${escapeMarkdown(pendingLink.approval_code)}\`\n\n` +
        'Untuk menyelesaikan penautan, ketik:\n' +
        '`/approve KODE_ANDA`\n\n' +
        `Contoh: \`/approve ${escapeMarkdown(pendingLink.approval_code)}\`\n\n` +
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
        `*Nama*: ${escapeMarkdown(pendingLink.nama || '-')}\n` +
        `*NRP/NIP*: ${escapeMarkdown(pendingLink.user_id)}\n\n` +
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

  // /update command
  userBot.onText(/\/update(?:\s+(\w+)(?:\s+(.+))?)?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const field = match[1]?.toLowerCase();
    const value = match[2]?.trim();
    
    console.log(`[Telegram User Bot] /update command from chat ${chatId} with field: ${field}, value: ${value}`);
    
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
    
    if (!field) {
      await userBot.sendMessage(
        chatId,
        '⚠️ *Cara menggunakan perintah /update:*\n\n' +
        '*Format:* `/update <field> <value>`\n\n' +
        '*Field yang tersedia:*\n' +
        '• `instagram` - Update Instagram\n' +
        '• `tiktok` - Update TikTok\n' +
        '• `nama` - Update nama lengkap\n' +
        '• `email` - Update email\n' +
        '• `phone` - Update nomor telepon\n\n' +
        '*Contoh:*\n' +
        '`/update instagram @jokowi`\n' +
        '`/update tiktok @awkarin`\n' +
        '`/update nama Budi Santoso`\n' +
        '`/update email budi@gmail.com`\n' +
        '`/update phone +628123456789`\n\n' +
        'Ketik `/help` untuk bantuan lengkap.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    if (!value) {
      await userBot.sendMessage(
        chatId,
        `⚠️ Nilai untuk field *${field}* tidak boleh kosong.\n\n` +
        `Contoh: \`/update ${field} nilai_baru\`\n\n` +
        'Ketik `/help` untuk bantuan lengkap.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    try {
      const userId = linkedUser.user_id;
      let dbField = field;
      let processedValue = value;
      let displayValue = value;
      
      // Handle different field types
      switch (field) {
        case 'instagram':
        case 'insta': {
          dbField = 'insta';
          // Extract username from Instagram URL or handle
          const igMatch = processedValue.match(
            /^(?:https?:\/\/(?:www\.)?instagram\.com\/)?@?([A-Za-z0-9._]+)\/?(?:\?.*)?$/i
          );
          if (!igMatch) {
            await userBot.sendMessage(
              chatId,
              '❌ Format Instagram tidak valid!\n\n' +
              '*Format yang diterima:*\n' +
              '• `@username`\n' +
              '• `username`\n' +
              '• `https://www.instagram.com/username`\n\n' +
              '*Contoh:*\n' +
              '`/update instagram @jokowi`\n' +
              '`/update instagram raffinagita1717`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          processedValue = igMatch[1].toLowerCase();
          displayValue = '@' + processedValue;
          
          // Check if Instagram is already taken
          const existingIg = await userModel.findUserByInsta(processedValue);
          if (existingIg && existingIg.user_id !== userId) {
            await userBot.sendMessage(
              chatId,
              '❌ Akun Instagram tersebut sudah terdaftar pada pengguna lain.'
            );
            return;
          }
          break;
        }
        
        case 'tiktok': {
          // Extract username from TikTok URL or handle
          const ttMatch = processedValue.match(
            /^(?:https?:\/\/(?:www\.)?tiktok\.com\/@)?@?([A-Za-z0-9._]+)\/?(?:\?.*)?$/i
          );
          if (!ttMatch) {
            await userBot.sendMessage(
              chatId,
              '❌ Format TikTok tidak valid!\n\n' +
              '*Format yang diterima:*\n' +
              '• `@username`\n' +
              '• `username`\n' +
              '• `https://www.tiktok.com/@username`\n\n' +
              '*Contoh:*\n' +
              '`/update tiktok @jokowi`\n' +
              '`/update tiktok awkarin`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          processedValue = ttMatch[1].toLowerCase();
          displayValue = '@' + processedValue;
          
          // Check if TikTok is already taken
          const existingTt = await userModel.findUserByTiktok(processedValue);
          if (existingTt && existingTt.user_id !== userId) {
            await userBot.sendMessage(
              chatId,
              '❌ Akun TikTok tersebut sudah terdaftar pada pengguna lain.'
            );
            return;
          }
          break;
        }
        
        case 'nama':
        case 'name': {
          dbField = 'nama';
          // Validate name (should have at least 2 characters)
          if (processedValue.length < 2) {
            await userBot.sendMessage(
              chatId,
              '❌ Nama harus memiliki minimal 2 karakter.\n\n' +
              '*Contoh:*\n' +
              '`/update nama Budi Santoso`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          processedValue = processedValue.toUpperCase();
          displayValue = processedValue;
          break;
        }
        
        case 'email': {
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(processedValue)) {
            await userBot.sendMessage(
              chatId,
              '❌ Format email tidak valid!\n\n' +
              '*Contoh:*\n' +
              '`/update email budi@gmail.com`\n' +
              '`/update email nama.lengkap@domain.co.id`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          break;
        }
        
        case 'phone':
        case 'telepon':
        case 'whatsapp':
        case 'wa': {
          dbField = 'whatsapp';
          // Normalize phone number
          try {
            processedValue = normalizeWhatsappNumber(processedValue);
            displayValue = processedValue;
          } catch (error) {
            await userBot.sendMessage(
              chatId,
              '❌ Format nomor telepon tidak valid!\n\n' +
              '*Format yang diterima:*\n' +
              '• Harus dimulai dengan \\+62\n' +
              '• Diikuti minimal 9 digit angka\n\n' +
              '*Contoh:*\n' +
              '`/update phone +628123456789`\n' +
              '`/update phone +6281234567890`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          break;
        }
        
        default: {
          await userBot.sendMessage(
            chatId,
            '❌ Field tidak dikenali!\n\n' +
            '*Field yang tersedia:*\n' +
            '• `instagram` - Update Instagram\n' +
            '• `tiktok` - Update TikTok\n' +
            '• `nama` - Update nama lengkap\n' +
            '• `email` - Update email\n' +
            '• `phone` - Update nomor telepon\n\n' +
            'Ketik `/help` untuk bantuan lengkap.',
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }
      
      // Update the field
      await userModel.updateUserField(userId, dbField, processedValue);
      
      await userBot.sendMessage(
        chatId,
        `✅ *Berhasil mengupdate ${field}!*\n\n` +
        `*Nilai baru:* ${escapeMarkdown(displayValue)}\n\n` +
        'Ketik `/profile` untuk melihat data terbaru Anda.',
        { parse_mode: 'Markdown' }
      );
      
      console.log(`[Telegram User Bot] User ${userId} updated ${dbField} to ${processedValue}`);
      
    } catch (error) {
      console.error('[Telegram User Bot] Error in /update command:', error);
      await userBot.sendMessage(
        chatId,
        '❌ Terjadi kesalahan saat mengupdate data. Silakan coba lagi nanti.'
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

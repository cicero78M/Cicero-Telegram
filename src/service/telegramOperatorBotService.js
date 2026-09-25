import TelegramBot from 'node-telegram-bot-api';
import oprRequestHandlers from '../handler/menu/oprRequestHandlers.js';
import { query } from '../repository/db.js';
import * as userModel from '../model/userModel.js';
import * as clientModel from '../model/clientModel.js';
import * as telegramMenuAccessModel from '../model/telegramMenuAccessModel.js';
import { configureTelegramMenu, createSendMessageWrapper, escapeMarkdown } from '../utils/telegramBotHelpers.js';
import { extractVideoId } from '../utils/tiktokHelper.js';
import { fetchAndStoreSingleTiktokPost } from '../handler/fetchpost/tiktokFetchPost.js';

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
    await configureTelegramMenu(operatorBot, [
      { command: 'start', description: 'Buka beranda operator' },
      { command: 'menu', description: 'Buka menu operator' },
      { command: 'request', description: 'Ajukan akses client' },
      { command: 'tiktokmanual', description: 'Input satu atau banyak link TikTok' },
      { command: 'help', description: 'Bantuan operator' }
    ], 'Operator Bot');
    
    // Add sendMessage wrapper to make bot compatible with WhatsApp-style handlers
    const nativeSendMessage = TelegramBot.prototype.sendMessage;
    operatorBot.sendMessage = createSendMessageWrapper(operatorBot, nativeSendMessage, 'Operator Bot');
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    setupAccessCallbackHandlers();
    
    isInitialized = true;
    console.log('[Telegram Operator Bot] Bot initialized successfully');
    
    return operatorBot;
  } catch (error) {
    console.error('[Telegram Operator Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Show client selection menu to the user
 * @param {number} chatId - Telegram chat ID
 * @param {Array} clients - Array of active ORG clients
 */
async function showClientSelection(chatId, clients) {
  let clientMenu = '📋 *Pilih Client (Tipe ORG)*\n\n';
  clientMenu += 'Pilih client yang ingin Anda gunakan:\n\n';
  
  // Emoji array supports up to 10 clients visually
  // For more than 10 clients, falls back to numeric format
  clients.forEach((client, index) => {
    const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}.`;
    const nama = escapeMarkdown(client.nama || client.client_id);
    const clientId = escapeMarkdown(client.client_id);
    clientMenu += `${numberEmoji} ${clientId} - ${nama}\n`;
  });
  
  clientMenu += '\nBalas dengan *angka* atau *Client ID* yang tertera, atau ketik *batal* untuk keluar.';
  
  await operatorBot.sendMessage(chatId, clientMenu, { parse_mode: 'Markdown' });
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
      '/request - Ajukan izin akses ke satu client/satfung\n' +
      '/tiktokmanual [CLIENT_ID] link1 link2 - Input link TikTok\n' +
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
      '/request - Ajukan izin akses ke satu client/satfung\n' +
      '/menu - Tampilkan menu operator\n' +
      '/tiktokmanual [CLIENT_ID] link1 link2 - Input satu/banyak link TikTok\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /request untuk mengajukan akses\n' +
      '2. Pilih satu client/satfung\n' +
      '3. Tunggu persetujuan admin Telegram\n' +
      '4. Setelah disetujui, ketik /menu\n\n' +
      'Satu akun hanya dapat terhubung ke satu client. Banyak akun dapat memakai client yang sama.\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await operatorBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // Accept one or many TikTok links directly from Telegram.
  operatorBot.onText(/^\/tiktokmanual(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    if (msg.chat.type !== 'private') return;

    const authorizedClients = await getAuthorizedClients(msg);
    if (!authorizedClients) return;

    const rawTokens = String(match?.[1] || '')
      .split(/[\s,;]+/)
      .map((token) => token.trim().replace(/^[([{<]+|[)\]}>,.]+$/g, ''))
      .filter(Boolean);
    if (!rawTokens.length) {
      await operatorBot.sendMessage(chatId, 'Format: /tiktokmanual [CLIENT_ID] link1 link2\nLink dapat dipisahkan dengan spasi, baris baru, koma, atau titik koma.');
      return;
    }

    const session = userSessions.get(chatId) || { step: 'main' };
    userSessions.set(chatId, session);
    let clientId = session.selected_client_id;
    let linkTokens = rawTokens;
    if (!extractVideoId(rawTokens[0])) {
      clientId = rawTokens[0];
      linkTokens = rawTokens.slice(1);
    }

    const client = authorizedClients.find((item) => item.client_id === clientId);
    if (!client) {
      const available = authorizedClients.map((item) => item.client_id).join(', ');
      await operatorBot.sendMessage(chatId, clientId
        ? `❌ Client *${escapeMarkdown(clientId)}* tidak tersedia untuk akun ini.\nClient yang diizinkan: ${escapeMarkdown(available)}`
        : '❌ Pilih client melalui /menu terlebih dahulu atau gunakan /tiktokmanual CLIENT_ID link1 link2.',
      { parse_mode: 'Markdown' });
      return;
    }

    const videoIds = [...new Set(linkTokens.map(extractVideoId).filter(Boolean))];
    if (!videoIds.length) {
      await operatorBot.sendMessage(chatId, '❌ Tidak ada link/ID video TikTok yang valid.');
      return;
    }

    await operatorBot.sendMessage(chatId, `⏳ Memproses ${videoIds.length} link TikTok untuk *${escapeMarkdown(client.client_id)}*...`, { parse_mode: 'Markdown' });
    const success = [];
    const failed = [];
    for (const videoId of videoIds) {
      try {
        await fetchAndStoreSingleTiktokPost(client.client_id, videoId);
        success.push(videoId);
      } catch (error) {
        failed.push(`${videoId}: ${error.message || 'gagal diproses'}`);
        console.error(`[Telegram Operator Bot] Manual TikTok ${videoId} failed:`, error);
      }
    }

    let result = `✅ Selesai. Berhasil: ${success.length}/${videoIds.length} untuk ${client.client_id}.`;
    if (success.length) result += `\nID berhasil: ${success.join(', ')}`;
    if (failed.length) result += `\n❌ Gagal:\n${failed.join('\n')}`;
    result += '\n\nData manual masuk sebagai tugas hari ini.';
    await operatorBot.sendMessage(chatId, result);
  });


  operatorBot.onText(/\/request/, async (msg) => {
    if (msg.chat.type !== 'private') return;
    await showAccessRequestMenu(msg.chat.id);
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
    
    try {
      // Fetch all active ORG clients
      const activeOrgClients = await getAuthorizedClients(msg);
      if (!activeOrgClients) return;
      
      // Initialize or get user session
      let session = userSessions.get(chatId);
      if (!session) {
        session = {};
        userSessions.set(chatId, session);
      }
      
      // If multiple clients available, show client selection
      if (activeOrgClients && activeOrgClients.length > 1) {
        // Store clients in session and set step to choose_client
        session.opr_clients = activeOrgClients;
        session.step = 'choose_client';
        
        // Show client selection menu
        await showClientSelection(chatId, activeOrgClients);
        return;
      }
      
      // If only one client or no clients, set it and proceed to main menu
      if (activeOrgClients && activeOrgClients.length === 1) {
        session.selected_client_id = activeOrgClients[0].client_id;
      }
      
      // Reset session to main menu
      session.step = 'main';
      
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
      const authorizedClients = await getAuthorizedClients(msg);
      if (!authorizedClients) return;
      session.opr_clients = authorizedClients;
      if (session.selected_client_id && !authorizedClients.some((client) => client.client_id === session.selected_client_id)) {
        delete session.selected_client_id;
        session.step = ["choose_client"][0];
      }
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
function getAdminChatIds() {
  const configured = String(process.env.TELEGRAM_OPERATOR_ADMIN_CHAT_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
  return configured.filter((id) => id === '1836914805');
}

function isTelegramAdmin(chatId) {
  return getAdminChatIds().includes(String(chatId));
}

async function notifyAccessAdmins(request, client) {
  const admins = getAdminChatIds();
  const text = '🔐 *Permintaan Akses Menu Operator*\n\n' + 'User: *' + escapeMarkdown(request.telegram_name || request.telegram_username || request.telegram_chat_id) + '*\n' + 'Chat ID: `' + request.telegram_chat_id + '`\n' + 'Client: *' + escapeMarkdown(client.nama || client.client_id) + '* (`' + client.client_id + '`)\n\nSetujui atau tolak permintaan ini.';
  if (!admins.length) console.warn('[Telegram Operator Bot] No admin chat IDs configured');
  for (const adminChatId of admins) await operatorBot.sendMessage(adminChatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '✅ Setujui', callback_data: 'access:approve:' + request.access_id }, { text: '❌ Tolak', callback_data: 'access:reject:' + request.access_id }]] } });
}

async function showAccessRequestMenu(chatId) {
  const clients = await clientModel.findAllActiveOrgClients();
  const keyboard = clients.map((client) => [{ text: '🔑 ' + (client.nama || client.client_id), callback_data: 'access:request:' + client.client_id }]);
  await operatorBot.sendMessage(chatId, '🔒 *Akses diperlukan*\n\nPilih satfung/client yang ingin digunakan. Permintaan dikirim ke admin Telegram. Setelah disetujui, akun ini hanya dapat mengakses pilihan tersebut.\n\nJumlah user tidak dibatasi.', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

async function getAuthorizedClients(msg) {
  const chatId = msg.chat.id;
  if (isTelegramAdmin(chatId)) return clientModel.findAllActiveOrgClients();
  const approved = await telegramMenuAccessModel.findApprovedClients(chatId);
  if (!approved.length) { await showAccessRequestMenu(chatId); return null; }
  return approved;
}

function setupAccessCallbackHandlers() {
  if (!operatorBot) return;
  operatorBot.on('callback_query', async (callback) => {
    const chatId = callback.message && callback.message.chat.id;
    const parts = String(callback.data || '').split(':');
    if (parts[0] !== 'access') return;
    try {
      if (parts[1] === 'request') {
        const clientId = parts.slice(2).join(':');
        const current = await telegramMenuAccessModel.findCurrent(chatId);
        if (current && current.client_id !== clientId) { await operatorBot.answerCallbackQuery(callback.id, { text: 'Akun Anda sudah terhubung ke client lain.', show_alert: true }); return; }
        if (current && current.client_id === clientId && current.status === 'approved') { await operatorBot.answerCallbackQuery(callback.id, { text: 'Akses client ini sudah disetujui. Ketik /menu.', show_alert: true }); return; }
        if (current && current.client_id === clientId && current.status === 'pending') { await operatorBot.answerCallbackQuery(callback.id, { text: 'Permintaan ini masih menunggu persetujuan admin.', show_alert: true }); return; }
        const client = (await clientModel.findAllActiveOrgClients()).find((item) => item.client_id === clientId);
        if (!client) throw new Error('Client tidak aktif');
        const request = await telegramMenuAccessModel.createRequest({ chatId, userId: callback.from.id, username: callback.from.username, name: [callback.from.first_name, callback.from.last_name].filter(Boolean).join(' '), clientId });
        await notifyAccessAdmins(request, client);
        await operatorBot.answerCallbackQuery(callback.id, { text: 'Permintaan dikirim ke admin.', show_alert: true });
        await operatorBot.sendMessage(chatId, '⏳ Permintaan akses *' + escapeMarkdown(client.nama || clientId) + '* menunggu konfirmasi admin.', { parse_mode: 'Markdown' });
        return;
      }
      if (parts[1] === 'approve' || parts[1] === 'reject') {
        if (!isTelegramAdmin(chatId)) { await operatorBot.answerCallbackQuery(callback.id, { text: 'Hanya admin Telegram yang dapat memproses.', show_alert: true }); return; }
        const access = await telegramMenuAccessModel.decide(parts.slice(2).join(':'), parts[1] === 'approve' ? 'approved' : 'rejected', chatId);
        if (!access) { await operatorBot.answerCallbackQuery(callback.id, { text: 'Permintaan sudah diproses.', show_alert: true }); return; }
        await operatorBot.answerCallbackQuery(callback.id, { text: parts[1] === 'approve' ? 'Akses disetujui.' : 'Akses ditolak.' });
        await operatorBot.sendMessage(access.telegram_chat_id, parts[1] === 'approve' ? '✅ Akses *' + escapeMarkdown(access.client_id) + '* disetujui. Ketik /menu.' : '❌ Permintaan akses *' + escapeMarkdown(access.client_id) + '* ditolak.', { parse_mode: 'Markdown' });
        await operatorBot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: callback.message.message_id });
      }
    } catch (error) { console.error('[Telegram Operator Bot] Access callback error:', error); await operatorBot.answerCallbackQuery(callback.id, { text: 'Gagal memproses permintaan.', show_alert: true }); }
  });
}

// src/service/telegramClientBotService.js

/**
 * Telegram Client Bot Service
 * Handles telegram bot operations for client request menu
 * Following naming conventions: camelCase for functions and file names
 */

import TelegramBot from 'node-telegram-bot-api';
import { runClientRequestAction } from '../handler/menu/clientRequestTelegramHandlers.js';
import { findAllActiveClients } from '../service/clientService.js';
import { escapeMarkdown } from '../utils/telegramBotHelpers.js';

let clientBot = null;
let isInitialized = false;
// Store user sessions for client selection and menu navigation
const userSessions = new Map();
// Default client ID when no clients are available
const DEFAULT_CLIENT_ID = 'DITBINMAS';

/**
 * Initialize the Telegram Client Bot
 * @param {string} token - Telegram bot token
 * @param {boolean} enabled - Whether the bot is enabled
 * @returns {Promise<TelegramBot|null>} Bot instance or null
 */
export async function initializeTelegramClientBot(token, enabled = true) {
  if (!enabled) {
    console.log('[Telegram Client Bot] Bot is disabled via configuration flag');
    return null;
  }

  if (!token) {
    console.log('[Telegram Client Bot] No token provided. Bot will not start.');
    return null;
  }

  if (isInitialized && clientBot) {
    console.log('[Telegram Client Bot] Already initialized');
    return clientBot;
  }

  try {
    console.log('[Telegram Client Bot] Initializing bot...');
    clientBot = new TelegramBot(token, { polling: true });
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    
    isInitialized = true;
    console.log('[Telegram Client Bot] Bot initialized successfully');
    
    return clientBot;
  } catch (error) {
    console.error('[Telegram Client Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup command handlers for the bot
 */
function setupCommandHandlers() {
  if (!clientBot) return;

  // /start command
  clientBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Client Bot] /start command from chat ${chatId} (type: ${chatType})`);
    
    // Only respond to private chats
    if (chatType !== 'private') {
      await clientBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private. Silakan hubungi bot secara langsung.');
      return;
    }
    
    const welcomeMessage = 
      '🤖 *Selamat datang di Bot Client Request Cicero!*\n\n' +
      'Bot ini dapat membantu Anda mengakses menu client request untuk:\n' +
      '• Manajemen Client & User\n' +
      '• Operasional Media Sosial\n' +
      '• Transfer & Laporan\n' +
      '• Administratif\n\n' +
      'Gunakan perintah:\n' +
      '/menu - Tampilkan menu client request yang tersedia\n' +
      '/help - Tampilkan bantuan';
    
    await clientBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  clientBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Client Bot] /help command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await clientBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    const helpMessage = 
      '📖 *Bantuan Bot Client Request Cicero*\n\n' +
      '*Perintah yang tersedia:*\n' +
      '/start - Mulai menggunakan bot\n' +
      '/menu - Tampilkan menu client request\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /menu untuk melihat daftar menu\n' +
      '2. Pilih nomor menu yang ingin diakses\n' +
      '3. Bot akan memproses permintaan Anda\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await clientBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /menu command
  clientBot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Client Bot] /menu command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await clientBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    // Check if user already has a selected client
    const session = userSessions.get(chatId);
    if (session && session.selectedClientId) {
      // User already has a client selected, show menu directly
      await sendMainMenu(chatId);
    } else {
      // Show client selection first
      await showClientSelection(chatId);
    }
  });
}

/**
 * Setup message handlers for the bot
 */
function setupMessageHandlers() {
  if (!clientBot) return;

  // Handle all text messages that are not commands
  clientBot.on('message', async (msg) => {
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
    
    console.log(`[Telegram Client Bot] Message from chat ${chatId}: ${text}`);
    
    // Check if user is in client selection mode
    const session = userSessions.get(chatId);
    if (session && session.step === 'choose_client') {
      await handleClientSelection(chatId, text, msg.from);
      return;
    }
    
    // Check if it's a menu number
    if (text && /^\d+$/.test(text.trim())) {
      await handleMenuSelection(chatId, text.trim(), msg.from);
    }
  });
}

/**
 * Send the main menu to the user
 * @param {number} chatId - Telegram chat ID
 */
async function sendMainMenu(chatId) {
  const menuText = 
    '📋 *Menu Client Request*\n\n' +
    'Pilih menu yang ingin Anda akses:\n\n' +
    
    '1️⃣ *Manajemen Client & User*\n' +
    '   Kelola client dan user, tambah/update/hapus data\n\n' +
    
    '2️⃣ *Operasional Media Sosial*\n' +
    '   Ambil konten, likes, komentar Instagram & TikTok\n\n' +
    
    '3️⃣ *Transfer & Laporan*\n' +
    '   Transfer user, export data, sinkronisasi\n\n' +
    
    '4️⃣ *Administratif*\n' +
    '   Kelola komplain, broadcast, kontak Google\n\n' +
    
    'Ketik nomor menu untuk mengaksesnya.\n' +
    'Contoh: ketik "1" untuk Manajemen Client & User';
  
  await clientBot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
}

/**
 * Show client selection menu to the user
 * @param {number} chatId - Telegram chat ID
 */
async function showClientSelection(chatId) {
  try {
    const clients = await findAllActiveClients();
    
    if (!clients || clients.length === 0) {
      // No clients found, default to DITBINMAS
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await clientBot.sendMessage(chatId, `✅ Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu atau ketik /menu untuk melihat daftar menu.`);
      await sendMainMenu(chatId);
      return;
    }
    
    // Create client selection menu
    let clientMenu = '📋 *Pilih Client*\n\n';
    clientMenu += 'Pilih client yang ingin Anda gunakan:\n\n';
    
    // Emoji array supports up to 10 clients visually
    // For more than 10 clients, falls back to numeric format
    clients.slice(0, 10).forEach((client, index) => {
      const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index];
      const nama = client.nama || client.client_id;
      clientMenu += `${numberEmoji} ${client.client_id} - ${nama}\n`;
    });
    
    if (clients.length > 10) {
      clientMenu += '\n... dan ' + (clients.length - 10) + ' client lainnya\n';
    }
    
    clientMenu += '\nBalas dengan *angka* (1-' + Math.min(10, clients.length) + ') atau *Client ID* yang tertera.';
    
    // Store clients in session
    userSessions.set(chatId, {
      step: 'choose_client',
      clients: clients
    });
    
    await clientBot.sendMessage(chatId, clientMenu, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Client Bot] Error showing client selection:', error);
    await clientBot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil daftar client. Silakan coba lagi atau ketik /menu untuk memulai ulang.');
  }
}

/**
 * Handle client selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - User input (number or client ID)
 * @param {object} from - Telegram user info
 */
async function handleClientSelection(chatId, text, from) {
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.clients) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak ditemukan. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clients = session.clients;
    let selectedClient = null;
    
    // Check if input is a number (1-10 for quick selection)
    if (/^\d+$/.test(text.trim())) {
      const index = parseInt(text.trim(), 10) - 1;
      if (index >= 0 && index < Math.min(10, clients.length)) {
        selectedClient = clients[index];
      }
    }
    
    // If not found by number, try to match by client ID
    if (!selectedClient) {
      const inputUpper = text.trim().toUpperCase();
      selectedClient = clients.find(c => 
        c.client_id && c.client_id.toUpperCase() === inputUpper
      );
    }
    
    if (!selectedClient) {
      await clientBot.sendMessage(
        chatId, 
        '❌ Client tidak ditemukan. Silakan pilih nomor yang valid atau ketik Client ID yang benar.\n\nKetik /menu untuk melihat daftar client kembali.'
      );
      return;
    }
    
    // Update session with selected client
    userSessions.set(chatId, {
      selectedClientId: selectedClient.client_id,
      clientName: selectedClient.nama || selectedClient.client_id,
      step: 'menu'
    });
    
    const clientLabel = selectedClient.nama ? 
      `${escapeMarkdown(selectedClient.client_id)} - ${escapeMarkdown(selectedClient.nama)}` : 
      escapeMarkdown(selectedClient.client_id);
    
    await clientBot.sendMessage(
      chatId, 
      `✅ Client *${clientLabel}* telah dipilih.\n\nSilakan pilih menu dengan mengetik nomor menu.`,
      { parse_mode: 'Markdown' }
    );
    
    // Show main menu
    await sendMainMenu(chatId);
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling client selection:', error);
    await clientBot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi atau ketik /menu untuk memulai ulang.');
  }
}

/**
 * Handle menu selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} menuNumber - Menu number selected
 * @param {object} from - Telegram user info
 */
async function handleMenuSelection(chatId, menuNumber, from) {
  try {
    console.log(`[Telegram Client Bot] Processing menu ${menuNumber} for chat ${chatId}`);
    
    // Get user session to retrieve selected client
    const session = userSessions.get(chatId);
    let clientId = DEFAULT_CLIENT_ID; // Default fallback
    
    // If user has a selected client in session, use it
    if (session && session.selectedClientId) {
      clientId = session.selectedClientId;
    } else {
      // No client selected yet, prompt user to select client first
      await clientBot.sendMessage(
        chatId, 
        '⚠️ Silakan pilih client terlebih dahulu. Ketik /menu untuk memulai.'
      );
      return;
    }
    
    // Send processing message
    await clientBot.sendMessage(chatId, `⏳ Memproses menu ${menuNumber} untuk client ${clientId}...`);
    
    const chatIdStr = chatId.toString();
    
    // Call the runClientRequestAction function
    const result = await runClientRequestAction({
      action: menuNumber,
      clientId: clientId,
      chatId: chatIdStr,
      context: {
        username: from.username || from.first_name || 'telegram_user',
        chatId: chatIdStr,
      }
    });
    
    // Send the result back to user
    if (result) {
      // Split long messages if needed (Telegram has a 4096 character limit)
      const maxLength = 4000;
      if (result.length > maxLength) {
        // Split by newlines when possible to avoid breaking words/characters
        const chunks = [];
        let currentChunk = '';
        const lines = result.split('\n');
        
        for (const line of lines) {
          // If adding this line would exceed the limit, push current chunk and start new one
          if (currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
            // If a single line is too long, split it carefully
            if (line.length > maxLength) {
              let remaining = line;
              while (remaining.length > 0) {
                // Find a safe split point (prefer spaces, but respect UTF-8 boundaries)
                let splitPoint = maxLength;
                if (remaining.length > maxLength) {
                  // Look for last space before maxLength
                  const lastSpace = remaining.lastIndexOf(' ', maxLength);
                  if (lastSpace > maxLength * 0.8) { // Only use space if it's not too far back
                    splitPoint = lastSpace;
                  }
                }
                chunks.push(remaining.substring(0, splitPoint));
                remaining = remaining.substring(splitPoint).trim();
              }
            } else {
              currentChunk = line;
            }
          } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
          }
        }
        
        // Push the last chunk if there's anything left
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // Send each chunk as a separate message
        for (const chunk of chunks) {
          await clientBot.sendMessage(chatId, chunk);
        }
      } else {
        // Send the full result if it's within the limit
        await clientBot.sendMessage(chatId, result);
      }
    }
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling menu selection:', error);
    await clientBot.sendMessage(
      chatId, 
      `❌ Terjadi kesalahan saat memproses menu ${menuNumber}.\n\nError: ${error.message}`
    );
  }
}

/**
 * Get the bot instance
 * @returns {TelegramBot|null} Bot instance or null
 */
export function getTelegramClientBot() {
  return clientBot;
}

/**
 * Stop the bot
 */
export async function stopTelegramClientBot() {
  if (clientBot && isInitialized) {
    console.log('[Telegram Client Bot] Stopping bot...');
    await clientBot.stopPolling();
    isInitialized = false;
    clientBot = null;
    console.log('[Telegram Client Bot] Bot stopped');
  }
}

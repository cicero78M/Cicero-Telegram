import TelegramBot from 'node-telegram-bot-api';
import { performAction } from '../handler/menu/dirRequestHandlers.js';
import { findAllActiveDirektoratClients } from '../service/clientService.js';

let direktoratBot = null;
let isInitialized = false;
// Store user sessions for client selection
const userSessions = new Map();
// Default client ID when no DIREKTORAT clients are available
const DEFAULT_CLIENT_ID = 'DITBINMAS';

/**
 * Initialize the Telegram Direktorat Bot
 * @param {string} token - Telegram bot token
 * @param {boolean} enabled - Whether the bot is enabled
 */
export async function initializeTelegramDirektoratBot(token, enabled = true) {
  if (!enabled) {
    console.log('[Telegram Direktorat Bot] Bot is disabled via TELEGRAM_DIREKTORAT_BOT_ENABLED flag');
    return null;
  }

  if (!token) {
    console.log('[Telegram Direktorat Bot] No token provided. Bot will not start.');
    return null;
  }

  if (isInitialized && direktoratBot) {
    console.log('[Telegram Direktorat Bot] Already initialized');
    return direktoratBot;
  }

  try {
    console.log('[Telegram Direktorat Bot] Initializing direktoratBot...');
    direktoratBot = new TelegramBot(token, { polling: true });
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    
    isInitialized = true;
    console.log('[Telegram Direktorat Bot] Bot initialized successfully');
    
    return direktoratBot;
  } catch (error) {
    console.error('[Telegram Direktorat Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup command handlers for the bot
 */
function setupCommandHandlers() {
  if (!direktoratBot) return;

  // /start command
  direktoratBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Direktorat Bot] /start command from chat ${chatId} (type: ${chatType})`);
    
    // Only respond to private chats
    if (chatType !== 'private') {
      await direktoratBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private. Silakan hubungi bot secara langsung.');
      return;
    }
    
    const welcomeMessage = 
      '🤖 *Selamat datang di Bot Direktorat Cicero!*\n\n' +
      'Bot ini dapat membantu Anda mengakses menu direktorat untuk pelaporan dan analisis data.\n\n' +
      'Gunakan perintah:\n' +
      '/menu - Tampilkan menu dirRequest yang tersedia\n' +
      '/help - Tampilkan bantuan';
    
    await direktoratBot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  direktoratBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Direktorat Bot] /help command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await direktoratBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    const helpMessage = 
      '📖 *Bantuan Bot Direktorat Cicero*\n\n' +
      '*Perintah yang tersedia:*\n' +
      '/start - Mulai menggunakan bot\n' +
      '/menu - Tampilkan menu dirRequest\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /menu untuk melihat daftar menu\n' +
      '2. Pilih nomor menu yang ingin diakses\n' +
      '3. Bot akan memproses permintaan Anda\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await direktoratBot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /menu command
  direktoratBot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Direktorat Bot] /menu command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await direktoratBot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
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
  if (!direktoratBot) return;

  // Handle all text messages that are not commands
  direktoratBot.on('message', async (msg) => {
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
    
    console.log(`[Telegram Direktorat Bot] Message from chat ${chatId}: ${text}`);
    
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
    '📋 *Menu DirRequest*\n\n' +
    'Pilih menu yang ingin Anda akses:\n\n' +
    
    '*📊 Laporan Dasar (1-3)*\n' +
    '1️⃣ Recap data user\n' +
    '2️⃣ Executive summary\n' +
    '3️⃣ Laporan data tidak lengkap\n\n' +
    
    '*👥 Laporan Instagram/Likes (5-7, 12-13, 19)*\n' +
    '5️⃣ Absensi likes Ditbinmas (lengkap)\n' +
    '6️⃣ Absensi likes Ditbinmas (sederhana)\n' +
    '7️⃣ Absensi likes semua personel\n' +
    '1️⃣2️⃣ Fetch & recap konten Instagram + likes\n' +
    '1️⃣3️⃣ Fetch likes Instagram saja\n' +
    '1️⃣9️⃣ Likes recap Excel\n\n' +
    
    '*💬 Laporan TikTok/Komentar (8-10, 14-15, 20)*\n' +
    '8️⃣ Absensi komentar TikTok\n' +
    '9️⃣ Absensi komentar Ditbinmas (sederhana)\n' +
    '1️⃣0️⃣ Absensi komentar Ditbinmas (lengkap)\n' +
    '1️⃣4️⃣ Fetch & recap konten TikTok + komentar\n' +
    '1️⃣5️⃣ Fetch komentar TikTok saja\n' +
    '2️⃣0️⃣ Comment recap Excel\n\n' +
    
    '*📈 Laporan Lainnya*\n' +
    '4️⃣ Satker update matrix Excel\n' +
    '2️⃣2️⃣ Engagement ranking Excel\n' +
    '3️⃣0️⃣ Laporan Kasatker\n\n' +
    'Ketik nomor menu untuk mengaksesnya.\n' +
    'Contoh: ketik "1" untuk menu 1';
  
  await direktoratBot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
}

/**
 * Show client selection menu to the user
 * @param {number} chatId - Telegram chat ID
 */
async function showClientSelection(chatId) {
  try {
    const clients = await findAllActiveDirektoratClients();
    
    if (!clients || clients.length === 0) {
      // No DIREKTORAT clients found, default to DITBINMAS
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await direktoratBot.sendMessage(chatId, `✅ Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu.`);
      return;
    }
    
    // Create client selection menu
    let clientMenu = '📋 *Pilih Client DIREKTORAT*\n\n';
    clientMenu += 'Pilih client yang ingin Anda gunakan:\n\n';
    
    // Emoji array supports up to 10 clients visually
    // For more than 10 clients, falls back to numeric format
    clients.forEach((client, index) => {
      const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}.`;
      const nama = client.nama || client.client_id;
      clientMenu += `${numberEmoji} ${client.client_id} - ${nama}\n`;
    });
    
    clientMenu += '\nBalas dengan *angka* atau *Client ID* yang tertera.';
    
    // Store clients in session
    userSessions.set(chatId, {
      step: 'choose_client',
      clients: clients
    });
    
    await direktoratBot.sendMessage(chatId, clientMenu, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Bot] Error showing client selection:', error);
    // Fallback to default client on error
    userSessions.set(chatId, { 
      selectedClientId: DEFAULT_CLIENT_ID,
      step: 'menu'
    });
    await direktoratBot.sendMessage(chatId, `⚠️ Tidak dapat memuat daftar client. Menggunakan ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu.`);
  }
}

/**
 * Handle client selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} input - User input (number or client ID)
 * @param {object} from - Telegram user info
 */
async function handleClientSelection(chatId, input, from) {
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.clients) {
      await direktoratBot.sendMessage(chatId, '❌ Sesi tidak valid. Silakan ketik /menu untuk memulai lagi.');
      return;
    }
    
    const clients = session.clients;
    const normalizedInput = input.trim().toUpperCase();
    let selectedClient = null;
    
    // Try to match by number first
    if (/^\d+$/.test(normalizedInput)) {
      const index = parseInt(normalizedInput) - 1;
      if (index >= 0 && index < clients.length) {
        selectedClient = clients[index];
      }
    }
    
    // Try to match by client ID if not found by number
    if (!selectedClient) {
      selectedClient = clients.find(c => c.client_id?.toUpperCase() === normalizedInput);
    }
    
    if (!selectedClient) {
      await direktoratBot.sendMessage(chatId, '❌ Pilihan tidak valid. Silakan pilih sesuai daftar atau ketik /menu untuk memulai ulang.');
      return;
    }
    
    // Update session with selected client
    userSessions.set(chatId, {
      selectedClientId: selectedClient.client_id,
      clientName: selectedClient.nama || selectedClient.client_id,
      step: 'menu'
    });
    
    const clientLabel = selectedClient.nama ? 
      `${selectedClient.client_id} - ${selectedClient.nama}` : 
      selectedClient.client_id;
    
    await direktoratBot.sendMessage(
      chatId, 
      `✅ Client *${clientLabel}* telah dipilih.\n\nSilakan pilih menu dengan mengetik nomor menu.\nKetik /menu untuk melihat daftar menu.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('[Telegram Bot] Error handling client selection:', error);
    await direktoratBot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi atau ketik /menu untuk memulai ulang.');
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
    console.log(`[Telegram Bot] Processing menu ${menuNumber} for chat ${chatId}`);
    
    // Get user session to retrieve selected client
    const session = userSessions.get(chatId);
    let clientId = DEFAULT_CLIENT_ID; // Default fallback
    
    // If user has a selected client in session, use it
    if (session && session.selectedClientId) {
      clientId = session.selectedClientId;
    } else {
      // No client selected yet, prompt user to select client first
      await direktoratBot.sendMessage(
        chatId, 
        '⚠️ Silakan pilih client terlebih dahulu. Ketik /menu untuk memulai.'
      );
      return;
    }
    
    // Send processing message
    await direktoratBot.sendMessage(chatId, `⏳ Memproses menu ${menuNumber} untuk client ${clientId}...`);
    
    const chatIdStr = chatId.toString();
    
    // Call the performAction function from dirRequestHandlers
    // For Telegram bot, we don't have a WhatsApp client, so we pass null
    const result = await performAction(
      menuNumber,      // action
      clientId,        // clientId
      null,            // waClient (not used for Telegram)
      chatIdStr,       // chatId
      null,            // roleFlag
      null,            // userClientId
      {                // context
        username: from.username || from.first_name || 'telegram_user',
        chatId: chatIdStr,
      },
      {}               // fallbackOptions
    );
    
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
        
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        for (const chunk of chunks) {
          await direktoratBot.sendMessage(chatId, chunk);
        }
      } else {
        await direktoratBot.sendMessage(chatId, result);
      }
    } else {
      await direktoratBot.sendMessage(chatId, '✅ Menu berhasil diproses.');
    }
    
    // Send menu again
    await direktoratBot.sendMessage(chatId, '\nKetik /menu untuk kembali ke menu utama.');
    
  } catch (error) {
    console.error(`[Telegram Bot] Error processing menu ${menuNumber}:`, error);
    await direktoratBot.sendMessage(
      chatId, 
      `❌ Terjadi kesalahan saat memproses menu ${menuNumber}. Silakan coba lagi nanti.\n\nKetik /menu untuk kembali ke menu utama.`
    );
  }
}

/**
 * Stop the Telegram Direktorat Bot
 */
export async function stopTelegramDirektoratBot() {
  if (direktoratBot) {
    console.log('[Telegram Direktorat Bot] Stopping bot...');
    await direktoratBot.stopPolling();
    direktoratBot = null;
    isInitialized = false;
    console.log('[Telegram Direktorat Bot] Bot stopped');
  }
}

/**
 * Get bot instance
 */
export function getDirektoratBot() {
  return direktoratBot;
}

/**
 * Check if bot is initialized
 */
export function isDirektoratBotInitialized() {
  return isInitialized;
}

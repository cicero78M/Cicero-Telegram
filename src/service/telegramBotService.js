import TelegramBot from 'node-telegram-bot-api';
import { performAction } from '../handler/menu/dirRequestHandlers.js';

let bot = null;
let isInitialized = false;

/**
 * Initialize the Telegram bot
 * @param {string} token - Telegram bot token
 * @param {boolean} enabled - Whether the bot is enabled
 */
export async function initializeTelegramBot(token, enabled = true) {
  if (!enabled) {
    console.log('[Telegram Bot] Bot is disabled via TELEGRAM_BOT_ENABLED flag');
    return null;
  }

  if (!token) {
    console.log('[Telegram Bot] No token provided. Bot will not start.');
    return null;
  }

  if (isInitialized && bot) {
    console.log('[Telegram Bot] Already initialized');
    return bot;
  }

  try {
    console.log('[Telegram Bot] Initializing bot...');
    bot = new TelegramBot(token, { polling: true });
    
    // Set up command handlers
    setupCommandHandlers();
    
    // Set up message handlers
    setupMessageHandlers();
    
    isInitialized = true;
    console.log('[Telegram Bot] Bot initialized successfully');
    
    return bot;
  } catch (error) {
    console.error('[Telegram Bot] Failed to initialize:', error);
    return null;
  }
}

/**
 * Setup command handlers for the bot
 */
function setupCommandHandlers() {
  if (!bot) return;

  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Bot] /start command from chat ${chatId} (type: ${chatType})`);
    
    // Only respond to private chats
    if (chatType !== 'private') {
      await bot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private. Silakan hubungi bot secara langsung.');
      return;
    }
    
    const welcomeMessage = 
      '🤖 *Selamat datang di Cicero Telegram Bot!*\n\n' +
      'Bot ini dapat membantu Anda mengakses menu dirRequest.\n\n' +
      'Gunakan perintah:\n' +
      '/menu - Tampilkan menu dirRequest yang tersedia\n' +
      '/help - Tampilkan bantuan';
    
    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Bot] /help command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await bot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    const helpMessage = 
      '📖 *Bantuan Cicero Telegram Bot*\n\n' +
      '*Perintah yang tersedia:*\n' +
      '/start - Mulai menggunakan bot\n' +
      '/menu - Tampilkan menu dirRequest\n' +
      '/help - Tampilkan pesan bantuan ini\n\n' +
      '*Cara penggunaan:*\n' +
      '1. Ketik /menu untuk melihat daftar menu\n' +
      '2. Pilih nomor menu yang ingin diakses\n' +
      '3. Bot akan memproses permintaan Anda\n\n' +
      'Bot ini hanya merespons di *chat private*.';
    
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // /menu command
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    
    console.log(`[Telegram Bot] /menu command from chat ${chatId} (type: ${chatType})`);
    
    if (chatType !== 'private') {
      await bot.sendMessage(chatId, '❌ Bot ini hanya bekerja di chat private.');
      return;
    }
    
    await sendMainMenu(chatId);
  });
}

/**
 * Setup message handlers for the bot
 */
function setupMessageHandlers() {
  if (!bot) return;

  // Handle all text messages that are not commands
  bot.on('message', async (msg) => {
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
    
    console.log(`[Telegram Bot] Message from chat ${chatId}: ${text}`);
    
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
  
  await bot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
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
    
    // Send processing message
    await bot.sendMessage(chatId, `⏳ Memproses menu ${menuNumber}...`);
    
    // Default to DITBINMAS client for now
    // In production, this should be determined based on user authentication
    const clientId = 'DITBINMAS';
    
    // Call the performAction function from dirRequestHandlers
    const result = await performAction(menuNumber, clientId, {
      username: from.username || from.first_name || 'telegram_user',
      chatId: chatId.toString(),
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
        
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        for (const chunk of chunks) {
          await bot.sendMessage(chatId, chunk);
        }
      } else {
        await bot.sendMessage(chatId, result);
      }
    } else {
      await bot.sendMessage(chatId, '✅ Menu berhasil diproses.');
    }
    
    // Send menu again
    await bot.sendMessage(chatId, '\nKetik /menu untuk kembali ke menu utama.');
    
  } catch (error) {
    console.error(`[Telegram Bot] Error processing menu ${menuNumber}:`, error);
    await bot.sendMessage(
      chatId, 
      `❌ Terjadi kesalahan saat memproses menu ${menuNumber}. Silakan coba lagi nanti.\n\nKetik /menu untuk kembali ke menu utama.`
    );
  }
}

/**
 * Stop the Telegram bot
 */
export async function stopTelegramBot() {
  if (bot) {
    console.log('[Telegram Bot] Stopping bot...');
    await bot.stopPolling();
    bot = null;
    isInitialized = false;
    console.log('[Telegram Bot] Bot stopped');
  }
}

/**
 * Get bot instance
 */
export function getBot() {
  return bot;
}

/**
 * Check if bot is initialized
 */
export function isBotInitialized() {
  return isInitialized;
}

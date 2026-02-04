// src/service/telegramClientBotService.js

/**
 * Telegram Client Bot Service
 * Handles telegram bot operations for client request menu
 * Following naming conventions: camelCase for functions and file names
 */

import TelegramBot from 'node-telegram-bot-api';
import { runClientRequestAction } from '../handler/menu/clientRequestTelegramHandlers.js';
import { 
  findAllActiveClients
} from './clientService.js';
import { escapeMarkdown } from '../utils/telegramBotHelpers.js';

let clientBot = null;
let isInitialized = false;
// Store user sessions for client selection and menu navigation
const userSessions = new Map();
// Default client ID and name when no clients are available
const DEFAULT_CLIENT_ID = 'DITBINMAS';
// Number emojis for displaying client selection menu (supports up to 10 clients)
const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
// Items per page for client list pagination
const ITEMS_PER_PAGE = 10;
// Minimum threshold for using space as split point when chunking messages (0.8 = 80%)
// This ensures we don't split too far back from the maximum length, keeping chunks reasonably sized
const MIN_SPACE_THRESHOLD = 0.8;

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
    
    // Initialize session if not exists with default client
    let session = userSessions.get(chatId);
    if (!session || !session.selectedClientId) {
      userSessions.set(chatId, {
        selectedClientId: DEFAULT_CLIENT_ID,
        clientName: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      console.log(`[Telegram Client Bot] Initialized session with default client ${DEFAULT_CLIENT_ID} for chat ${chatId}`);
    }
    
    // Show menu directly - no client selection required
    await sendMainMenu(chatId);
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
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in sendMainMenu');
    return;
  }
  
  const session = userSessions.get(chatId);
  
  // Build client info string for display
  let clientInfo = '\n';
  if (session && session.selectedClientId) {
    const displayName = session.clientName || session.selectedClientId;
    clientInfo = `\nClient aktif: *${session.selectedClientId}* - ${displayName}\n\n`;
  }
  
  const menuText = 
    '📋 *Menu Client Request*\n' +
    clientInfo +
    'Pilih menu yang ingin Anda akses:\n\n' +
    
    '1️⃣ *Tambah Client Baru*\n' +
    '   Tambahkan client baru ke sistem\n\n' +
    
    '2️⃣ *Manajemen Client & User*\n' +
    '   Kelola client dan user, update/hapus data\n\n' +
    
    '3️⃣ *Operasional Media Sosial*\n' +
    '   Ambil konten, likes, komentar Instagram & TikTok\n\n' +
    
    '4️⃣ *Transfer & Laporan*\n' +
    '   Transfer user, export data, sinkronisasi\n\n' +
    
    '5️⃣ *Administratif*\n' +
    '   Kelola komplain, broadcast, kontak Google\n\n' +
    
    '6️⃣ *Pilih/Ganti Client*\n' +
    '   Pilih atau ganti client aktif\n\n' +
    
    'Ketik nomor menu untuk mengaksesnya.\n' +
    'Contoh: ketik "1" untuk Tambah Client Baru';
  
  await clientBot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
}

/**
 * Validate if a client object is valid
 * @param {object} client - Client object to validate
 * @returns {boolean} True if client is valid, false otherwise
 */
function isValidClient(client) {
  if (!client || !client.client_id || client.client_id.trim() === '') {
    return false;
  }
  return true;
}

/**
 * Show client selection menu to the user
 * Simplified version - shows all active clients directly without type filtering
 * @param {number} chatId - Telegram chat ID
 * @param {number} page - Optional page number for pagination (default: 1)
 */
async function showClientSelection(chatId, page = 1) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in showClientSelection');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Fetching all active clients for chat:`, chatId);
    
    // Fetch all active clients - simplified approach
    const clients = await findAllActiveClients();
    
    // Validate clients response
    if (!clients) {
      console.error('[Telegram Client Bot] Query returned null or undefined');
      // Use default client as fallback
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await clientBot.sendMessage(chatId, `⚠️ Tidak dapat memuat daftar client. Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu atau ketik /menu untuk melihat daftar menu.`);
      await sendMainMenu(chatId);
      return;
    }
    
    if (!Array.isArray(clients)) {
      console.error('[Telegram Client Bot] Query returned non-array:', typeof clients);
      // Use default client as fallback
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await clientBot.sendMessage(chatId, `⚠️ Data client tidak valid. Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu atau ketik /menu untuk melihat daftar menu.`);
      await sendMainMenu(chatId);
      return;
    }
    
    console.log(`[Telegram Client Bot] Found ${clients.length} active clients`);
    
    if (clients.length === 0) {
      // No clients found, default to DITBINMAS
      console.log('[Telegram Client Bot] No clients found, using default:', DEFAULT_CLIENT_ID);
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await clientBot.sendMessage(chatId, `✅ Tidak ada client yang aktif. Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu atau ketik /menu untuk melihat daftar menu.`);
      await sendMainMenu(chatId);
      return;
    }
    
    // Validate client objects have required fields
    const validClients = clients.filter(client => {
      if (!isValidClient(client)) {
        console.warn('[Telegram Client Bot] Invalid client object found:', client);
        return false;
      }
      return true;
    });
    
    if (validClients.length === 0) {
      console.error('[Telegram Client Bot] All clients are invalid');
      // Use default client as fallback
      userSessions.set(chatId, { 
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await clientBot.sendMessage(chatId, `⚠️ Data client tidak valid. Menggunakan client ${DEFAULT_CLIENT_ID} sebagai default.\n\nSilakan pilih menu dengan mengetik nomor menu atau ketik /menu untuk melihat daftar menu.`);
      await sendMainMenu(chatId);
      return;
    }
    
    if (validClients.length < clients.length) {
      console.warn(`[Telegram Client Bot] Filtered out ${clients.length - validClients.length} invalid clients`);
    }
    
    // Pagination logic using page parameter
    const totalPages = Math.ceil(validClients.length / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, validClients.length);
    const pageClients = validClients.slice(startIndex, endIndex);
    
    // Create client selection menu
    let clientMenu = `📋 *Pilih Client*\n\n`;
    clientMenu += 'Pilih client yang ingin Anda gunakan:\n\n';
    
    // Display clients for current page with emoji numbers
    pageClients.forEach((client, index) => {
      const numberEmoji = NUMBER_EMOJIS[index];
      const nama = escapeMarkdown(client.nama || client.client_id);
      const clientId = escapeMarkdown(client.client_id);
      const type = client.client_type ? escapeMarkdown(` [${client.client_type}]`) : '';
      clientMenu += `${numberEmoji} ${clientId} - ${nama}${type}\n`;
    });
    
    // Add pagination information if there are multiple pages
    if (totalPages > 1) {
      clientMenu += `\n📄 Halaman ${page} dari ${totalPages} (Total: ${validClients.length} client)\n`;
      clientMenu += '\nNavigasi:\n';
      if (page > 1) {
        clientMenu += '• Ketik *prev* atau *p* untuk halaman sebelumnya\n';
      }
      if (page < totalPages) {
        clientMenu += '• Ketik *next* atau *n* untuk halaman berikutnya\n';
      }
      if (totalPages > 2) {
        clientMenu += `• Ketik nomor halaman (1-${totalPages}) untuk langsung ke halaman tersebut\n`;
      }
    }
    
    clientMenu += '\n*Pilih Client:*\n';
    clientMenu += `• Ketik angka emoji di atas (1-${pageClients.length})\n`;
    clientMenu += '• Ketik Client ID lengkap untuk pilih langsung\n';
    clientMenu += '• Ketik *kembali* untuk kembali ke menu utama';
    
    // Store clients in session with pagination info
    userSessions.set(chatId, {
      step: 'choose_client',
      clients: validClients,
      currentPage: page,
      totalPages: totalPages
    });
    
    console.log('[Telegram Client Bot] Sending client selection menu to chat:', chatId);
    await clientBot.sendMessage(chatId, clientMenu, { parse_mode: 'Markdown' });
    console.log('[Telegram Client Bot] Client selection menu sent successfully');
  } catch (error) {
    console.error('[Telegram Client Bot] Error showing client selection:', error);
    console.error('[Telegram Client Bot] Error stack:', error.stack);
    
    // Provide sanitized error message to avoid leaking sensitive system information
    let errorMessage = '❌ Terjadi kesalahan saat mengambil daftar client.\n\n';
    
    // Only include error type, not full details that might contain sensitive info
    if (error.message) {
      // Check if error is database-related
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage += 'Detail: Masalah koneksi database.\n\n';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Detail: Permintaan timeout.\n\n';
      } else {
        // Generic error message without sensitive details
        errorMessage += 'Detail: Terjadi kesalahan sistem.\n\n';
      }
    }
    
    errorMessage += 'Silakan coba lagi atau ketik /menu untuk memulai ulang.';
    
    if (clientBot) {
      await clientBot.sendMessage(chatId, errorMessage);
    }
  }
}

/**
 * Handle client selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - User input (number or client ID)
 * @param {object} from - Telegram user info
 */
async function handleClientSelection(chatId, text, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in handleClientSelection');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Processing client selection for chat ${chatId}, input: "${text}"`);
    
    const session = userSessions.get(chatId);
    if (!session || !session.clients) {
      console.warn('[Telegram Client Bot] Session not found or clients missing for chat:', chatId);
      await clientBot.sendMessage(chatId, '❌ Sesi tidak ditemukan. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clients = session.clients;
    
    if (!Array.isArray(clients) || clients.length === 0) {
      console.error('[Telegram Client Bot] Invalid or empty clients array in session');
      await clientBot.sendMessage(chatId, '❌ Data client tidak tersedia. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const input = (text || '').trim().toLowerCase();
    
    // Check if user wants to go back to main menu
    if (input === 'kembali' || input === 'back') {
      console.log('[Telegram Client Bot] User requested to go back to main menu');
      await sendMainMenu(chatId);
      return;
    }
    
    // Handle pagination commands
    const currentPage = session.currentPage || 1;
    const totalPages = session.totalPages || 1;
    
    // Check for next page
    if ((input === 'next' || input === 'n') && currentPage < totalPages) {
      console.log('[Telegram Client Bot] User requested next page');
      await showClientSelection(chatId, currentPage + 1);
      return;
    }
    
    // Check for previous page
    if ((input === 'prev' || input === 'p') && currentPage > 1) {
      console.log('[Telegram Client Bot] User requested previous page');
      await showClientSelection(chatId, currentPage - 1);
      return;
    }
    
    // Check if input is a page number for navigation
    // Only treat as page navigation if it's explicitly for pagination (beyond client selection range)
    if (/^\d+$/.test(text.trim())) {
      const num = parseInt(text.trim(), 10);
      
      // If number is greater than items per page, treat as page navigation
      if (num > ITEMS_PER_PAGE && num <= totalPages) {
        console.log(`[Telegram Client Bot] User requested page ${num}`);
        await showClientSelection(chatId, num);
        return;
      }
    }
    
    let selectedClient = null;
    
    // Check if input is a number (1-10 for quick selection)
    if (/^\d+$/.test(text.trim())) {
      const index = parseInt(text.trim(), 10) - 1;
      console.log(`[Telegram Client Bot] User selected index: ${index}`);
      
      // Calculate the actual index based on current page
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageClients = clients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      if (index >= 0 && index < pageClients.length) {
        selectedClient = pageClients[index];
        console.log(`[Telegram Client Bot] Selected client by index:`, selectedClient?.client_id);
      } else {
        console.warn(`[Telegram Client Bot] Index ${index} out of range (max: ${pageClients.length - 1})`);
      }
    }
    
    // If not found by number, try to match by client ID
    if (!selectedClient) {
      const inputUpper = text.trim().toUpperCase();
      console.log(`[Telegram Client Bot] Searching for client by ID: "${inputUpper}"`);
      selectedClient = clients.find(c => 
        c.client_id && c.client_id.toUpperCase() === inputUpper
      );
      if (selectedClient) {
        console.log(`[Telegram Client Bot] Selected client by ID:`, selectedClient.client_id);
      }
    }
    
    if (!selectedClient) {
      console.warn(`[Telegram Client Bot] Client not found for input: "${text}"`);
      await clientBot.sendMessage(
        chatId, 
        '❌ Client tidak ditemukan. Silakan pilih nomor yang valid atau ketik Client ID yang benar.\n\nKetik /menu untuk melihat daftar client kembali.'
      );
      return;
    }
    
    // Validate selected client has required fields
    if (!selectedClient.client_id || selectedClient.client_id.trim() === '') {
      console.error('[Telegram Client Bot] Selected client missing or has invalid client_id:', selectedClient);
      await clientBot.sendMessage(
        chatId, 
        '❌ Data client tidak valid. Silakan ketik /menu untuk memulai kembali.'
      );
      return;
    }
    
    // Update session with selected client
    userSessions.set(chatId, {
      selectedClientId: selectedClient.client_id,
      clientName: selectedClient.nama || selectedClient.client_id,
      step: 'menu'
    });
    
    console.log(`[Telegram Client Bot] Client selected successfully: ${selectedClient.client_id}`);
    
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
    console.error('[Telegram Client Bot] Error stack:', error.stack);
    
    // Provide sanitized error message to avoid leaking sensitive system information
    let errorMessage = '❌ Terjadi kesalahan saat memproses pilihan client.\n\n';
    
    // Only include error type, not full details that might contain sensitive info
    if (error.message) {
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage += 'Detail: Masalah koneksi database.\n\n';
      } else if (error.message.includes('session')) {
        errorMessage += 'Detail: Sesi tidak valid.\n\n';
      } else {
        errorMessage += 'Detail: Terjadi kesalahan sistem.\n\n';
      }
    }
    
    errorMessage += 'Silakan coba lagi atau ketik /menu untuk memulai ulang.';
    
    if (clientBot) {
      await clientBot.sendMessage(chatId, errorMessage);
    }
  }
}

/**
 * Handle menu selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} menuNumber - Menu number selected
 * @param {object} from - Telegram user info
 */
async function handleMenuSelection(chatId, menuNumber, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in handleMenuSelection');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Processing menu ${menuNumber} for chat ${chatId}`);
    
    // Handle menu 6 (Choose/Change Client) - special case
    if (menuNumber === '6') {
      console.log('[Telegram Client Bot] User selected menu 6 - Choose/Change Client');
      await showClientSelection(chatId);
      return;
    }
    
    // Get user session to retrieve selected client
    const session = userSessions.get(chatId);
    let clientId = DEFAULT_CLIENT_ID; // Default fallback
    
    // If user has a selected client in session, use it
    if (session && session.selectedClientId) {
      clientId = session.selectedClientId;
    } else {
      // Initialize with default client if no session exists
      userSessions.set(chatId, {
        selectedClientId: DEFAULT_CLIENT_ID,
        clientName: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      clientId = DEFAULT_CLIENT_ID;
    }
    
    // Send processing message
    await clientBot.sendMessage(chatId, `⏳ Memproses menu ${menuNumber} untuk client ${clientId}...`);
    
    const chatIdStr = chatId.toString();
    
    // Call the runClientRequestAction function
    const result = await runClientRequestAction({
      action: menuNumber,
      clientId: clientId,
      chatId: chatIdStr
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
                  // Only use space if it's not too far back (within MIN_SPACE_THRESHOLD)
                  if (lastSpace > maxLength * MIN_SPACE_THRESHOLD) {
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
    if (clientBot) {
      await clientBot.sendMessage(
        chatId, 
        `❌ Terjadi kesalahan saat memproses menu ${menuNumber}.\n\nError: ${error.message}`
      );
    }
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

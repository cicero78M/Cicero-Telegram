// src/service/telegramClientBotService.js

/**
 * Telegram Client Bot Service
 * Handles telegram bot operations for client request menu
 * Following naming conventions: camelCase for functions and file names
 */

import TelegramBot from 'node-telegram-bot-api';
import { 
  runClientRequestAction,
  clientRequestTelegramHandlers,
  NUM_UPDATABLE_FIELDS
} from '../handler/menu/clientRequestTelegramHandlers.js';
import { 
  findAllActiveClients,
  findAllInactiveClients,
  toggleClientStatus,
  findClientById
} from './clientService.js';
import { escapeMarkdown } from '../utils/telegramBotHelpers.js';
import { formatNama } from '../utils/utilsHelper.js';

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
// Visual separator for message sections
const MESSAGE_SEPARATOR = '━━━━━━━━━━━━━━━━━━━━━━';

/**
 * Format client label for display
 * @param {string} clientId - Client ID
 * @param {string} clientName - Client name from session or database
 * @returns {string} Formatted client label
 */
function formatClientLabel(clientId, clientName) {
  if (clientName && clientName !== clientId) {
    return `${formatNama(clientName)} (${clientId})`;
  }
  return clientId;
}

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
    
    // Check if user is in inactive client selection mode
    if (session && session.step === 'choose_inactive_client') {
      await handleInactiveClientSelection(chatId, text, msg.from);
      return;
    }
    
    // Check if user is confirming status change
    if (session && session.step === 'confirm_status_change') {
      await handleStatusChangeConfirmation(chatId, text, msg.from);
      return;
    }
    
    // Check if user is in management submenu mode
    if (session && session.step === 'management_submenu') {
      await handleManagementSubmenuSelection(chatId, text.trim(), msg.from);
      return;
    }
    
    // Check if user is in management subaction mode
    if (session && session.step === 'management_subaction') {
      await handleManagementSubactionSelection(chatId, text.trim(), msg.from);
      return;
    }
    
    // Check if user is selecting field to update
    if (session && session.step === 'update_client_field_selection') {
      await handleUpdateClientFieldSelection(chatId, text.trim(), msg.from);
      return;
    }
    
    // Check if user is entering new field value
    if (session && session.step === 'update_client_field_value') {
      await handleUpdateClientFieldValue(chatId, text, msg.from);
      return;
    }
    
    // Check if user is selecting status field to update
    if (session && session.step === 'update_status_field_selection') {
      await handleUpdateStatusFieldSelection(chatId, text.trim(), msg.from);
      return;
    }
    
    // Check if user is confirming status field update
    if (session && session.step === 'update_status_field_confirmation') {
      await handleUpdateStatusFieldConfirmation(chatId, text, msg.from);
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
    // Show client ID and name, avoiding duplication when name equals ID
    if (session.clientName && session.clientName !== session.selectedClientId) {
      clientInfo = `\nClient aktif: *${session.selectedClientId}* - ${session.clientName}\n\n`;
    } else {
      clientInfo = `\nClient aktif: *${session.selectedClientId}*\n\n`;
    }
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
    
    '7️⃣ *Kelola Client Tidak Aktif*\n' +
    '   Lihat dan kelola client yang tidak aktif\n\n' +
    
    'Ketik nomor menu untuk mengaksesnya.';
  
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
 * Show inactive client selection menu to the user
 * Displays all inactive clients for management purposes
 * @param {number} chatId - Telegram chat ID
 * @param {number} page - Optional page number for pagination (default: 1)
 */
async function showInactiveClientSelection(chatId, page = 1) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in showInactiveClientSelection');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Fetching all inactive clients for chat:`, chatId);
    
    // Fetch all inactive clients
    const clients = await findAllInactiveClients();
    
    // Validate clients response
    if (!clients) {
      console.error('[Telegram Client Bot] Query returned null or undefined for inactive clients');
      await clientBot.sendMessage(chatId, `⚠️ Tidak dapat memuat daftar client tidak aktif.\n\nSilakan coba lagi atau ketik /menu untuk kembali ke menu utama.`);
      return;
    }
    
    if (!Array.isArray(clients)) {
      console.error('[Telegram Client Bot] Query returned non-array for inactive clients:', typeof clients);
      await clientBot.sendMessage(chatId, `⚠️ Data client tidak valid.\n\nSilakan coba lagi atau ketik /menu untuk kembali ke menu utama.`);
      return;
    }
    
    console.log(`[Telegram Client Bot] Found ${clients.length} inactive clients`);
    
    if (clients.length === 0) {
      // No inactive clients found
      console.log('[Telegram Client Bot] No inactive clients found');
      await clientBot.sendMessage(chatId, `✅ Tidak ada client yang tidak aktif.\n\nSemua client dalam sistem berstatus aktif.\n\nKetik /menu untuk kembali ke menu utama.`);
      return;
    }
    
    // Validate client objects have required fields
    const validClients = clients.filter(client => {
      if (!isValidClient(client)) {
        console.warn('[Telegram Client Bot] Invalid inactive client object found:', client);
        return false;
      }
      return true;
    });
    
    if (validClients.length === 0) {
      console.error('[Telegram Client Bot] All inactive clients are invalid');
      await clientBot.sendMessage(chatId, `⚠️ Data client tidak valid.\n\nSilakan coba lagi atau ketik /menu untuk kembali ke menu utama.`);
      return;
    }
    
    if (validClients.length < clients.length) {
      console.warn(`[Telegram Client Bot] Filtered out ${clients.length - validClients.length} invalid inactive clients`);
    }
    
    // Pagination logic using page parameter
    const totalPages = Math.ceil(validClients.length / ITEMS_PER_PAGE);
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, validClients.length);
    const pageClients = validClients.slice(startIndex, endIndex);
    
    // Create inactive client selection menu
    let clientMenu = `🔴 *Kelola Client Tidak Aktif*\n\n`;
    clientMenu += 'Berikut adalah daftar client yang tidak aktif:\n\n';
    
    // Display inactive clients for current page with emoji numbers
    pageClients.forEach((client, index) => {
      const numberEmoji = NUMBER_EMOJIS[index];
      const nama = escapeMarkdown(client.nama || client.client_id);
      const clientId = escapeMarkdown(client.client_id);
      const type = client.client_type ? escapeMarkdown(` [${client.client_type}]`) : '';
      clientMenu += `${numberEmoji} ${clientId} - ${nama}${type} ⏸️\n`;
    });
    
    // Add pagination information if there are multiple pages
    if (totalPages > 1) {
      clientMenu += `\n📄 Halaman ${page} dari ${totalPages} (Total: ${validClients.length} client tidak aktif)\n`;
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
    
    clientMenu += '\n*Pilih Client untuk Melihat Detail:*\n';
    clientMenu += `• Ketik angka (1-${pageClients.length}) sesuai nomor client\n`;
    clientMenu += '• Ketik Client ID lengkap untuk melihat detail\n';
    clientMenu += '• Ketik *kembali* untuk kembali ke menu utama';
    
    // Store clients in session with pagination info
    userSessions.set(chatId, {
      step: 'choose_inactive_client',
      clients: validClients,
      currentPage: page,
      totalPages: totalPages
    });
    
    console.log('[Telegram Client Bot] Sending inactive client selection menu to chat:', chatId);
    await clientBot.sendMessage(chatId, clientMenu, { parse_mode: 'Markdown' });
    console.log('[Telegram Client Bot] Inactive client selection menu sent successfully');
  } catch (error) {
    console.error('[Telegram Client Bot] Error showing inactive client selection:', error);
    console.error('[Telegram Client Bot] Error stack:', error.stack);
    
    // Provide sanitized error message
    let errorMessage = '❌ Terjadi kesalahan saat mengambil daftar client tidak aktif.\n\n';
    
    if (error.message) {
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage += 'Detail: Masalah koneksi database.\n\n';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Detail: Permintaan timeout.\n\n';
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
 * Handle inactive client selection from user
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - User input (number or client ID)
 * @param {object} from - Telegram user info
 */
async function handleInactiveClientSelection(chatId, text, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in handleInactiveClientSelection');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Processing inactive client selection for chat ${chatId}, input: "${text}"`);
    
    const session = userSessions.get(chatId);
    if (!session || !session.clients) {
      console.warn('[Telegram Client Bot] Session not found or clients missing for chat:', chatId);
      await clientBot.sendMessage(chatId, '❌ Sesi tidak ditemukan. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clients = session.clients;
    
    if (!Array.isArray(clients) || clients.length === 0) {
      console.error('[Telegram Client Bot] Invalid or empty clients array in session');
      await clientBot.sendMessage(chatId, '❌ Data client tidak valid. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const input = text.trim();
    const currentPage = session.currentPage || 1;
    const totalPages = session.totalPages || 1;
    
    // Handle pagination commands
    if (input.toLowerCase() === 'next' || input.toLowerCase() === 'n') {
      if (currentPage < totalPages) {
        await showInactiveClientSelection(chatId, currentPage + 1);
      } else {
        await clientBot.sendMessage(chatId, '❌ Sudah di halaman terakhir.');
      }
      return;
    }
    
    if (input.toLowerCase() === 'prev' || input.toLowerCase() === 'p') {
      if (currentPage > 1) {
        await showInactiveClientSelection(chatId, currentPage - 1);
      } else {
        await clientBot.sendMessage(chatId, '❌ Sudah di halaman pertama.');
      }
      return;
    }
    
    // Handle page number direct navigation
    if (/^\d+$/.test(input) && totalPages > 1) {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= totalPages) {
        await showInactiveClientSelection(chatId, num);
        return;
      }
    }
    
    // Handle "back" command
    if (input.toLowerCase() === 'kembali' || input.toLowerCase() === 'back') {
      console.log('[Telegram Client Bot] User wants to go back to main menu');
      // Clear session and go back to main menu
      userSessions.set(chatId, {
        selectedClientId: DEFAULT_CLIENT_ID,
        step: 'menu'
      });
      await sendMainMenu(chatId);
      return;
    }
    
    // Find selected client
    let selectedClient = null;
    
    // Try numeric selection (1-10 for current page)
    if (/^\d+$/.test(text)) {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageClients = clients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      const index = parseInt(text, 10) - 1;
      
      if (index >= 0 && index < pageClients.length) {
        selectedClient = pageClients[index];
        console.log('[Telegram Client Bot] Client selected by number:', selectedClient.client_id);
      }
    }
    
    // Try direct client ID match if numeric selection didn't work
    if (!selectedClient) {
      selectedClient = clients.find(c => 
        c.client_id.toUpperCase() === input.toUpperCase()
      );
      if (selectedClient) {
        console.log('[Telegram Client Bot] Client selected by ID:', selectedClient.client_id);
      }
    }
    
    // If no client found, show error
    if (!selectedClient) {
      console.warn('[Telegram Client Bot] Client not found for input:', input);
      await clientBot.sendMessage(
        chatId,
        `❌ Client tidak ditemukan.\n\nSilakan pilih nomor yang tertera atau ketik Client ID yang valid.\nKetik *kembali* untuk kembali ke menu utama.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // Store selected client in session for potential status change
    session.selectedInactiveClient = selectedClient;
    session.step = 'confirm_status_change';
    userSessions.set(chatId, session);
    
    // Display inactive client details
    const clientId = escapeMarkdown(selectedClient.client_id);
    const nama = escapeMarkdown(selectedClient.nama || selectedClient.client_id);
    const type = selectedClient.client_type ? escapeMarkdown(selectedClient.client_type) : 'N/A';
    
    let detailsMessage = `🔴 *Detail Client Tidak Aktif*\n\n`;
    detailsMessage += `*Client ID:* ${clientId}\n`;
    detailsMessage += `*Nama:* ${nama}\n`;
    detailsMessage += `*Tipe:* ${type}\n`;
    detailsMessage += `*Status:* Tidak Aktif ⏸️\n\n`;
    
    // Add additional info if available
    if (selectedClient.client_group) {
      detailsMessage += `*Group:* ${escapeMarkdown(selectedClient.client_group)}\n`;
    }
    if (selectedClient.regional_id) {
      detailsMessage += `*Regional ID:* ${escapeMarkdown(selectedClient.regional_id)}\n`;
    }
    if (selectedClient.client_level !== undefined && selectedClient.client_level !== null) {
      detailsMessage += `*Level:* ${selectedClient.client_level}\n`;
    }
    
    detailsMessage += `\n*Catatan:* Client ini tidak aktif dan tidak dapat digunakan untuk operasi.\n\n`;
    detailsMessage += `${MESSAGE_SEPARATOR}\n\n`;
    detailsMessage += `*Opsi Pengelolaan:*\n`;
    detailsMessage += `Ketik *AKTIFKAN* untuk mengaktifkan client ini\n`;
    detailsMessage += `Ketik *KEMBALI* untuk kembali ke daftar\n`;
    detailsMessage += `Ketik /menu untuk kembali ke menu utama`;
    
    await clientBot.sendMessage(chatId, detailsMessage, { parse_mode: 'Markdown' });
    
    console.log('[Telegram Client Bot] Inactive client details sent for:', selectedClient.client_id);
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling inactive client selection:', error);
    console.error('[Telegram Client Bot] Error stack:', error.stack);
    
    let errorMessage = '❌ Terjadi kesalahan saat memproses pilihan client.\n\n';
    
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
 * Handle status change confirmation for inactive client
 * Supports bilingual commands (Indonesian/English) to accommodate various user preferences
 * @param {number} chatId - Telegram chat ID
 * @param {string} text - User input text
 * @param {object} from - Telegram user info
 */
async function handleStatusChangeConfirmation(chatId, text, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized in handleStatusChangeConfirmation');
    return;
  }
  
  try {
    console.log(`[Telegram Client Bot] Processing status change confirmation for chat ${chatId}, input: "${text}"`);
    
    const session = userSessions.get(chatId);
    if (!session || !session.selectedInactiveClient) {
      console.warn('[Telegram Client Bot] Session not found or no selected client for chat:', chatId);
      await clientBot.sendMessage(chatId, '❌ Sesi tidak ditemukan. Silakan ketik /menu untuk memulai kembali.');
      return;
    }
    
    const selectedClient = session.selectedInactiveClient;
    const input = text.trim().toUpperCase();
    
    // Handle "back" command
    if (input === 'KEMBALI' || input === 'BACK') {
      console.log('[Telegram Client Bot] User wants to go back to inactive client list');
      // Go back to inactive client selection
      session.step = 'choose_inactive_client';
      delete session.selectedInactiveClient;
      userSessions.set(chatId, session);
      await showInactiveClientSelection(chatId, 1);
      return;
    }
    
    // Handle activation command
    if (input === 'AKTIFKAN' || input === 'ACTIVATE') {
      console.log('[Telegram Client Bot] Attempting to activate client:', selectedClient.client_id);
      
      // Show processing message
      await clientBot.sendMessage(chatId, '⏳ Sedang memproses aktivasi client...');
      
      try {
        // Update client status to active
        const updatedClient = await toggleClientStatus(selectedClient.client_id, true);
        
        if (!updatedClient) {
          await clientBot.sendMessage(chatId, '❌ Gagal mengaktifkan client. Client tidak ditemukan.');
          return;
        }
        
        // Success message
        const clientId = escapeMarkdown(selectedClient.client_id);
        const nama = escapeMarkdown(selectedClient.nama || selectedClient.client_id);
        
        let successMessage = `✅ *Client Berhasil Diaktifkan*\n\n`;
        successMessage += `*Client ID:* ${clientId}\n`;
        successMessage += `*Nama:* ${nama}\n`;
        successMessage += `*Status:* Aktif ✅\n\n`;
        successMessage += `Client ini sekarang dapat digunakan untuk operasi.\n\n`;
        successMessage += `Ketik /menu untuk kembali ke menu utama.`;
        
        await clientBot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
        
        console.log('[Telegram Client Bot] Client activated successfully:', selectedClient.client_id);
        
        // Clear session step and selected client
        session.step = 'menu';
        delete session.selectedInactiveClient;
        userSessions.set(chatId, session);
        
      } catch (error) {
        console.error('[Telegram Client Bot] Error activating client:', error);
        await clientBot.sendMessage(
          chatId,
          `❌ Terjadi kesalahan saat mengaktifkan client.\n\nDetail: ${error.message}\n\nSilakan coba lagi atau ketik /menu untuk memulai ulang.`
        );
      }
      return;
    }
    
    // Invalid input
    await clientBot.sendMessage(
      chatId,
      `❌ Perintah tidak valid.\n\nSilakan ketik:\n*AKTIFKAN* - untuk mengaktifkan client\n*KEMBALI* - untuk kembali ke daftar\n/menu - untuk kembali ke menu utama`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling status change confirmation:', error);
    console.error('[Telegram Client Bot] Error stack:', error.stack);
    
    let errorMessage = '❌ Terjadi kesalahan saat memproses konfirmasi.\n\n';
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
    
    // Handle menu 7 (Manage Inactive Clients) - special case
    if (menuNumber === '7') {
      console.log('[Telegram Client Bot] User selected menu 7 - Manage Inactive Clients');
      await showInactiveClientSelection(chatId);
      return;
    }
    
    // Handle menu 2 (Management Menu) - special case for interactive submenu
    if (menuNumber === '2') {
      console.log('[Telegram Client Bot] User selected menu 2 - Management Menu');
      const session = userSessions.get(chatId);
      let clientId = DEFAULT_CLIENT_ID;
      let clientName = DEFAULT_CLIENT_ID;
      
      if (session && session.selectedClientId) {
        clientId = session.selectedClientId;
        clientName = session.clientName || clientId;
      }
      
      // Update session to submenu mode
      userSessions.set(chatId, {
        ...session,
        step: 'management_submenu',
        selectedMenu: '2',
        selectedClientId: clientId,
        clientName: clientName
      });
      
      // Show submenu (no need to fetch client as we have the name in session)
      const result = await runClientRequestAction({
        action: '2',
        clientId: clientId,
        chatId: chatId.toString()
      });
      
      await clientBot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
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
 * Handle submenu selection in Management Menu (menu 2)
 * @param {number} chatId - Telegram chat ID
 * @param {string} submenu - Submenu number (1-5)
 * @param {object} from - User info from Telegram
 */
async function handleManagementSubmenuSelection(chatId, submenu, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const clientName = session.clientName || clientId;
    
    console.log(`[Telegram Client Bot] Processing submenu ${submenu} for client ${clientId}`);
    
    // If submenu is 1 or 2, it has sub-actions, so set step to subaction mode
    if (submenu === '1' || submenu === '2') {
      userSessions.set(chatId, {
        ...session,
        step: 'management_subaction',
        selectedSubmenu: submenu
      });
    } else {
      // For submenus 3, 4, 5 - direct action
      userSessions.set(chatId, {
        ...session,
        step: 'menu' // Reset to menu mode after action
      });
    }
    
    // Format client label using helper
    const clientLabel = formatClientLabel(clientId, clientName);
    
    // Call the handler
    const result = await clientRequestTelegramHandlers.handleManagementSubmenu(
      submenu,
      null, // no subaction yet
      clientId,
      clientLabel
    );
    
    await clientBot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling submenu:', error);
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}`
    );
  }
}

/**
 * Handle subaction selection in Management Menu (menu 2.1 or 2.2)
 * @param {number} chatId - Telegram chat ID
 * @param {string} subaction - Subaction number
 * @param {object} from - User info from Telegram
 */
async function handleManagementSubactionSelection(chatId, subaction, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId || !session.selectedSubmenu) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const clientName = session.clientName || clientId;
    const submenu = session.selectedSubmenu;
    
    console.log(`[Telegram Client Bot] Processing subaction ${submenu}.${subaction} for client ${clientId}`);
    
    // Special handling for Update Data Client (2.1.1)
    if (submenu === '1' && subaction === '1') {
      // Set state to field selection
      userSessions.set(chatId, {
        ...session,
        step: 'update_client_field_selection'
      });
      
      // Format client label using helper
      const clientLabel = formatClientLabel(clientId, clientName);
      
      // Call the handler to show field selection menu
      const result = await clientRequestTelegramHandlers.handleManagementSubmenu(
        submenu,
        subaction,
        clientId,
        clientLabel
      );
      
      await clientBot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
      return;
    }
    
    // Special handling for Update Status Client (2.1.4)
    if (submenu === '1' && subaction === '4') {
      // Set state to status field selection
      userSessions.set(chatId, {
        ...session,
        step: 'update_status_field_selection'
      });
      
      // Format client label using helper
      const clientLabel = formatClientLabel(clientId, clientName);
      
      // Call the handler to show status field selection menu
      const result = await clientRequestTelegramHandlers.handleManagementSubmenu(
        submenu,
        subaction,
        clientId,
        clientLabel
      );
      
      await clientBot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
      return;
    }
    
    // Reset to menu mode after action for other subactions
    userSessions.set(chatId, {
      ...session,
      step: 'menu'
    });
    
    // Format client label using helper
    const clientLabel = formatClientLabel(clientId, clientName);
    
    // Call the handler
    const result = await clientRequestTelegramHandlers.handleManagementSubmenu(
      submenu,
      subaction,
      clientId,
      clientLabel
    );
    
    await clientBot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling subaction:', error);
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}`
    );
  }
}

/**
 * Handle field selection for client update
 * @param {number} chatId - Telegram chat ID
 * @param {string} fieldNumber - Field number (1-6)
 * @param {object} from - User info from Telegram
 */
async function handleUpdateClientFieldSelection(chatId, fieldNumber, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const clientName = session.clientName || clientId;
    
    // Validate field number
    const fieldRegex = new RegExp(`^[1-${NUM_UPDATABLE_FIELDS}]$`);
    if (!fieldRegex.test(fieldNumber.trim())) {
      await clientBot.sendMessage(
        chatId,
        `❌ Pilihan tidak valid. Ketik nomor field yang valid (1-${NUM_UPDATABLE_FIELDS}) atau /menu untuk kembali.`
      );
      return;
    }
    
    console.log(`[Telegram Client Bot] User selected field ${fieldNumber} to update for client ${clientId}`);
    
    // Get current value
    const client = await findClientById(clientId);
    if (!client) {
      await clientBot.sendMessage(chatId, '❌ Client tidak ditemukan.');
      return;
    }
    
    const fieldMapping = {
      '1': client.nama,
      '2': client.client_insta,
      '3': client.client_tiktok,
      '4': client.client_group,
      '5': client.client_operator,
      '6': client.client_super
    };
    
    const currentValue = fieldMapping[fieldNumber];
    
    // Update session to field value entry mode
    userSessions.set(chatId, {
      ...session,
      step: 'update_client_field_value',
      selectedField: fieldNumber
    });
    
    // Format client label
    const clientLabel = formatClientLabel(clientId, clientName);
    
    // Show prompt for new value
    const prompt = clientRequestTelegramHandlers.handleClientFieldUpdatePrompt(
      fieldNumber,
      clientLabel,
      currentValue
    );
    
    await clientBot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling field selection:', error);
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}`
    );
  }
}

/**
 * Handle field value entry for client update
 * @param {number} chatId - Telegram chat ID
 * @param {string} newValue - New value for the field
 * @param {object} from - User info from Telegram
 */
async function handleUpdateClientFieldValue(chatId, newValue, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId || !session.selectedField) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const fieldNumber = session.selectedField;
    
    console.log(`[Telegram Client Bot] Processing update for client ${clientId}, field ${fieldNumber}, value: ${newValue}`);
    
    // Show processing message
    await clientBot.sendMessage(chatId, '⏳ Sedang memproses update...');
    
    // Process the update
    const result = await clientRequestTelegramHandlers.processClientFieldUpdate(
      clientId,
      fieldNumber,
      newValue
    );
    
    // Reset session to menu mode
    userSessions.set(chatId, {
      ...session,
      step: 'menu',
      selectedField: undefined
    });
    
    // Send result
    await clientBot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    
    // If successful, show menu again
    if (result.success) {
      await clientBot.sendMessage(
        chatId,
        'Ketik /menu untuk kembali ke menu utama.'
      );
    }
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling field value:', error);
    
    // Reset session on error
    const session = userSessions.get(chatId);
    if (session) {
      userSessions.set(chatId, {
        ...session,
        step: 'menu',
        selectedField: undefined
      });
    }
    
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}\n\nKetik /menu untuk kembali ke menu utama.`
    );
  }
}

/**
 * Handle status field selection for status update
 * @param {number} chatId - Telegram chat ID
 * @param {string} statusFieldNumber - Status field number (1-3)
 * @param {object} from - User info from Telegram
 */
async function handleUpdateStatusFieldSelection(chatId, statusFieldNumber, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const clientName = session.clientName || clientId;
    
    // Validate status field number
    if (!['1', '2', '3'].includes(statusFieldNumber.trim())) {
      await clientBot.sendMessage(
        chatId,
        `❌ Pilihan tidak valid. Ketik nomor status yang valid (1-3) atau /menu untuk kembali.`
      );
      return;
    }
    
    console.log(`[Telegram Client Bot] User selected status field ${statusFieldNumber} to update for client ${clientId}`);
    
    // Update session to status confirmation mode
    userSessions.set(chatId, {
      ...session,
      step: 'update_status_field_confirmation',
      selectedStatusField: statusFieldNumber
    });
    
    // Format client label
    const clientLabel = formatClientLabel(clientId, clientName);
    
    // Show confirmation prompt
    const prompt = await clientRequestTelegramHandlers.handleStatusFieldUpdatePrompt(
      clientId,
      statusFieldNumber,
      clientLabel
    );
    
    await clientBot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling status field selection:', error);
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}`
    );
  }
}

/**
 * Handle status field update confirmation
 * @param {number} chatId - Telegram chat ID
 * @param {string} confirmation - User confirmation (YA/TIDAK)
 * @param {object} from - User info from Telegram
 */
async function handleUpdateStatusFieldConfirmation(chatId, confirmation, from) {
  if (!clientBot) {
    console.error('[Telegram Client Bot] Bot not initialized');
    return;
  }
  
  try {
    const session = userSessions.get(chatId);
    if (!session || !session.selectedClientId || !session.selectedStatusField) {
      await clientBot.sendMessage(chatId, '❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.');
      return;
    }
    
    const clientId = session.selectedClientId;
    const statusFieldNumber = session.selectedStatusField;
    const input = confirmation.trim().toUpperCase();
    
    // Check for cancellation
    if (input === 'TIDAK' || input === 'NO') {
      console.log(`[Telegram Client Bot] Status update cancelled by user for client ${clientId}`);
      
      // Reset session to menu mode
      userSessions.set(chatId, {
        ...session,
        step: 'menu',
        selectedStatusField: undefined
      });
      
      await clientBot.sendMessage(
        chatId,
        '❌ Update status dibatalkan.\n\nKetik /menu untuk kembali ke menu utama.'
      );
      return;
    }
    
    // Check for confirmation
    if (input !== 'YA' && input !== 'YES') {
      await clientBot.sendMessage(
        chatId,
        '❌ Konfirmasi tidak valid. Ketik *YA* untuk konfirmasi atau *TIDAK* untuk membatalkan.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    console.log(`[Telegram Client Bot] Processing status update for client ${clientId}, status field ${statusFieldNumber}`);
    
    // Show processing message
    await clientBot.sendMessage(chatId, '⏳ Sedang memproses update status...');
    
    // Process the status update
    const result = await clientRequestTelegramHandlers.processStatusFieldUpdate(
      clientId,
      statusFieldNumber
    );
    
    // Reset session to menu mode
    userSessions.set(chatId, {
      ...session,
      step: 'menu',
      selectedStatusField: undefined
    });
    
    // Send result
    await clientBot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    
    // If successful, show menu again
    if (result.success) {
      await clientBot.sendMessage(
        chatId,
        'Ketik /menu untuk kembali ke menu utama.'
      );
    }
  } catch (error) {
    console.error('[Telegram Client Bot] Error handling status confirmation:', error);
    
    // Reset session on error
    const session = userSessions.get(chatId);
    if (session) {
      userSessions.set(chatId, {
        ...session,
        step: 'menu',
        selectedStatusField: undefined
      });
    }
    
    await clientBot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan: ${error.message}\n\nKetik /menu untuk kembali ke menu utama.`
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

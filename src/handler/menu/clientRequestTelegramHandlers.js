// src/handler/menu/clientRequestTelegramHandlers.js

/**
 * Telegram bot handler for clientRequest menu
 * This module provides telegram-specific handlers for client request operations
 * Following naming conventions: camelCase for functions and file names
 */

import { 
  findClientById, 
  getClientSummary
} from "../../service/clientService.js";
import { getGreeting, formatNama } from "../../utils/utilsHelper.js";
import { refreshAggregatorData } from "../../service/aggregatorService.js";

const DITBINMAS_CLIENT_ID = "DITBINMAS";

// Standard message for features under development
const FEATURE_IN_DEVELOPMENT_MSG = 
  `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
  `Untuk saat ini, silakan gunakan antarmuka WhatsApp atau web dashboard.`;

/**
 * Format client label for display
 * @param {object} client - Client object from database
 * @param {string} clientId - Client ID fallback
 * @returns {string} Formatted client label
 */
function formatClientLabel(client, clientId) {
  if (client?.nama && client.nama !== clientId) {
    return `${formatNama(client.nama)} (${clientId})`;
  }
  return clientId;
}

/**
 * Main performAction function for client request menu
 * Processes menu selections and returns formatted text responses
 * 
 * @param {string} action - Menu number selected by user
 * @param {string} clientId - Selected client ID
 * @returns {Promise<string>} Formatted response message
 */
async function performAction(
  action,
  clientId
) {
  let msg = "";
  const targetId = (clientId || DITBINMAS_CLIENT_ID).toUpperCase();
  
  try {
    const client = await findClientById(targetId);
    const clientLabel = formatClientLabel(client, targetId);

    switch (action) {
      case "1": {
        // Tambah Client Baru
        msg = await handleAddClientMenu();
        break;
      }
      case "2": {
        // Manajemen Client & User
        msg = await handleManagementMenu(targetId, clientLabel);
        break;
      }
      case "3": {
        // Operasional Media Sosial
        msg = await handleSocialMediaMenu(targetId, clientLabel);
        break;
      }
      case "4": {
        // Transfer & Laporan
        msg = await handleTransferReportMenu(targetId, clientLabel);
        break;
      }
      case "5": {
        // Administratif
        msg = await handleAdminMenu(targetId, clientLabel);
        break;
      }
      default:
        msg = `❌ Menu ${action} tidak ditemukan.\n\nGunakan /menu untuk melihat daftar menu yang tersedia.`;
    }
  } catch (error) {
    console.error(`[ClientRequest Telegram] Error processing action ${action}:`, error);
    msg = `❌ Terjadi kesalahan saat memproses menu ${action}.\n\nError: ${error.message}`;
  }

  return msg;
}

/**
 * Handle Tambah Client Baru submenu (menu 1)
 */
async function handleAddClientMenu() {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `➕ *Tambah Client Baru*\n\n` +
    `Fitur untuk menambahkan client baru ke sistem.\n\n` +
    `Informasi yang diperlukan:\n` +
    `• Client ID (unik)\n` +
    `• Nama Client\n` +
    `• Tipe Client (ORG/DIREKTORAT)\n` +
    `• Status Client (Aktif/Tidak Aktif)\n` +
    `• Regional ID (untuk DIREKTORAT)\n` +
    `• Parent Client ID (opsional)\n\n` +
    FEATURE_IN_DEVELOPMENT_MSG;
}

/**
 * Handle Management menu (menu 2)
 * Now displays interactive submenu options
 */
async function handleManagementMenu(clientId, clientLabel) {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `📋 *Manajemen Client & User*\n` +
    `Client: ${clientLabel}\n\n` +
    `Pilih submenu yang ingin Anda akses:\n\n` +
    `1️⃣ *Kelola Client*\n` +
    `   Update, hapus, atau lihat info client\n\n` +
    `2️⃣ *Kelola User*\n` +
    `   Update, exception, atau status user\n\n` +
    `3️⃣ *Hapus WA User*\n` +
    `   Hapus nomor WhatsApp dari user\n\n` +
    `4️⃣ *Penghapusan Massal Status User*\n` +
    `   Hapus status user secara massal\n\n` +
    `5️⃣ *Refresh Aggregator Direktorat*\n` +
    `   Refresh data aggregator direktorat\n\n` +
    `Ketik nomor submenu (1-5) untuk melanjutkan, atau ketik /menu untuk kembali.`;
}

/**
 * Handle Social Media Operations menu (menu 3)
 */
async function handleSocialMediaMenu(clientId, clientLabel) {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `📱 *Operasional Media Sosial*\n` +
    `Client: ${clientLabel}\n\n` +
    `Menu operasional media sosial mencakup:\n` +
    `• Ambil konten Instagram\n` +
    `• Ambil konten TikTok\n` +
    `• Ambil likes Instagram\n` +
    `• Ambil komentar TikTok\n` +
    `• Hapus konten TikTok\n` +
    `• Cek status akun\n\n` +
    FEATURE_IN_DEVELOPMENT_MSG;
}

/**
 * Handle Transfer & Report menu (menu 4)
 */
async function handleTransferReportMenu(clientId, clientLabel) {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `📊 *Transfer & Laporan*\n` +
    `Client: ${clientLabel}\n\n` +
    `Menu transfer dan laporan mencakup:\n` +
    `• Transfer user antar client\n` +
    `• Laporan user per client\n` +
    `• Export data user\n` +
    `• Sinkronisasi data\n\n` +
    FEATURE_IN_DEVELOPMENT_MSG;
}

/**
 * Handle Administrative menu (menu 5)
 */
async function handleAdminMenu(clientId, clientLabel) {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `⚙️ *Administratif*\n` +
    `Client: ${clientLabel}\n\n` +
    `Menu administratif mencakup:\n` +
    `• Kelola komplain user\n` +
    `• Kirim broadcast\n` +
    `• Manajemen kontak Google\n` +
    `• Update data client\n` +
    `• Kelola Akun Resmi Satbinmas\n\n` +
    FEATURE_IN_DEVELOPMENT_MSG;
}

/**
 * Handle Kelola Client submenu (2.1)
 */
async function handleKelolaClientMenu(clientId, clientLabel) {
  return `🏢 *Kelola Client*\n` +
    `Client: ${clientLabel}\n\n` +
    `Pilih aksi yang ingin dilakukan:\n\n` +
    `1️⃣ *Update Data Client*\n` +
    `   Perbarui informasi client\n\n` +
    `2️⃣ *Hapus Client*\n` +
    `   Hapus client dari sistem\n\n` +
    `3️⃣ *Info Client*\n` +
    `   Tampilkan detail client\n\n` +
    `Ketik nomor aksi (1-3) atau /menu untuk kembali.`;
}

/**
 * Handle Info Client (2.1.3)
 */
async function handleClientInfo(clientId) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return `❌ Client dengan ID ${clientId} tidak ditemukan.`;
    }

    const summary = await getClientSummary(clientId);
    const status = client.client_status ? '✅ Aktif' : '❌ Tidak Aktif';
    
    let info = `📊 *Informasi Client*\n\n`;
    info += `🆔 *Client ID*: ${client.client_id}\n`;
    info += `📛 *Nama*: ${client.nama || '-'}\n`;
    info += `📍 *Status*: ${status}\n`;
    info += `🏷️ *Tipe*: ${client.client_type || '-'}\n`;
    info += `👥 *Group*: ${client.client_group || '-'}\n`;
    
    if (summary) {
      info += `\n📈 *Statistik*:\n`;
      info += `• Jumlah User: ${summary.user_count || 0}\n`;
      info += `• Post Instagram: ${summary.insta_post_count || 0}\n`;
      info += `• Post TikTok: ${summary.tiktok_post_count || 0}\n`;
      info += `• Total Likes Instagram: ${summary.total_insta_likes || 0}\n`;
      info += `• Total Komentar TikTok: ${summary.total_tiktok_comments || 0}\n`;
    }
    
    return info;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error getting client info:', error);
    return `❌ Gagal mengambil informasi client: ${error.message}`;
  }
}

/**
 * Handle Kelola User submenu (2.2)
 */
async function handleKelolaUserMenu(clientId, clientLabel) {
  return `👥 *Kelola User*\n` +
    `Client: ${clientLabel}\n\n` +
    `Pilih aksi yang ingin dilakukan:\n\n` +
    `1️⃣ *Update Data User*\n` +
    `   Perbarui informasi user\n\n` +
    `2️⃣ *Kelola Exception User*\n` +
    `   Lihat user dengan exception\n\n` +
    `3️⃣ *Ubah Status User*\n` +
    `   Aktifkan atau nonaktifkan user\n\n` +
    `Ketik nomor aksi (1-3) atau /menu untuk kembali.`;
}

/**
 * Handle Hapus WA User (2.3)
 */
async function handleHapusWAUserPrompt(clientId, clientLabel) {
  return `📱 *Hapus WA User*\n` +
    `Client: ${clientLabel}\n\n` +
    `Fitur ini menghapus nomor WhatsApp dari user.\n\n` +
    `Masukkan User ID atau NRP yang akan dihapus nomor WhatsApp-nya, atau ketik /menu untuk kembali.`;
}

/**
 * Handle Bulk Status (2.4)
 */
async function handleBulkStatusPrompt(clientId, clientLabel) {
  return `🗑️ *Penghapusan Massal Status User*\n` +
    `Client: ${clientLabel}\n\n` +
    `Fitur ini menonaktifkan status user secara massal.\n\n` +
    `Masukkan daftar User ID/NRP (dipisahkan dengan koma atau spasi), atau ketik /menu untuk kembali.`;
}

/**
 * Handle Refresh Aggregator (2.5)
 */
async function handleRefreshAggregator() {
  try {
    await refreshAggregatorData();
    return `✅ *Refresh Aggregator Berhasil*\n\n` +
      `Data aggregator direktorat telah diperbarui.`;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error refreshing aggregator:', error);
    return `❌ Gagal refresh aggregator: ${error.message}`;
  }
}

/**
 * Handle submenu actions for Management Menu (menu 2)
 * @param {string} submenu - Submenu number (1-5)
 * @param {string} subaction - Optional sub-action within submenu
 * @param {string} clientId - Client ID
 * @param {string} clientLabel - Client label for display
 * @returns {Promise<string>} Response message
 */
async function handleManagementSubmenu(submenu, subaction, clientId, clientLabel) {
  switch (submenu) {
    case "1": // Kelola Client
      if (!subaction) {
        return handleKelolaClientMenu(clientId, clientLabel);
      }
      switch (subaction) {
        case "1": // Update Data Client
          return `ℹ️ *Update Data Client*\n\nFitur ini memerlukan interaksi multi-step yang kompleks.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        case "2": // Hapus Client
          return `⚠️ *Hapus Client*\n\nPenghapusan client adalah operasi berbahaya yang memerlukan konfirmasi admin.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        case "3": // Info Client
          return handleClientInfo(clientId);
        default:
          return `❌ Aksi tidak valid. Ketik nomor aksi yang valid (1-3).`;
      }
    
    case "2": // Kelola User
      if (!subaction) {
        return handleKelolaUserMenu(clientId, clientLabel);
      }
      switch (subaction) {
        case "1": // Update Data User
          return `ℹ️ *Update Data User*\n\nFitur ini memerlukan interaksi multi-step yang kompleks.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        case "2": // Kelola Exception User
          return `ℹ️ *Kelola Exception User*\n\nFitur ini memerlukan interaksi multi-step yang kompleks.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        case "3": // Ubah Status User
          return `ℹ️ *Ubah Status User*\n\nFitur ini memerlukan interaksi multi-step yang kompleks.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        default:
          return `❌ Aksi tidak valid. Ketik nomor aksi yang valid (1-3).`;
      }
    
    case "3": // Hapus WA User
      return handleHapusWAUserPrompt(clientId, clientLabel);
    
    case "4": // Bulk Status
      return handleBulkStatusPrompt(clientId, clientLabel);
    
    case "5": // Refresh Aggregator
      return handleRefreshAggregator();
    
    default:
      return `❌ Submenu tidak valid. Ketik nomor submenu yang valid (1-5).`;
  }
}

/**
 * Wrapper function to run client request action
 * Similar to runDirRequestAction in dirRequestHandlers
 * 
 * @param {object} params - Parameters object
 * @param {string} params.action - Menu number
 * @param {string} params.clientId - Client ID
 * @param {string} params.chatId - Telegram chat ID
 * @returns {Promise<string>} Response message
 */
export async function runClientRequestAction({
  action,
  clientId,
  chatId
} = {}) {
  if (!action) {
    throw new Error("Action menu wajib diisi");
  }
  if (!chatId) {
    throw new Error("chatId penerima wajib diisi untuk menjalankan menu");
  }

  const normalizedAction = String(action).trim();
  const normalizedClient = (clientId || "").trim();

  return performAction(
    normalizedAction,
    normalizedClient
  );
}

/**
 * Handler object for clientRequest menu
 * Exported for consistency with other menu handlers
 */
export const clientRequestTelegramHandlers = {
  performAction,
  handleAddClientMenu,
  handleManagementMenu,
  handleManagementSubmenu,
  handleSocialMediaMenu,
  handleTransferReportMenu,
  handleAdminMenu,
  handleKelolaClientMenu,
  handleKelolaUserMenu,
  handleClientInfo,
  handleHapusWAUserPrompt,
  handleBulkStatusPrompt,
  handleRefreshAggregator
};

export default clientRequestTelegramHandlers;

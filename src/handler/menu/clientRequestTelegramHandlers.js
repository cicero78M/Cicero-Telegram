// src/handler/menu/clientRequestTelegramHandlers.js

/**
 * Telegram bot handler for clientRequest menu
 * This module provides telegram-specific handlers for client request operations
 * Following naming conventions: camelCase for functions and file names
 */

import { findClientById } from "../../service/clientService.js";
import { getGreeting, formatNama } from "../../utils/utilsHelper.js";

const DITBINMAS_CLIENT_ID = "DITBINMAS";

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
    const clientLabel = client?.nama
      ? `${formatNama(client.nama)} (${targetId})`
      : targetId;

    switch (action) {
      case "1": {
        // Manajemen Client & User
        msg = await handleManagementMenu(targetId, clientLabel);
        break;
      }
      case "2": {
        // Operasional Media Sosial
        msg = await handleSocialMediaMenu(targetId, clientLabel);
        break;
      }
      case "3": {
        // Transfer & Laporan
        msg = await handleTransferReportMenu(targetId, clientLabel);
        break;
      }
      case "4": {
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
 * Handle Management menu (menu 1)
 */
async function handleManagementMenu(clientId, clientLabel) {
  const salam = getGreeting();
  return `${salam}!\n\n` +
    `📋 *Manajemen Client & User*\n` +
    `Client: ${clientLabel}\n\n` +
    `Menu manajemen client dan user mencakup:\n` +
    `• Tambah client baru\n` +
    `• Kelola client (update/hapus/info)\n` +
    `• Kelola user (update/exception/status)\n` +
    `• Hapus WA User\n` +
    `• Penghapusan Massal Status User\n` +
    `• Refresh Aggregator Direktorat\n\n` +
    `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
    `Untuk saat ini, silakan gunakan interface WhatsApp atau web dashboard.`;
}

/**
 * Handle Social Media Operations menu (menu 2)
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
    `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
    `Untuk saat ini, silakan gunakan interface WhatsApp atau web dashboard.`;
}

/**
 * Handle Transfer & Report menu (menu 3)
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
    `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
    `Untuk saat ini, silakan gunakan interface WhatsApp atau web dashboard.`;
}

/**
 * Handle Administrative menu (menu 4)
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
    `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
    `Untuk saat ini, silakan gunakan interface WhatsApp atau web dashboard.`;
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
  handleManagementMenu,
  handleSocialMediaMenu,
  handleTransferReportMenu,
  handleAdminMenu
};

export default clientRequestTelegramHandlers;

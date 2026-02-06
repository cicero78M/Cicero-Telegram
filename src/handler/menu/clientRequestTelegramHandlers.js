// src/handler/menu/clientRequestTelegramHandlers.js

/**
 * Telegram bot handler for clientRequest menu
 * This module provides telegram-specific handlers for client request operations
 * Following naming conventions: camelCase for functions and file names
 */

import { 
  findClientById, 
  getClientSummary,
  updateClient,
  toggleClientStatus
} from "../../service/clientService.js";
import { getGreeting, formatNama, normalizeWhatsAppNumber } from "../../utils/utilsHelper.js";
import { refreshAggregatorData } from "../../service/aggregatorService.js";

const DITBINMAS_CLIENT_ID = "DITBINMAS";

// Standard message for features under development
const FEATURE_IN_DEVELOPMENT_MSG = 
  `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
  `Untuk saat ini, silakan gunakan antarmuka WhatsApp atau web dashboard.`;

// Updatable client fields configuration
const UPDATABLE_CLIENT_FIELDS = {
  '1': { field: 'nama', label: 'Nama Client' },
  '2': { field: 'client_insta', label: 'Instagram Username' },
  '3': { field: 'client_tiktok', label: 'TikTok Username' },
  '4': { field: 'client_group', label: 'Client Group' },
  '5': { field: 'client_operator', label: 'Client Operator' },
  '6': { field: 'client_super', label: 'Client Super Admin' }
};

// Number of updatable fields
const NUM_UPDATABLE_FIELDS = Object.keys(UPDATABLE_CLIENT_FIELDS).length;

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
    `4️⃣ *Update Status Client*\n` +
    `   Perbarui status Instagram, TikTok, dan Amplifikasi\n\n` +
    `5️⃣ *Nonaktifkan Client*\n` +
    `   Client tidak dapat digunakan untuk operasi\n\n` +
    `Ketik nomor aksi (1-5) atau /menu untuk kembali.`;
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
 * Handle Update Data Client - Show field selection menu (2.1.1)
 * Returns menu for selecting which field to update
 */
async function handleUpdateClientFieldSelection(clientId, clientLabel) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return `❌ Client dengan ID ${clientId} tidak ditemukan.`;
    }

    return `✏️ *Update Data Client*\n` +
      `Client: ${clientLabel}\n\n` +
      `Pilih field yang ingin diupdate:\n\n` +
      `1️⃣ *Nama Client*\n` +
      `   Saat ini: ${client.nama || '-'}\n\n` +
      `2️⃣ *Instagram Username*\n` +
      `   Saat ini: ${client.client_insta || '-'}\n\n` +
      `3️⃣ *TikTok Username*\n` +
      `   Saat ini: ${client.client_tiktok || '-'}\n\n` +
      `4️⃣ *Client Group*\n` +
      `   Saat ini: ${client.client_group || '-'}\n\n` +
      `5️⃣ *Client Operator (WA)*\n` +
      `   Saat ini: ${client.client_operator || '-'}\n\n` +
      `6️⃣ *Client Super Admin (WA)*\n` +
      `   Saat ini: ${client.client_super || '-'}\n\n` +
      `Ketik nomor field (1-${NUM_UPDATABLE_FIELDS}) atau /menu untuk kembali.`;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error in field selection:', error);
    return `❌ Gagal memuat data client: ${error.message}`;
  }
}

/**
 * Handle client field update prompt
 * Returns prompt message asking for new value
 */
function handleClientFieldUpdatePrompt(fieldNumber, clientLabel, currentValue) {
  const fieldNames = {
    '1': { field: 'nama', label: 'Nama Client', hint: 'Contoh: DITINTELKAM' },
    '2': { field: 'client_insta', label: 'Instagram Username', hint: 'Contoh: polri_official atau kosongkan dengan tanda -' },
    '3': { field: 'client_tiktok', label: 'TikTok Username', hint: 'Contoh: @polri atau kosongkan dengan tanda -' },
    '4': { field: 'client_group', label: 'Client Group', hint: 'Contoh: MABES atau kosongkan dengan tanda -' },
    '5': { field: 'client_operator', label: 'Client Operator (WA)', hint: 'Contoh: 628123456789 atau kosongkan dengan tanda -' },
    '6': { field: 'client_super', label: 'Client Super Admin (WA)', hint: 'Contoh: 628123456789 atau kosongkan dengan tanda -' }
  };

  const fieldInfo = fieldNames[fieldNumber];
  if (!fieldInfo) {
    return `❌ Field tidak valid.`;
  }

  return `✏️ *Update ${fieldInfo.label}*\n` +
    `Client: ${clientLabel}\n\n` +
    `Nilai saat ini: ${currentValue || '-'}\n\n` +
    `Masukkan nilai baru untuk ${fieldInfo.label}:\n` +
    `${fieldInfo.hint}\n\n` +
    `Ketik nomor field (1-${NUM_UPDATABLE_FIELDS}) atau /menu untuk membatalkan.`;
}

/**
 * Process client field update
 * Validates and updates the specified field
 */
async function processClientFieldUpdate(clientId, fieldNumber, newValue) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return { success: false, message: `❌ Client dengan ID ${clientId} tidak ditemukan.` };
    }

    // Map field numbers to database columns
    const fieldMapping = {
      '1': 'nama',
      '2': 'client_insta',
      '3': 'client_tiktok',
      '4': 'client_group',
      '5': 'client_operator',
      '6': 'client_super'
    };

    const fieldName = fieldMapping[fieldNumber];
    if (!fieldName) {
      return { success: false, message: `❌ Field tidak valid.` };
    }

    // Clean the new value
    const cleanValue = newValue.trim();
    
    // Handle empty value (user wants to clear the field)
    let updateValue = cleanValue;
    if (cleanValue === '-' || cleanValue === '') {
      updateValue = '';
    }

    // Special validation for specific fields
    if (fieldName === 'client_operator' || fieldName === 'client_super') {
      // Validate WhatsApp number format if not empty
      if (updateValue && updateValue !== '') {
        // Remove non-digit characters
        const digitsOnly = updateValue.replace(/\D/g, '');
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
          return { 
            success: false, 
            message: `❌ Format nomor WhatsApp tidak valid. Nomor harus 10-15 digit.` 
          };
        }
        // Use helper to normalize
        updateValue = normalizeWhatsAppNumber(updateValue);
      }
    }

    // Prepare update data
    const updateData = { [fieldName]: updateValue };

    // Perform the update
    const updatedClient = await updateClient(clientId, updateData);
    
    if (!updatedClient) {
      return { 
        success: false, 
        message: `❌ Gagal mengupdate client. Client tidak ditemukan.` 
      };
    }

    // Get field label for success message
    const fieldLabels = {
      'nama': 'Nama Client',
      'client_insta': 'Instagram Username',
      'client_tiktok': 'TikTok Username',
      'client_group': 'Client Group',
      'client_operator': 'Client Operator',
      'client_super': 'Client Super Admin'
    };

    const displayValue = updateValue || '(kosong)';
    
    return { 
      success: true, 
      message: `✅ *Update Berhasil*\n\n` +
        `Client: ${client.nama || clientId}\n` +
        `Field: ${fieldLabels[fieldName]}\n` +
        `Nilai baru: ${displayValue}\n\n` +
        `Data client telah diperbarui.`
    };
  } catch (error) {
    console.error('[ClientRequestTelegram] Error updating client:', error);
    return { 
      success: false, 
      message: `❌ Terjadi kesalahan saat mengupdate client: ${error.message}` 
    };
  }
}

/**
 * Handle Update Status Client - Show status field selection menu (2.1.4)
 * Returns menu for selecting which status field to update
 */
async function handleUpdateStatusClientMenu(clientId, clientLabel) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return `❌ Client dengan ID ${clientId} tidak ditemukan.`;
    }

    const instaStatus = client.client_insta_status ? '✅ Aktif' : '❌ Tidak Aktif';
    const tiktokStatus = client.client_tiktok_status ? '✅ Aktif' : '❌ Tidak Aktif';
    const amplifyStatus = client.client_amplify_status ? '✅ Aktif' : '❌ Tidak Aktif';

    return `🔄 *Update Status Client*\n` +
      `Client: ${clientLabel}\n\n` +
      `Pilih status yang ingin diupdate:\n\n` +
      `1️⃣ *Status Instagram*\n` +
      `   Saat ini: ${instaStatus}\n\n` +
      `2️⃣ *Status TikTok*\n` +
      `   Saat ini: ${tiktokStatus}\n\n` +
      `3️⃣ *Status Amplifikasi*\n` +
      `   Saat ini: ${amplifyStatus}\n\n` +
      `Ketik nomor status (1-3) atau /menu untuk kembali.`;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error in status field selection:', error);
    return `❌ Gagal memuat data client: ${error.message}`;
  }
}

/**
 * Handle status field update prompt
 * Returns prompt message asking for status update confirmation
 */
async function handleStatusFieldUpdatePrompt(clientId, statusFieldNumber, clientLabel) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return `❌ Client dengan ID ${clientId} tidak ditemukan.`;
    }

    const statusFieldNames = {
      '1': { field: 'client_insta_status', label: 'Status Instagram', current: client.client_insta_status },
      '2': { field: 'client_tiktok_status', label: 'Status TikTok', current: client.client_tiktok_status },
      '3': { field: 'client_amplify_status', label: 'Status Amplifikasi', current: client.client_amplify_status }
    };

    const statusInfo = statusFieldNames[statusFieldNumber];
    if (!statusInfo) {
      return `❌ Status field tidak valid.`;
    }

    const currentStatus = statusInfo.current ? '✅ Aktif' : '❌ Tidak Aktif';
    const newStatus = statusInfo.current ? '❌ Tidak Aktif' : '✅ Aktif';

    return `🔄 *Update ${statusInfo.label}*\n` +
      `Client: ${clientLabel}\n\n` +
      `Status saat ini: ${currentStatus}\n` +
      `Status baru: ${newStatus}\n\n` +
      `Apakah Anda yakin ingin mengubah status ini?\n\n` +
      `Ketik *YA* untuk konfirmasi atau *TIDAK* untuk membatalkan.`;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error getting status info:', error);
    return `❌ Gagal mengambil informasi status: ${error.message}`;
  }
}

/**
 * Process status field update
 * Toggles the specified status field
 */
async function processStatusFieldUpdate(clientId, statusFieldNumber) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return { success: false, message: `❌ Client dengan ID ${clientId} tidak ditemukan.` };
    }

    // Map status field numbers to database columns
    const statusFieldMapping = {
      '1': 'client_insta_status',
      '2': 'client_tiktok_status',
      '3': 'client_amplify_status'
    };

    const statusFieldName = statusFieldMapping[statusFieldNumber];
    if (!statusFieldName) {
      return { success: false, message: `❌ Status field tidak valid.` };
    }

    // Get current status and toggle it
    const currentStatus = client[statusFieldName];
    const newStatus = !currentStatus;

    // Prepare update data
    const updateData = { [statusFieldName]: newStatus };

    // Perform the update
    const updatedClient = await updateClient(clientId, updateData);
    
    if (!updatedClient) {
      return { 
        success: false, 
        message: `❌ Gagal mengupdate status client. Client tidak ditemukan.` 
      };
    }

    // Get field label for success message
    const statusFieldLabels = {
      'client_insta_status': 'Status Instagram',
      'client_tiktok_status': 'Status TikTok',
      'client_amplify_status': 'Status Amplifikasi'
    };

    const statusDisplay = newStatus ? '✅ Aktif' : '❌ Tidak Aktif';
    
    return { 
      success: true, 
      message: `✅ *Update Status Berhasil*\n\n` +
        `Client: ${client.nama || clientId}\n` +
        `Field: ${statusFieldLabels[statusFieldName]}\n` +
        `Status baru: ${statusDisplay}\n\n` +
        `Status client telah diperbarui.`
    };
  } catch (error) {
    console.error('[ClientRequestTelegram] Error updating status:', error);
    return { 
      success: false, 
      message: `❌ Terjadi kesalahan saat mengupdate status: ${error.message}` 
    };
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
 * Handle Deactivate Client Prompt (2.1.5)
 * Returns confirmation prompt for deactivating a client
 */
async function handleDeactivateClientPrompt(clientId, clientLabel) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return `❌ Client dengan ID ${clientId} tidak ditemukan.`;
    }
    
    // Check if client is already inactive
    if (!client.client_status) {
      return `⚠️ *Client Sudah Tidak Aktif*\n\n` +
        `Client ${clientLabel} sudah dalam status tidak aktif.\n\n` +
        `Ketik /menu untuk kembali ke menu utama.`;
    }
    
    return `⚠️ *Konfirmasi Nonaktifkan Client*\n\n` +
      `Client: ${clientLabel}\n` +
      `Status saat ini: Aktif ✅\n\n` +
      `Apakah Anda yakin ingin menonaktifkan client ini?\n` +
      `Client yang tidak aktif tidak dapat digunakan untuk operasi.\n\n` +
      `Ketik *NONAKTIFKAN* untuk konfirmasi, atau ketik *KEMBALI* untuk membatalkan.`;
  } catch (error) {
    console.error('[ClientRequestTelegram] Error in deactivate prompt:', error);
    return `❌ Gagal memuat data client: ${error.message}`;
  }
}

/**
 * Process client deactivation
 * @param {string} clientId - Client ID to deactivate
 * @param {string} clientLabel - Client label for display
 * @returns {Promise<object>} Object with success flag and message
 */
async function processClientDeactivation(clientId, clientLabel) {
  try {
    const client = await findClientById(clientId);
    if (!client) {
      return {
        success: false,
        message: `❌ Client dengan ID ${clientId} tidak ditemukan.`
      };
    }
    
    // Check if client is already inactive
    if (!client.client_status) {
      return {
        success: false,
        message: `⚠️ Client ${clientLabel} sudah dalam status tidak aktif.`
      };
    }
    
    // Deactivate the client by setting status to false
    const updatedClient = await toggleClientStatus(clientId, false);
    
    if (!updatedClient) {
      return {
        success: false,
        message: `❌ Gagal menonaktifkan client. Silakan coba lagi.`
      };
    }
    
    return {
      success: true,
      message: `✅ *Client Berhasil Dinonaktifkan*\n\n` +
        `Client: ${clientLabel}\n` +
        `Status: Tidak Aktif ❌\n\n` +
        `Client ini sekarang tidak dapat digunakan untuk operasi.\n` +
        `Untuk mengaktifkan kembali, gunakan menu *Kelola Client Tidak Aktif* (menu 7).\n\n` +
        `Ketik /menu untuk kembali ke menu utama.`
    };
  } catch (error) {
    console.error('[ClientRequestTelegram] Error deactivating client:', error);
    return {
      success: false,
      message: `❌ Terjadi kesalahan saat menonaktifkan client: ${error.message}`
    };
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
          return handleUpdateClientFieldSelection(clientId, clientLabel);
        case "2": // Hapus Client
          return `⚠️ *Hapus Client*\n\nPenghapusan client adalah operasi berbahaya yang memerlukan konfirmasi admin.\nUntuk saat ini, silakan gunakan antarmuka web dashboard.`;
        case "3": // Info Client
          return handleClientInfo(clientId);
        case "4": // Update Status Client
          return handleUpdateStatusClientMenu(clientId, clientLabel);
        case "5": // Nonaktifkan Client
          return handleDeactivateClientPrompt(clientId, clientLabel);
        default:
          return `❌ Aksi tidak valid. Ketik nomor aksi yang valid (1-5).`;
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
  handleRefreshAggregator,
  handleUpdateClientFieldSelection,
  handleClientFieldUpdatePrompt,
  processClientFieldUpdate,
  handleUpdateStatusClientMenu,
  handleStatusFieldUpdatePrompt,
  processStatusFieldUpdate,
  handleDeactivateClientPrompt,
  processClientDeactivation
};

// Export constants
export { NUM_UPDATABLE_FIELDS, UPDATABLE_CLIENT_FIELDS };

export default clientRequestTelegramHandlers;

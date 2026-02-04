// src/handler/menu/clientRequestTelegramHandlers.js

/**
 * Telegram bot handler for clientRequest menu
 * This module provides telegram-specific handlers for client request operations
 * Following naming conventions: camelCase for functions and file names
 */

import { 
  findClientById, 
  getClientSummary,
  updateClient
} from "../../service/clientService.js";
import { getGreeting, formatNama } from "../../utils/utilsHelper.js";
import { refreshAggregatorData } from "../../service/aggregatorService.js";
import { normalizeHandleValue } from "../../utils/handleNormalizer.js";
import { fetchTiktokProfile } from "../../service/tiktokRapidService.js";

const DITBINMAS_CLIENT_ID = "DITBINMAS";

// Standard message for features under development
const FEATURE_IN_DEVELOPMENT_MSG = 
  `ℹ️ Fitur ini memerlukan integrasi lebih lanjut untuk operasi melalui Telegram.\n` +
  `Untuk saat ini, silakan gunakan antarmuka WhatsApp atau web dashboard.`;

// Field groups for client update workflow
const CLIENT_UPDATE_FIELD_GROUPS = [
  {
    key: "identitas_tipe",
    label: "Identitas & Tipe",
    fields: [
      { key: "client_type", label: "Tipe Client" },
      { key: "client_group", label: "Group Client" },
    ],
  },
  {
    key: "kontak_wa",
    label: "Kontak WA",
    fields: [
      { key: "client_operator", label: "Operator Client (WA)" },
      { key: "client_super", label: "Super Admin Client (WA)" },
    ],
  },
  {
    key: "akun_sosmed",
    label: "Akun Sosmed",
    fields: [
      { key: "client_insta", label: "Username Instagram" },
      { key: "client_tiktok", label: "Username TikTok" },
      { key: "tiktok_secuid", label: "TikTok SecUID" },
    ],
  },
  {
    key: "status_amplifikasi",
    label: "Status & Amplifikasi",
    fields: [
      { key: "client_status", label: "Status Aktif (true/false)" },
      { key: "client_insta_status", label: "Status IG Aktif (true/false)" },
      { key: "client_tiktok_status", label: "Status TikTok Aktif (true/false)" },
      { key: "client_amplify_status", label: "Status Amplifikasi (true/false)" },
    ],
  },
];

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
 * Handle Update Data Client - Step 1: Show field groups
 * @param {string} clientId - Client ID
 * @param {string} clientLabel - Client label for display
 * @returns {string} Response message with field groups
 */
async function handleUpdateClientStart(clientId, clientLabel) {
  let msg = `📝 *Update Data Client*\n`;
  msg += `Client: ${clientLabel}\n\n`;
  msg += `Pilih kategori data yang ingin diperbarui:\n\n`;
  
  CLIENT_UPDATE_FIELD_GROUPS.forEach((group, index) => {
    msg += `${index + 1}️⃣ *${group.label}*\n`;
  });
  
  msg += `\nKetik nomor kategori (1-${CLIENT_UPDATE_FIELD_GROUPS.length}) atau /menu untuk kembali.`;
  return msg;
}

/**
 * Handle Update Data Client - Step 2: Show fields in selected group
 * @param {string} groupIndex - Selected group index (0-based)
 * @param {string} clientId - Client ID
 * @param {string} clientLabel - Client label for display
 * @returns {object} Response object with message and selected group info
 */
async function handleUpdateClientGroupSelection(groupIndex, clientId, clientLabel) {
  const idx = parseInt(groupIndex);
  
  if (isNaN(idx) || idx < 0 || idx >= CLIENT_UPDATE_FIELD_GROUPS.length) {
    return {
      error: true,
      message: `❌ Pilihan tidak valid. Ketik nomor kategori yang valid (1-${CLIENT_UPDATE_FIELD_GROUPS.length}).`
    };
  }
  
  const selectedGroup = CLIENT_UPDATE_FIELD_GROUPS[idx];
  let msg = `📝 *Update Data Client - ${selectedGroup.label}*\n`;
  msg += `Client: ${clientLabel}\n\n`;
  msg += `Pilih field yang ingin diupdate:\n\n`;
  
  selectedGroup.fields.forEach((field, index) => {
    msg += `${index + 1}️⃣ *${field.label}*\n`;
    msg += `   (${field.key})\n`;
  });
  
  msg += `\nKetik nomor field (1-${selectedGroup.fields.length}) atau /menu untuk kembali.`;
  
  return {
    error: false,
    message: msg,
    selectedGroup: selectedGroup
  };
}

/**
 * Handle Update Data Client - Step 3: Prompt for field value
 * @param {string} fieldIndex - Selected field index (0-based)
 * @param {object} selectedGroup - Currently selected group
 * @param {string} clientLabel - Client label for display
 * @returns {object} Response object with message and selected field info
 */
async function handleUpdateClientFieldSelection(fieldIndex, selectedGroup, clientLabel) {
  if (!selectedGroup || !selectedGroup.fields) {
    return {
      error: true,
      message: `❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.`
    };
  }
  
  const idx = parseInt(fieldIndex);
  
  if (isNaN(idx) || idx < 0 || idx >= selectedGroup.fields.length) {
    return {
      error: true,
      message: `❌ Pilihan tidak valid. Ketik nomor field yang valid (1-${selectedGroup.fields.length}).`
    };
  }
  
  const selectedField = selectedGroup.fields[idx];
  
  // Special case for tiktok_secuid - auto-sync from existing username
  if (selectedField.key === 'tiktok_secuid') {
    return {
      error: false,
      autoSync: true,
      message: `🔄 *Sinkronisasi TikTok SecUID*\n\nSecUID akan disinkronkan otomatis dari username TikTok yang tersimpan.\n\nMenunggu konfirmasi...`,
      selectedField: selectedField
    };
  }
  
  let msg = `📝 *Update Data Client - ${selectedField.label}*\n`;
  msg += `Client: ${clientLabel}\n\n`;
  msg += `Masukkan nilai baru untuk *${selectedField.label}*:\n\n`;
  
  // Add hints for specific field types
  if (selectedField.key.includes('status')) {
    msg += `💡 Untuk field status, masukkan:\n`;
    msg += `• *true* untuk aktif\n`;
    msg += `• *false* untuk tidak aktif\n\n`;
  } else if (selectedField.key === 'client_tiktok') {
    msg += `💡 Masukkan username TikTok tanpa @\n`;
    msg += `(SecUID akan disinkronkan otomatis)\n\n`;
  } else if (selectedField.key === 'client_insta') {
    msg += `💡 Masukkan username Instagram tanpa @\n\n`;
  }
  
  msg += `Ketik nilai baru atau /menu untuk kembali.`;
  
  return {
    error: false,
    autoSync: false,
    message: msg,
    selectedField: selectedField
  };
}

/**
 * Handle Update Data Client - Step 4: Update field value
 * @param {string} value - New value for the field
 * @param {object} selectedField - Currently selected field
 * @param {string} clientId - Client ID
 * @returns {Promise<object>} Response object with success status and message
 */
async function handleUpdateClientValueInput(value, selectedField, clientId) {
  if (!selectedField || !clientId) {
    return {
      success: false,
      message: `❌ Sesi tidak valid. Ketik /menu untuk memulai kembali.`
    };
  }
  
  try {
    const trimmedValue = value.trim();
    let updateData = {};
    let additionalInfo = '';
    
    // Special handling for TikTok username - also sync secUid
    if (selectedField.key === 'client_tiktok') {
      const normalizedHandle = normalizeHandleValue(trimmedValue);
      if (!normalizedHandle) {
        return {
          success: false,
          message: `❌ Username TikTok tidak valid. Masukkan username TikTok tanpa spasi.`
        };
      }
      
      const username = normalizedHandle.replace(/^@/, '');
      let secUid = null;
      
      try {
        const profile = await fetchTiktokProfile(username);
        secUid = profile?.secUid || null;
        if (secUid) {
          additionalInfo = `\n✅ SecUID berhasil disinkronkan.`;
        } else {
          additionalInfo = `\n⚠️ Gagal mengambil SecUID dari RapidAPI.`;
        }
      } catch (error) {
        additionalInfo = `\n⚠️ Gagal mengambil SecUID: ${error.message}`;
      }
      
      updateData = {
        client_tiktok: normalizedHandle,
        tiktok_secuid: secUid
      };
    }
    // Special handling for TikTok SecUID auto-sync
    else if (selectedField.key === 'tiktok_secuid') {
      const client = await findClientById(clientId);
      const storedHandle = normalizeHandleValue(client?.client_tiktok || '');
      
      if (!storedHandle) {
        return {
          success: false,
          message: `⚠️ Username TikTok belum diisi. Update *client_tiktok* terlebih dahulu.`
        };
      }
      
      const username = storedHandle.replace(/^@/, '');
      let secUid = null;
      
      try {
        const profile = await fetchTiktokProfile(username);
        secUid = profile?.secUid || null;
        if (secUid) {
          additionalInfo = `\n✅ SecUID berhasil disinkronkan dari username: @${username}`;
        } else {
          additionalInfo = `\n❌ Gagal mengambil SecUID dari RapidAPI.`;
        }
      } catch (error) {
        return {
          success: false,
          message: `❌ Gagal mengambil SecUID: ${error.message}`
        };
      }
      
      updateData = { tiktok_secuid: secUid };
    }
    // Handle boolean fields
    else if (selectedField.key.includes('status')) {
      const lowerValue = trimmedValue.toLowerCase();
      if (lowerValue !== 'true' && lowerValue !== 'false') {
        return {
          success: false,
          message: `❌ Nilai tidak valid untuk field status. Masukkan *true* atau *false*.`
        };
      }
      updateData = { [selectedField.key]: lowerValue === 'true' };
    }
    // Handle Instagram username
    else if (selectedField.key === 'client_insta') {
      const normalizedHandle = normalizeHandleValue(trimmedValue);
      updateData = { [selectedField.key]: normalizedHandle };
    }
    // Handle other fields
    else {
      updateData = { [selectedField.key]: trimmedValue };
    }
    
    // Perform the update
    const updatedClient = await updateClient(clientId, updateData);
    
    if (!updatedClient) {
      return {
        success: false,
        message: `❌ Client tidak ditemukan atau update gagal.`
      };
    }
    
    // Format success message
    let msg = `✅ *Update Berhasil*\n\n`;
    msg += `Field *${selectedField.label}* telah diperbarui.${additionalInfo}\n\n`;
    msg += `📊 *Informasi Client*:\n`;
    msg += `🆔 Client ID: ${updatedClient.client_id}\n`;
    msg += `📛 Nama: ${updatedClient.nama || '-'}\n`;
    msg += `📍 Status: ${updatedClient.client_status ? '✅ Aktif' : '❌ Tidak Aktif'}\n`;
    msg += `🏷️ Tipe: ${updatedClient.client_type || '-'}\n`;
    
    return {
      success: true,
      message: msg
    };
  } catch (error) {
    console.error('[ClientRequestTelegram] Error updating client:', error);
    return {
      success: false,
      message: `❌ Terjadi kesalahan saat update: ${error.message}`
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
          return handleUpdateClientStart(clientId, clientLabel);
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
  handleRefreshAggregator,
  handleUpdateClientStart,
  handleUpdateClientGroupSelection,
  handleUpdateClientFieldSelection,
  handleUpdateClientValueInput
};

export default clientRequestTelegramHandlers;

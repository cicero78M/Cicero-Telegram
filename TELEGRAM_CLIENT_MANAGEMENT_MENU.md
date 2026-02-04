# Telegram Client Bot - Management Menu Implementation

## Overview
This document describes the implementation of the interactive Management Menu (Menu 2) in the Telegram Client Bot.

## Menu Structure

```
Main Menu (/)
└── 2. Manajemen Client & User
    ├── 1. Kelola Client
    │   ├── 1. Update Data Client (placeholder)
    │   ├── 2. Hapus Client (placeholder)
    │   └── 3. Info Client (✅ WORKING)
    ├── 2. Kelola User
    │   ├── 1. Update Data User (placeholder)
    │   ├── 2. Kelola Exception User (placeholder)
    │   └── 3. Ubah Status User (placeholder)
    ├── 3. Hapus WA User (input prompt ready)
    ├── 4. Penghapusan Massal Status User (input prompt ready)
    └── 5. Refresh Aggregator Direktorat (✅ WORKING)
```

## User Interaction Flow

### Flow 1: View Client Info (Fully Working)
```
User: /start
Bot: Welcome message

User: /menu
Bot: Shows main menu (1-7)

User: 2
Bot: Shows Management submenu (1-5)
Session: step = 'management_submenu'

User: 1
Bot: Shows Kelola Client menu (1-3)
Session: step = 'management_subaction', selectedSubmenu = '1'

User: 3
Bot: Displays client info with statistics
Session: step = 'menu' (reset)
```

### Flow 2: Refresh Aggregator (Fully Working)
```
User: /menu
Bot: Shows main menu

User: 2
Bot: Shows Management submenu
Session: step = 'management_submenu'

User: 5
Bot: "✅ Refresh Aggregator Berhasil - Data aggregator direktorat telah diperbarui."
Session: step = 'menu' (reset)
```

### Flow 3: Complex Operations (Placeholder)
```
User: /menu
Bot: Shows main menu

User: 2
Bot: Shows Management submenu
Session: step = 'management_submenu'

User: 1
Bot: Shows Kelola Client menu
Session: step = 'management_subaction'

User: 1 (Update Data Client)
Bot: "ℹ️ Update Data Client - Fitur ini memerlukan interaksi multi-step yang kompleks.
     Untuk saat ini, silakan gunakan antarmuka web dashboard."
Session: step = 'menu' (reset)
```

## Session State Management

The bot uses a Map-based session system to track user state:

```javascript
userSessions.set(chatId, {
  selectedClientId: 'DITBINMAS',
  clientName: 'DITBINMAS',
  step: 'management_submenu',     // Current interaction step
  selectedMenu: '2',               // Main menu selection
  selectedSubmenu: '1'             // Submenu selection
});
```

### Session Steps
- `menu` - User is at main menu level
- `management_submenu` - User is selecting submenu (1-5)
- `management_subaction` - User is selecting subaction (e.g., 1-3 in Kelola Client)
- `choose_client` - User is selecting a client
- `choose_inactive_client` - User is selecting an inactive client
- `confirm_status_change` - User is confirming a status change

## Implementation Details

### Files Modified

1. **src/handler/menu/clientRequestTelegramHandlers.js**
   - Added submenu handler functions
   - Added routing logic for submenu/subaction selection
   - Implemented working features (Info Client, Refresh Aggregator)
   - Added placeholders for complex operations

2. **src/service/telegramClientBotService.js**
   - Enhanced message handler to support session-based routing
   - Added submenu/subaction selection handlers
   - Modified menu selection to detect Menu 2 and enter submenu mode

### Key Functions

#### Handler Functions (clientRequestTelegramHandlers.js)
- `handleManagementMenu()` - Shows submenu options
- `handleManagementSubmenu()` - Routes to submenu handlers
- `handleKelolaClientMenu()` - Shows client management options
- `handleClientInfo()` - Retrieves and displays client info ✅
- `handleKelolaUserMenu()` - Shows user management options
- `handleHapusWAUserPrompt()` - Prompts for user input
- `handleBulkStatusPrompt()` - Prompts for bulk input
- `handleRefreshAggregator()` - Refreshes aggregator data ✅

#### Bot Service Functions (telegramClientBotService.js)
- `handleManagementSubmenuSelection()` - Processes submenu (1-5) selection
- `handleManagementSubactionSelection()` - Processes subaction selection
- Modified `handleMenuSelection()` - Detects Menu 2 and sets session mode

## Messages and Responses

### Management Menu (Menu 2)
```
📋 *Manajemen Client & User*
Client: DITBINMAS

Pilih submenu yang ingin Anda akses:

1️⃣ *Kelola Client*
   Update, hapus, atau lihat info client

2️⃣ *Kelola User*
   Update, exception, atau status user

3️⃣ *Hapus WA User*
   Hapus nomor WhatsApp dari user

4️⃣ *Penghapusan Massal Status User*
   Hapus status user secara massal

5️⃣ *Refresh Aggregator Direktorat*
   Refresh data aggregator direktorat

Ketik nomor submenu (1-5) untuk melanjutkan, atau ketik /menu untuk kembali.
```

### Client Info Response (Example)
```
📊 *Informasi Client*

🆔 *Client ID*: DITBINMAS
📛 *Nama*: Dit Binmas Polda
📍 *Status*: ✅ Aktif
🏷️ *Tipe*: DIREKTORAT
👥 *Group*: REGIONAL_1

📈 *Statistik*:
• Jumlah User: 45
• Post Instagram: 120
• Post TikTok: 85
• Total Likes Instagram: 15,430
• Total Komentar TikTok: 8,920
```

### Refresh Aggregator Response
```
✅ *Refresh Aggregator Berhasil*

Data aggregator direktorat telah diperbarui.
```

## Future Enhancements

The following features are marked as placeholders and require implementation:

1. **Update Data Client** - Multi-step form for updating client information
2. **Hapus Client** - Confirmation flow for client deletion
3. **Update Data User** - Multi-step form for updating user information
4. **Kelola Exception User** - View and manage user exceptions
5. **Ubah Status User** - Activate/deactivate user accounts
6. **Hapus WA User** - Complete implementation with user ID input
7. **Bulk Status Deletion** - Complete implementation with bulk input parsing

## Security Considerations

- Client deletion requires admin confirmation (currently placeholder)
- User status changes should be logged
- Bulk operations require validation before execution
- All operations respect client-user relationships

## Testing

To test the implementation:

1. Start the bot with proper configuration:
   ```bash
   TELEGRAM_CLIENT_BOT_TOKEN=<your-token>
   TELEGRAM_CLIENT_BOT_ENABLED=true
   ```

2. Send `/start` to the bot
3. Send `/menu` to see the main menu
4. Send `2` to enter Management Menu
5. Try submenu options:
   - Send `1` then `3` for Client Info
   - Send `5` for Refresh Aggregator
   - Send `1` then `1` to see placeholder message

## Related Documentation

- `docs/telegram_multi_bot_setup.md` - General bot setup
- `TELEGRAM_BOT_ARCHITECTURE.md` - Architecture overview
- `docs/naming_conventions.md` - Code style guidelines

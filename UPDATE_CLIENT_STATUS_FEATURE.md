# Update Client Status Feature Documentation

## Overview
This document describes the new "Update Status Client" feature added to the Telegram bot client management menu.

## Feature Description
A new submenu has been added under **Menu 2 (Manajemen Client & User) → 1. Kelola Client → 4. Update Status Client** that allows users to update client status fields for Instagram, TikTok, and Amplification.

## Implementation Details

### Database Fields
The feature manages three boolean status fields in the `clients` table:
- `client_insta_status` - Instagram status (active/inactive)
- `client_tiktok_status` - TikTok status (active/inactive)
- `client_amplify_status` - Amplification status (active/inactive)

### Menu Flow
1. User navigates to Menu 2 (Manajemen Client & User)
2. Selects option 1 (Kelola Client)
3. Selects option 4 (Update Status Client)
4. Views current status for all three fields
5. Selects which status field to update (1-3)
6. Receives confirmation prompt showing current and new status
7. Confirms with "YA" or cancels with "TIDAK"
8. Status is toggled and success message is displayed

### Files Modified

#### 1. `/src/handler/menu/clientRequestTelegramHandlers.js`
- Updated `handleKelolaClientMenu()` to add option 4
- Added `handleUpdateStatusClientMenu()` - Shows status field selection menu
- Added `handleStatusFieldUpdatePrompt()` - Shows confirmation prompt
- Added `processStatusFieldUpdate()` - Processes the status toggle
- Updated `handleManagementSubmenu()` to route to new handlers
- Updated exports to include new functions

#### 2. `/src/service/telegramClientBotService.js`
- Updated `handleManagementSubactionSelection()` to handle subaction '4'
- Added `handleUpdateStatusFieldSelection()` - Handles status field selection
- Added `handleUpdateStatusFieldConfirmation()` - Handles confirmation
- Added message routing for new steps:
  - `update_status_field_selection`
  - `update_status_field_confirmation`

#### 3. `/tests/telegramClientBotService.test.js`
- Updated mocks to include new handler functions
- Added `NUM_UPDATABLE_FIELDS` export to mock
- Added `findClientById` to client service mock

## User Experience

### Menu Navigation Example
```
🏢 Kelola Client
Client: DITBINMAS

Pilih aksi yang ingin dilakukan:

1️⃣ Update Data Client
   Perbarui informasi client

2️⃣ Hapus Client
   Hapus client dari sistem

3️⃣ Info Client
   Tampilkan detail client

4️⃣ Update Status Client
   Perbarui status Instagram, TikTok, dan Amplifikasi

Ketik nomor aksi (1-4) atau /menu untuk kembali.
```

### Status Field Selection
```
🔄 Update Status Client
Client: DITBINMAS

Pilih status yang ingin diupdate:

1️⃣ Status Instagram
   Saat ini: ✅ Aktif

2️⃣ Status TikTok
   Saat ini: ✅ Aktif

3️⃣ Status Amplifikasi
   Saat ini: ❌ Tidak Aktif

Ketik nomor status (1-3) atau /menu untuk kembali.
```

### Confirmation Prompt
```
🔄 Update Status Instagram
Client: DITBINMAS

Status saat ini: ✅ Aktif
Status baru: ❌ Tidak Aktif

Apakah Anda yakin ingin mengubah status ini?

Ketik YA untuk konfirmasi atau TIDAK untuk membatalkan.
```

### Success Message
```
✅ Update Status Berhasil

Client: DITBINMAS
Field: Status Instagram
Status baru: ❌ Tidak Aktif

Status client telah diperbarui.
```

## Testing

### Manual Testing Steps
1. Start the Telegram bot
2. Navigate to Menu 2 (Manajemen Client & User)
3. Select option 1 (Kelola Client)
4. Verify option 4 (Update Status Client) is displayed
5. Select option 4
6. Verify all three status fields are shown with current values
7. Select a status field (1, 2, or 3)
8. Verify confirmation prompt displays correctly
9. Type "YA" to confirm
10. Verify success message and status change
11. Repeat with "TIDAK" to verify cancellation works

### Automated Tests
- All existing tests pass
- Test mocks updated to support new functions
- Linting passes with no errors

## Security Considerations
- Only toggles existing boolean fields
- No SQL injection risk (uses parameterized queries via ORM)
- Requires valid session and client context
- User must have access to client management menu

## Impact Analysis
- **Low risk**: Feature only toggles status flags
- **No breaking changes**: Existing functionality unchanged
- **Backwards compatible**: New menu option only
- **Database**: No schema changes required (fields already exist)

## Future Enhancements
Potential improvements for future iterations:
- Batch status updates (update multiple statuses at once)
- Status change history/audit log
- Status-based filtering in client lists
- Notification when status changes

## Related Documentation
- `CLIENTREQUEST_TELEGRAM_BOT_IMPLEMENTATION.md` - Overall bot implementation
- `CLIENT_REQUEST_WORKFLOW_DOCUMENTATION.md` - Menu workflow details
- `CLIENT_STATUS_TOGGLE_FEATURE.md` - Related client activation feature

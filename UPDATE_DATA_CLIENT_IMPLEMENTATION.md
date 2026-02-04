# Update Data Client CRUD Workflow - Implementation Summary

## Overview
This document describes the implementation of the **Update Data Client** feature for the Telegram bot, which enables users to perform CRUD operations on client data through a multi-step interactive workflow.

## Problem Statement
Previously, the "Update Data Client" menu (option 2.1.1) returned a placeholder message directing users to the web dashboard. The task was to implement a complete CRUD workflow that follows best practices and allows users to update client data directly through the Telegram bot.

## Solution Architecture

### Multi-Step Workflow
The implementation uses a session-based, multi-step workflow:

1. **Step 1: Select Category** (`update_client_group`)
   - User selects a category of fields to update
   - Categories: Identitas & Tipe, Kontak WA, Akun Sosmed, Status & Amplifikasi

2. **Step 2: Select Field** (`update_client_field`)
   - User selects a specific field within the chosen category
   - Each field is displayed with its label and key name

3. **Step 3: Input Value** (`update_client_value`)
   - User inputs the new value for the selected field
   - Special handling for boolean fields (true/false validation)
   - Auto-sync for TikTok SecUID when updating TikTok username

4. **Step 4: Confirmation**
   - System updates the database
   - Displays success message with updated client information

### Session Management
Sessions are stored in `userSessions` Map in `telegramClientBotService.js` with the following structure:
```javascript
{
  selectedClientId: 'CLIENT_ID',
  clientName: 'Client Name',
  step: 'update_client_group' | 'update_client_field' | 'update_client_value',
  updateClientGroup: { /* selected group object */ },
  updateClientField: { /* selected field object */ }
}
```

### Field Groups
The workflow organizes updatable fields into 4 logical groups:

1. **Identitas & Tipe**
   - client_type (Tipe Client)
   - client_group (Group Client)

2. **Kontak WA**
   - client_operator (Operator Client WA)
   - client_super (Super Admin Client WA)

3. **Akun Sosmed**
   - client_insta (Username Instagram)
   - client_tiktok (Username TikTok)
   - tiktok_secuid (TikTok SecUID - auto-sync)

4. **Status & Amplifikasi**
   - client_status (Status Aktif)
   - client_insta_status (Status IG Aktif)
   - client_tiktok_status (Status TikTok Aktif)
   - client_amplify_status (Status Amplifikasi)

## Implementation Details

### Files Modified
1. **src/handler/menu/clientRequestTelegramHandlers.js**
   - Added `CLIENT_UPDATE_FIELD_GROUPS` constant
   - Implemented workflow handler functions:
     - `handleUpdateClientStart()` - Display field groups
     - `handleUpdateClientGroupSelection()` - Handle group selection
     - `handleUpdateClientFieldSelection()` - Handle field selection
     - `handleUpdateClientValueInput()` - Handle value input and update
   - Updated imports to include `updateClient`, `normalizeHandleValue`, and `fetchTiktokProfile`

2. **src/service/telegramClientBotService.js**
   - Added message handlers for each workflow step:
     - `handleUpdateClientGroupInput()`
     - `handleUpdateClientFieldInput()`
     - `handleUpdateClientValueInput()`
   - Modified `handleManagementSubactionSelection()` to set proper workflow step
   - Added step checks in message handler

### Special Features

#### 1. Boolean Field Validation
Status fields only accept `true` or `false` values:
```javascript
if (selectedField.key.includes('status')) {
  const lowerValue = trimmedValue.toLowerCase();
  if (lowerValue !== 'true' && lowerValue !== 'false') {
    return { success: false, message: 'Nilai tidak valid...' };
  }
  updateData = { [selectedField.key]: lowerValue === 'true' };
}
```

#### 2. TikTok Username Auto-Sync
When updating `client_tiktok`, the system automatically fetches and updates the `tiktok_secuid`:
```javascript
if (selectedField.key === 'client_tiktok') {
  const username = normalizedHandle.replace(/^@/, '');
  const profile = await fetchTiktokProfile(username);
  const secUid = profile?.secUid || null;
  updateData = {
    client_tiktok: normalizedHandle,
    tiktok_secuid: secUid
  };
}
```

#### 3. Direct SecUID Sync
The `tiktok_secuid` field can be synced directly without user input by fetching from existing username:
```javascript
if (selectedField.key === 'tiktok_secuid') {
  const client = await findClientById(clientId);
  const username = client.client_tiktok.replace(/^@/, '');
  const profile = await fetchTiktokProfile(username);
  updateData = { tiktok_secuid: profile?.secUid };
}
```

## Testing
Comprehensive tests were created in `tests/clientRequestTelegramHandlers.test.js`:
- 11 test cases covering all workflow steps
- Tests for validation (invalid indices, invalid boolean values)
- Tests for special features (auto-sync, boolean fields)
- All tests passing ✅

## User Experience

### Example Flow
1. User types `/menu` to start
2. Selects option `2` (Manajemen Client & User)
3. Selects option `1` (Kelola Client)
4. Selects option `1` (Update Data Client)
5. Bot shows 4 categories to choose from
6. User types `3` (Akun Sosmed)
7. Bot shows fields: Instagram, TikTok, SecUID
8. User types `2` (Username TikTok)
9. Bot prompts for new username
10. User types `polriofficial`
11. Bot updates database and syncs SecUID automatically
12. Bot shows success message with updated client info

### Error Handling
- Invalid selections show clear error messages
- Invalid boolean values for status fields are rejected
- Missing dependencies (e.g., TikTok username for SecUID sync) are detected
- Database errors are caught and reported

## Security Considerations
- Session data is stored in memory (not persisted)
- Only authenticated Telegram users can access the bot
- Input validation prevents injection attacks
- Boolean fields use strict validation

## Best Practices Followed
1. **Separation of Concerns**: Handlers separated from service logic
2. **State Management**: Clear session states for each workflow step
3. **Error Handling**: Comprehensive error handling and user feedback
4. **Input Validation**: Strict validation for all user inputs
5. **User Experience**: Clear prompts and helpful error messages
6. **Testability**: All functions are testable with comprehensive test coverage
7. **Code Organization**: Logical grouping of fields for better UX
8. **Special Cases**: Intelligent handling of related fields (TikTok username + SecUID)

## Future Enhancements
Possible improvements for future iterations:
1. Add ability to cancel mid-workflow
2. Add confirmation step before updating
3. Support batch updates (multiple fields at once)
4. Add undo/rollback capability
5. Add audit logging for all updates
6. Add permission checks for sensitive fields

## Conclusion
The Update Data Client CRUD workflow is now fully implemented and tested. Users can update client data through an intuitive, multi-step process directly from the Telegram bot, eliminating the need to use the web dashboard for these operations.

# Telegram User Bot - Linking Feature

## Overview

The Telegram User Bot now includes a secure linking mechanism that allows users to connect their Telegram accounts to their user profiles in the system.

## Features

1. **Secure Linking**: Users must approve linking requests with a unique code
2. **Time-Limited**: Link requests expire after 24 hours
3. **Authentication Required**: Users can only access bot features after linking
4. **Easy to Use**: Simple commands for linking and approval

## Commands

### `/start`
- Shows welcome message
- Different message for linked vs unlinked users
- Provides next steps

### `/help`
- Displays help information
- Shows linking instructions for unlinked users
- Shows menu options for linked users

### `/link NRP_ANDA`
- Initiates the linking process
- Example: `/link 081235114745`
- Creates a pending link request with approval code
- Checks if NRP/NIP exists in the system
- Prevents duplicate linking

### `/approve KODE_ANDA`
- Approves a pending link request
- Example: `/approve 123456`
- Links Telegram account to user profile
- Enables access to user menu

### `/menu`
- Displays main user menu (only for linked users)
- Options:
  1. View My Data - Display user profile information
  2. Update Data - Modify user profile fields
  3. Exit - Close menu

## Workflow

### Linking Process

```
1. User: /link 081235114745
   Bot: Creates pending link request
   Bot: Returns approval code (e.g., 123456)

2. User: /approve 123456
   Bot: Verifies code
   Bot: Links telegram_chat_id to user profile
   Bot: Confirms successful linking

3. User: /menu
   Bot: Displays user menu (now accessible)
```

### Data Update Process

```
1. User: /menu
   Bot: Shows menu options

2. User: 2 (Update Data)
   Bot: Lists updatable fields:
        1. Nama
        2. Pangkat
        3. Satfung
        4. Jabatan
        5. Instagram
        6. TikTok
        7. Desa Binaan (if user is Ditbinmas)

3. User: 5 (Instagram)
   Bot: Prompts for new Instagram value

4. User: @myinstagram
   Bot: Validates input
   Bot: Updates database
   Bot: Confirms success
```

## Database Schema

### `user` table
- Added `telegram_chat_id` VARCHAR UNIQUE column
- Stores Telegram chat ID for linked users

### `pending_telegram_links` table
- `link_id`: UUID primary key
- `user_id`: Reference to user table
- `telegram_chat_id`: Telegram chat ID requesting link
- `telegram_username`: Telegram username (optional)
- `telegram_first_name`: Telegram first name (optional)
- `telegram_last_name`: Telegram last name (optional)
- `status`: pending | approved | rejected | expired
- `approval_code`: 6-digit unique code
- `created_at`: Timestamp of request
- `expires_at`: Expiration timestamp (24 hours from creation)
- `approved_at`: Timestamp of approval (if approved)

## Security Features

1. **One-to-One Mapping**: Each Telegram account can only link to one user profile
2. **Approval Required**: Users must explicitly approve linking with unique code
3. **Time-Limited Codes**: Approval codes expire after 24 hours
4. **Duplicate Prevention**: System prevents linking already-linked accounts
5. **Authentication Check**: All menu operations require linked account

## Error Handling

- Invalid NRP/NIP: Clear error message
- Expired code: Prompts to request new link
- Already linked: Shows current link information
- Duplicate linking: Prevents linking same account twice

## User Experience

### For New Users
1. Clear onboarding with `/start`
2. Step-by-step linking instructions
3. Immediate feedback on link status
4. Easy approval process

### For Existing Users
1. Quick access to menu
2. Simple navigation
3. Inline validation
4. Confirmation messages

## Implementation Files

- `sql/migrations/20260203_add_telegram_chat_id_to_user.sql` - User table migration
- `sql/migrations/20260203_create_pending_telegram_links.sql` - Pending links table migration
- `sql/schema.sql` - Updated schema with new tables
- `src/model/userModel.js` - Database operations for telegram linking
- `src/service/telegramUserBotService.js` - Bot commands and handlers
- `src/handler/menu/userMenuHandlers.js` - Menu navigation handlers

## Future Enhancements

1. Add inline keyboard buttons for menu navigation
2. Implement `/unlink` command to remove linking
3. Add admin commands for managing links
4. Notification system for link requests
5. Multi-language support

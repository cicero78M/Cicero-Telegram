# Telegram Multi-Bot Setup Guide

## Overview

Cicero now supports **three specialized Telegram bots**, each designed for specific user roles and functionalities:

1. **Bot Direktorat** - For directorate-level reporting and analytics (dirRequest menu)
2. **Bot Operator** - For operator management tasks (oprRequest menu)  
3. **Bot User** - For end-user personal data management (userRequest menu)

## Bot Descriptions

### 1. Bot Direktorat (Directorate Bot)

**Purpose**: Provides access to directorate-level reporting, analytics, and administrative functions.

**Target Users**: Directorate staff, administrators

**Available Menus**:
- Recap data user
- Executive summary
- Laporan data tidak lengkap
- Absensi likes Instagram (various formats)
- Absensi komentar TikTok (various formats)
- Fetch & recap konten Instagram + likes
- Fetch & recap konten TikTok + komentar
- Satker update matrix Excel
- Engagement ranking Excel
- Laporan Kasatker
- And more (see dirRequestHandlers.js for complete list)

**Commands**:
- `/start` - Welcome message and bot introduction
- `/help` - Display available commands and usage instructions
- `/menu` - Show directorate menu options

### 2. Bot Operator (Operator Bot)

**Purpose**: Enables operators to manage users, amplification, and engagement for their client organizations.

**Target Users**: Client operators, organizational administrators

**Available Menus**:
- **Manajemen User** - User management (add, edit, delete users)
- **Manajemen Amplifikasi** - Link amplification management (regular and khusus)
- **Manajemen Engagement** - Instagram likes and TikTok comments engagement tracking

**Commands**:
- `/start` - Welcome message and bot introduction
- `/help` - Display available commands and usage instructions
- `/menu` - Show operator menu options

**Note**: Menu availability depends on client configuration:
- Amplification menu requires `client_amplify_status = true`
- Engagement menu requires Instagram or TikTok status to be active

### 3. Bot User (User Bot)

**Purpose**: Allows individual users to view and update their personal data.

**Target Users**: End users (police personnel, content creators)

**Available Functions**:
- View personal profile information
- Update profile fields:
  - Nama (Name)
  - Pangkat (Rank)
  - Satfung (Division)
  - Jabatan (Position)
  - Instagram handle
  - TikTok handle
  - Desa Binaan (for Ditbinmas users)

**Commands**:
- `/start` - Welcome message and bot introduction
- `/help` - Display available commands and usage instructions
- `/menu` - Show user menu options

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Direktorat Bot Configuration
TELEGRAM_DIREKTORAT_BOT_TOKEN=your-direktorat-bot-token-here
TELEGRAM_DIREKTORAT_BOT_ENABLED=true

# Operator Bot Configuration
TELEGRAM_OPERATOR_BOT_TOKEN=your-operator-bot-token-here
TELEGRAM_OPERATOR_BOT_ENABLED=true

# User Bot Configuration
TELEGRAM_USER_BOT_TOKEN=your-user-bot-token-here
TELEGRAM_USER_BOT_ENABLED=true
```

### Obtaining Bot Tokens

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to:
   - Choose a display name (e.g., "Cicero Direktorat Bot")
   - Choose a unique username (must end in 'bot', e.g., "cicero_direktorat_bot")
4. BotFather will provide you with a bot token
5. Copy the token and add it to your `.env` file
6. Repeat for each of the three bots

### Bot Configuration Best Practices

- **Separate Tokens**: Use different tokens for each bot to keep them independent
- **Descriptive Names**: Choose clear, descriptive names that indicate the bot's purpose
- **Security**: Keep bot tokens secret and never commit them to version control
- **Enable Selectively**: You can enable/disable individual bots by setting the `_ENABLED` flag

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env` (see above)

3. Start the application:
```bash
npm start
# or for development with auto-reload
npm run dev
```

4. Verify bots are running:
```
[App] Telegram Direktorat Bot is enabled, initializing...
[Telegram Direktorat Bot] Initializing bot...
[Telegram Direktorat Bot] Bot initialized successfully
[App] Telegram Direktorat Bot started successfully

[App] Telegram Operator Bot is enabled, initializing...
[Telegram Operator Bot] Initializing operatorBot...
[Telegram Operator Bot] Bot initialized successfully
[App] Telegram Operator Bot started successfully

[App] Telegram User Bot is enabled, initializing...
[Telegram User Bot] Initializing userBot...
[Telegram User Bot] Bot initialized successfully
[App] Telegram User Bot started successfully
```

## Usage

### For End Users

1. **Direktorat Staff**:
   - Search for your Direktorat Bot on Telegram
   - Send `/start` to begin
   - Use `/menu` to access reporting and analytics features

2. **Operators**:
   - Search for your Operator Bot on Telegram
   - Send `/start` to begin
   - Use `/menu` to manage users, amplification, and engagement

3. **Regular Users**:
   - Search for your User Bot on Telegram
   - Send `/start` to begin
   - Use `/menu` to view and update your profile

### Command Flow

All bots follow a similar interaction pattern:

1. **Start**: `/start` - Displays welcome message
2. **Help**: `/help` - Shows available commands and instructions
3. **Menu**: `/menu` - Displays role-specific menu options
4. **Navigation**: Type menu numbers or keywords as prompted
5. **Exit**: Type "batal" (cancel) to exit current operation

## Architecture

### File Structure

```
src/
├── service/
│   ├── telegramDirektoratBotService.js  # Direktorat bot implementation
│   ├── telegramOperatorBotService.js     # Operator bot implementation
│   └── telegramUserBotService.js         # User bot implementation
├── handler/
│   └── menu/
│       ├── dirRequestHandlers.js         # Direktorat menu handlers
│       ├── oprRequestHandlers.js         # Operator menu handlers
│       └── userMenuHandlers.js           # User menu handlers
└── config/
    └── env.js                            # Environment configuration
```

### Session Management

Each bot maintains its own session state using a `Map` structure:

```javascript
const userSessions = new Map();
// Key: chatId (Telegram user ID)
// Value: session object with state information
```

Sessions track:
- User's current step in the menu flow
- Selected options and inputs
- Client/user associations
- Temporary data during multi-step operations

### Handler Integration

Bots integrate with existing WhatsApp menu handlers by:
- Passing the Telegram bot instance as the `waClient` parameter
- Adapting message formats for Telegram's API
- Maintaining session state for multi-step flows
- Handling Telegram-specific features (inline keyboards, message formatting)

## Troubleshooting

### Bot Not Responding

1. Check bot is enabled in `.env`:
   ```env
   TELEGRAM_DIREKTORAT_BOT_ENABLED=true
   ```

2. Verify token is correct and not revoked

3. Check application logs for initialization errors

4. Ensure the bot is not blocked by Telegram rate limits

### Permission Issues

- Operator bot requires users to have operator permissions in the database
- User bot requires users to have their WhatsApp/phone linked in the database
- Direktorat bot may require client selection based on user's role

### Database Connection

All bots require database connectivity to:
- Retrieve user information
- Fetch client configurations
- Access menu data
- Store session state (if persistent)

## Migration from Single Bot

If migrating from the legacy single-bot setup:

1. Keep the old `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_ENABLED` variables for backward compatibility
2. Add new bot tokens for the three specialized bots
3. Enable the new bots one at a time to test functionality
4. Communicate the change to users and provide new bot usernames
5. Eventually deprecate the old single bot

## Security Considerations

- **Private Chats Only**: All bots only respond to private messages, not group chats
- **Authentication**: User identity is verified against database records
- **Authorization**: Menu access is role-based and client-scoped
- **Token Security**: Keep bot tokens secure and rotate if compromised
- **Rate Limiting**: Telegram enforces rate limits; design workflows accordingly

## Testing

Run the test suite:

```bash
npm test
```

Test files:
- `tests/telegramDirektoratBotService.test.js`
- `tests/telegramOperatorBotService.test.js` (to be created)
- `tests/telegramUserBotService.test.js` (to be created)

## Future Enhancements

Planned improvements:
- [ ] Inline keyboard buttons for menu navigation
- [ ] Callback query handling for interactive menus
- [ ] File upload/download capabilities
- [ ] Rich media support (images, documents)
- [ ] Scheduled report delivery
- [ ] Multi-language support
- [ ] Admin commands for bot management

## Support

For issues or questions:
- Check the logs in the application console
- Review the code in `src/service/telegram*BotService.js`
- Consult the handler implementations in `src/handler/menu/`
- Refer to [Telegram Bot API documentation](https://core.telegram.org/bots/api)

## License

This implementation is part of the Cicero project and follows the same license.

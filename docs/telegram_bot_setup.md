# Telegram Bot Setup Guide

## Overview

The Cicero Telegram Bot allows users to access dirRequest menu functionality through a private Telegram chat. This bot supports various menu options including reports, recaps, and data exports.

## Prerequisites

1. A Telegram account
2. Access to BotFather on Telegram
3. Node.js 20 or newer installed
4. The Cicero backend running

## Creating a Telegram Bot

### Step 1: Create Bot with BotFather

1. Open Telegram and search for `@BotFather`
2. Start a conversation with BotFather
3. Send the command `/newbot`
4. Follow the prompts:
   - **Bot name**: Enter a display name for your bot (e.g., "Cicero DirRequest Bot")
   - **Bot username**: Enter a unique username ending in 'bot' (e.g., "cicero_dirrequest_bot")
5. BotFather will provide you with a **bot token**. Save this token securely.

Example:
```
Done! Congratulations on your new bot. You will find it at t.me/cicero_dirrequest_bot.
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

### Step 2: Configure the Bot Token

1. Copy the `.env.example` file to `.env` if you haven't already:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your bot token:
   ```ini
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   TELEGRAM_BOT_ENABLED=true
   ```

### Step 3: Start the Application

Start the Cicero backend:
```bash
npm start
```

Or with PM2:
```bash
pm2 start ecosystem.config.js
```

You should see logs indicating the Telegram bot has started:
```
[App] Telegram bot is enabled, initializing...
[Telegram Bot] Initializing bot...
[Telegram Bot] Bot initialized successfully
[App] Telegram bot started successfully
```

## Using the Bot

### Starting a Conversation

1. Open Telegram and search for your bot username (e.g., `@cicero_dirrequest_bot`)
2. Click "Start" or send `/start`
3. The bot will respond with a welcome message

### Available Commands

- `/start` - Start the bot and see welcome message
- `/help` - Display help information
- `/menu` - Show the dirRequest menu options

### Accessing Menu Options

1. Send `/menu` to see available menu options
2. Reply with the menu number you want to access (e.g., `1`, `2`, `12`)
3. The bot will process your request and send back the results

### Menu Categories

**📊 Laporan Dasar (1-3)**
- Menu 1: Recap data user
- Menu 2: Executive summary
- Menu 3: Laporan data tidak lengkap

**👥 Laporan Instagram/Likes (5-7, 12-13, 19)**
- Menu 5: Absensi likes Ditbinmas (lengkap)
- Menu 6: Absensi likes Ditbinmas (sederhana)
- Menu 7: Absensi likes semua personel
- Menu 12: Fetch & recap konten Instagram + likes
- Menu 13: Fetch likes Instagram saja
- Menu 19: Likes recap Excel

**💬 Laporan TikTok/Komentar (8-10, 14-15, 20)**
- Menu 8: Absensi komentar TikTok
- Menu 9: Absensi komentar Ditbinmas (sederhana)
- Menu 10: Absensi komentar Ditbinmas (lengkap)
- Menu 14: Fetch & recap konten TikTok + komentar
- Menu 15: Fetch komentar TikTok saja
- Menu 20: Comment recap Excel

**📈 Laporan Lainnya**
- Menu 4: Satker update matrix Excel
- Menu 22: Engagement ranking Excel
- Menu 30: Laporan Kasatker

## Important Notes

### Private Chat Only

The bot **only responds to private chats**. If you try to use the bot in a group chat, it will notify you to use private chat instead.

### Client ID

Currently, the bot uses the `DITBINMAS` client ID by default for all requests. In a production environment, you may want to implement user authentication to determine the appropriate client ID based on the user.

### Long Messages

The bot automatically handles long responses by splitting them into multiple messages (Telegram has a 4096 character limit per message).

### File Attachments

Some menu options generate Excel files. Currently, these are processed but not attached to Telegram messages. To support file sending, additional implementation is needed.

## Troubleshooting

### Bot Not Responding

1. **Check if bot is enabled**:
   - Verify `TELEGRAM_BOT_ENABLED=true` in your `.env` file

2. **Check bot token**:
   - Ensure `TELEGRAM_BOT_TOKEN` is correctly set in `.env`
   - Verify the token with BotFather if needed

3. **Check application logs**:
   ```bash
   pm2 logs
   ```
   or
   ```bash
   npm start
   ```
   Look for `[Telegram Bot]` prefixed messages

4. **Verify bot is running**:
   - The bot should show as "online" in Telegram when the application is running

### "Bot ini hanya bekerja di chat private"

This message appears when you try to use the bot in a group chat. The bot is designed to only work in private/direct messages. Open a direct chat with the bot instead.

### Menu Not Working

1. Make sure you're sending just the menu number (e.g., `1`, not `menu 1`)
2. Check the application logs for error messages
3. Verify database connection is working
4. Ensure required environment variables are set

### Bot Stops Responding

If the bot stops responding:
1. Restart the application
2. Check for error messages in logs
3. Verify internet connectivity
4. Check if polling is working correctly

## Security Considerations

1. **Keep your bot token secret**: Never commit the token to version control
2. **Private chats only**: The bot is configured to only work in private chats for security
3. **User authentication**: Consider implementing authentication to verify users before allowing access to sensitive data
4. **Rate limiting**: Consider adding rate limiting to prevent abuse

## Disabling the Bot

To disable the bot, set in `.env`:
```ini
TELEGRAM_BOT_ENABLED=false
```

Then restart the application.

## Advanced Configuration

### Customizing Menu Options

To add or modify menu options, edit `/src/service/telegramBotService.js` in the `sendMainMenu()` function.

### Adding File Support

To send generated Excel files via Telegram, you'll need to:
1. Modify the `handleMenuSelection()` function to detect file outputs
2. Use `bot.sendDocument()` to send files
3. Ensure proper cleanup of temporary files

### Multi-Client Support

To support multiple client IDs:
1. Implement user authentication system
2. Store user-to-client mapping in database
3. Modify `handleMenuSelection()` to use user-specific client ID

## Support

For issues or questions, please contact the repository administrator or create an issue on GitHub.

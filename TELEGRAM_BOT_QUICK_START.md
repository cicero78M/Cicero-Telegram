# Telegram Bot Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Your Bot (2 minutes)

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to name your bot
4. Save the token you receive (looks like: `1234567890:ABCdefGHI...`)

### Step 2: Configure (1 minute)

Edit your `.env` file:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHI...  # Your token from BotFather
TELEGRAM_BOT_ENABLED=true                    # Enable the bot
```

### Step 3: Start (1 minute)

```bash
npm start
# or
pm2 restart ecosystem.config.js
```

Look for these logs:
```
[App] Telegram bot is enabled, initializing...
[Telegram Bot] Initializing bot...
[Telegram Bot] Bot initialized successfully
```

### Step 4: Test (1 minute)

1. Open Telegram
2. Search for your bot username
3. Click "Start" or send `/start`
4. Send `/menu` to see available options
5. Send a menu number like `1` to test

## ✅ Expected Behavior

### When you send `/menu`:
```
📋 Menu DirRequest

Pilih menu yang ingin Anda akses:

📊 Laporan Dasar (1-3)
1️⃣ Recap data user
2️⃣ Executive summary
3️⃣ Laporan data tidak lengkap

👥 Laporan Instagram/Likes (5-7, 12-13, 19)
5️⃣ Absensi likes Ditbinmas (lengkap)
...
```

### When you send a number (e.g., `1`):
```
⏳ Memproses menu 1...
[Results from menu 1]
Ketik /menu untuk kembali ke menu utama.
```

## 🔧 Troubleshooting

**Bot not responding?**
- Check logs: `pm2 logs` or `npm start`
- Verify `TELEGRAM_BOT_ENABLED=true`
- Verify token is correct

**"Bot ini hanya bekerja di chat private"?**
- Open a direct/private chat with the bot
- Don't use the bot in groups

## 📚 Full Documentation

- Setup Guide: `docs/telegram_bot_setup.md`
- Implementation Details: `TELEGRAM_BOT_IMPLEMENTATION_SUMMARY.md`
- Main README: `README.md`

## 🎯 What You Can Do

Access 43 different menus including:
- 📊 User data reports
- 👥 Instagram likes tracking
- 💬 TikTok comments tracking
- 📈 Engagement rankings
- 📋 Various Excel exports

All through simple commands in Telegram!

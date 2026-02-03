import './src/utils/logger.js';
import { env } from './src/config/env.js';
import { initializeTelegramDirektoratBot } from './src/service/telegramDirektoratBotService.js';
import { initializeTelegramOperatorBot } from './src/service/telegramOperatorBotService.js';
import { initializeTelegramUserBot } from './src/service/telegramUserBotService.js';

console.log('Cicero backend initialized - web endpoints have been removed');
console.log('Application services are available for internal use');

// Initialize Telegram Direktorat Bot if enabled
if (env.TELEGRAM_DIREKTORAT_BOT_ENABLED) {
  console.log('[App] Telegram Direktorat Bot is enabled, initializing...');
  initializeTelegramDirektoratBot(env.TELEGRAM_DIREKTORAT_BOT_TOKEN, env.TELEGRAM_DIREKTORAT_BOT_ENABLED)
    .then((bot) => {
      if (bot) {
        console.log('[App] Telegram Direktorat Bot started successfully');
      } else {
        console.log('[App] Telegram Direktorat Bot failed to start');
      }
    })
    .catch((error) => {
      console.error('[App] Error starting Telegram Direktorat Bot:', error);
    });
} else {
  console.log('[App] Telegram Direktorat Bot is disabled');
}

// Initialize Telegram Operator Bot if enabled
if (env.TELEGRAM_OPERATOR_BOT_ENABLED) {
  console.log('[App] Telegram Operator Bot is enabled, initializing...');
  initializeTelegramOperatorBot(env.TELEGRAM_OPERATOR_BOT_TOKEN, env.TELEGRAM_OPERATOR_BOT_ENABLED)
    .then((bot) => {
      if (bot) {
        console.log('[App] Telegram Operator Bot started successfully');
      } else {
        console.log('[App] Telegram Operator Bot failed to start');
      }
    })
    .catch((error) => {
      console.error('[App] Error starting Telegram Operator Bot:', error);
    });
} else {
  console.log('[App] Telegram Operator Bot is disabled');
}

// Initialize Telegram User Bot if enabled
if (env.TELEGRAM_USER_BOT_ENABLED) {
  console.log('[App] Telegram User Bot is enabled, initializing...');
  initializeTelegramUserBot(env.TELEGRAM_USER_BOT_TOKEN, env.TELEGRAM_USER_BOT_ENABLED)
    .then((bot) => {
      if (bot) {
        console.log('[App] Telegram User Bot started successfully');
      } else {
        console.log('[App] Telegram User Bot failed to start');
      }
    })
    .catch((error) => {
      console.error('[App] Error starting Telegram User Bot:', error);
    });
} else {
  console.log('[App] Telegram User Bot is disabled');
}


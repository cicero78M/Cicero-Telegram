import './src/utils/logger.js';
import { env } from './src/config/env.js';
import { initializeTelegramBot } from './src/service/telegramBotService.js';

console.log('Cicero backend initialized - web endpoints have been removed');
console.log('Application services are available for internal use');

// Initialize Telegram bot if enabled
if (env.TELEGRAM_BOT_ENABLED) {
  console.log('[App] Telegram bot is enabled, initializing...');
  initializeTelegramBot(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_BOT_ENABLED)
    .then((bot) => {
      if (bot) {
        console.log('[App] Telegram bot started successfully');
      } else {
        console.log('[App] Telegram bot failed to start');
      }
    })
    .catch((error) => {
      console.error('[App] Error starting Telegram bot:', error);
    });
} else {
  console.log('[App] Telegram bot is disabled');
}


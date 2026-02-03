/**
 * Shared utilities for Telegram bots
 */

/**
 * Create a sendMessage wrapper for a Telegram bot instance
 * This wrapper makes the bot compatible with WhatsApp-style handlers
 * by wrapping the native sendMessage with error handling
 * 
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {Function} nativeSendMessage - The native sendMessage function from TelegramBot
 * @param {string} botName - Name of the bot for logging (e.g., "Direktorat Bot")
 * @returns {Function} Wrapped sendMessage function
 */
export function createSendMessageWrapper(bot, nativeSendMessage, botName) {
  return async (chatId, message, options = {}) => {
    try {
      return await nativeSendMessage.call(bot, chatId, message, options);
    } catch (error) {
      console.error(`[Telegram ${botName}] Error sending message:`, error);
      throw error;
    }
  };
}

/**
 * Constants for message splitting
 */
export const MESSAGE_SPLIT_CONFIG = {
  MAX_LENGTH: 4000, // Telegram has 4096 limit, use 4000 for safety
  MIN_SPLIT_RATIO: 0.8, // When splitting, only use space if it's not too far back (80% threshold)
};

/**
 * Escape Markdown special characters in text to prevent Telegram parsing errors
 * This is used for user-provided data that will be included in messages with parse_mode: 'Markdown'
 * 
 * @param {string} text - The text to escape
 * @returns {string} Escaped text safe for Markdown
 */
export function escapeMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Escape Markdown special characters: * _ ` [
  // Note: We only escape opening brackets [ to prevent link formatting issues
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[');
}

/**
 * Shared utilities for Telegram bots
 */

/**
 * Create a sendMessage wrapper for a Telegram bot instance
 * This wrapper makes the bot compatible with WhatsApp-style handlers
 * by wrapping the native sendMessage with error handling and automatic message splitting
 * 
 * @param {TelegramBot} bot - The Telegram bot instance
 * @param {Function} nativeSendMessage - The native sendMessage function from TelegramBot
 * @param {string} botName - Name of the bot for logging (e.g., "Direktorat Bot")
 * @returns {Function} Wrapped sendMessage function
 */
export function createSendMessageWrapper(bot, nativeSendMessage, botName) {
  return async (chatId, message, options = {}) => {
    try {
      // If message is too long, split it into chunks
      if (message && message.length > MESSAGE_SPLIT_CONFIG.MAX_LENGTH) {
        const chunks = splitMessage(message, MESSAGE_SPLIT_CONFIG.MAX_LENGTH);
        console.log(`[Telegram ${botName}] Splitting long message into ${chunks.length} chunks`);
        
        // Send all chunks sequentially
        let lastResult;
        for (let i = 0; i < chunks.length; i++) {
          lastResult = await nativeSendMessage.call(bot, chatId, chunks[i], options);
          
          // Add a small delay between chunks to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Return the result from the last chunk
        return lastResult;
      }
      
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
 * Split a long message into chunks that fit within Telegram's message size limit
 * Tries to split at newlines first, then spaces, to avoid breaking content
 * 
 * @param {string} message - The message to split
 * @param {number} maxLength - Maximum length per chunk (default: 4000)
 * @returns {string[]} Array of message chunks
 */
export function splitMessage(message, maxLength = MESSAGE_SPLIT_CONFIG.MAX_LENGTH) {
  if (!message || message.length <= maxLength) {
    return [message];
  }

  const chunks = [];
  let currentChunk = '';
  const lines = message.split('\n');

  for (const line of lines) {
    // If adding this line would exceed the limit, push current chunk and start new one
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      // If a single line is too long, split it carefully
      if (line.length > maxLength) {
        let remaining = line;
        while (remaining.length > 0) {
          // Find a safe split point (prefer spaces, but respect UTF-8 boundaries)
          let splitPoint = maxLength;
          if (remaining.length > maxLength) {
            // Look for last space before maxLength
            const lastSpace = remaining.lastIndexOf(' ', maxLength);
            if (lastSpace > maxLength * MESSAGE_SPLIT_CONFIG.MIN_SPLIT_RATIO) {
              splitPoint = lastSpace;
            }
          }
          chunks.push(remaining.substring(0, splitPoint));
          remaining = remaining.substring(splitPoint).trim();
        }
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [message];
}

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
  
  // Escape Markdown special characters
  // IMPORTANT: Escape backslash first to prevent double-escaping
  // Then escape other Markdown special characters: * _ ` [
  // Note: We only escape opening brackets [ to prevent link formatting issues
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[');
}
